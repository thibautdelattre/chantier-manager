import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Chantier",
  description: "Gestion de chantier — dépendances, ressources, planning",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans min-h-screen pb-16 md:pb-0">
        <Nav />
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
