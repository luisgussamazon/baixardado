import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "A3X AI | Seu espaço para pensar",
  description: "Assistente pessoal com inteligência artificial, histórico e privacidade.",
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
