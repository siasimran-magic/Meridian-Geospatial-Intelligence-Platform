"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { DailyActivityItem } from "@/types/gps";

interface DailyActivityChartProps {
  data: DailyActivityItem[];
}

export default function DailyActivityChart({ data }: DailyActivityChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 text-slate-500">
        No daily activity data available
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <defs>
            <linearGradient id="distanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
          />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" km" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderColor: "#334155",
              borderRadius: "8px",
              color: "#f8fafc",
              fontSize: "12px",
            }}
            formatter={(value: any, name: any) => [
              name === "totalDistanceKm" ? `${value} km` : value,
              name === "totalDistanceKm" ? "Distance Travelled" : name,
            ]}
          />
          <Area
            type="monotone"
            dataKey="totalDistanceKm"
            stroke="#06b6d4"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#distanceGradient)"
            name="totalDistanceKm"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
