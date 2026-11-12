/**
 * Generator script for:
 * 1. Relational Schema 3NF Diagram (Image 1 style - Table boxes, red FD arrows, black FK arrows)
 * 2. Chen's ER Diagram (Image 2 style - Rectangles, diamonds, pink attribute ovals, cardinalities)
 *
 * Team:
 * - Sia Simran A (PES1UG24CS453)
 * - Simret M Kotian (PES1UG24CS456)
 * Project: Meridian: Geospatial Intelligence Platform
 */

const fs = require('fs');
const path = require('path');

// Ensure directories
const outDir = path.join(__dirname, '..', 'docs', 'diagrams');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// -------------------------------------------------------------
// 1. GENERATE RELATIONAL SCHEMA 3NF (IMAGE 1 STYLE)
// -------------------------------------------------------------
function generateRelationalSchemaSVG() {
  const width = 1680;
  const height = 1580;

  // SVG Helper
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <!-- Arrowhead markers -->
    <marker id="fk-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0f172a" />
    </marker>
    <marker id="fd-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 2 L 8 5 L 0 8 z" fill="#dc2626" />
    </marker>
    <marker id="cross-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 2 L 8 5 L 0 8 z" fill="#0284c7" />
    </marker>
    <filter id="shadow" x="-2%" y="-4%" width="104%" height="110%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08" />
    </filter>
  </defs>

  <!-- Header Banner -->
  <g transform="translate(60, 40)">
    <!-- Date (Left) -->
    <text x="0" y="24" font-size="16" font-weight="700" fill="#334155">12 November 2026</text>
    <text x="0" y="44" font-size="12" fill="#64748b">Semester 5 · PES University</text>

    <!-- Title (Center) -->
    <text x="780" y="22" font-size="22" font-weight="800" text-anchor="middle" fill="#0f172a" letter-spacing="-0.02em">
      Meridian Geospatial Platform Relational Schema 3NF
    </text>
    <text x="780" y="44" font-size="13" font-weight="600" text-anchor="middle" fill="#0284c7">
      Department of Computer Science &amp; Engineering — DBMS Level 3 Experiential Learning Project
    </text>

    <!-- Authors (Right) -->
    <text x="1560" y="20" font-size="14" font-weight="800" text-anchor="end" fill="#0f172a">
      Sia Simran A (PES1UG24CS453)
    </text>
    <text x="1560" y="40" font-size="14" font-weight="800" text-anchor="end" fill="#0f172a">
      Simret M Kotian (PES1UG24CS456)
    </text>
    <text x="1560" y="58" font-size="11" text-anchor="end" fill="#64748b">Project Pair 2 · PostGIS + MongoDB</text>

    <!-- Dividing rule -->
    <line x1="0" y1="72" x2="1560" y2="72" stroke="#e2e8f0" stroke-width="2" />
  </g>
`;

  // Helper function to draw a table
  function renderTable(name, x, y, cols) {
    const cellHeight = 36;
    let totalW = 0;
    cols.forEach(c => totalW += c.width);

    let res = `\n  <!-- Table: ${name} -->\n  <g id="table-${name.toLowerCase()}" transform="translate(${x}, ${y})">\n`;
    // Table Label
    res += `    <text x="2" y="-12" font-size="14" font-weight="800" fill="#0f172a" letter-spacing="0.05em">${name}</text>\n`;
    // Table Outer Box
    res += `    <rect x="0" y="0" width="${totalW}" height="${cellHeight}" fill="#ffffff" stroke="#0f172a" stroke-width="1.8" filter="url(#shadow)" />\n`;

    let curX = 0;
    cols.forEach((col, idx) => {
      // Cell divider
      if (idx > 0) {
        res += `    <line x1="${curX}" y1="0" x2="${curX}" y2="${cellHeight}" stroke="#0f172a" stroke-width="1.2" />\n`;
      }

      // Column Text
      const textX = curX + col.width / 2;
      const textY = 22;
      const isPk = col.isPk;
      const isFk = col.isFk;

      let textStyle = `font-size="12" fill="#0f172a" text-anchor="middle"`;
      if (isPk) {
        textStyle += ` font-weight="700" text-decoration="underline"`;
      } else if (isFk) {
        textStyle += ` font-weight="600"`;
      } else {
        textStyle += ` font-weight="500"`;
      }

      res += `    <text x="${textX}" y="${textY}" ${textStyle}>${col.name}</text>\n`;

      // Draw dotted underline for FK if not PK
      if (isFk && !isPk) {
        const textLenApprox = col.name.length * 6.5;
        const lineX1 = textX - textLenApprox / 2;
        const lineX2 = textX + textLenApprox / 2;
        res += `    <line x1="${lineX1}" y1="26" x2="${lineX2}" y2="26" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="2 2" />\n`;
      }

      col.midX = x + curX + col.width / 2;
      col.topY = y;
      col.botY = y + cellHeight;
      curX += col.width;
    });

    res += `  </g>\n`;

    // Render Red Functional Dependency (FD) Arcs on top of table
    const pkCol = cols.find(c => c.isPk);
    if (pkCol) {
      cols.forEach(col => {
        if (col !== pkCol && !col.isPkPart) {
          const startX = pkCol.midX;
          const endX = col.midX;
          const arcHeight = Math.min(22, 10 + Math.abs(endX - startX) * 0.04);
          const controlY = y - arcHeight;
          res += `  <path d="M ${startX} ${y} Q ${(startX + endX) / 2} ${controlY} ${endX} ${y - 2}" fill="none" stroke="#dc2626" stroke-width="1.2" marker-end="url(#fd-arrow)" />\n`;
        }
      });
    }

    return res;
  }

  // 1. Table Definitions
  const tables = {
    USERS: {
      name: "USERS", x: 80, y: 170,
      cols: [
        { name: "user_id", width: 110, isPk: true },
        { name: "email", width: 130 },
        { name: "display_name", width: 110 },
        { name: "password_hash", width: 115 },
        { name: "role", width: 70 },
        { name: "is_active", width: 80 },
        { name: "created_at", width: 95 }
      ]
    },
    CATEGORIES: {
      name: "CATEGORIES", x: 920, y: 170,
      cols: [
        { name: "category_id", width: 120, isPk: true },
        { name: "name", width: 110 },
        { name: "slug", width: 100 },
        { name: "description", width: 120 },
        { name: "parent_category_id", width: 150, isFk: true }
      ]
    },
    PLACES: {
      name: "PLACES", x: 80, y: 390,
      cols: [
        { name: "place_id", width: 110, isPk: true },
        { name: "name", width: 110 },
        { name: "description", width: 110 },
        { name: "address", width: 110 },
        { name: "location (Point)", width: 120 },
        { name: "time_zone", width: 95 },
        { name: "is_active", width: 80 },
        { name: "created_by_user_id", width: 150, isFk: true },
        { name: "created_at", width: 95 }
      ]
    },
    PLACE_CATEGORIES: {
      name: "PLACE_CATEGORIES", x: 1130, y: 390,
      cols: [
        { name: "place_id", width: 120, isPk: true, isFk: true },
        { name: "category_id", width: 130, isPk: true, isFk: true }
      ]
    },
    PLACE_HOURS_PROFILES: {
      name: "PLACE_HOURS_PROFILES", x: 80, y: 610,
      cols: [
        { name: "place_id", width: 120, isPk: true, isFk: true },
        { name: "verified_at", width: 110 },
        { name: "notes", width: 100 },
        { name: "updated_at", width: 100 }
      ]
    },
    PLACE_WEEKLY_HOURS: {
      name: "PLACE_WEEKLY_HOURS", x: 680, y: 610,
      cols: [
        { name: "place_id", width: 120, isPk: true, isFk: true },
        { name: "iso_weekday", width: 110, isPk: true, isPkPart: true },
        { name: "period_no", width: 95, isPk: true, isPkPart: true },
        { name: "is_closed", width: 90 },
        { name: "opens_at", width: 95 },
        { name: "closes_at", width: 95 }
      ]
    },
    REVIEWS: {
      name: "REVIEWS", x: 80, y: 830,
      cols: [
        { name: "review_id", width: 110, isPk: true },
        { name: "place_id", width: 120, isFk: true },
        { name: "author_user_id", width: 135, isFk: true },
        { name: "rating", width: 75 },
        { name: "body", width: 100 },
        { name: "moderation_status", width: 140 },
        { name: "created_at", width: 95 }
      ]
    },
    REVIEW_EMBEDDINGS: {
      name: "REVIEW_EMBEDDINGS", x: 980, y: 830,
      cols: [
        { name: "review_id", width: 120, isPk: true, isFk: true },
        { name: "embedding (v384)", width: 130 },
        { name: "model_name", width: 110 },
        { name: "model_revision", width: 120 },
        { name: "input_sha256", width: 110 }
      ]
    },
    CHECK_INS: {
      name: "CHECK_INS", x: 80, y: 1050,
      cols: [
        { name: "check_in_id", width: 120, isPk: true },
        { name: "user_id", width: 110, isFk: true },
        { name: "place_id", width: 110, isFk: true },
        { name: "checked_in_at", width: 115 },
        { name: "source", width: 85 }
      ]
    },
    AUTH_SESSIONS: {
      name: "AUTH_SESSIONS", x: 720, y: 1050,
      cols: [
        { name: "session_id", width: 120, isPk: true },
        { name: "user_id", width: 110, isFk: true },
        { name: "expires_at", width: 105 },
        { name: "revoked_at", width: 105 },
        { name: "created_at", width: 100 }
      ]
    },
    AUDIT_LOGS: {
      name: "AUDIT_LOGS", x: 1240, y: 1050,
      cols: [
        { name: "audit_log_id", width: 110, isPk: true },
        { name: "actor_user_id", width: 120, isFk: true },
        { name: "action", width: 80 },
        { name: "occurred_at", width: 95 }
      ]
    },
    GPS_TRACES: {
      name: "GPS_TRACES (MongoDB Collection - NoSQL Store)", x: 80, y: 1270,
      cols: [
        { name: "_id (BSON PK)", width: 130, isPk: true },
        { name: "userId (Ref)", width: 130, isFk: true },
        { name: "deviceId", width: 120 },
        { name: "points [{coord, time, speed, acc}]", width: 260 },
        { name: "batteryLevel", width: 110 },
        { name: "metadata", width: 100 },
        { name: "createdAt", width: 100 }
      ]
    }
  };

  // Render all tables
  for (const key in tables) {
    const t = tables[key];
    svg += renderTable(t.name, t.x, t.y, t.cols);
  }

  // 2. Render Black Referential Integrity (Foreign Key) Connectors (Image 1 style)
  function drawFkArrow(fromX, fromY, toX, toY, waypoints = []) {
    let path = `M ${fromX} ${fromY}`;
    waypoints.forEach(wp => {
      path += ` L ${wp.x} ${wp.y}`;
    });
    path += ` L ${toX} ${toY}`;
    return `  <path d="${path}" fill="none" stroke="#0f172a" stroke-width="1.6" marker-end="url(#fk-arrow)" />\n`;
  }

  svg += `\n  <!-- Referential Integrity Foreign Key Constraints (Black Lines) -->\n`;

  // CATEGORIES.parent_category_id -> CATEGORIES.category_id
  const catParent = tables.CATEGORIES.cols[4];
  const catPk = tables.CATEGORIES.cols[0];
  svg += drawFkArrow(catParent.midX, catParent.botY, catPk.midX, catPk.botY + 2, [
    { x: catParent.midX, y: catParent.botY + 16 },
    { x: catPk.midX - 30, y: catParent.botY + 16 },
    { x: catPk.midX - 30, y: catPk.botY + 14 },
    { x: catPk.midX, y: catPk.botY + 14 }
  ]);

  // PLACES.created_by_user_id -> USERS.user_id
  const placeUserFk = tables.PLACES.cols[7];
  const userPk = tables.USERS.cols[0];
  svg += drawFkArrow(placeUserFk.midX, placeUserFk.topY - 4, userPk.midX + 25, userPk.botY + 2, [
    { x: placeUserFk.midX, y: 260 },
    { x: userPk.midX + 25, y: 260 }
  ]);

  // PLACE_CATEGORIES.place_id -> PLACES.place_id
  const pcPlace = tables.PLACE_CATEGORIES.cols[0];
  const placePk = tables.PLACES.cols[0];
  svg += drawFkArrow(pcPlace.midX, pcPlace.botY, placePk.midX + 20, placePk.botY + 2, [
    { x: pcPlace.midX, y: 460 },
    { x: placePk.midX + 20, y: 460 }
  ]);

  // PLACE_CATEGORIES.category_id -> CATEGORIES.category_id
  const pcCat = tables.PLACE_CATEGORIES.cols[1];
  svg += drawFkArrow(pcCat.midX, pcCat.topY - 4, catPk.midX + 20, catPk.botY + 2, [
    { x: pcCat.midX, y: 260 },
    { x: catPk.midX + 20, y: 260 }
  ]);

  // PLACE_HOURS_PROFILES.place_id -> PLACES.place_id
  const profPlace = tables.PLACE_HOURS_PROFILES.cols[0];
  svg += drawFkArrow(profPlace.midX, profPlace.topY - 4, placePk.midX + 40, placePk.botY + 2, [
    { x: profPlace.midX, y: 480 },
    { x: placePk.midX + 40, y: 480 }
  ]);

  // PLACE_WEEKLY_HOURS.place_id -> PLACE_HOURS_PROFILES.place_id
  const pwhPlace = tables.PLACE_WEEKLY_HOURS.cols[0];
  svg += drawFkArrow(pwhPlace.midX, pwhPlace.botY, profPlace.midX + 20, profPlace.botY + 2, [
    { x: pwhPlace.midX, y: 680 },
    { x: profPlace.midX + 20, y: 680 }
  ]);

  // REVIEWS.place_id -> PLACES.place_id
  const revPlace = tables.REVIEWS.cols[1];
  svg += drawFkArrow(revPlace.midX, revPlace.topY - 4, placePk.midX + 60, placePk.botY + 2, [
    { x: revPlace.midX, y: 700 },
    { x: 30, y: 700 },
    { x: 30, y: 500 },
    { x: placePk.midX + 60, y: 500 }
  ]);

  // REVIEWS.author_user_id -> USERS.user_id
  const revUser = tables.REVIEWS.cols[2];
  svg += drawFkArrow(revUser.midX, revUser.topY - 4, userPk.midX + 50, userPk.botY + 2, [
    { x: revUser.midX, y: 720 },
    { x: 50, y: 720 },
    { x: 50, y: 280 },
    { x: userPk.midX + 50, y: 280 }
  ]);

  // REVIEW_EMBEDDINGS.review_id -> REVIEWS.review_id
  const embRev = tables.REVIEW_EMBEDDINGS.cols[0];
  const revPk = tables.REVIEWS.cols[0];
  svg += drawFkArrow(embRev.midX, embRev.botY, revPk.midX + 20, revPk.botY + 2, [
    { x: embRev.midX, y: 900 },
    { x: revPk.midX + 20, y: 900 }
  ]);

  // CHECK_INS.user_id -> USERS.user_id
  const ciUser = tables.CHECK_INS.cols[1];
  svg += drawFkArrow(ciUser.midX, ciUser.topY - 4, userPk.midX + 70, userPk.botY + 2, [
    { x: ciUser.midX, y: 950 },
    { x: 20, y: 950 },
    { x: 20, y: 300 },
    { x: userPk.midX + 70, y: 300 }
  ]);

  // CHECK_INS.place_id -> PLACES.place_id
  const ciPlace = tables.CHECK_INS.cols[2];
  svg += drawFkArrow(ciPlace.midX, ciPlace.topY - 4, placePk.midX + 80, placePk.botY + 2, [
    { x: ciPlace.midX, y: 960 },
    { x: 40, y: 960 },
    { x: 40, y: 520 },
    { x: placePk.midX + 80, y: 520 }
  ]);

  // AUTH_SESSIONS.user_id -> USERS.user_id
  const sessUser = tables.AUTH_SESSIONS.cols[1];
  svg += drawFkArrow(sessUser.midX, sessUser.topY - 4, userPk.midX + 90, userPk.botY + 2, [
    { x: sessUser.midX, y: 970 },
    { x: 670, y: 970 },
    { x: 670, y: 320 },
    { x: userPk.midX + 90, y: 320 }
  ]);

  // AUDIT_LOGS.actor_user_id -> USERS.user_id
  const auditUser = tables.AUDIT_LOGS.cols[1];
  svg += drawFkArrow(auditUser.midX, auditUser.topY - 4, userPk.midX + 110, userPk.botY + 2, [
    { x: auditUser.midX, y: 980 },
    { x: 690, y: 980 },
    { x: 690, y: 340 },
    { x: userPk.midX + 110, y: 340 }
  ]);

  // GPS_TRACES.userId (Cross-store dashed ref) -> USERS.user_id
  const gpsUser = tables.GPS_TRACES.cols[1];
  svg += `  <path d="M ${gpsUser.midX} ${gpsUser.topY - 4} L ${gpsUser.midX} 1180 L 10 1180 L 10 240 L ${userPk.midX} 240 L ${userPk.midX} ${userPk.botY + 2}" fill="none" stroke="#0284c7" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#cross-arrow)" />\n`;

  // 3. Legend & Footer
  svg += `
  <!-- Legend Box -->
  <g transform="translate(80, 1400)">
    <rect x="0" y="0" width="1520" height="130" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="24" y="30" font-size="14" font-weight="800" fill="#0f172a">DIAGRAM LEGEND &amp; RELATIONAL MAPPING NOTATIONS (3NF):</text>

    <!-- Red FD explanation -->
    <line x1="30" y1="60" x2="80" y2="60" stroke="#dc2626" stroke-width="2" marker-end="url(#fd-arrow)" />
    <text x="95" y="64" font-size="13" font-weight="700" fill="#dc2626">Functional Dependency (FD):</text>
    <text x="285" y="64" font-size="12" fill="#334155">Primary Key determines each non-prime attribute (Full dependency X → Y; satisfies 2NF &amp; 3NF with zero transitive dependencies).</text>

    <!-- Black FK explanation -->
    <line x1="30" y1="92" x2="80" y2="92" stroke="#0f172a" stroke-width="2" marker-end="url(#fk-arrow)" />
    <text x="95" y="96" font-size="13" font-weight="700" fill="#0f172a">Referential Integrity Constraint (FK):</text>
    <text x="345" y="96" font-size="12" fill="#334155">Foreign Key points to the Primary Key of the referenced relation (enforced with ON DELETE CASCADE / RESTRICT).</text>

    <!-- Blue Cross-Store explanation -->
    <line x1="30" y1="116" x2="80" y2="116" stroke="#0284c7" stroke-width="2" stroke-dasharray="4 4" marker-end="url(#cross-arrow)" />
    <text x="95" y="119" font-size="12" font-weight="700" fill="#0284c7">Cross-Store Reference:</text>
    <text x="245" y="119" font-size="12" fill="#334155">Eventual consistency UUID reference from MongoDB NoSQL collection (gps_traces) to PostgreSQL (users).</text>

    <!-- Key underlines -->
    <text x="1180" y="64" font-size="12" fill="#0f172a"><tspan text-decoration="underline" font-weight="700">attribute</tspan> : Primary Key</text>
    <text x="1180" y="92" font-size="12" fill="#0284c7" font-weight="600">attribute : Foreign Key (dashed underline)</text>
    <text x="1180" y="116" font-size="11" fill="#64748b">Verified in PostgreSQL 16 &amp; MongoDB 8.0</text>
  </g>
</svg>`;

  return svg;
}

// -------------------------------------------------------------
// 2. GENERATE CHEN'S ER DIAGRAM (IMAGE 2 STYLE)
// -------------------------------------------------------------
function generateChenERDiagramSVG() {
  const width = 1920;
  const height = 1580;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <!-- Soft Gradients matching Image 2 -->
    <!-- Entity Gradient (Pastel Green) -->
    <linearGradient id="entity-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#bbf7d0" />
      <stop offset="100%" stop-color="#86efac" />
    </linearGradient>
    <!-- Relationship Gradient (Soft Lavender/Blue) -->
    <linearGradient id="rel-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e0e7ff" />
      <stop offset="100%" stop-color="#c7d2fe" />
    </linearGradient>
    <!-- Attribute Gradient (Pastel Pink/Rose) -->
    <linearGradient id="attr-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffe4e6" />
      <stop offset="100%" stop-color="#fecdd3" />
    </linearGradient>
    <filter id="box-shadow" x="-5%" y="-10%" width="110%" height="125%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.1" />
    </filter>
  </defs>

  <!-- Title & Metadata Header -->
  <g transform="translate(60, 40)">
    <text x="0" y="24" font-size="16" font-weight="700" fill="#334155">12 November 2026</text>
    <text x="0" y="44" font-size="12" fill="#64748b">Semester 5 · PES University</text>

    <text x="900" y="22" font-size="24" font-weight="800" text-anchor="middle" fill="#0f172a" letter-spacing="-0.02em">
      Meridian Geospatial Platform Conceptual ER Diagram (Chen Notation)
    </text>
    <text x="900" y="44" font-size="13" font-weight="600" text-anchor="middle" fill="#4338ca">
      Department of Computer Science &amp; Engineering — DBMS Level 3 Experiential Learning Project
    </text>

    <text x="1800" y="20" font-size="14" font-weight="800" text-anchor="end" fill="#0f172a">
      Sia Simran A (PES1UG24CS453)
    </text>
    <text x="1800" y="40" font-size="14" font-weight="800" text-anchor="end" fill="#0f172a">
      Simret M Kotian (PES1UG24CS456)
    </text>
    <text x="1800" y="58" font-size="11" text-anchor="end" fill="#64748b">Chen's Notation: Rectangles, Diamonds &amp; Ellipses</text>

    <line x1="0" y1="72" x2="1800" y2="72" stroke="#e2e8f0" stroke-width="2" />
  </g>
`;

  // Draw Entity Box
  function renderEntity(name, cx, cy, w = 150, h = 48, isWeak = false) {
    const x = cx - w / 2;
    const y = cy - h / 2;
    let res = `\n  <!-- Entity: ${name} -->\n  <g id="entity-${name.toLowerCase()}">\n`;
    res += `    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#entity-grad)" stroke="#16a34a" stroke-width="1.8" filter="url(#box-shadow)" />\n`;
    if (isWeak) {
      res += `    <rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="2" fill="none" stroke="#16a34a" stroke-width="1.4" />\n`;
    }
    res += `    <text x="${cx}" y="${cy + 5}" font-size="14" font-weight="800" text-anchor="middle" fill="#14532d">${name}</text>\n`;
    res += `  </g>\n`;
    return res;
  }

  // Draw Diamond Relationship
  function renderRelationship(name, cx, cy, w = 110, h = 54, isIdentifying = false) {
    const x1 = cx; const y1 = cy - h / 2;
    const x2 = cx + w / 2; const y2 = cy;
    const x3 = cx; const y3 = cy + h / 2;
    const x4 = cx - w / 2; const y4 = cy;
    const pts = `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`;

    let res = `\n  <!-- Relationship: ${name} -->\n  <g id="rel-${name.toLowerCase()}">\n`;
    res += `    <polygon points="${pts}" fill="url(#rel-grad)" stroke="#4338ca" stroke-width="1.8" filter="url(#box-shadow)" />\n`;
    if (isIdentifying) {
      const sw = w - 8;
      const sh = h - 6;
      const innerPts = `${cx},${cy - sh/2} ${cx + sw/2},${cy} ${cx},${cy + sh/2} ${cx - sw/2},${cy}`;
      res += `    <polygon points="${innerPts}" fill="none" stroke="#4338ca" stroke-width="1.4" />\n`;
    }
    res += `    <text x="${cx}" y="${cy + 5}" font-size="12" font-weight="700" text-anchor="middle" fill="#312e81">${name}</text>\n`;
    res += `  </g>\n`;
    return res;
  }

  // Draw Attribute Oval / Ellipse
  function renderAttribute(name, cx, cy, rx = 52, ry = 20, isPk = false, isMulti = false, isDerived = false, isPartial = false) {
    let res = `  <g id="attr-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}">\n`;
    let strokeDash = isDerived ? `stroke-dasharray="4 3"` : "";
    res += `    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#attr-grad)" stroke="#e11d48" stroke-width="1.5" ${strokeDash} filter="url(#box-shadow)" />\n`;
    if (isMulti) {
      res += `    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 4}" ry="${ry - 3}" fill="none" stroke="#e11d48" stroke-width="1.2" />\n`;
    }

    let textStyle = `font-size="11" text-anchor="middle" fill="#881337"`;
    if (isPk) {
      textStyle += ` font-weight="700" text-decoration="underline"`;
    } else if (isPartial) {
      textStyle += ` font-weight="600"`;
    } else {
      textStyle += ` font-weight="500"`;
    }

    res += `    <text x="${cx}" y="${cy + 4}" ${textStyle}>${name}</text>\n`;

    if (isPartial) {
      // Draw dashed line under text
      const len = name.length * 6;
      res += `    <line x1="${cx - len/2}" y1="${cy + 7}" x2="${cx + len/2}" y2="${cy + 7}" stroke="#e11d48" stroke-width="1.2" stroke-dasharray="2 2" />\n`;
    }

    res += `  </g>\n`;
    return res;
  }

  // Draw Line Connector
  function renderLine(x1, y1, x2, y2, stroke = "#475569", strokeWidth = 1.3, dash = "") {
    const dashAttr = dash ? `stroke-dasharray="${dash}"` : "";
    return `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" ${dashAttr} />\n`;
  }

  // Draw Cardinality Label
  function renderCard(text, x, y) {
    return `  <text x="${x}" y="${y}" font-size="12" font-weight="800" fill="#0f172a" text-anchor="middle">${text}</text>\n`;
  }

  // -----------------------------------------------------------
  // LAYOUT & COORDINATES
  // -----------------------------------------------------------

  // Connectors Layer
  svg += `\n  <!-- Relationship & Attribute Connectors -->\n`;

  // ENTITIES
  // User (cx=300, cy=460)
  // Place (cx=880, cy=460)
  // Category (cx=1560, cy=460)
  // Review (cx=880, cy=960)
  // ReviewEmbedding (cx=1560, cy=960) - Weak
  // PlaceHoursProfile (cx=880, cy=200)
  // PlaceWeeklyHours (cx=1560, cy=200) - Weak
  // CheckIn (cx=300, cy=960)
  // AuthSession (cx=300, cy=200)
  // GPSTrace (cx=300, cy=1320) - NoSQL

  // RELATIONSHIPS
  // User <-> Place: "Creates" at (590, 460)
  svg += renderLine(300, 460, 535, 460); // User to Creates
  svg += renderLine(645, 460, 880, 460); // Creates to Place
  svg += renderCard("1", 390, 452);
  svg += renderCard("N", 790, 452);

  // Place <-> Category: "ClassifiedIn" at (1220, 460)
  svg += renderLine(880, 460, 1165, 460);
  svg += renderLine(1275, 460, 1560, 460);
  svg += renderCard("M", 975, 452);
  svg += renderCard("N", 1465, 452);

  // Category <-> Category: "SubCategory" at (1560, 340) (recursive loop)
  svg += renderLine(1560, 436, 1560, 367);
  svg += renderLine(1615, 340, 1720, 340);
  svg += renderLine(1720, 340, 1720, 460);
  svg += renderLine(1720, 460, 1635, 460);
  svg += renderCard("1", 1572, 395);
  svg += renderCard("N", 1680, 452);

  // Place <-> PlaceHoursProfile: "HasProfile" at (880, 330)
  svg += renderLine(880, 436, 880, 357);
  svg += renderLine(880, 303, 880, 224);
  svg += renderCard("1", 894, 385);
  svg += renderCard("1", 894, 260);

  // PlaceHoursProfile <-> PlaceWeeklyHours: "DefinesSchedule" at (1220, 200)
  svg += renderLine(955, 200, 1165, 200);
  svg += renderLine(1275, 200, 1485, 200);
  svg += renderCard("1", 1010, 192);
  svg += renderCard("N", 1430, 192);

  // User <-> Review: "WritesReview" at (520, 710)
  svg += renderLine(300, 484, 465, 683);
  svg += renderLine(575, 737, 880, 936);
  svg += renderCard("1", 380, 560);
  svg += renderCard("N", 780, 860);

  // Place <-> Review: "ReceivesReview" at (880, 710)
  svg += renderLine(880, 484, 880, 683);
  svg += renderLine(880, 737, 880, 936);
  svg += renderCard("1", 894, 550);
  svg += renderCard("N", 894, 870);

  // Review <-> ReviewEmbedding: "GeneratesEmbedding" at (1220, 960)
  svg += renderLine(955, 960, 1165, 960);
  svg += renderLine(1275, 960, 1485, 960);
  svg += renderCard("1", 1010, 952);
  svg += renderCard("1", 1430, 952);

  // User <-> CheckIn: "LogsCheckIn" at (300, 710)
  svg += renderLine(300, 484, 300, 683);
  svg += renderLine(300, 737, 300, 936);
  svg += renderCard("1", 314, 550);
  svg += renderCard("N", 314, 870);

  // Place <-> CheckIn: "CheckedAt" at (590, 710)
  svg += renderLine(880, 484, 645, 683);
  svg += renderLine(535, 737, 300, 936);
  svg += renderCard("1", 780, 560);
  svg += renderCard("N", 380, 860);

  // User <-> AuthSession: "Maintains" at (300, 330)
  svg += renderLine(300, 436, 300, 357);
  svg += renderLine(300, 303, 300, 224);
  svg += renderCard("1", 314, 385);
  svg += renderCard("N", 314, 260);

  // User <-> GPSTrace: "RecordsTrace" at (300, 1140) (Cross-store dashed)
  svg += renderLine(300, 984, 300, 1113, "#0284c7", 1.8, "4 4");
  svg += renderLine(300, 1167, 300, 1296, "#0284c7", 1.8, "4 4");
  svg += renderCard("1", 314, 1050);
  svg += renderCard("N", 314, 1230);

  // -----------------------------------------------------------
  // ATTRIBUTE CONNECTORS (Lines from Entities to Ovals)
  // -----------------------------------------------------------

  // User Attributes (Left of User entity)
  const uAttrs = [
    { name: "user_id", x: 100, y: 360, isPk: true },
    { name: "email", x: 100, y: 410 },
    { name: "display_name", x: 100, y: 460 },
    { name: "password_hash", x: 100, y: 510 },
    { name: "role", x: 100, y: 560 },
    { name: "is_active", x: 100, y: 610 }
  ];
  uAttrs.forEach(a => svg += renderLine(300, 460, a.x, a.y, "#fda4af"));

  // Place Attributes (Spread around Place entity)
  const pAttrs = [
    { name: "place_id", x: 700, y: 390, isPk: true },
    { name: "name", x: 740, y: 350 },
    { name: "description", x: 1020, y: 350 },
    { name: "address", x: 1060, y: 390 },
    { name: "location (Pt)", x: 700, y: 530 },
    { name: "time_zone", x: 760, y: 570 },
    { name: "phone", x: 1000, y: 570 },
    { name: "is_active", x: 1060, y: 530 },
    { name: "avg_rating", x: 880, y: 600, isDerived: true }
  ];
  pAttrs.forEach(a => svg += renderLine(880, 460, a.x, a.y, "#fda4af"));

  // Category Attributes (Right of Category entity)
  const cAttrs = [
    { name: "category_id", x: 1780, y: 410, isPk: true },
    { name: "name", x: 1780, y: 460 },
    { name: "slug", x: 1780, y: 510 },
    { name: "description", x: 1780, y: 560 }
  ];
  cAttrs.forEach(a => svg += renderLine(1560, 460, a.x, a.y, "#fda4af"));

  // PlaceWeeklyHours Attributes
  const pwhAttrs = [
    { name: "iso_weekday", x: 1440, y: 110, isPartial: true },
    { name: "period_no", x: 1560, y: 100, isPartial: true },
    { name: "is_closed", x: 1680, y: 110 },
    { name: "opens_at", x: 1720, y: 180 },
    { name: "closes_at", x: 1720, y: 230 }
  ];
  pwhAttrs.forEach(a => svg += renderLine(1560, 200, a.x, a.y, "#fda4af"));

  // Review Attributes
  const revAttrs = [
    { name: "review_id", x: 740, y: 1040, isPk: true },
    { name: "rating", x: 830, y: 1070 },
    { name: "body", x: 930, y: 1070 },
    { name: "moderation", x: 1020, y: 1040 },
    { name: "created_at", x: 880, y: 1110 }
  ];
  revAttrs.forEach(a => svg += renderLine(880, 960, a.x, a.y, "#fda4af"));

  // ReviewEmbedding Attributes
  const embAttrs = [
    { name: "embedding (v384)", x: 1780, y: 910 },
    { name: "model_name", x: 1780, y: 960 },
    { name: "model_revision", x: 1780, y: 1010 },
    { name: "input_sha256", x: 1780, y: 1060 }
  ];
  embAttrs.forEach(a => svg += renderLine(1560, 960, a.x, a.y, "#fda4af"));

  // CheckIn Attributes
  const ciAttrs = [
    { name: "check_in_id", x: 100, y: 910, isPk: true },
    { name: "checked_in_at", x: 100, y: 960 },
    { name: "source", x: 100, y: 1010 }
  ];
  ciAttrs.forEach(a => svg += renderLine(300, 960, a.x, a.y, "#fda4af"));

  // AuthSession Attributes
  const sessAttrs = [
    { name: "session_id", x: 100, y: 160, isPk: true },
    { name: "expires_at", x: 100, y: 210 },
    { name: "revoked_at", x: 100, y: 260 }
  ];
  sessAttrs.forEach(a => svg += renderLine(300, 200, a.x, a.y, "#fda4af"));

  // GPSTrace Attributes (Bottom)
  const gpsAttrs = [
    { name: "_id", x: 100, y: 1280, isPk: true },
    { name: "deviceId", x: 100, y: 1330 },
    { name: "batteryLevel", x: 100, y: 1380 },
    { name: "points", x: 500, y: 1320, isMulti: true },
    { name: "distance_km", x: 500, y: 1370, isDerived: true }
  ];
  gpsAttrs.forEach(a => svg += renderLine(300, 1320, a.x, a.y, "#7dd3fc"));

  // -----------------------------------------------------------
  // RENDER ENTITIES & RELATIONSHIPS
  // -----------------------------------------------------------

  // Entities (Green Rectangles)
  svg += renderEntity("User", 300, 460);
  svg += renderEntity("Place", 880, 460);
  svg += renderEntity("Category", 1560, 460);
  svg += renderEntity("PlaceHoursProfile", 880, 200);
  svg += renderEntity("PlaceWeeklyHours", 1560, 200, 170, 48, true); // Weak Entity
  svg += renderEntity("Review", 880, 960);
  svg += renderEntity("ReviewEmbedding", 1560, 960, 170, 48, true); // Weak Entity
  svg += renderEntity("CheckIn", 300, 960);
  svg += renderEntity("AuthSession", 300, 200);
  svg += renderEntity("GPSTrace", 300, 1320); // NoSQL Store

  // Relationships (Diamonds)
  svg += renderRelationship("Creates", 590, 460);
  svg += renderRelationship("ClassifiedIn", 1220, 460, 120);
  svg += renderRelationship("SubCategory", 1560, 340, 110);
  svg += renderRelationship("HasProfile", 880, 330);
  svg += renderRelationship("DefinesSchedule", 1220, 200, 130, 54, true); // Identifying
  svg += renderRelationship("WritesReview", 520, 710, 120);
  svg += renderRelationship("ReceivesReview", 880, 710, 130);
  svg += renderRelationship("GeneratesEmbedding", 1220, 960, 140, 54, true); // Identifying
  svg += renderRelationship("LogsCheckIn", 300, 710, 110);
  svg += renderRelationship("CheckedAt", 590, 710, 110);
  svg += renderRelationship("Maintains", 300, 330, 110);
  svg += renderRelationship("RecordsTrace", 300, 1140, 120);

  // -----------------------------------------------------------
  // RENDER ATTRIBUTES (Ovals)
  // -----------------------------------------------------------
  uAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, 50, 18, a.isPk));
  pAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, a.name.length > 10 ? 56 : 48, 18, a.isPk, false, a.isDerived));
  cAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, a.name.length > 10 ? 56 : 48, 18, a.isPk));
  pwhAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, 50, 18, false, false, false, a.isPartial));
  revAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, 48, 18, a.isPk));
  embAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, 60, 18));
  ciAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, 50, 18, a.isPk));
  sessAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, 50, 18, a.isPk));
  gpsAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, a.isMulti ? 45 : 50, 18, a.isPk, a.isMulti, a.isDerived));

  // -----------------------------------------------------------
  // LEGEND
  // -----------------------------------------------------------
  svg += `
  <!-- Legend Box -->
  <g transform="translate(60, 1440)">
    <rect x="0" y="0" width="1800" height="100" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="24" y="26" font-size="13" font-weight="800" fill="#0f172a">CHEN'S ER NOTATION CONVENTIONS:</text>

    <!-- Rectangle (Entity) -->
    <rect x="30" y="42" width="70" height="24" rx="3" fill="url(#entity-grad)" stroke="#16a34a" stroke-width="1.5" />
    <text x="110" y="58" font-size="12" font-weight="700" fill="#14532d">Strong Entity Set</text>

    <!-- Double Rectangle (Weak Entity) -->
    <rect x="250" y="42" width="70" height="24" rx="3" fill="url(#entity-grad)" stroke="#16a34a" stroke-width="1.5" />
    <rect x="253" y="45" width="64" height="18" rx="2" fill="none" stroke="#16a34a" stroke-width="1" />
    <text x="330" y="58" font-size="12" font-weight="700" fill="#14532d">Weak Entity Set</text>

    <!-- Diamond (Relationship) -->
    <polygon points="460,42 485,54 460,66 435,54" fill="url(#rel-grad)" stroke="#4338ca" stroke-width="1.5" />
    <text x="495" y="58" font-size="12" font-weight="700" fill="#312e81">Relationship Set</text>

    <!-- Double Diamond (Identifying Relationship) -->
    <polygon points="630,42 655,54 630,66 605,54" fill="url(#rel-grad)" stroke="#4338ca" stroke-width="1.5" />
    <polygon points="630,45 650,54 630,63 610,54" fill="none" stroke="#4338ca" stroke-width="1" />
    <text x="665" y="58" font-size="12" font-weight="700" fill="#312e81">Identifying Relationship</text>

    <!-- Oval (Attribute) -->
    <ellipse cx="830" cy="54" rx="28" ry="12" fill="url(#attr-grad)" stroke="#e11d48" stroke-width="1.4" />
    <text x="830" y="58" font-size="10" font-weight="700" text-anchor="middle" text-decoration="underline" fill="#881337">Key</text>
    <text x="870" y="58" font-size="12" font-weight="700" fill="#881337">Primary Key</text>

    <!-- Multivalued Attribute -->
    <ellipse cx="980" cy="54" rx="28" ry="12" fill="url(#attr-grad)" stroke="#e11d48" stroke-width="1.4" />
    <ellipse cx="980" cy="54" rx="24" ry="9" fill="none" stroke="#e11d48" stroke-width="1" />
    <text x="1020" y="58" font-size="12" font-weight="700" fill="#881337">Multivalued Attribute</text>

    <!-- Derived Attribute -->
    <ellipse cx="1180" cy="54" rx="28" ry="12" fill="url(#attr-grad)" stroke="#e11d48" stroke-width="1.4" stroke-dasharray="3 2" />
    <text x="1220" y="58" font-size="12" font-weight="700" fill="#881337">Derived Attribute</text>

    <!-- Cardinality Ratio -->
    <text x="1350" y="58" font-size="12" font-weight="800" fill="#0f172a">1 : N / M : N</text>
    <text x="1440" y="58" font-size="12" fill="#334155">Structural Cardinality Ratios</text>

    <text x="1650" y="58" font-size="12" font-weight="700" fill="#0284c7">NoSQL Boundary Ref (Dashed)</text>
  </g>
</svg>`;

  return svg;
}

// -------------------------------------------------------------
// 3. GENERATE INTERACTIVE HTML VIEWER WITH HIGH RESOLUTION & ZOOM
// -------------------------------------------------------------
function generateViewerHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meridian Database Diagrams | ER &amp; Relational Schema 3NF</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #0f172a;
      --border: #1e293b;
      --accent: #06b6d4;
      --accent-alt: #10b981;
      --text: #f8fafc;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-badge {
      font-size: 11px;
      font-weight: 700;
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid rgba(6, 182, 212, 0.4);
      color: var(--accent);
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .authors-info {
      font-size: 12px;
      color: var(--muted);
      text-align: right;
      line-height: 1.4;
    }
    .authors-info strong {
      color: #e2e8f0;
    }
    .nav-tabs {
      display: flex;
      gap: 12px;
      padding: 12px 32px;
      background: #0b1120;
      border-bottom: 1px solid var(--border);
    }
    .tab-btn {
      background: #111827;
      border: 1px solid var(--border);
      color: var(--muted);
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      background: #1e293b;
      color: #fff;
    }
    .tab-btn.active {
      background: rgba(6, 182, 212, 0.15);
      border-color: var(--accent);
      color: var(--accent);
    }
    .action-group {
      margin-left: auto;
      display: flex;
      gap: 10px;
    }
    .action-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #f1f5f9;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .action-btn:hover {
      background: #334155;
    }
    main {
      flex: 1;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow-x: auto;
    }
    .diagram-viewport {
      width: 100%;
      max-width: 1720px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      overflow: hidden;
      border: 1px solid #334155;
      position: relative;
    }
    .diagram-viewport img, .diagram-viewport svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .diagram-panel {
      display: none;
      width: 100%;
    }
    .diagram-panel.active {
      display: block;
    }
    footer {
      padding: 16px 32px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <header>
    <div>
      <div class="brand-title">
        <span>Meridian: Geospatial Intelligence Platform</span>
        <span class="brand-badge">DBMS Level 3 Project</span>
      </div>
      <div style="font-size: 11px; color: var(--muted); margin-top: 3px;">
        Department of Computer Science &amp; Engineering — PES University
      </div>
    </div>
    <div class="authors-info">
      <div><strong>Sia Simran A</strong> (SRN: PES1UG24CS453)</div>
      <div><strong>Simret M Kotian</strong> (SRN: PES1UG24CS456)</div>
    </div>
  </header>

  <div class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('relational')">
      📊 Relational Schema 3NF Diagram (Image 1 Style)
    </button>
    <button class="tab-btn" onclick="switchTab('chen')">
      🔶 Conceptual Chen's ER Diagram (Image 2 Style)
    </button>

    <div class="action-group">
      <a class="action-btn" id="download-svg" href="relational_schema_3nf.svg" download="Meridian_Relational_Schema_3NF.svg">
        ⬇ Download SVG
      </a>
      <button class="action-btn" onclick="window.print()">
        🖨 Print / Export PDF
      </button>
    </div>
  </div>

  <main>
    <div class="diagram-viewport">
      <div id="panel-relational" class="diagram-panel active">
        <object type="image/svg+xml" data="relational_schema_3nf.svg" style="width:100%; height:auto;"></object>
      </div>
      <div id="panel-chen" class="diagram-panel">
        <object type="image/svg+xml" data="chen_er_diagram.svg" style="width:100%; height:auto;"></object>
      </div>
    </div>
  </main>

  <footer>
    Meridian: Geospatial Intelligence Platform · Relational (PostgreSQL) + Spatial (PostGIS) + Vector (pgvector) + NoSQL (MongoDB) · 3NF Certified
  </footer>

  <script>
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.diagram-panel').forEach(p => p.classList.remove('active'));

      if (tabId === 'relational') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('panel-relational').classList.add('active');
        document.getElementById('download-svg').href = 'relational_schema_3nf.svg';
        document.getElementById('download-svg').setAttribute('download', 'Meridian_Relational_Schema_3NF.svg');
      } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('panel-chen').classList.add('active');
        document.getElementById('download-svg').href = 'chen_er_diagram.svg';
        document.getElementById('download-svg').setAttribute('download', 'Meridian_Chen_ER_Diagram.svg');
      }
    }
  </script>
</body>
</html>`;
}

// -------------------------------------------------------------
// EXECUTE GENERATION
// -------------------------------------------------------------
const schemaSvg = generateRelationalSchemaSVG();
fs.writeFileSync(path.join(outDir, 'relational_schema_3nf.svg'), schemaSvg, 'utf8');
console.log('✓ Generated: docs/diagrams/relational_schema_3nf.svg');

const chenSvg = generateChenERDiagramSVG();
fs.writeFileSync(path.join(outDir, 'chen_er_diagram.svg'), chenSvg, 'utf8');
console.log('✓ Generated: docs/diagrams/chen_er_diagram.svg');

const viewerHtml = generateViewerHTML();
fs.writeFileSync(path.join(outDir, 'index.html'), viewerHtml, 'utf8');
console.log('✓ Generated: docs/diagrams/index.html');
