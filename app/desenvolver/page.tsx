import {redirect} from "next/navigation";
import {getUser} from "@/lib/security";
import SourceStudio from "@/components/source-studio";
export const dynamic="force-dynamic";
export default async function Page(){if(!await getUser())redirect("/login");return <SourceStudio/>;}
