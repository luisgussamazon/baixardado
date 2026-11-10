import {redirect} from "next/navigation";
import {getUser} from "@/lib/security";
import AutonomyStatus from "@/components/autonomy-status";
export const dynamic="force-dynamic";
export default async function Page(){if(!await getUser())redirect("/login");return <AutonomyStatus/>;}
