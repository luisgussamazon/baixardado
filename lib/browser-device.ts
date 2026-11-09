import {db} from "./db";
import {bearer} from "./model-device";
export async function browserDevice(req:Request){const hash=bearer(req);if(!hash)return null;return (await db.query<{id:string;user_id:string}>("SELECT id,user_id FROM browser_devices WHERE token_hash=$1 AND expires_at>NOW()",[hash])).rows[0]??null;}
export async function browserContext(userId:string,id:string){
 const result=await db.query<{observation:{url:string;title:string;text:string}}>("SELECT observation FROM browser_devices WHERE id=$1 AND user_id=$2 AND expires_at>NOW() AND observed_at>NOW()-INTERVAL '30 minutes'",[id,userId]);
 const observation=result.rows[0]?.observation;return observation?{url:observation.url,title:observation.title,text:observation.text.slice(0,3000)}:null;
}
