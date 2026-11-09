import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Meridian | Geospatial Intelligence & Fleet Telemetry",
  description:
    "Unified spatial discovery, point-of-interest intelligence, and real-time GPS trajectory analytics platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-black">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-slate-900/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-400">
                Meridian Geospatial Platform
              </span>{" "}
              — High-Performance Spatial Intelligence & Fleet Telemetry
            </div>
            <div className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} Meridian Geospatial. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
