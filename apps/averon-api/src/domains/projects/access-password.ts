import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt=promisify(nodeScrypt); const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
export function generateProjectAccessPassword(length=12){const bytes=randomBytes(length);return [...bytes].map((value)=>alphabet[value%alphabet.length]).join("");}
export async function hashProjectAccessPassword(password:string){const salt=randomBytes(16);const derived=await scrypt(password,salt,32) as Buffer;return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;}
export async function verifyProjectAccessPassword(password:string,encoded:string){const [kind,saltText,hashText]=encoded.split("$");if(kind!=="scrypt"||!saltText||!hashText)return false;const expected=Buffer.from(hashText,"base64url");const actual=await scrypt(password,Buffer.from(saltText,"base64url"),expected.length) as Buffer;return actual.length===expected.length&&timingSafeEqual(actual,expected);}
