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
              <span>Spatial Analytics & Aggregation Engine</span>
            </h1>
            <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-mono text-cyan-300 border border-cyan-800">
              MongoDB Aggregation
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Data aggregated server-side via MongoDB multi-stage pipelines: $group, $facet, $project, and Haversine distance.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-80 items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <span className="text-xs text-slate-400">Computing aggregation pipelines...</span>
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
                  <h2 className="text-sm font-bold text-white">Distance Travelled by Trace</h2>
                </div>
                <span className="text-xs font-mono text-slate-400">Unit: Kilometres (km)</span>
              </div>
              <DistanceChart data={chartTraces} />
            </div>

            {/* Chart 2: Speed Profile by Trace */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Speed Comparison by Trace</h2>
                </div>
                <span className="text-xs font-mono text-slate-400">Avg vs Max (km/h)</span>
              </div>
              <SpeedChart data={chartTraces} />
            </div>

            {/* Chart 3: Daily Activity Trends */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white">Daily Movement Activity</h2>
                </div>
                <span className="text-xs font-mono text-slate-400">Distance over Time (km)</span>
              </div>
              <DailyActivityChart data={dailyData} />
            </div>

            {/* Chart 4: Activity by Device */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white">Activity Distribution by Device</h2>
                </div>
                <span className="text-xs font-mono text-slate-400">Traces & Distance</span>
              </div>
              <DeviceDistributionChart data={deviceData} />
            </div>
          </div>

          {/* User Movement Analytics Summary Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden space-y-0">
            <div className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  User-Wise Movement Aggregation Summary
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                MongoDB $match + $group by userId
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">User ID</th>
                    <th className="px-4 py-3">Total Traces</th>
                    <th className="px-4 py-3">Total Points</th>
                    <th className="px-4 py-3">Total Distance</th>
                    <th className="px-4 py-3">Avg Speed</th>
                    <th className="px-4 py-3">Peak Speed</th>
                    <th className="px-4 py-3">Associated Devices</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {userSummaries.map((u) => (
                    <tr key={u.userId} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-cyan-300">
                        {u.userId}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        {u.tracesCount}
                      </td>
                      <td className="px-4 py-3 text-amber-300">{u.totalPoints}</td>
                      <td className="px-4 py-3 font-bold text-slate-100">
                        {u.totalDistanceKm} km
                      </td>
                      <td className="px-4 py-3 text-emerald-300">
                        {u.avgSpeedKmh} km/h
                      </td>
                      <td className="px-4 py-3 text-rose-300">
                        {u.maxSpeedMps ? (u.maxSpeedMps * 3.6).toFixed(1) : 0} km/h
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {u.devices.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
