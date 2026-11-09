"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  ListFilter,
  BarChart3,
  Globe2,
  ArrowRight,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/", icon: Compass },
    { name: "Spatial Explorer", href: "/spatial", icon: Globe2 },
    { name: "Fleet Trajectories", href: "/traces", icon: ListFilter },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Globe2 className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  Meridian
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300">
                  Platform
                </span>
              </div>
              <p className="text-[10px] tracking-wide text-slate-400 font-medium hidden sm:block">
                Geospatial Intelligence & Fleet Telemetry
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? "bg-slate-800/90 text-cyan-300 border border-slate-700/80 shadow-sm shadow-cyan-500/10"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action / Status Area */}
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-slate-400">Live Telemetry</span>
            </div>

            <Link
              href="/login"
              className="text-xs font-semibold text-slate-300 hover:text-cyan-300 px-3 py-1.5 rounded-lg hover:bg-slate-900/60 transition"
            >
              Sign in
            </Link>

            <Link
              href="/spatial"
              className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-semibold bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white px-3.5 py-1.5 rounded-lg shadow-sm shadow-cyan-900/50 transition-all"
            >
              <span>Explore Places</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
