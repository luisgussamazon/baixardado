import { redirect } from "next/navigation";
import { getUser } from "@/lib/security";
import CognitiveMemory from "@/components/cognitive-memory";
export const dynamic="force-dynamic";
export default async function MemoryPage(){
  if(!await getUser())redirect("/login");
  return <CognitiveMemory/>;
}
