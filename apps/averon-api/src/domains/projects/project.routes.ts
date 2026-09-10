import { ApiError } from "../../errors/api-error.ts";
import type { AuthContext } from "../../services/auth/authentication.ts";
import { requireAdmin } from "../../services/auth/authorization.ts";
import type { RateLimiter } from "../../ai/emmy/rate-limiter.ts";
import type { ProjectService } from "./project.service.ts";
import type { ProjectRepository } from "./project.repository.ts";

export async function handleProjectRoute(i:{method:string;path:string;body:unknown;auth:AuthContext;service:ProjectService;repository:ProjectRepository;limiter:RateLimiter}) {
  if(i.method==="GET"&&i.path==="/api/v1/projects")return{status:200,data:{items:await i.service.list(i.auth.user.userId)}};
  if(i.method==="GET"&&i.path==="/api/v1/admin/projects"){requireAdmin(i.auth);return{status:200,data:{items:await i.service.adminProjects()}};}
  const download=/^\/api\/v1\/projects\/([^/]+)\/files\/([^/]+)\/download$/.exec(i.path);
  if(download&&i.method==="POST")return{status:200,data:await i.service.download(decodeURIComponent(download[1]),decodeURIComponent(download[2]),i.auth.user.userId)};
  const upload=/^\/api\/v1\/admin\/projects\/([^/]+)\/files$/.exec(i.path);
  if(upload&&i.method==="POST"){requireAdmin(i.auth);return{status:201,data:await i.service.uploadFile(decodeURIComponent(upload[1]),i.auth.user.userId,(i.body??{}) as Record<string,unknown>)};}
  const m=/^\/api\/v1\/projects\/([^/]+)(?:\/(workspace|access\/verify|messages|change-requests|satisfaction|admin|milestones|access\/regenerate))?$/.exec(i.path);if(!m)return null;
  const id=decodeURIComponent(m[1]),action=m[2],body=(i.body??{}) as Record<string,unknown>;
  if(i.method==="POST"&&action==="access/verify"){await i.limiter.check(`${i.auth.user.userId}:${id}`);const password=String(body.accessPassword??"");if(Object.keys(body).some(k=>k!=="accessPassword")||password.length<8||password.length>64)throw new ApiError(400,"VALIDATION_ERROR","A valid accessPassword is required.");return{status:200,data:await i.service.verify(id,i.auth.user.userId,password)};}
  if(i.method==="GET"&&action==="workspace")return{status:200,data:await i.service.workspace(id,i.auth.user.userId)};
  if(i.method==="POST"&&action==="messages")return{status:201,data:await i.service.message(id,i.auth.user.userId,String(body.body??""))};
  if(i.method==="POST"&&action==="change-requests")return{status:201,data:await i.service.change(id,i.auth.user.userId,body)};
  if(i.method==="POST"&&action==="satisfaction")return{status:201,data:await i.service.satisfaction(id,i.auth.user.userId,body)};
  requireAdmin(i.auth);
  if(i.method==="POST"&&action==="access/regenerate")return{status:200,data:await i.service.regenerate(id)};
  if(i.method==="PATCH"&&action==="admin"){const allowed=["title","summary","status","progressPercent","startDate","targetDate","accessEnabled"];if(Object.keys(body).some(k=>!allowed.includes(k)))throw new ApiError(400,"UNKNOWN_FIELDS","Unsupported project field.");await i.repository.updateAdmin(id,body);return{status:200,data:{projectId:id}};}
  if(i.method==="POST"&&action==="milestones"){const milestone={title:String(body.title??""),description:String(body.description??""),status:String(body.status??"pending"),order:Number(body.order??0),targetDate:body.targetDate?String(body.targetDate):undefined};if(!milestone.title||!milestone.description||!["pending","in_progress","completed","blocked"].includes(milestone.status)||!Number.isInteger(milestone.order))throw new ApiError(400,"VALIDATION_ERROR","Valid milestone fields are required.");return{status:201,data:{milestoneId:await i.repository.addMilestone(id,milestone as never)}};}
  return null;
}
