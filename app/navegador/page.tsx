import {redirect} from "next/navigation";
import {getUser} from "@/lib/security";
import BrowserAssistant from "@/components/browser-assistant";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{code?:string}>}){if(!await getUser())redirect("/login");const {code}=await searchParams;return <BrowserAssistant initialCode={typeof code==="string"&&/^[A-F0-9]{12}$/.test(code)?code:""}/>;}
