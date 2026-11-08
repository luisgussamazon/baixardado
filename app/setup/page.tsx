import { getUser } from "@/lib/security";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";
export const dynamic = "force-dynamic";
export default async function SetupPage() {
  if (await getUser()) redirect("/chat");
  const result = await db.query("SELECT 1 FROM users LIMIT 1");
  if (result.rowCount) redirect("/login");
  return <AuthForm mode="setup"/>;
}
