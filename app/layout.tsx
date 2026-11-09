import type { Metadata } from "next";
import "./globals.css";
import "./a3x-theme.css";
export const metadata: Metadata = {
  title: "A3X AI | Seu espaço para pensar",
  description: "Conversa local por regras e contexto, pesquisa com fontes e histórico privado.",
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
