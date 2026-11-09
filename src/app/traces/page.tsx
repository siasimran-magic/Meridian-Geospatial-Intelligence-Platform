"use client";

import React, { useEffect, useState } from "react";
import { ListFilter, RefreshCw, Upload } from "lucide-react";
import TraceTable from "@/components/traces/TraceTable";
import TraceUploadModal from "@/components/traces/TraceUploadModal";
import { TraceSummaryItem } from "@/types/gps";

export default function TraceManagementPage() {
  const [traces, setTraces] = useState<TraceSummaryItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState<{ userId?: string; deviceId?: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fetchTraces = async (page = 1, currentFilters = filters) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (currentFilters.userId) queryParams.set("userId", currentFilters.userId);
      if (currentFilters.deviceId) queryParams.set("deviceId", currentFilters.deviceId);

      const res = await fetch(`/api/traces?${queryParams.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setTraces(json.data);
        if (json.pagination) {
          setPagination(json.pagination);
        }
      }
    } catch (err) {
      console.error("Failed to fetch traces:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: { userId?: string; deviceId?: string }) => {
    setFilters(newFilters);
    fetchTraces(1, newFilters);
  };

  const handleDeleteTrace = async (traceId: string) => {
    try {
      const res = await fetch(`/api/traces/${traceId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchTraces(pagination.page);
      } else {
        alert(json.error || "Failed to delete route");
      }
    } catch {
      alert("Failed to delete route");
    }
  };

  useEffect(() => {
    fetchTraces(1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-white flex items-center space-x-2">
              <ListFilter className="w-6 h-6 text-cyan-400" />
              <span>Fleet Trajectories & Logs</span>
            </h1>
            <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-800">
              Active Logs
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, inspect, and manage ingested GPS route records and waypoint telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchTraces(pagination.page)}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg hover:from-cyan-500 hover:to-emerald-500 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Ingest Route</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <TraceTable
        traces={traces}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(page) => fetchTraces(page)}
        onFilterChange={handleFilterChange}
        onDeleteTrace={handleDeleteTrace}
      />

      {/* Upload Modal */}
      <TraceUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => fetchTraces(1)}
      />
    </div>
  );
}
