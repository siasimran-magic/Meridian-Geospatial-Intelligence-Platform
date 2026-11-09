"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

interface TraceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TraceUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: TraceUploadModalProps) {
  const [userId, setUserId] = useState("user_001");
  const [deviceId, setDeviceId] = useState("dev_bglr_alpha");
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [tripType, setTripType] = useState("commute");
  const [notes, setNotes] = useState("Manual upload via dashboard form");
  const [points, setPoints] = useState<
    { timestamp: string; coordinates: [number, number]; speed: number; accuracy: number }[]
  >([
    {
      timestamp: "2026-10-22T09:00:00.000Z",
      coordinates: [77.5946, 12.9716], // Bengaluru MG Road
      speed: 6.5,
      accuracy: 6,
    },
    {
      timestamp: "2026-10-22T09:01:00.000Z",
      coordinates: [77.6050, 12.9750],
      speed: 8.2,
      accuracy: 5,
    },
    {
      timestamp: "2026-10-22T09:02:00.000Z",
      coordinates: [77.6180, 12.9800],
      speed: 7.0,
      accuracy: 5,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddPoint = () => {
    const lastPoint = points[points.length - 1];
    const newLon = Number((lastPoint.coordinates[0] + 0.005).toFixed(4));
    const newLat = Number((lastPoint.coordinates[1] + 0.003).toFixed(4));
    const newTime = new Date(new Date(lastPoint.timestamp).getTime() + 60000).toISOString();

    setPoints([
      ...points,
      {
        timestamp: newTime,
        coordinates: [newLon, newLat],
        speed: 7.5,
        accuracy: 5,
      },
    ]);
  };

  const handleRemovePoint = (index: number) => {
    if (points.length <= 2) {
      alert("A GPS trace requires at least 2 points to compute movement.");
      return;
    }
    setPoints(points.filter((_, i) => i !== index));
  };

  const handleUpdatePoint = (
    index: number,
    field: "lon" | "lat" | "speed" | "accuracy" | "timestamp",
    val: string
  ) => {
    const updated = [...points];
    const pt = { ...updated[index] };

    if (field === "lon") {
      pt.coordinates = [parseFloat(val) || 0, pt.coordinates[1]];
    } else if (field === "lat") {
      pt.coordinates = [pt.coordinates[0], parseFloat(val) || 0];
    } else if (field === "speed") {
      pt.speed = parseFloat(val) || 0;
    } else if (field === "accuracy") {
      pt.accuracy = parseFloat(val) || 0;
    } else if (field === "timestamp") {
      pt.timestamp = val;
    }

    updated[index] = pt;
    setPoints(updated);
  };

  const handleLoadPresetBengaluru = () => {
    const now = Date.now();
    setUserId("user_003");
    setDeviceId("dev_bglr_preset");
    setTripType("patrol");
    setBatteryLevel(92);
    setNotes("Quick demonstration preset from Cubbon Park to Indiranagar");
    setPoints([
      {
        timestamp: new Date(now).toISOString(),
        coordinates: [77.5913, 12.9763], // Cubbon Park
        speed: 5.0,
        accuracy: 4.5,
      },
      {
        timestamp: new Date(now + 45000).toISOString(),
        coordinates: [77.6033, 12.9752], // MG Road
        speed: 8.5,
        accuracy: 5.0,
      },
      {
        timestamp: new Date(now + 90000).toISOString(),
        coordinates: [77.6185, 12.9742], // Trinity Circle
        speed: 9.2,
        accuracy: 6.0,
      },
      {
        timestamp: new Date(now + 150000).toISOString(),
        coordinates: [77.6395, 12.9770], // Indiranagar
        speed: 7.8,
        accuracy: 5.0,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        userId,
        deviceId,
        batteryLevel: Number(batteryLevel),
        metadata: {
          tripType,
          notes,
        },
        points: points.map((p) => ({
          timestamp: p.timestamp,
          coordinates: [Number(p.coordinates[0]), Number(p.coordinates[1])],
          speed: Number(p.speed),
          accuracy: Number(p.accuracy),
        })),
      };

      const res = await fetch("/api/traces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Failed to create trace");
      }

      setSuccessMsg("Trace created successfully in MongoDB!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <span>Upload GPS Trace</span>
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono">
                MongoDB Insert
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Store real-time GPS trajectories with embedded coordinates and speed vectors.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center space-x-2 rounded-lg border border-rose-800 bg-rose-950/60 p-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-center space-x-2 rounded-lg border border-emerald-800 bg-emerald-950/60 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                User ID *
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Device ID *
              </label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Battery Level (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={batteryLevel}
                onChange={(e) => setBatteryLevel(Number(e.target.value))}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Trip Category
              </label>
              <select
                value={tripType}
                onChange={(e) => setTripType(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="commute">Commute</option>
                <option value="delivery">Delivery</option>
                <option value="patrol">Patrol</option>
                <option value="inspection">Inspection</option>
                <option value="test_drive">Test Drive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Trace Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Points List */}
          <div className="border border-slate-800 rounded-lg p-3 bg-slate-950/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                GPS Coordinate Waypoints ({points.length} points)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleLoadPresetBengaluru}
                  className="flex items-center space-x-1 rounded bg-slate-800 px-2 py-1 text-xs text-amber-300 hover:bg-slate-700"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Load BLR Preset</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddPoint}
                  className="flex items-center space-x-1 rounded bg-cyan-700 px-2 py-1 text-xs text-white hover:bg-cyan-600"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Point</span>
                </button>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {points.map((pt, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center bg-slate-900 p-2 rounded border border-slate-800 text-xs"
                >
                  <span className="col-span-1 text-slate-500 font-mono font-bold">
                    #{idx + 1}
                  </span>
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.0001"
                      value={pt.coordinates[0]}
                      placeholder="Longitude"
                      onChange={(e) => handleUpdatePoint(idx, "lon", e.target.value)}
                      title="Longitude"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.0001"
                      value={pt.coordinates[1]}
                      placeholder="Latitude"
                      onChange={(e) => handleUpdatePoint(idx, "lat", e.target.value)}
                      title="Latitude"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.1"
                      value={pt.speed}
                      placeholder="m/s"
                      onChange={(e) => handleUpdatePoint(idx, "speed", e.target.value)}
                      title="Speed (m/s)"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.5"
                      value={pt.accuracy}
                      placeholder="Acc (m)"
                      onChange={(e) => handleUpdatePoint(idx, "accuracy", e.target.value)}
                      title="Accuracy (m)"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemovePoint(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-md text-xs font-semibold bg-gradient-to-r from-cyan-600 to-emerald-600 text-white hover:from-cyan-500 hover:to-emerald-500 disabled:opacity-50"
            >
              {isSubmitting ? "Inserting..." : "Insert into MongoDB"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
