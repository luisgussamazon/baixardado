import { db } from "../db";
import { initialState, type DialogueState, type MemoryRecord } from "./types";
export async function loadCognitiveContext(userId:string,conversationId:string){
  const [records,saved]=await Promise.all([
    db.query<MemoryRecord>("SELECT id,kind,label,value,question,status FROM cognitive_records WHERE user_id=$1 AND status='approved' ORDER BY approved_at DESC LIMIT 200",[userId]),
    db.query<{state:DialogueState}>(`SELECT s.state FROM cognitive_dialogue_states s JOIN conversations c ON c.id=s.conversation_id AND c.user_id=s.user_id WHERE s.conversation_id=$1 AND s.user_id=$2`,[conversationId,userId])
  ]);
  return {records:records.rows,state:saved.rows[0]?.state??initialState()};
}
async function writeState(query:(sql:string,params:unknown[])=>Promise<unknown>,userId:string,conversationId:string,state:DialogueState){
  await query(`INSERT INTO cognitive_dialogue_states(conversation_id,user_id,state)
    SELECT id,user_id,$3::jsonb FROM conversations WHERE id=$1 AND user_id=$2
    ON CONFLICT(conversation_id) DO UPDATE SET state=EXCLUDED.state,updated_at=NOW()
    WHERE cognitive_dialogue_states.user_id=EXCLUDED.user_id`,[conversationId,userId,JSON.stringify(state)]);
}
export async function saveDialogueState(userId:string,conversationId:string,state:DialogueState){
  await writeState((sql,params)=>db.query(sql,params),userId,conversationId,state);
}
export async function persistDialogueReply(userId:string,conversationId:string,state:DialogueState,content:string){
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    await writeState((sql,params)=>client.query(sql,params),userId,conversationId,state);
    // Se o proprietário divergir, a subconsulta resulta em NULL e o NOT NULL aborta a transação.
    await client.query("INSERT INTO messages(conversation_id,role,content) VALUES((SELECT id FROM conversations WHERE id=$1 AND user_id=$3),'assistant',$2)",[conversationId,content,userId]);
    await client.query("UPDATE conversations SET updated_at=NOW() WHERE id=$1 AND user_id=$2",[conversationId,userId]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK").catch(()=>{});throw error;}finally{client.release();}
}
