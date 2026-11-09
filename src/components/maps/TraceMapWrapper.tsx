"use client";

import dynamic from "next/dynamic";
import React from "react";
import { GPSPoint } from "@/types/gps";

const DynamicTraceMap = dynamic(() => import("./TraceMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400">
      <div className="flex flex-col items-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <span className="text-sm font-medium">Loading Interactive GPS Map...</span>
      </div>
    </div>
  ),
});

interface TraceMapWrapperProps {
  points: GPSPoint[];
  traceTitle?: string;
  userId?: string;
  deviceId?: string;
  height?: string;
}

export default function TraceMapWrapper(props: TraceMapWrapperProps) {
  return <DynamicTraceMap {...props} />;
}
