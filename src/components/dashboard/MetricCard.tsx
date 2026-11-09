import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme?: "cyan" | "emerald" | "amber" | "indigo" | "rose" | "teal";
}

const colorStyles = {
  cyan: {
    bg: "from-cyan-500/10 to-transparent",
    border: "border-cyan-500/30",
    iconBg: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30",
    valueText: "text-cyan-300",
  },
  emerald: {
    bg: "from-emerald-500/10 to-transparent",
    border: "border-emerald-500/30",
    iconBg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    valueText: "text-emerald-300",
  },
  amber: {
    bg: "from-amber-500/10 to-transparent",
    border: "border-amber-500/30",
    iconBg: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    valueText: "text-amber-300",
  },
  indigo: {
    bg: "from-indigo-500/10 to-transparent",
    border: "border-indigo-500/30",
    iconBg: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30",
    valueText: "text-indigo-300",
  },
  rose: {
    bg: "from-rose-500/10 to-transparent",
    border: "border-rose-500/30",
    iconBg: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
    valueText: "text-rose-300",
  },
  teal: {
    bg: "from-teal-500/10 to-transparent",
    border: "border-teal-500/30",
    iconBg: "bg-teal-500/10 text-teal-400 border border-teal-500/30",
    valueText: "text-teal-300",
  },
};

export default function MetricCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  colorScheme = "cyan",
}: MetricCardProps) {
  const styles = colorStyles[colorScheme];

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-b ${styles.bg} bg-slate-900/80 p-5 border ${styles.border} shadow-lg backdrop-blur-sm transition-all hover:scale-[1.01]`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${styles.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline space-x-1.5">
        <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${styles.valueText}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </div>

      {subtitle && (
        <p className="mt-2 text-xs text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
          <span>{subtitle}</span>
        </p>
      )}
    </div>
  );
}
