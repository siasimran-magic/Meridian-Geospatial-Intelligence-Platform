"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  MapPin,
  Route,
  Navigation,
  Gauge,
  Users,
  Activity,
  Plus,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Layers,
} from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import TraceMapWrapper from "@/components/maps/TraceMapWrapper";
import TraceTable from "@/components/traces/TraceTable";
import TraceUploadModal from "@/components/traces/TraceUploadModal";
import {
  OverviewAnalytics,
  TraceSummaryItem,
  GPSTrace,
  TraceAnalyticsResult,
} from "@/types/gps";

export default function OverviewDashboardPage() {
  const [overview, setOverview] = useState<OverviewAnalytics | null>(null);
  const [traces, setTraces] = useState<TraceSummaryItem[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedTraceFull, setSelectedTraceFull] = useState<GPSTrace | null>(null);
  const [selectedTraceAnalytics, setSelectedTraceAnalytics] = useState<TraceAnalyticsResult | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Fetch overview metrics from backend
  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/analytics/overview");
      const json = await res.json();
      if (json.success && json.data) {
        setOverview(json.data);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch overview analytics:", err);
    }
  };

  // Fetch paginated traces
  const fetchTraces = async (page = 1, filters: { userId?: string; deviceId?: string } = {}) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "6",
      });
      if (filters.userId) queryParams.set("userId", filters.userId);
      if (filters.deviceId) queryParams.set("deviceId", filters.deviceId);

      const res = await fetch(`/api/traces?${queryParams.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setTraces(json.data);
        if (json.pagination) {
          setPagination(json.pagination);
        }
        if (!selectedTraceId && json.data.length > 0) {
          handleSelectTraceForMap(json.data[0].id);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to fetch traces:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load a full trace & its analytics for the map
  const handleSelectTraceForMap = async (traceId: string) => {
    setSelectedTraceId(traceId);
    setIsMapLoading(true);
    try {
      const [traceRes, analyticsRes] = await Promise.all([
        fetch(`/api/traces/${traceId}`),
        fetch(`/api/analytics/traces/${traceId}`),
      ]);

      const traceJson = await traceRes.json();
      const analyticsJson = await analyticsRes.json();

      if (traceJson.success && traceJson.data) {
        setSelectedTraceFull(traceJson.data);
      }
      if (analyticsJson.success && analyticsJson.data) {
        setSelectedTraceAnalytics(analyticsJson.data);
      }
    } catch (err: unknown) {
      console.error("Error loading route details:", err);
    } finally {
      setIsMapLoading(false);
    }
  };

  const handleDeleteTrace = async (traceId: string) => {
    if (!confirm("Are you sure you want to delete this GPS route?")) return;
    try {
      const res = await fetch(`/api/traces/${traceId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        if (selectedTraceId === traceId) {
          setSelectedTraceId(null);
          setSelectedTraceFull(null);
          setSelectedTraceAnalytics(null);
        }
        fetchOverview();
        fetchTraces(pagination.page);
      } else {
        alert(json.message || "Failed to delete route");
      }
    } catch {
      alert("Error deleting route");
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchTraces(1);
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/60 p-6 sm:p-8 border border-slate-800 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full bg-cyan-950/80 px-3 py-1 border border-cyan-800 text-xs font-medium text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Real-Time Geospatial Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Fleet Tracking & Movement Telemetry
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              High-precision trajectory ingestion, spherical distance computation, and live spatial boundary indexing across metropolitan corridors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                fetchOverview();
                fetchTraces(pagination.page);
              }}
              className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="Refresh telemetry feed"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-950 hover:from-cyan-500 hover:to-emerald-500 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Ingest Route</span>
            </button>
            <Link
              href="/spatial"
              className="flex items-center space-x-1.5 rounded-lg border border-cyan-800/60 bg-cyan-950/40 px-3.5 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40 transition"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Spatial Explorer</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 6 Real-time Metric Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Platform Telemetry Overview</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Spherical Haversine Aggregations
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Total Routes"
            value={overview?.totalTraces ?? "..."}
            subtitle="Ingested trajectories"
            icon={Route}
            colorScheme="cyan"
          />
          <MetricCard
            title="GPS Telemetry Points"
            value={overview?.totalPoints ?? "..."}
            subtitle="Indexed coordinates"
            icon={MapPin}
            colorScheme="emerald"
          />
          <MetricCard
            title="Distance Tracked"
            value={overview ? overview.totalDistanceKm : "..."}
            unit="km"
            subtitle="Spherical calculation"
            icon={Navigation}
            colorScheme="teal"
          />
          <MetricCard
            title="Average Velocity"
            value={overview ? overview.overallAvgSpeedKmh : "..."}
            unit="km/h"
            subtitle={`Peak: ${overview?.overallMaxSpeedKmh ?? 0} km/h`}
            icon={Gauge}
            colorScheme="amber"
          />
          <MetricCard
            title="Active Operators"
            value={overview?.uniqueUsersCount ?? "..."}
            subtitle={`${overview?.uniqueDevicesCount ?? 0} active devices`}
            icon={Users}
            colorScheme="indigo"
          />
          <MetricCard
            title="Latest Dispatch"
            value={overview?.latestTrace ? overview.latestTrace.userId : "None"}
            subtitle={
              overview?.latestTrace
                ? `${overview.latestTrace.pointsCount} points logged`
                : "Awaiting telemetry"
            }
            icon={Compass}
            colorScheme="rose"
          />
        </div>
      </section>

      {/* GPS Route Explorer Section */}
      <section id="explorer" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <span>Interactive Route Visualizer</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any route to visualize waypoints, path dynamics, and telemetry benchmarks.
            </p>
          </div>

          {/* Trace Selector Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">Active Route:</span>
            <select
              value={selectedTraceId || ""}
              onChange={(e) => handleSelectTraceForMap(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              {traces.map((t, idx) => (
                <option key={t.id} value={t.id}>
                  #{idx + 1}: {t.userId} ({t.deviceId}) - {t.pointsCount} pts
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Route Summary Banner */}
        {selectedTraceAnalytics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 text-xs shadow-md">
            <div>
              <span className="text-slate-500 block text-[11px]">Operator ID:</span>
              <span className="font-semibold text-cyan-300">{selectedTraceAnalytics.userId}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Device Identifier:</span>
              <span className="font-mono text-emerald-300">{selectedTraceAnalytics.deviceId}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Total Distance:</span>
              <span className="font-bold text-white">
                {selectedTraceAnalytics.totalDistanceKm} km
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Duration:</span>
              <span className="font-semibold text-amber-300">
                {selectedTraceAnalytics.durationFormatted}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Average Speed:</span>
              <span className="font-semibold text-slate-200">
                {selectedTraceAnalytics.avgRecordedSpeedKmh} km/h
              </span>
            </div>
            <div className="flex items-center justify-end">
              <Link
                href={`/traces/${selectedTraceAnalytics.traceId}`}
                className="flex items-center space-x-1 rounded bg-cyan-950 border border-cyan-800 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-900 transition"
              >
                <span>Telemetry View</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* The Interactive Map */}
        <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-xl">
          {isMapLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs">
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                <span>Loading route telemetry...</span>
              </div>
            </div>
          )}

          <TraceMapWrapper
            points={selectedTraceFull?.points || []}
            traceTitle={
              selectedTraceFull?.metadata?.routeTitle ||
              (selectedTraceAnalytics ? `Route: ${selectedTraceAnalytics.userId}` : "Bengaluru Trajectory")
            }
            userId={selectedTraceFull?.userId}
            deviceId={selectedTraceFull?.deviceId}
            height="460px"
          />
        </div>
      </section>

      {/* Trace Management Preview Table */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Route className="w-5 h-5 text-cyan-400" />
              <span>Active Trajectory Streams</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological log of ingested fleet routes and coordinate waypoints
            </p>
          </div>

          <Link
            href="/traces"
            className="flex items-center space-x-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <TraceTable
          traces={traces}
          pagination={pagination}
          isLoading={isLoading}
          onPageChange={(page) => fetchTraces(page)}
          onFilterChange={(filters) => fetchTraces(1, filters)}
          onDeleteTrace={handleDeleteTrace}
          onSelectTraceForMap={handleSelectTraceForMap}
          selectedTraceId={selectedTraceId || undefined}
        />
      </section>

      {/* Trace Upload Modal */}
      <TraceUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchOverview();
          fetchTraces(1);
        }}
      />
    </div>
  );
}
