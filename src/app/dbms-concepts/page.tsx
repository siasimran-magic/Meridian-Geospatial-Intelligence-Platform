"use client";

import React, { useState } from "react";
import {
  Database,
  Cpu,
  Layers,
  BookOpen,
  CheckCircle,
  Copy,
  Terminal,
} from "lucide-react";

export default function DBMSConceptsPage() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const mongoshSnippets = [
    {
      title: "1. Inspect Database Indexes and Sizes",
      desc: "Demonstrates compound and 2dsphere spatial indexes created in MongoDB.",
      cmd: `use geospatial_platform;
db.gps_traces.getIndexes();
db.gps_traces.stats();`,
    },
    {
      title: "2. Verify Collection JSON Schema Validation",
      desc: "Shows the collection-level BSON validation rules enforced by MongoDB engine.",
      cmd: `db.getCollectionInfos({ name: "gps_traces" });`,
    },
    {
      title: "3. Spatial Aggregation: Total Distance & Points per User",
      desc: "Calculates total points, trace counts, and distinct devices grouped by user.",
      cmd: `db.gps_traces.aggregate([
  {
    $group: {
      _id: "$userId",
      totalTraces: { $sum: 1 },
      totalPoints: { $sum: { $size: "$points" } },
      avgBattery: { $avg: "$batteryLevel" },
      devices: { $addToSet: "$deviceId" }
    }
  },
  { $sort: { totalPoints: -1 } }
]);`,
    },
    {
      title: "4. Temporal Aggregation: Daily Movement Activity",
      desc: "Groups activity chronologically using $dateToString on createdAt timestamps.",
      cmd: `db.gps_traces.aggregate([
  {
    $project: {
      day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      pointsCount: { $size: "$points" },
      avgSpeed: { $avg: "$points.speed" },
      userId: 1
    }
  },
  {
    $group: {
      _id: "$day",
      traceCount: { $sum: 1 },
      totalPoints: { $sum: "$pointsCount" },
      overallAvgSpeed: { $avg: "$avgSpeed" },
      activeUsers: { $addToSet: "$userId" }
    }
  },
  { $sort: { _id: 1 } }
]);`,
    },
    {
      title: "5. Find Nearby Traces using 2dsphere Geospatial Index",
      desc: "Demonstrates $geoIntersects / $nearSphere on embedded coordinates array.",
      cmd: `db.gps_traces.find({
  "points.coordinates": {
    $geoWithin: {
      $centerSphere: [ [77.5946, 12.9716], 5 / 6378.1 ] // 5km radius around Bengaluru center
    }
  }
}, { userId: 1, deviceId: 1, createdAt: 1 });`,
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title Header */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono mb-2">
          <BookOpen className="w-4 h-4" />
          <span>DBMS Academic Viva & Evaluation Reference</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          DBMS Architecture & Theoretical Foundations
        </h1>
        <p className="text-sm text-slate-300 mt-2 leading-relaxed">
          Detailed explanation of schema design choices, spatial indexing, aggregation pipelines,
          mathematical formulations, and Person 1 (PostgreSQL/PostGIS) integration architecture.
        </p>
      </div>

      {/* Concept 1: Why MongoDB for GPS Traces */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold text-base">
          <Database className="w-5 h-5" />
          <h2>1. Why MongoDB for Timestamped GPS Traces?</h2>
        </div>
        <div className="text-xs sm:text-sm text-slate-300 space-y-2 leading-relaxed">
          <p>
            In geospatial tracking applications, GPS receivers stream high-frequency coordinate samples
            (lat, lon, speed, heading, accuracy) at 1 to 5 second intervals. In a relational database,
            storing each point as an individual row creates massive index bloat, frequent write locks,
            and expensive multi-table JOIN operations when reconstructing a route.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
              <span className="font-bold text-cyan-300 block text-xs uppercase tracking-wider">
                MongoDB Document Model (Selected)
              </span>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 mt-1">
                <li>Hierarchical: Points embedded inside a parent trace document.</li>
                <li>Single atomic write per uploaded journey / batch.</li>
                <li>Pre-sorted chronologically: Instant route line drawing without joins.</li>
                <li>Native support for dynamic metadata (tags, vehicle telemetry, battery).</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-1">
              <span className="font-bold text-slate-400 block text-xs uppercase tracking-wider">
                Normalized Relational Model Trade-off
              </span>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 mt-1">
                <li>Requires 100,000s of discrete row inserts for a single day.</li>
                <li>Foreign key lookup overhead on every point retrieval.</li>
                <li>Higher I/O cost when fetching complete trajectories.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Concept 2: Mathematical Formulation */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 text-emerald-400 font-bold text-base">
          <Cpu className="w-5 h-5" />
          <h2>2. Haversine Great-Circle Distance Calculation</h2>
        </div>
        <div className="text-xs sm:text-sm text-slate-300 space-y-2 leading-relaxed">
          <p>
            Because the Earth is approximately spherical (mean radius <code className="text-emerald-300 font-mono">R = 6,371,000 m</code>),
            Euclidean distance on longitude and latitude produces severe distortion. The Haversine formula
            computes great-circle distances directly on the sphere:
          </p>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto space-y-1">
            <p className="text-slate-400">{"// Haversine Formula:"}</p>
            <p>&Delta;&phi; = (lat2 - lat1) &times; (&pi; / 180)</p>
            <p>&Delta;&lambda; = (lon2 - lon1) &times; (&pi; / 180)</p>
            <p>a = sin&sup2;(&Delta;&phi; / 2) + cos(lat1 &times; &pi;/180) &times; cos(lat2 &times; &pi;/180) &times; sin&sup2;(&Delta;&lambda; / 2)</p>
            <p>c = 2 &times; atan2(&radic;a, &radic;(1 - a))</p>
            <p className="text-emerald-400 font-bold">d = R &times; c  (in metres)</p>
          </div>
          <p className="text-xs text-slate-400">
            <strong>Average Speed Distinction:</strong> In this system, we distinguish two metrics:
            (1) <em>Mean recorded speed</em> (the average of instantaneous sensor readings reported by the GPS chip),
            and (2) <em>Calculated speed</em> (total Haversine distance divided by elapsed timestamp difference).
          </p>
        </div>
      </section>

      {/* Concept 3: Indexes & Optimization */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 text-amber-400 font-bold text-base">
          <Layers className="w-5 h-5" />
          <h2>3. Indexes and Performance Implications</h2>
        </div>
        <div className="text-xs sm:text-sm text-slate-300 space-y-2 leading-relaxed">
          <p>To ensure high throughput and prevent full collection scans (COLLSCAN), the platform creates five indexes:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <span className="font-mono text-cyan-300 font-semibold block text-xs">
                &#123; userId: 1, createdAt: -1 &#125;
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Compound index for filtering traces by user and sorting by recency without in-memory sort.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <span className="font-mono text-cyan-300 font-semibold block text-xs">
                &#123; deviceId: 1, createdAt: -1 &#125;
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Device telemetry index enabling fast hardware activity tracking and filtering.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <span className="font-mono text-emerald-300 font-semibold block text-xs">
                &#123; &quot;points.coordinates&quot;: &quot;2dsphere&quot; &#125;
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Geospatial 2dsphere index supporting spherical geometries and $geoWithin queries.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <span className="font-mono text-amber-300 font-semibold block text-xs">
                &#123; &quot;points.timestamp&quot;: 1 &#125;
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Multikey index over point timestamps for temporal window queries across trajectories.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Concept 4: Integration with Person 1 */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-base">
          <Layers className="w-5 h-5" />
          <h2>4. Integration Architecture with Person 1 (PostgreSQL / PostGIS)</h2>
        </div>
        <div className="text-xs sm:text-sm text-slate-300 space-y-2 leading-relaxed">
          <p>
            In the complete Geospatial Intelligence Platform, Person 1 and Person 2 serve distinct, complementary database roles:
          </p>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
            <div className="flex items-start space-x-2">
              <span className="font-bold text-cyan-400 min-w-24">Person 2 (MongoDB):</span>
              <span className="text-slate-300">
                High-write-volume time-series GPS trace storage, trajectory analytics, speed profiles, and vehicle battery metrics.
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-indigo-400 min-w-24">Person 1 (PostGIS):</span>
              <span className="text-slate-300">
                Relational POI catalogue (restaurants, landmarks, fuel stations) with spatial spatial indexing (GIST) for nearest-neighbor queries (<code className="font-mono text-indigo-300">ST_DWithin</code>, <code className="font-mono text-indigo-300">ST_Distance</code>).
              </span>
            </div>
            <div className="flex items-start space-x-2 border-t border-slate-800 pt-2">
              <span className="font-bold text-emerald-400 min-w-24">Integration Contract:</span>
              <span className="text-slate-300">
                Person 2 passes the GPS route coordinates or bounding box to Person 1&apos;s API endpoint (<code className="font-mono text-emerald-300">GET /api/pois/nearby?routeId=...</code>). The combined UI overlays nearby restaurants directly on Person 2&apos;s Leaflet route map.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Mongosh Demonstration Scripts */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold text-base">
          <Terminal className="w-5 h-5" />
          <h2>5. Ready-to-Run MongoDB Shell (`mongosh`) Viva Commands</h2>
        </div>
        <p className="text-xs text-slate-400">
          Copy and paste these commands into <code className="text-cyan-300 font-mono">mongosh</code> during your evaluation to demonstrate queries directly on the database engine.
        </p>

        <div className="space-y-4">
          {mongoshSnippets.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-2">
                <div>
                  <span className="text-xs font-bold text-slate-200">{item.title}</span>
                  <p className="text-[11px] text-slate-400">{item.desc}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(item.cmd, idx)}
                  className="flex items-center space-x-1 rounded bg-slate-800 px-2.5 py-1 text-xs text-cyan-300 hover:bg-slate-700"
                >
                  {copiedIdx === idx ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy mongosh</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre">
                {item.cmd}
              </pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
