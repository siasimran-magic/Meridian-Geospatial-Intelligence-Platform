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
  Database,
  ExternalLink,
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch overview metrics from MongoDB
  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/analytics/overview");
      const json = await res.json();
      if (json.success && json.data) {
        setOverview(json.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch overview analytics:", err);
    }
  };

  // Fetch paginated traces
  const fetchTraces = async (page = 1, filters: { userId?: string; deviceId?: string } = {}) => {
    setIsLoading(true);
    setErrorMsg(null);
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
        // Auto-select first trace for map if none selected
        if (!selectedTraceId && json.data.length > 0) {
          handleSelectTraceForMap(json.data[0].id);
        }
      } else {
        setErrorMsg(json.error || "Failed to load GPS traces");
      }
    } catch (err: any) {
      setErrorMsg("Could not connect to MongoDB backend API");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch complete trace details and points for interactive map
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
    } catch (err) {
      console.error("Error fetching trace for map:", err);
    } finally {
      setIsMapLoading(false);
    }
  };

  // Delete trace
  const handleDeleteTrace = async (traceId: string) => {
    try {
      const res = await fetch(`/api/traces/${traceId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        if (selectedTraceId === traceId) {
          setSelectedTraceId(null);
          setSelectedTraceFull(null);
          setSelectedTraceAnalytics(null);
        }
        await Promise.all([fetchOverview(), fetchTraces(pagination.page)]);
      } else {
        alert(json.error || "Failed to delete trace");
      }
    } catch {
      alert("Failed to delete trace from MongoDB");
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchTraces(1);
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950 p-6 sm:p-8 border border-slate-800 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full bg-cyan-950/80 px-3 py-1 border border-cyan-800 text-xs font-mono text-cyan-300">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>DBMS Level 3 • Real MongoDB Engine</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Geospatial Intelligence Platform
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Person 2 GPS Analytics module: Real-time trajectory ingestion, 2dsphere spatial indexing,
              and high-performance MongoDB aggregation pipelines for Bengaluru movement analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                fetchOverview();
                fetchTraces(pagination.page);
              }}
              className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
              title="Refresh database state"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-950 hover:from-cyan-500 hover:to-emerald-500 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Trace</span>
            </button>
            <Link
              href="/dbms-concepts"
              className="flex items-center space-x-1.5 rounded-lg border border-amber-600/40 bg-amber-950/40 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-900/40 transition"
            >
              <span>Viva Guide</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 6 Real-time Metric Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Platform Movement Metrics (Aggregated from MongoDB)</span>
          </h2>
          <span className="text-xs font-mono text-slate-500">
            Pipeline: $facet + $group + Haversine
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Total Traces"
            value={overview?.totalTraces ?? "..."}
            subtitle="Uploaded routes"
            icon={Route}
            colorScheme="cyan"
          />
          <MetricCard
            title="GPS Points"
            value={overview?.totalPoints ?? "..."}
            subtitle="Embedded coordinates"
            icon={MapPin}
            colorScheme="emerald"
          />
          <MetricCard
            title="Total Distance"
            value={overview ? overview.totalDistanceKm : "..."}
            unit="km"
            subtitle="Calculated via Haversine"
            icon={Navigation}
            colorScheme="teal"
          />
          <MetricCard
            title="Average Speed"
            value={overview ? overview.overallAvgSpeedKmh : "..."}
            unit="km/h"
            subtitle={`Peak: ${overview?.overallMaxSpeedKmh ?? 0} km/h`}
            icon={Gauge}
            colorScheme="amber"
          />
          <MetricCard
            title="Active Users"
            value={overview?.uniqueUsersCount ?? "..."}
            subtitle={`${overview?.uniqueDevicesCount ?? 0} unique devices`}
            icon={Users}
            colorScheme="indigo"
          />
          <MetricCard
            title="Latest Trace"
            value={overview?.latestTrace ? overview.latestTrace.userId : "None"}
            subtitle={
              overview?.latestTrace
                ? `${overview.latestTrace.pointsCount} pts recorded`
                : "Awaiting data"
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
              <span>Interactive GPS Route Explorer</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any trace to render its OpenStreetMap trajectory, inspect waypoints, and view movement dynamics.
            </p>
          </div>

          {/* Trace Selector Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">Selected Route:</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs shadow-md">
            <div>
              <span className="text-slate-500 block">User / Driver:</span>
              <span className="font-semibold text-cyan-300">{selectedTraceAnalytics.userId}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Device Identifier:</span>
              <span className="font-mono text-emerald-300">{selectedTraceAnalytics.deviceId}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Trajectory Distance:</span>
              <span className="font-bold text-white">
                {selectedTraceAnalytics.totalDistanceKm} km ({selectedTraceAnalytics.totalDistanceMeters} m)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Elapsed Duration:</span>
              <span className="font-semibold text-amber-300">
                {selectedTraceAnalytics.durationFormatted}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Avg Recorded Speed:</span>
              <span className="font-semibold text-slate-200">
                {selectedTraceAnalytics.avgRecordedSpeedKmh} km/h ({selectedTraceAnalytics.avgRecordedSpeedMps} m/s)
              </span>
            </div>
            <div className="flex items-center justify-end">
              <Link
                href={`/traces/${selectedTraceAnalytics.traceId}`}
                className="flex items-center space-x-1 rounded bg-cyan-950 border border-cyan-800 px-2.5 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-900 transition"
              >
                <span>Full Details</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* The Interactive Map */}
        <div className="relative">
          {isMapLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs rounded-xl">
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                <span>Loading route points...</span>
              </div>
            </div>
          )}

          <TraceMapWrapper
            points={selectedTraceFull?.points || []}
            traceTitle={
              selectedTraceFull?.metadata?.routeTitle ||
              (selectedTraceAnalytics ? `Bengaluru Route - ${selectedTraceAnalytics.userId}` : "Bengaluru Trajectory")
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
              <span>Stored GPS Traces</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live CRUD records from MongoDB collection: <code className="text-cyan-300 font-mono">gps_traces</code>
            </p>
          </div>

          <Link
            href="/traces"
            className="flex items-center space-x-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            <span>Full Trace Management</span>
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
