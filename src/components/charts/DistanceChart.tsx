"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DistanceChartProps {
  data: {
    id: string;
    label: string;
    distanceKm: number;
    pointsCount: number;
  }[];
}

export default function DistanceChart({ data }: DistanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 text-slate-500">
        No trace distance data available
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
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            unit=" km"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderColor: "#334155",
              borderRadius: "8px",
              color: "#f8fafc",
              fontSize: "12px",
            }}
            formatter={(value: any) => [`${value} km`, "Distance"]}
          />
          <Bar
            dataKey="distanceKm"
            fill="#06b6d4"
            radius={[4, 4, 0, 0]}
            name="Distance (km)"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
