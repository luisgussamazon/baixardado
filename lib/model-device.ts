import { createHash } from "node:crypto";
import { db } from "./db";
export const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
export function bearer(req:Request){const token=req.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];return token?tokenHash(token):null;}
export async function getDevice(req:Request){
  const hash=bearer(req);if(!hash)return null;
  const result=await db.query<{id:string;user_id:string;model:string}>("SELECT id,user_id,model FROM local_model_devices WHERE token_hash=$1 AND expires_at>NOW()",[hash]);return result.rows[0]??null;
}
