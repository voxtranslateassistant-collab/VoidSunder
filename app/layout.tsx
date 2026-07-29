import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "VoidSunder — Security Validation Orchestrator",
    template: "%s · VoidSunder",
  },
  description:
    "Plataforma de Red Team Validation com IA. Simula ataques controlados para validar a segurança de aplicações, APIs e sistemas com LLMs.",
};

export const viewport: Viewport = {
  themeColor: "#101010",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-obsidian text-bone-white antialiased">
        {children}
      </body>
    </html>
  );
}
