import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Murder Party - Frontend",
  description: "Client web pour la Murder Party (joueurs & MJ)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="container py-6">
          <header className="mb-8 flex items-center justify-between">
            <h1 className="text-xl font-semibold">🔎 Murder Party</h1>
            <nav className="flex gap-3 text-sm">
              <a className="btn" href="/join">Rejoindre</a>
              <a className="btn" href="/mj/dashboard">Espace MJ</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
