import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import Stripe from "stripe";
import { FirebaseBusinessRepository } from "../src/domains/business/business.repository.ts";
import { FirebaseProjectRepository } from "../src/domains/projects/project.repository.ts";
import { FirebasePaymentRepository } from "../src/domains/payments/payment.repository.ts";
import { PaymentService } from "../src/domains/payments/payment.service.ts";
import { ProjectService } from "../src/domains/projects/project.service.ts";
import { ResendProjectEmailSender } from "../src/domains/projects/project.email.ts";
import { StripePaymentProvider } from "../src/providers/payments/stripe/stripe.adapter.ts";
import { emptyPaymentProvider, request, StubVerifier, userToken } from "./http-harness.ts";

// Runs the production repositories without Firebase credentials or network writes.
type Row = Record<string, unknown>;
class MemoryDb {
  rows = new Map<string, Row>(); sequence = 0; queue: Promise<unknown> = Promise.resolve();
  collection(name: string) { return new Query(this, name); }
  seed(path: string, data: Row) { this.rows.set(path, { ...data }); }
  row(path: string) { return this.rows.get(path)!; }
  async runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    const job = this.queue.then(async () => { const tx = new Transaction(); const result = await fn(tx); for (const write of tx.writes) write(); return result; });
    this.queue = job.catch(() => {}); return job;
  }
}
class Ref {
  db: MemoryDb; path: string; id: string;
  constructor(db: MemoryDb, path: string) { this.db = db; this.path = path; this.id = path.split("/").at(-1)!; }
  async get() { const row = this.db.rows.get(this.path); return { id: this.id, exists: Boolean(row), data: () => row ? { ...row } : undefined }; }
  async update(data: Row) { assert.ok(this.db.rows.has(this.path)); this.db.seed(this.path, { ...this.db.row(this.path), ...data }); }
}
class Query {
  db: MemoryDb; name: string; filters: Array<[string, unknown]> = []; count = Infinity;
  constructor(db: MemoryDb, name: string) { this.db = db; this.name = name; }
  doc(id = `auto-${++this.db.sequence}`) { return new Ref(this.db, `${this.name}/${id}`); }
  where(key: string, op: string, value: unknown) { assert.equal(op,"=="); const next = new Query(this.db,this.name); next.filters=[...this.filters,[key,value]]; return next; }
  limit(count: number) { this.count = count; return this; }
  orderBy() { return this; }
  async get() { const paths = [...this.db.rows].filter(([path,row])=>path.split("/")[0]===this.name && this.filters.every(([key,value])=>row[key]===value)).slice(0,this.count); const docs=await Promise.all(paths.map(([path])=>new Ref(this.db,path).get())); return {docs,empty:!docs.length}; }
  async add(data: Row) { assert.equal(Object.values(data).includes(undefined),false,"Firestore rejects undefined values");const ref=this.doc(); this.db.seed(ref.path,data); return ref; }
}
class Transaction {
  writes: Array<()=>void> = [];
  async get<T extends Ref | Query>(ref: T): Promise<Awaited<ReturnType<T["get"]>>> { assert.equal(this.writes.length,0,"Firestore requires reads before writes"); return await ref.get() as Awaited<ReturnType<T["get"]>>; }
  set(ref: Ref, data: Row, options?: {merge:boolean}) { this.writes.push(()=>ref.db.seed(ref.path,{...(options?.merge?ref.db.row(ref.path):{}),...data})); }
  create(ref: Ref, data: Row) { this.writes.push(()=>{assert.equal(ref.db.rows.has(ref.path),false);ref.db.seed(ref.path,data);}); }
  update(ref: Ref, data: Row) { this.writes.push(()=>{assert.ok(ref.db.rows.has(ref.path));ref.db.seed(ref.path,{...ref.db.row(ref.path),...data});}); }
}

const paid = {eventId:"evt-paid",type:"paid" as const,customerId:"user-1",contractId:"contract-1",invoiceId:"invoice-1",checkoutReference:"cs_test",amountCents:25000,currency:"eur"};
const admin = new StubVerifier({...userToken,role:"admin"});
function setup() {
  const db = new MemoryDb();
  db.seed("contracts/contract-1",{customerId:"user-1",customerEmail:"internal@example.test",customerName:"Test Customer",title:"Internal lifecycle",scope:"Actual stored scope and terms",contractVersion:"v1.0",status:"assigned",workspaceAccess:true,depositAmountCents:25000,currency:"eur"});
  db.seed("invoices/invoice-1",{customerId:"user-1",contractId:"contract-1",isDeposit:true,status:"issued",amountCents:25000,currency:"eur"});
  const business = new FirebaseBusinessRepository(db as never); const projects = new FirebaseProjectRepository(db as never); const payments = new FirebasePaymentRepository(db as never);
  const emails: string[] = []; const email = {async sendAccess(input:{accessPassword:string}) {emails.push(input.accessPassword);}};
  const service = new ProjectService(projects,email,"https://internal.example.test/client-portal");
  const paymentService = new PaymentService(payments,emptyPaymentProvider,"https://internal.example.test",event=>service.activateFromPayment(event));
  const sign = () => request("/api/v1/contracts/contract-1/sign",{method:"PATCH",authorization:"Bearer valid",body:{typedSignature:"Test Customer"},repository:business,projectRepository:projects,projectEmail:email});
  return {db,business,projects,payments,service,paymentService,sign,emails};
}

for (const order of ["sign-pay","pay-sign"] as const) test(`activation: ${order}, replay and repeated signing create exactly one project`,async()=>{
  const f=setup();
  if(order==="sign-pay") {assert.equal((await f.sign()).status,200);assert.equal((await f.projects.listOwned("user-1")).length,0);await f.paymentService.reconcile(paid);}
  else {await f.paymentService.reconcile(paid);assert.equal((await f.projects.listOwned("user-1")).length,0);assert.equal((await f.sign()).status,200);}
  const signature=f.db.row("contracts/contract-1").signedAt;
  assert.equal(await f.paymentService.reconcile(paid),"duplicate");assert.equal((await f.sign()).status,200);
  assert.equal(f.db.row("contracts/contract-1").signedAt,signature);
  assert.equal((await f.projects.listOwned("user-1")).length,1);assert.equal(f.emails.length,1);
});

test("activation serializes concurrent attempts and recovers a post-payment callback failure",async()=>{
  const f=setup();await f.business.signContract("contract-1","user-1",undefined,"Test Customer");
  const broken=new PaymentService(f.payments,emptyPaymentProvider,"https://internal.example.test",async()=>{throw new Error("interrupted");});
  await assert.rejects(()=>broken.reconcile(paid),/interrupted/);
  await Promise.all([f.paymentService.reconcile(paid),f.paymentService.reconcile(paid),f.service.activateContract("contract-1","user-1")]);
  assert.equal((await f.projects.listOwned("user-1")).length,1);assert.equal(f.emails.length,1);
});

test("activation rejects wrong ownership, wrong contract/invoice and unsatisfied deposit",async()=>{
  const f=setup();await f.business.signContract("contract-1","user-1",undefined,"Test Customer");
  await assert.rejects(()=>f.service.activateContract("contract-1","other-user"));
  await assert.rejects(()=>f.service.activateContract("contract-other","user-1"));
  assert.equal(await f.service.activateContract("contract-1","user-1"),"ineligible");
  f.db.row("invoices/invoice-1").status="paid";
  assert.equal(await f.service.activateFromPayment({...paid,invoiceId:"wrong-invoice"}),"ineligible");
  for (const patch of [{customerId:"other-user"},{contractId:"contract-other"},{amountCents:1},{currency:"usd"},{isDeposit:false}]) {
    const original={...f.db.row("invoices/invoice-1")};Object.assign(f.db.row("invoices/invoice-1"),patch);
    assert.equal(await f.service.activateContract("contract-1","user-1"),"ineligible");f.db.seed("invoices/invoice-1",original);
  }
});

test("signing rejects unauthenticated, foreign, invalid states and signature rewrites",async()=>{
  const f=setup();
  assert.equal((await request("/api/v1/contracts/contract-1/sign",{method:"PATCH",body:{typedSignature:"Name"},repository:f.business})).status,401);
  assert.equal(await f.business.signContract("contract-1","other-user",undefined,"Name"),false);
  for(const status of ["draft","cancelled","active"]) {f.db.row("contracts/contract-1").status=status;await assert.rejects(()=>f.business.signContract("contract-1","user-1",undefined,"Name"));}
  f.db.row("contracts/contract-1").status="assigned";await f.sign();
  await assert.rejects(()=>f.business.signContract("contract-1","user-1",undefined,"Different Name"));
  const injection=await request("/api/v1/contracts/contract-1/sign",{method:"PATCH",authorization:"Bearer valid",body:{typedSignature:"Name",status:"signed",customerId:"other-user"},repository:f.business});assert.equal(injection.status,400);
});

test("Stripe verified completion requires actual paid status, including async success",()=>{
  const oldKey=process.env.STRIPE_SECRET_KEY,oldSecret=process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY="sk_test_internal_fixture";process.env.STRIPE_WEBHOOK_SECRET="whsec_internal_fixture";
  try {
    const stripe=new Stripe("sk_test_internal_fixture");const provider=new StripePaymentProvider();
    for(const [eventType,status,expected] of [["checkout.session.completed","paid","paid"],["checkout.session.completed","unpaid","unknown"],["checkout.session.completed",undefined,"unknown"],["checkout.session.completed","no_payment_required","unknown"],["checkout.session.async_payment_succeeded","paid","paid"],["checkout.session.async_payment_succeeded","unpaid","unknown"]]) {
      const payload=JSON.stringify({id:"evt-fixture",type:eventType,data:{object:{id:"cs_fixture",payment_status:status,amount_total:25000,currency:"eur",metadata:{customerId:"user-1",contractId:"contract-1",invoiceId:"invoice-1"}}}});
      const signature=stripe.webhooks.generateTestHeaderString({payload,secret:"whsec_internal_fixture"});
      assert.equal(provider.verifyWebhook(Buffer.from(payload),signature).type,expected);
    }
  } finally {if(oldKey===undefined)delete process.env.STRIPE_SECRET_KEY;else process.env.STRIPE_SECRET_KEY=oldKey;if(oldSecret===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=oldSecret;}
});

test("real reconciliation rejects amount/currency/customer/contract mismatch and ignores unpaid completion",async()=>{
  const f=setup();
  for(const patch of [{amountCents:1},{currency:"usd"},{customerId:"other-user"},{contractId:"other-contract"}]) await assert.rejects(()=>f.payments.reconcile({...paid,...patch}));
  assert.equal(f.db.row("invoices/invoice-1").status,"issued");
  assert.equal(await f.paymentService.reconcile({...paid,type:"unknown"}),"ignored");
  assert.equal(f.db.row("invoices/invoice-1").status,"issued");
  await f.paymentService.reconcile(paid);assert.equal(await f.paymentService.reconcile(paid),"duplicate");
  assert.equal(await f.paymentService.reconcile({...paid,eventId:"evt-late-failure",type:"failed"}),"ignored");
  assert.equal(f.db.row("payments/cs_test").status,"paid");
});

test("revocation denies workspace, download and portal writes without erasing unlock history",async()=>{
  const f=setup();await f.sign();await f.paymentService.reconcile(paid);const project=(await f.projects.listOwned("user-1"))[0];
  await f.service.verify(project.id,"user-1",f.emails[0]);assert.ok(await f.service.workspace(project.id,"user-1"));
  const path=`projects/${project.id}`,unlocked=f.db.row(path).unlockedAt;
  f.db.seed("projectFiles/file-1",{projectId:project.id,customerId:"user-1",customerVisible:true,storagePath:"private/file",name:"file"});
  const service=new ProjectService(f.projects,{async sendAccess(){ }},"https://internal.example.test",{async save(){throw new Error("unused");},async signedDownload(){return {url:"https://internal.example.test/file",expiresAt:new Date().toISOString()};}});
  assert.ok(await service.download(project.id,"file-1","user-1"));
  await assert.rejects(()=>service.download(project.id,"file-1","other-user"));
  f.db.row(path).accessEnabled=false;
  await assert.rejects(()=>service.workspace(project.id,"user-1"));await assert.rejects(()=>service.download(project.id,"file-1","user-1"));
  await assert.rejects(()=>service.message(project.id,"user-1","Hello"));await assert.rejects(()=>service.change(project.id,"user-1",{title:"change"}));await assert.rejects(()=>service.satisfaction(project.id,"user-1",{satisfaction:"satisfied"}));
  assert.equal(await f.projects.workspace(project.id,"user-1"),null);assert.equal(f.db.row(path).unlockedAt,unlocked);
});

test("quote issue, view and immutable revision-bound acceptance/rejection",async()=>{
  const f=setup();f.db.seed("quotes/quote-1",{customerId:"user-1",projectType:"Internal project",status:"pending"});
  const issued=await request("/api/v1/quotes/quote-1",{method:"PATCH",authorization:"Bearer valid",verifier:admin,repository:f.business,body:{status:"approved",adminReply:"Scope and commercial terms",amountCents:25000,currency:"eur"}});assert.equal(issued.status,200);
  assert.equal((await f.business.customerPortal("user-1")).quotes[0].amountCents,25000);
  await assert.rejects(()=>f.business.decideQuote("quote-1","other-user","accepted",1));await assert.rejects(()=>f.business.decideQuote("quote-1","user-1","accepted",2));
  const response=await request("/api/v1/quotes/quote-1/decision",{method:"PATCH",authorization:"Bearer valid",repository:f.business,body:{decision:"accepted",revision:1}});assert.equal(response.status,200);
  await f.business.decideQuote("quote-1","user-1","accepted",1);await assert.rejects(()=>f.business.decideQuote("quote-1","user-1","rejected",1));
  await assert.rejects(()=>f.business.replyToQuote("quote-1",{status:"replied",adminReply:"Overwrite"},"admin"));
  f.db.seed("quotes/quote-2",{...f.db.row("quotes/quote-1"),status:"approved"});await f.business.decideQuote("quote-2","user-1","rejected",1);
  assert.equal((await f.business.get("quotes","quote-2"))?.status,"rejected");
  assert.equal((await f.projects.listOwned("user-1")).length,0);
});

test("milestone update and change decision enforce admin, association and bounded transitions",async()=>{
  const f=setup();f.db.seed("projects/project-1",{customerId:"user-1"});f.db.seed("projectMilestones/mile-1",{projectId:"project-1",status:"pending"});f.db.seed("changeRequests/change-1",{projectId:"project-1",customerId:"user-1",status:"submitted",title:"Change"});
  for(const [suffix,body] of [["milestones/mile-1",{status:"completed",progressPercent:100}],["change-requests/change-1",{status:"approved"}]] as const) {
    const path=`/api/v1/projects/project-1/${suffix}`;
    assert.equal((await request(path,{method:"PATCH",body,projectRepository:f.projects})).status,401);
    assert.equal((await request(path,{method:"PATCH",authorization:"Bearer valid",body,projectRepository:f.projects})).status,403);
    assert.equal((await request(path,{method:"PATCH",authorization:"Bearer valid",verifier:admin,body,projectRepository:f.projects})).status,200);
  }
  assert.ok(f.db.row("projectMilestones/mile-1").completedAt);assert.equal(f.db.row("changeRequests/change-1").decidedBy,"user-1");
  await assert.rejects(()=>f.projects.updateMilestone("project-other","mile-1",{status:"completed",progressPercent:100},"admin"));
  await assert.rejects(()=>f.projects.decideChange("project-other","change-1","approved","admin"));
  await assert.rejects(()=>f.projects.decideChange("project-1","change-1","declined","admin"));
  await f.projects.decideChange("project-1","change-1","completed","admin");assert.ok(f.db.row("changeRequests/change-1").completedAt);
  f.db.seed("changeRequests/change-2",{projectId:"project-1",customerId:"user-1",status:"submitted",title:"Another change"});await f.projects.decideChange("project-1","change-2","declined","admin");
  for(const body of [{status:"completed",progressPercent:20},{status:"completed",progressPercent:100,customerId:"other-user"}]) assert.equal((await request("/api/v1/projects/project-1/milestones/mile-1",{method:"PATCH",authorization:"Bearer valid",verifier:admin,body,projectRepository:f.projects})).status,400);
});

test("admin replies preserve canonical customer/project association and unread status",async()=>{
  const f=setup();f.db.seed("projects/project-1",{customerId:"user-1",accessEnabled:true,unlockedAt:"earlier"});
  for(const project of [false,true]) {
    const id=project?"project-message":"general-message";f.db.seed(`messages/${id}`,{customerId:"user-1",senderRole:"customer",body:"Question",...(project?{projectId:"project-1"}:{})});
    const path=`/api/v1/messages/${id}/reply`,body={body:"Authorized reply"};
    assert.equal((await request(path,{method:"POST",authorization:"Bearer valid",repository:f.business,body})).status,403);
    const reply=await request(path,{method:"POST",authorization:"Bearer valid",verifier:admin,repository:f.business,body});assert.equal(reply.status,201);
    const row=f.db.row(`messages/${reply.payload.data.messageId}`);assert.equal(row.customerId,"user-1");assert.equal(row.projectId,project?"project-1":undefined);assert.equal(row.status,"unread");
    assert.equal(await f.business.markCustomerMessageRead(String(reply.payload.data.messageId),"other-user"),false);
  }
  f.db.row("projects/project-1").accessEnabled=false;assert.equal((await f.business.customerPortal("user-1")).messages.some(row=>row.projectId),false);
  f.db.row("projects/project-1").customerId="other-user";await assert.rejects(()=>f.business.replyToMessage("project-message","Reply","admin"));
});

for(const satisfaction of ["satisfied","not_satisfied"] as const) test(`completion ${satisfaction} records acceptance only when satisfied`,async()=>{
  const f=setup();f.db.seed("projects/project-1",{customerId:"user-1",completedAt:"completed",accessEnabled:true,unlockedAt:"earlier"});
  await f.projects.submitSatisfaction("project-1","user-1",{satisfaction,comment:"Feedback"});const project=f.db.row("projects/project-1");
  assert.equal(Boolean(project.acceptedAt),satisfaction==="satisfied");assert.equal(project.completedAt,"completed");
  assert.equal((await f.db.collection("changeRequests").get()).docs.length,satisfaction==="not_satisfied"?1:0);
  await assert.rejects(()=>f.projects.submitSatisfaction("project-1","user-1",{satisfaction}));
});

test("missing access email configuration records failure and authorized regeneration reports delivery",async()=>{
  const f=setup();await f.business.signContract("contract-1","user-1",undefined,"Test Customer");await f.payments.reconcile(paid);
  const missing=new ResendProjectEmailSender("","","");const service=new ProjectService(f.projects,missing,"https://internal.example.test");
  assert.equal(await service.activateFromPayment(paid),"activated");const project=(await f.projects.listOwned("user-1"))[0];assert.equal(project.accessEmailStatus,"failed");
  const denied=await request(`/api/v1/projects/${project.id}/access/regenerate`,{method:"POST",authorization:"Bearer valid",body:{},projectRepository:f.projects,projectEmail:missing});assert.equal(denied.status,403);
  assert.equal((await service.regenerate(project.id)).deliveryStatus,"failed");
  assert.equal((await f.service.regenerate(project.id)).deliveryStatus,"sent");assert.equal((await f.projects.getOwned(project.id,"user-1"))?.accessEmailStatus,"sent");
});

test("Firestore policy forbids direct customer contract lifecycle writes and forged quote/message creation",()=>{
  const rules=readFileSync(new URL("../../../firestore.rules",import.meta.url),"utf8");
  const contracts=rules.split("match /contracts/{contractId}")[1].split("match /invoices")[0];
  assert.match(contracts,/allow update: if false;/);assert.doesNotMatch(contracts,/changedKeys|signedBy|typedSignature/);
  assert.match(rules,/match \/quotes\/\{quoteId\} \{\s*allow create: if false;/);
  assert.match(rules,/Association and sender identity are assigned by the API\.\s*allow create: if false;/);
});

test("operator lifecycle read exposes only associated records and is admin-only",async()=>{
  const f=setup();f.db.seed("projects/project-1",{customerId:"user-1"});
  f.db.seed("projectMilestones/mile-1",{projectId:"project-1",status:"pending"});f.db.seed("projectMilestones/mile-other",{projectId:"project-other"});
  f.db.seed("changeRequests/change-1",{projectId:"project-1",customerId:"user-1"});f.db.seed("changeRequests/change-other",{projectId:"project-1",customerId:"other-user"});
  const path="/api/v1/admin/projects/project-1/lifecycle";
  assert.equal((await request(path,{projectRepository:f.projects})).status,401);
  assert.equal((await request(path,{authorization:"Bearer valid",projectRepository:f.projects})).status,403);
  const result=await request(path,{authorization:"Bearer valid",verifier:admin,projectRepository:f.projects});assert.equal(result.status,200);
  assert.deepEqual(result.payload.data.milestones.map((row:{id:string})=>row.id),["mile-1"]);assert.deepEqual(result.payload.data.changeRequests.map((row:{id:string})=>row.id),["change-1"]);
});

test("milestone creation without optional target date persists a usable record",async()=>{
  const f=setup();f.db.seed("projects/project-1",{customerId:"user-1"});
  const response=await request("/api/v1/projects/project-1/milestones",{method:"POST",authorization:"Bearer valid",verifier:admin,projectRepository:f.projects,body:{title:"First delivery",description:"Bounded milestone",status:"pending",order:0}});
  assert.equal(response.status,201);
});

test("quote and message routes reject identity injection, unauthorized issuing and missing offer pricing",async()=>{
  const f=setup();f.db.seed("quotes/quote-1",{customerId:"user-1",status:"pending"});
  const offer={status:"approved",adminReply:"Terms",amountCents:10000,currency:"eur"};
  assert.equal((await request("/api/v1/quotes/quote-1",{method:"PATCH",authorization:"Bearer valid",repository:f.business,body:offer})).status,403);
  assert.equal((await request("/api/v1/quotes/quote-1",{method:"PATCH",authorization:"Bearer valid",verifier:admin,repository:f.business,body:{status:"approved",adminReply:"No pricing"}})).status,400);
  assert.equal((await request("/api/v1/quotes/quote-1/decision",{method:"PATCH",repository:f.business,body:{decision:"accepted",revision:1}})).status,401);
  assert.equal((await request("/api/v1/quotes/quote-1/decision",{method:"PATCH",authorization:"Bearer valid",repository:f.business,body:{decision:"accepted",revision:1,customerId:"other-user"}})).status,400);
  assert.equal((await request("/api/v1/messages/message-1/reply",{method:"POST",repository:f.business,body:{body:"Reply"}})).status,401);
  assert.equal((await request("/api/v1/messages/message-1/reply",{method:"POST",authorization:"Bearer valid",verifier:admin,repository:f.business,body:{body:"Reply",customerId:"other-user",projectId:"project-other"}})).status,400);
});
