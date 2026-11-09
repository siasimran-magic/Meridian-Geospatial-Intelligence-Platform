"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Layers,
  Users,
  Compass,
  RefreshCw,
} from "lucide-react";
import DistanceChart from "@/components/charts/DistanceChart";
import SpeedChart from "@/components/charts/SpeedChart";
import DailyActivityChart from "@/components/charts/DailyActivityChart";
import DeviceDistributionChart from "@/components/charts/DeviceDistributionChart";
import { DailyActivityItem, DeviceActivityItem } from "@/types/gps";

export default function AnalyticsDashboardPage() {
  const [chartTraces, setChartTraces] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<DailyActivityItem[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceActivityItem[]>([]);
  const [userSummaries, setUserSummaries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [chartsRes, dailyRes, devicesRes, tracesRes] = await Promise.all([
        fetch("/api/analytics/charts?limit=10"),
        fetch("/api/analytics/daily"),
        fetch("/api/analytics/devices"),
        fetch("/api/traces?limit=50"),
      ]);

      const [chartsJson, dailyJson, devicesJson, tracesJson] = await Promise.all([
        chartsRes.json(),
        dailyRes.json(),
        devicesRes.json(),
        tracesRes.json(),
      ]);

      if (chartsJson.success) setChartTraces(chartsJson.data || []);
      if (dailyJson.success) setDailyData(dailyJson.data || []);
      if (devicesJson.success) setDeviceData(devicesJson.data || []);

      // Derive distinct users and fetch user aggregations
      if (tracesJson.success && Array.isArray(tracesJson.data)) {
        const uniqueUsers = Array.from(new Set(tracesJson.data.map((t: any) => t.userId))) as string[];
        const userPromises = uniqueUsers.map((u) =>
          fetch(`/api/analytics/users/${u}`).then((r) => r.json())
        );
        const userResults = await Promise.all(userPromises);
        const validUsers = userResults
          .filter((res) => res.success && res.data)
          .map((res) => res.data);
        setUserSummaries(validUsers);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-white flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
              <span>Fleet Movement Analytics & Trends</span>
            </h1>
            <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-800">
              Telemetry Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time velocity profiles, spherical distance benchmarks, and fleet distribution across urban networks.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 self-start sm:self-auto transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-80 items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <span className="text-xs text-slate-400">Loading telemetry insights...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Charts Grid: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Distance by Trace */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white">Distance Travelled by Route</h2>
                </div>
                <span className="text-xs font-mono text-slate-400">Unit: Kilometres (km)</span>
              </div>
              <DistanceChart data={chartTraces} />
            </div>

            {/* Chart 2: Speed Comparison */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Average vs Peak Velocity Profile</h2>
                </div>
                <span className="text-xs font-mono text-slate-400">Unit: km/h</span>
              </div>
              <SpeedChart data={chartTraces} />
            </div>

            {/* Chart 3: Daily Activity Trend */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  <h2 className="text-sm font-bold text-white">Daily Trajectory Volume</h2>
                </div>
                <span className="text-xs font-mono text-slate-400">Chronological activity</span>
              </div>
              <DailyActivityChart data={dailyData} />
            </div>

            {/* Chart 4: Device Distribution */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-white">Device Fleet Distribution</h2>
                </div>
                <span className="text-xs font-mono text-slate-400">Unit: Total points recorded</span>
              </div>
              <DeviceDistributionChart data={deviceData} />
            </div>
          </div>

          {/* User Multi-Trace Summary Cards */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Users className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Fleet Operator Performance</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {userSummaries.map((u) => (
                <div
                  key={u.userId}
                  className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-cyan-300">{u.userId}</span>
                    <span className="text-xs rounded-full bg-slate-800 px-2 py-0.5 text-slate-400 border border-slate-700">
                      {u.traceCount} {u.traceCount === 1 ? "route" : "routes"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cumulative Distance:</span>
                      <span className="font-semibold text-white">{u.totalDistanceKm} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Recorded Duration:</span>
                      <span className="font-semibold text-amber-300">{u.totalDurationHours} hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fleet Average Speed:</span>
                      <span className="font-semibold text-emerald-300">{u.avgSpeedKmh} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Indexed Points:</span>
                      <span className="font-semibold text-slate-200">{u.totalPoints}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
