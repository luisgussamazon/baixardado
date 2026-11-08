import { redirect } from "next/navigation";
import { getUser } from "@/lib/security";
import ProgrammerApp from "@/components/programmer-app";
export const dynamic = "force-dynamic";

export default async function ProgrammerPage() {
  const user=await getUser();
  if (!user) redirect("/login");
  return <ProgrammerApp email={user.email} appName={process.env.NEXT_PUBLIC_APP_NAME || "A3X AI"}/>;
}
