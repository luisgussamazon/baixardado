import { getUser } from "@/lib/security";
import { redirect } from "next/navigation";
import DotWorkspace from "@/components/dot-workspace";
export const dynamic = "force-dynamic";
export default async function ChatPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  return <DotWorkspace email={user.email}/>;
}
