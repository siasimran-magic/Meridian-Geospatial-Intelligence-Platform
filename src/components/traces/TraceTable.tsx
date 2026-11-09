"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Clock,
  Gauge,
  Battery,
} from "lucide-react";
import { TraceSummaryItem } from "@/types/gps";

interface TraceTableProps {
  traces: TraceSummaryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onFilterChange: (filters: { userId?: string; deviceId?: string }) => void;
  onDeleteTrace: (traceId: string) => Promise<void>;
  onSelectTraceForMap?: (traceId: string) => void;
  selectedTraceId?: string;
}

export default function TraceTable({
  traces,
  pagination,
  isLoading,
  onPageChange,
  onFilterChange,
  onDeleteTrace,
  onSelectTraceForMap,
  selectedTraceId,
}: TraceTableProps) {
  const [filterUser, setFilterUser] = useState("");
  const [filterDevice, setFilterDevice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      userId: filterUser.trim() || undefined,
      deviceId: filterDevice.trim() || undefined,
    });
  };

  const handleResetFilter = () => {
    setFilterUser("");
    setFilterDevice("");
    onFilterChange({});
  };

  const handleDeleteClick = async (traceId: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete trace '${traceId}' from MongoDB? This action is permanent.`
    );
    if (!confirmed) return;

    setDeletingId(traceId);
    try {
      await onDeleteTrace(traceId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
      {/* Table Filter Bar */}
      <div className="border-b border-slate-800 bg-slate-900/80 p-4">
        <form
          onSubmit={handleApplyFilter}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter by User ID..."
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-40 sm:w-48 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Filter by Device ID..."
                value={filterDevice}
                onChange={(e) => setFilterDevice(e.target.value)}
                className="w-40 sm:w-48 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="flex items-center space-x-1 rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-600 transition"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
            {(filterUser || filterDevice) && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="flex items-center space-x-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400">
            Total Records:{" "}
            <span className="font-semibold text-cyan-400">{pagination.total}</span>
          </div>
        </form>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-4 py-3">Trace ID</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3">Points</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Distance</th>
              <th className="px-4 py-3">Avg Speed</th>
              <th className="px-4 py-3">Battery</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                    <span>Querying MongoDB traces...</span>
                  </div>
                </td>
              </tr>
            ) : traces.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                  No GPS traces found matching the current criteria.
                </td>
              </tr>
            ) : (
              traces.map((trace) => {
                const isSelected = selectedTraceId === trace.id;

                return (
                  <tr
                    key={trace.id}
                    className={`transition-colors hover:bg-slate-800/50 ${
                      isSelected ? "bg-cyan-950/30 border-l-2 border-cyan-400" : ""
                    }`}
                  >
                    {/* Trace ID */}
                    <td className="px-4 py-3 font-mono font-medium text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <span title={trace.id}>
                          {trace.id.substring(0, 8)}...
                        </span>
                        {trace.tripType && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                            {trace.tripType}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-4 py-3 font-semibold text-cyan-300">
                      {trace.userId}
                    </td>

                    {/* Device */}
                    <td className="px-4 py-3 font-mono text-emerald-300">
                      {trace.deviceId}
                    </td>

                    {/* Points Count */}
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono text-amber-300">
                        {trace.pointsCount} pts
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3 text-slate-300">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatDuration(trace.durationSeconds)}</span>
                      </div>
                    </td>

                    {/* Distance */}
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      {formatDistance(trace.totalDistanceMeters)}
                    </td>

                    {/* Avg Speed */}
                    <td className="px-4 py-3 text-slate-300">
                      <div className="flex items-center space-x-1">
                        <Gauge className="w-3 h-3 text-slate-500" />
                        <span>{(trace.avgSpeedMps * 3.6).toFixed(1)} km/h</span>
                      </div>
                    </td>

                    {/* Battery */}
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <Battery
                          className={`w-3.5 h-3.5 ${
                            trace.batteryLevel < 20
                              ? "text-rose-400"
                              : trace.batteryLevel < 50
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        />
                        <span>{trace.batteryLevel}%</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {onSelectTraceForMap && (
                          <button
                            onClick={() => onSelectTraceForMap(trace.id)}
                            title="Inspect on Route Map"
                            className="rounded p-1 text-cyan-400 hover:bg-cyan-950/60 hover:text-cyan-300"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                        )}

                        <Link
                          href={`/traces/${trace.id}`}
                          title="Full Trace Details & Point Table"
                          className="rounded px-2 py-1 text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          View
                        </Link>

                        <button
                          onClick={() => handleDeleteClick(trace.id)}
                          disabled={deletingId === trace.id}
                          title="Delete Trace"
                          className="rounded p-1 text-slate-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/90 px-4 py-3 text-xs text-slate-400">
        <div>
          Showing Page{" "}
          <span className="font-semibold text-slate-200">{pagination.page}</span>{" "}
          of{" "}
          <span className="font-semibold text-slate-200">
            {pagination.totalPages || 1}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
            className="flex items-center space-x-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
            className="flex items-center space-x-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
