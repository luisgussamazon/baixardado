import type { Metadata } from "next";
import "./globals.css";
import "./a3x-theme.css";
import "./workspace-theme.css";
import {getUser} from "@/lib/security";
import LivingAgentsProvider from "@/components/living-agents-provider";
export const metadata: Metadata = {
  title: "A3X AI | Seu espaço para pensar",
  description: "Conversa local por regras e contexto, pesquisa com fontes e histórico privado.",
};
export default async function RootLayout({children}:{children:React.ReactNode}) {
  const user=await getUser();
  return <html lang="pt-BR"><body>{user?<LivingAgentsProvider key={user.id}>{children}</LivingAgentsProvider>:children}</body></html>;
}
