"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface SpeedChartProps {
  data: {
    id: string;
    label: string;
    avgSpeedKmh: number;
    maxSpeedKmh: number;
  }[];
}

export default function SpeedChart({ data }: SpeedChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 text-slate-500">
        No speed data available
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            angle={-25}
            textAnchor="end"
            interval={0}
          />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" km/h" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderColor: "#334155",
              borderRadius: "8px",
              color: "#f8fafc",
              fontSize: "12px",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
          />
          <Bar
            dataKey="avgSpeedKmh"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            name="Avg Speed (km/h)"
          />
          <Bar
            dataKey="maxSpeedKmh"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
            name="Max Speed (km/h)"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
