"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  MapPin,
  ListFilter,
  BarChart3,
  Database,
  Layers,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/", icon: Compass },
    { name: "Spatial Explorer", href: "/spatial", icon: Layers },
    { name: "Route Explorer", href: "/#explorer", icon: MapPin },
    { name: "Trace Management", href: "/traces", icon: ListFilter },
    { name: "Analytics & Trends", href: "/analytics", icon: BarChart3 },
    { name: "DBMS Concepts", href: "/dbms-concepts", icon: Database },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-emerald-500 rounded-lg shadow-lg shadow-cyan-500/20 text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <Link href="/" className="flex items-center space-x-2">
                <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  GeoIntel Platform
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono">
                  PostGIS + MongoDB
                </span>
              </Link>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                DBMS Level 3 Mini-Project • Spatial Analytics Platform
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href) && !item.href.includes("#");

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? "bg-slate-800 text-cyan-400 shadow-sm border border-slate-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Database Status indicator */}
          <div className="flex items-center space-x-3">
            <Link href="/login" className="hidden sm:inline text-xs text-slate-300 hover:text-cyan-300">
              Sign in
            </Link>
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline">MongoDB:</span>
              <span className="font-semibold">geospatial_platform</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
