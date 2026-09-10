import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { getFirebaseAdminServices } from "../apps/averon-api/src/services/firebase/admin.ts";
import { FirebaseBusinessRepository } from "../apps/averon-api/src/domains/business/business.repository.ts";
import { FirebasePaymentRepository } from "../apps/averon-api/src/domains/payments/payment.repository.ts";
import { FirebaseProjectRepository } from "../apps/averon-api/src/domains/projects/project.repository.ts";
import { hashProjectAccessPassword } from "../apps/averon-api/src/domains/projects/access-password.ts";

if ((process.env.NODE_ENV ?? "development") === "production") throw new Error("Development project provisioning is disabled in production.");
const localEnvPath=new URL("../.env.development.local",import.meta.url);
const readLocal=()=>existsSync(localEnvPath)?Object.fromEntries(readFileSync(localEnvPath,"utf8").split(/\r?\n/).flatMap(line=>{const match=line.match(/^([^#=]+)=(.*)$/);return match?[[match[1].trim(),match[2].trim()]]:[];})):{};
const local=readLocal();const email=local.VITE_DEV_CUSTOMER_EMAIL;if(!email)throw new Error("Run npm run dev:provision-customer first.");
const password=local.DEV_PROJECT_ACCESS_PASSWORD||`Dev-${randomBytes(18).toString("base64url")}`;
const firebase=getFirebaseAdminServices();const account=await firebase.auth.getUserByEmail(email);
const business=new FirebaseBusinessRepository(firebase.firestore);const payments=new FirebasePaymentRepository(firebase.firestore);const projects=new FirebaseProjectRepository(firebase.firestore);
const fixtureTitle="Averon Customer Files Development Project";
let contract=(await business.list("contracts",account.uid)).find(item=>item.title===fixtureTitle);
let invoiceId="";let projectReference="";
if(!contract){const made=await business.assignContract({customerId:account.uid,customerEmail:email,customerName:account.displayName||"Developer Customer",title:fixtureTitle,scope:"Local authenticated customer-files acceptance workspace.",depositAmountCents:100,currency:"eur",workspaceAccess:true},"development-provisioner");contract=await business.get("contracts",made.contractId);invoiceId=made.invoiceId;projectReference=made.projectReference;}
if(!contract)throw new Error("Development contract could not be verified.");
invoiceId=invoiceId||(await business.list("invoices",account.uid)).find(item=>item.contractId===contract.id)?.id||"";if(!invoiceId)throw new Error("Development deposit invoice could not be verified.");
if(contract.status!=="signed")await business.signContract(contract.id,account.uid,email,"Developer Customer");
const invoice=await payments.getInvoice(invoiceId);if(!invoice)throw new Error("Development invoice could not be read.");projectReference=projectReference||invoice.projectReference;
const checkoutReference=`dev_files_${contract.id}`;await payments.recordCheckout(invoice,checkoutReference);
await payments.reconcile({eventId:`dev-files-paid-${contract.id}`,type:"paid",checkoutReference,invoiceId,contractId:contract.id,customerId:account.uid,amountCents:invoice.amountCents,currency:invoice.currency}).catch(error=>{if(!String(error).includes("duplicate"))throw error;});
let project=await projects.findByContract(contract.id);if(!project){project=await projects.createFromPaidContract({eventId:`dev-files-paid-${contract.id}`,customerId:account.uid,contractId:contract.id,invoiceId,projectReference},await hashProjectAccessPassword(password));}
if(!project)project=await projects.findByContract(contract.id);if(!project)throw new Error("Development project could not be verified.");
if(!local.DEV_PROJECT_ACCESS_PASSWORD)writeFileSync(localEnvPath,[readFileSync(localEnvPath,"utf8").trimEnd(),`DEV_PROJECT_ACCESS_PASSWORD=${password}`,""].join("\n"),{mode:0o600});
console.log(`Development project ready (${project.id}); access password remains only in ignored .env.development.local.`);
