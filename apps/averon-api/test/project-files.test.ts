import assert from "node:assert/strict";
import test from "node:test";
import { ProjectService } from "../src/domains/projects/project.service.ts";
import { SupabaseProjectFileStorage, configuredProjectFileStorage, type ProjectFileStorage } from "../src/domains/projects/project-file.storage.ts";
import type { ProjectFileRecord, ProjectRecord } from "../src/domains/projects/project.types.ts";
import type { ProjectRepository } from "../src/domains/projects/project.repository.ts";
import { customerVisibleFiles } from "../src/domains/projects/project.repository.ts";

const project=(id:string,customerId:string,unlocked=true):ProjectRecord=>({id,customerId,customerEmail:`${customerId}@example.test`,contractId:`contract-${id}`,projectReference:`AVR-${id}`,title:"Authorized project",summary:"Delivery",status:"active",progressPercent:50,accessEnabled:true,...(unlocked?{unlockedAt:"now"}:{})});

class MemoryFiles {
  projects=[project("project-a","customer-a"),project("project-b","customer-b"),project("locked","customer-a",false)];
  files=new Map<string,ProjectFileRecord>(); uploads=new Map<string,string>(); downloads:string[]=[];
  async listAll(){return this.projects;}
  async getOwned(id:string,customerId:string){return this.projects.find((item)=>item.id===id&&item.customerId===customerId)??null;}
  async getFile(id:string){return this.files.get(id)??null;}
  async createFile(input:Omit<ProjectFileRecord,"uploadedAt"|"firstDownloadedAt"|"latestDownloadedAt"|"downloadCount">,key:string){const prior=this.uploads.get(key);if(prior)return{file:this.files.get(prior)!,created:false};const file={...input,downloadCount:0,uploadedAt:"now"};this.files.set(file.id,file);this.uploads.set(key,file.id);return{file,created:true};}
  async recordDownload(id:string,customerId:string){const file=this.files.get(id);if(!file||file.customerId!==customerId)throw new Error("denied");file.downloadCount+=1;this.downloads.push(`${customerId}:${id}`);}
}
class MemoryStorage implements ProjectFileStorage { saves:string[]=[]; signed:string[]=[]; async save(input:{projectId:string;fileId:string;bytes:Buffer;mimeType:string}){const path=`projects/${input.projectId}/deliverables/${input.fileId}`;if(!this.saves.includes(path))this.saves.push(path);return{storagePath:path};}async signedDownload(path:string){this.signed.push(path);return{url:"https://signed.example.test/file?expires=soon",expiresAt:new Date(Date.now()+300_000).toISOString()};}}
const service=()=>{const repository=new MemoryFiles();const storage=new MemoryStorage();return{repository,storage,service:new ProjectService(repository as unknown as ProjectRepository,{sendAccess:async()=>{}} as never,"https://example.test",storage)};};
const upload={name:"final/report.pdf",description:"Final delivery",category:"deliverable",deliveryStatus:"final",customerVisible:true,mimeType:"application/pdf",contentBase64:Buffer.from("%PDF-safe fixture").toString("base64"),idempotencyKey:"upload-key-001"};

test("admin upload is project-derived, immutable, idempotent, and returns no storage path",async()=>{const ctx=service();const first=await ctx.service.uploadFile("project-a","admin-1",upload);const second=await ctx.service.uploadFile("project-a","admin-1",upload);assert.equal(first.created,true);assert.equal(second.created,false);assert.equal(ctx.repository.files.size,1);assert.equal(ctx.storage.saves.length,1);assert.equal(first.file.name,"final_report.pdf");assert.equal(first.file.version,1);assert.equal(first.file.customerVisible,true);assert.equal("storagePath" in first.file,false);assert.equal("customerId" in first.file,false);});

test("authorized unlocked owner receives short-lived access and download tracking",async()=>{const ctx=service();const made=await ctx.service.uploadFile("project-a","admin-1",upload);const access=await ctx.service.download("project-a",made.file.id,"customer-a");assert.match(access.url,/signed\.example\.test/);assert.ok(Date.parse(access.expiresAt)-Date.now()<=300_000);assert.equal(ctx.repository.downloads.length,1);assert.match(ctx.storage.signed[0],/^projects\/project-a\/deliverables\//);});

test("cross-customer, locked, hidden, and unknown file downloads fail closed",async()=>{const ctx=service();const made=await ctx.service.uploadFile("project-a","admin-1",upload);await assert.rejects(()=>ctx.service.download("project-a",made.file.id,"customer-b"),/Unlock this project/);await assert.rejects(()=>ctx.service.download("locked",made.file.id,"customer-a"),/Unlock this project/);await assert.rejects(()=>ctx.service.download("project-a","unknown","customer-a"),/not found/);const hidden=await ctx.service.uploadFile("project-a","admin-1",{...upload,customerVisible:false,idempotencyKey:"upload-key-002"});await assert.rejects(()=>ctx.service.download("project-a",hidden.file.id,"customer-a"),/not found/);assert.equal(ctx.repository.downloads.length,0);});

test("upload validation rejects unsafe metadata, MIME types, empty files, and oversized files",async()=>{const ctx=service();await assert.rejects(()=>ctx.service.uploadFile("project-a","admin-1",{...upload,mimeType:"text/html"}),/Valid project file metadata/);await assert.rejects(()=>ctx.service.uploadFile("project-a","admin-1",{...upload,contentBase64:""}),/between 1 byte and 10 MB/);await assert.rejects(()=>ctx.service.uploadFile("missing","admin-1",upload),/not found/);});

test("customer listing excludes hidden files and internal storage metadata",()=>{const items=customerVisibleFiles([{id:"visible",customerVisible:true,storagePath:"projects/a/private",customerId:"a",uploadedBy:"admin",name:"Visible"},{id:"hidden",customerVisible:false,storagePath:"projects/a/hidden",name:"Hidden"}]);assert.deepEqual(items,[{id:"visible",customerVisible:true,name:"Visible"}]);});

test("private Supabase adapter uploads immutable objects and returns a short-lived signed URL",async()=>{
  const calls:Array<{url:string;init:RequestInit}>=[];
  const storage=new SupabaseProjectFileStorage({url:"https://project.supabase.co",bucket:"customer-project-files",serviceRoleKey:"server-secret",fetcher:async(url,init)=>{
    calls.push({url:String(url),init:init??{}});
    return calls.length===1?new Response(JSON.stringify({Key:"stored"}),{status:200}):new Response(JSON.stringify({signedURL:"/object/sign/customer-project-files/projects/a/deliverables/f?token=safe"}),{status:200});
  }});
  assert.deepEqual(await storage.save({projectId:"a",fileId:"f",bytes:Buffer.from("safe"),mimeType:"text/plain"}),{storagePath:"projects/a/deliverables/f"});
  const access=await storage.signedDownload("projects/a/deliverables/f","report.txt");
  assert.match(access.url,/^https:\/\/project\.supabase\.co\/storage\/v1\/object\/sign\//);
  assert.ok(Date.parse(access.expiresAt)-Date.now()<=300_000);
  assert.equal(calls[0].init.headers && (calls[0].init.headers as Record<string,string>)["x-upsert"],"false");
  assert.equal(JSON.stringify(calls).includes("server-secret"),true);
  assert.equal(JSON.stringify(access).includes("server-secret"),false);
});

test("Supabase adapter accepts only the immutable duplicate condition and configuration fails closed",async()=>{
  const duplicate=new SupabaseProjectFileStorage({url:"https://project.supabase.co",bucket:"private",serviceRoleKey:"secret",fetcher:async()=>new Response(JSON.stringify({code:"Duplicate"}),{status:400})});
  await duplicate.save({projectId:"a",fileId:"f",bytes:Buffer.from("same"),mimeType:"text/plain"});
  const rejected=new SupabaseProjectFileStorage({url:"https://project.supabase.co",bucket:"private",serviceRoleKey:"secret",fetcher:async()=>new Response("{}",{status:403})});
  await assert.rejects(()=>rejected.save({projectId:"a",fileId:"f",bytes:Buffer.from("safe"),mimeType:"text/plain"}),/upload failed \(403\)/);
  assert.throws(()=>configuredProjectFileStorage({PROJECT_FILE_STORAGE_PROVIDER:"supabase"}),/incomplete/);
});
