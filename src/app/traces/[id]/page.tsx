"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Navigation,
  Gauge,
  Battery,
  Layers,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Maximize2,
} from "lucide-react";
import TraceMapWrapper from "@/components/maps/TraceMapWrapper";
import { GPSTrace, TraceAnalyticsResult } from "@/types/gps";

interface TraceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TraceDetailPage({ params }: TraceDetailPageProps) {
  const { id } = use(params);

  const [trace, setTrace] = useState<GPSTrace | null>(null);
  const [analytics, setAnalytics] = useState<TraceAnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Metadata edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editBattery, setEditBattery] = useState(85);
  const [editNotes, setEditNotes] = useState("");
  const [editTripType, setEditTripType] = useState("");
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  const fetchTraceData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [traceRes, analyticsRes] = await Promise.all([
        fetch(`/api/traces/${id}`),
        fetch(`/api/analytics/traces/${id}`),
      ]);

      const traceJson = await traceRes.json();
      const analyticsJson = await analyticsRes.json();

      if (!traceRes.ok || !traceJson.success) {
        throw new Error(traceJson.error || "Failed to load trace record");
      }

      setTrace(traceJson.data);
      setAnalytics(analyticsJson.data);
      setEditBattery(traceJson.data.batteryLevel);
      setEditNotes(traceJson.data.metadata?.notes || "");
      setEditTripType(traceJson.data.metadata?.tripType || "");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to fetch trace details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTraceData();
  }, [id]);

  const handleUpdateMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMsg(null);
    try {
      const res = await fetch(`/api/traces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batteryLevel: Number(editBattery),
          metadata: {
            tripType: editTripType,
            notes: editNotes,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Update failed");
      }

      setUpdateMsg("Metadata updated successfully in MongoDB!");
      setIsEditing(false);
      fetchTraceData();
    } catch (err: any) {
      alert(err.message || "Failed to update metadata");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-xs text-slate-400">Loading GPS trace and computing analytics...</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !trace) {
    return (
      <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-6 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <h2 className="text-base font-bold text-rose-200">Unable to load trace</h2>
        <p className="text-xs text-rose-300">{errorMsg || "Record not found in database."}</p>
        <Link
          href="/traces"
          className="inline-flex items-center space-x-1 rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Traces</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <Link
            href="/traces"
            className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-cyan-400 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Traces</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-black text-white">
              GPS Trace: <span className="font-mono text-cyan-300">{trace._id?.toString()}</span>
            </h1>
            <span className="rounded bg-cyan-950 border border-cyan-800 px-2.5 py-0.5 text-xs font-mono text-cyan-300">
              {trace.points?.length || 0} Points
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            User: <span className="font-semibold text-slate-200">{trace.userId}</span> • Device:{" "}
            <span className="font-mono text-emerald-300">{trace.deviceId}</span> • Created:{" "}
            <span className="text-slate-300">{new Date(trace.createdAt).toLocaleString()}</span>
          </p>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{isEditing ? "Cancel Edit" : "Edit Metadata"}</span>
        </button>
      </div>

      {updateMsg && (
        <div className="flex items-center space-x-2 rounded-lg border border-emerald-800 bg-emerald-950/60 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{updateMsg}</span>
        </div>
      )}

      {/* Edit Metadata Form Drawer */}
      {isEditing && (
        <form
          onSubmit={handleUpdateMetadata}
          className="rounded-xl border border-cyan-800 bg-slate-900/90 p-4 space-y-3"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            Edit Permitted Trace Metadata (MongoDB PATCH)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Battery Level (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editBattery}
                onChange={(e) => setEditBattery(Number(e.target.value))}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Trip Type</label>
              <input
                type="text"
                value={editTripType}
                onChange={(e) => setEditTripType(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Notes</label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 rounded text-xs text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 rounded bg-cyan-600 text-xs font-semibold text-white hover:bg-cyan-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>Total Distance</span>
          </div>
          <div className="text-lg font-bold text-cyan-300">
            {analytics?.totalDistanceKm ?? 0} km
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {analytics?.totalDistanceMeters ?? 0} metres
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Duration</span>
          </div>
          <div className="text-lg font-bold text-amber-300">
            {analytics?.durationFormatted || "0s"}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {analytics?.durationSeconds ?? 0} seconds
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>Avg Recorded Speed</span>
          </div>
          <div className="text-lg font-bold text-emerald-300">
            {analytics?.avgRecordedSpeedKmh ?? 0} km/h
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {analytics?.avgRecordedSpeedMps ?? 0} m/s
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
            <Gauge className="w-3.5 h-3.5 text-rose-400" />
            <span>Max Peak Speed</span>
          </div>
          <div className="text-lg font-bold text-rose-300">
            {analytics?.maxSpeedKmh ?? 0} km/h
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {analytics?.maxSpeedMps ?? 0} m/s
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
            <Battery className="w-3.5 h-3.5 text-teal-400" />
            <span>Battery Level</span>
          </div>
          <div className="text-lg font-bold text-teal-300">{trace.batteryLevel}%</div>
          <div className="text-[11px] text-slate-500">
            Status: {trace.batteryLevel > 20 ? "Normal" : "Low"}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
            <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Bounding Box</span>
          </div>
          <div className="text-[11px] text-indigo-300 font-mono truncate">
            Lon: [{analytics?.boundingBox.minLon.toFixed(3)}, {analytics?.boundingBox.maxLon.toFixed(3)}]
          </div>
          <div className="text-[11px] text-indigo-300 font-mono truncate">
            Lat: [{analytics?.boundingBox.minLat.toFixed(3)}, {analytics?.boundingBox.maxLat.toFixed(3)}]
          </div>
        </div>
      </div>

      {/* Map Section */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Route Map Visualizer
        </h2>
        <TraceMapWrapper
          points={trace.points || []}
          traceTitle={trace.metadata?.routeTitle || `Trace ${trace._id?.toString().substring(0, 8)}`}
          userId={trace.userId}
          deviceId={trace.deviceId}
          height="450px"
        />
      </section>

      {/* GPS Points Table */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden space-y-0">
        <div className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Recorded GPS Waypoints (Chronological Order)</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {trace.points?.length || 0} Stored Points
          </span>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 border-b border-slate-800 bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold z-10">
              <tr>
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Timestamp (UTC / Local)</th>
                <th className="px-4 py-2.5">Longitude</th>
                <th className="px-4 py-2.5">Latitude</th>
                <th className="px-4 py-2.5">Speed (m/s)</th>
                <th className="px-4 py-2.5">Speed (km/h)</th>
                <th className="px-4 py-2.5">Accuracy (&plusmn;m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {(trace.points || []).map((pt, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="px-4 py-2 text-slate-500 font-bold">{idx + 1}</td>
                  <td className="px-4 py-2 text-slate-400 font-sans">
                    {new Date(pt.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-cyan-300">
                    {pt.coordinates[0].toFixed(6)}
                  </td>
                  <td className="px-4 py-2 text-emerald-300">
                    {pt.coordinates[1].toFixed(6)}
                  </td>
                  <td className="px-4 py-2 text-slate-200">{pt.speed.toFixed(2)}</td>
                  <td className="px-4 py-2 text-amber-300 font-semibold">
                    {(pt.speed * 3.6).toFixed(1)}
                  </td>
                  <td className="px-4 py-2 text-slate-400">&plusmn;{pt.accuracy}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
