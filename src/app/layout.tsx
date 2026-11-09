import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Geospatial Intelligence Platform | GPS Movement Analytics",
  description:
    "DBMS Level 3 Mini-Project: MongoDB GPS trace storage, spatial indexing, aggregation pipelines, and interactive route visualization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-400">
                DBMS Level 3 Mini-Project
              </span>{" "}
              — Geospatial Intelligence Platform (Person 2: MongoDB GPS Module)
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              MongoDB Community Server • Next.js App Router • TypeScript
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
