import {redirect} from "next/navigation";
import {getUser} from "@/lib/security";
import CommandCenter from "@/components/command-center";
export const dynamic="force-dynamic";
export default async function Page({params,searchParams}:{params:Promise<{section?:string[]}>;searchParams:Promise<{pair?:string|string[]}>}){const user=await getUser();if(!user){const {pair}=await searchParams;redirect(typeof pair==="string"&&/^[A-F0-9]{12}$/.test(pair)?"/login?pair="+pair:"/login");}const {section}=await params;return <CommandCenter email={user.email} section={section?.[0]??"dashboard"}/>;}
