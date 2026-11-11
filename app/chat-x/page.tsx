import {redirect} from "next/navigation";
import {getUser} from "@/lib/security";
import ChatX from "@/components/chat-x";

export const dynamic="force-dynamic";

export default async function Page(){
  if(!await getUser())redirect("/login");
  return <ChatX/>;
}
