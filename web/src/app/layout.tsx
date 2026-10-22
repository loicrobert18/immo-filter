import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MainNav } from "@/components/main-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ImmoFilter",
  description: "Annonces immobilières dédupliquées",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <header className="border-b border-border bg-surface-1">
          <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-3">
            <span className="text-lg font-semibold">ImmoFilter</span>
            <MainNav />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
