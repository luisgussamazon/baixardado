import { getUser } from "@/lib/security";
import { redirect } from "next/navigation";
import ChatApp from "@/components/chat-app";
export const dynamic = "force-dynamic";
export default async function ChatPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  return <ChatApp email={user.email} appName={process.env.NEXT_PUBLIC_APP_NAME || "A3X AI"}/>;
}
