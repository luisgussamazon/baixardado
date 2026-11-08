import { redirect } from "next/navigation";
import { getUser } from "@/lib/security";
import ModelConnection from "@/components/model-connection";
export const dynamic="force-dynamic";
export default async function Connect({searchParams}:{searchParams:Promise<{code?:string}>}){
  if(!await getUser())redirect("/login");const {code}=await searchParams;
  return <ModelConnection initialCode={typeof code==="string"&&/^[A-F0-9]{12}$/.test(code)?code:""}/>;
}
