import { redirect } from "next/navigation";
import { getUser } from "@/lib/security";
import KnowledgeApp from "@/components/knowledge-app";
export const dynamic="force-dynamic";
export default async function TeachPage(){
  const user=await getUser();
  if(!user)redirect("/login");
  return <KnowledgeApp email={user.email}/>;
}
