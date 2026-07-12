import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeyraPro — AI Sports Predictions",
  description: "Predicții sportive asistate de AI: analiză de date, cote, acumulatoare sigure și performanță.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col">{children}</div>
        </div>
      </body>
    </html>
  );
}
