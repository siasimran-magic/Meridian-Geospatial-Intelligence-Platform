/**
 * Precision generator for:
 * 1. Relational Schema 3NF Diagram (Exact Image 1 style - Orthogonal red FDs, stepped black FKs, large text, A4 Landscape)
 * 2. Chen's ER Diagram (Exact Image 2 style - Pastel green entities, purple diamonds, pink attribute ovals, A4 Landscape)
 *
 * Header:
 * Title: Meridian: Geospatial Intelligence Platform Relational Schema 3NF
 * Authors: Sia Simran A (PES1UG24CS453) · Simret M Kotian (PES1UG24CS456)
 * Canvas: Standard A4 Landscape (1500 x 1060, ratio 1.414)
 */

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'docs', 'diagrams');
const pubDir = path.join(__dirname, '..', 'public', 'diagrams');
const artifactDir = 'C:\\Users\\siasi\\.gemini\\antigravity\\brain\\c462495f-629f-466c-a621-7ccc18872012';

// ----------------------------------------------------------------------
// 1. GENERATE RELATIONAL SCHEMA 3NF (EXACT IMAGE 1 MATCH - A4 LANDSCAPE)
// ----------------------------------------------------------------------
function generateRelationalSchemaA4() {
  const width = 1500;
  const height = 1060;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
  <defs>
    <!-- Sharp Black FK Arrowhead -->
    <marker id="fk-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
    </marker>
    <!-- Sharp Red FD Arrowhead -->
    <marker id="fd-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#d90429" />
    </marker>
    <!-- Blue NoSQL Arrowhead -->
    <marker id="nosql-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0284c7" />
    </marker>
  </defs>

  <!-- Clean Header (Title & Authors Only) -->
  <g transform="translate(60, 45)">
    <text x="690" y="22" font-size="24" font-weight="bold" text-anchor="middle" fill="#000000" letter-spacing="-0.01em">
      Meridian Geospatial Platform Relational Schema 3NF
    </text>
    <text x="690" y="48" font-size="16" font-weight="bold" text-anchor="middle" fill="#1e293b">
      Sia Simran A (PES1UG24CS453) &amp; Simret M Kotian (PES1UG24CS456)
    </text>
  </g>
`;

  // Draw table helper
  function drawTable(name, x, y, cols) {
    const rowH = 38;
    let totalW = 0;
    cols.forEach(c => totalW += c.w);

    let res = `\n  <!-- Table: ${name} -->\n  <g id="table-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}">\n`;
    // Table name in capital letters above rectangle (Image 1 style)
    res += `    <text x="${x}" y="${y - 10}" font-size="15" font-weight="bold" fill="#000000" letter-spacing="0.04em">${name}</text>\n`;
    // Outer box
    res += `    <rect x="${x}" y="${y}" width="${totalW}" height="${rowH}" fill="#ffffff" stroke="#000000" stroke-width="1.6" />\n`;

    let curX = x;
    cols.forEach((col, idx) => {
      // Internal vertical divider
      if (idx > 0) {
        res += `    <line x1="${curX}" y1="${y}" x2="${curX}" y2="${y + rowH}" stroke="#000000" stroke-width="1.3" />\n`;
      }

      const midX = curX + col.w / 2;
      const textY = y + 24;

      // Text inside cell
      let textDecoration = col.isPk ? `text-decoration="underline"` : "";
      let fontWeight = col.isPk ? "bold" : (col.isFk ? "600" : "500");
      let fontColor = "#000000";

      res += `    <text x="${midX}" y="${textY}" font-size="14" font-weight="${fontWeight}" fill="${fontColor}" text-anchor="middle" ${textDecoration}>${col.name}</text>\n`;

      // Dotted underline for Foreign Key (Image 1 style)
      if (col.isFk && !col.isPk) {
        const textLen = col.name.length * 8;
        const lineStart = midX - textLen / 2;
        const lineEnd = midX + textLen / 2;
        res += `    <line x1="${lineStart}" y1="${textY + 4}" x2="${lineEnd}" y2="${textY + 4}" stroke="#000000" stroke-width="1.4" stroke-dasharray="2.5 2.5" />\n`;
      }

      col.midX = midX;
      col.topY = y;
      col.botY = y + rowH;
      col.leftX = curX;
      col.rightX = curX + col.w;

      curX += col.w;
    });

    res += `  </g>\n`;

    // Draw Red Right-Angled Functional Dependency Arcs (Exact Image 1 Style)
    // Red line starts from PK top, goes UP, across HORIZONTALLY, and DOWN into each dependent attribute
    const pkCol = cols.find(c => c.isPk && !c.isPkPart);
    if (pkCol) {
      const topOffset = 18;
      const busY = y - topOffset;

      cols.forEach(col => {
        if (col !== pkCol && !col.isPkPart) {
          res += `  <!-- FD: ${pkCol.name} -> ${col.name} -->\n`;
          res += `  <path d="M ${pkCol.midX} ${y} L ${pkCol.midX} ${busY} L ${col.midX} ${busY} L ${col.midX} ${y - 1}" fill="none" stroke="#d90429" stroke-width="1.4" marker-end="url(#fd-arrow)" />\n`;
        }
      });
    }

    return res;
  }

  // Draw Stepped Orthogonal Black Foreign Key Line (Exact Image 1 Style)
  function drawFkStepped(fromX, fromY, toX, toY, dropY) {
    return `  <path d="M ${fromX} ${fromY} L ${fromX} ${dropY} L ${toX} ${dropY} L ${toX} ${toY + 1}" fill="none" stroke="#000000" stroke-width="1.6" marker-end="url(#fk-arrow)" />\n`;
  }

  // -------------------------------------------------------------
  // TABLE DEFINITIONS - CLEAN 2-CASCADE LAYOUT ON A4 LANDSCAPE
  // -------------------------------------------------------------

  // LEFT CASCADE (User Identity, Engagement, Sessions & Trajectories)
  const USERS = {
    name: "USERS", x: 60, y: 150,
    cols: [
      { name: "user_id", w: 105, isPk: true },
      { name: "email", w: 135 },
      { name: "display_name", w: 125 },
      { name: "password_hash", w: 135 },
      { name: "role", w: 75 },
      { name: "is_active", w: 90 }
    ]
  };

  const AUTH_SESSIONS = {
    name: "AUTH_SESSIONS", x: 60, y: 310,
    cols: [
      { name: "session_id", w: 120, isPk: true },
      { name: "user_id", w: 105, isFk: true },
      { name: "expires_at", w: 110 },
      { name: "revoked_at", w: 110 }
    ]
  };

  const REVIEWS = {
    name: "REVIEWS", x: 60, y: 470,
    cols: [
      { name: "review_id", w: 115, isPk: true },
      { name: "place_id", w: 105, isFk: true },
      { name: "author_user_id", w: 140, isFk: true },
      { name: "rating", w: 80 },
      { name: "body", w: 100 },
      { name: "status", w: 90 }
    ]
  };

  const REVIEW_EMBEDDINGS = {
    name: "REVIEW_EMBEDDINGS", x: 60, y: 630,
    cols: [
      { name: "review_id", w: 115, isPk: true, isFk: true },
      { name: "embedding (v384)", w: 155 },
      { name: "model_name", w: 125 },
      { name: "model_revision", w: 135 }
    ]
  };

  const GPS_TRACES = {
    name: "GPS_TRACES (MongoDB NoSQL)", x: 60, y: 790,
    cols: [
      { name: "_id", w: 100, isPk: true },
      { name: "userId", w: 110, isFk: true },
      { name: "deviceId", w: 115 },
      { name: "points[]", w: 120 },
      { name: "batteryLevel", w: 110 },
      { name: "createdAt", w: 110 }
    ]
  };

  // RIGHT CASCADE (Places, Categories, Schedules, Check-ins)
  const CATEGORIES = {
    name: "CATEGORIES", x: 790, y: 150,
    cols: [
      { name: "category_id", w: 125, isPk: true },
      { name: "name", w: 120 },
      { name: "slug", w: 110 },
      { name: "description", w: 130 },
      { name: "parent_category_id", w: 165, isFk: true }
    ]
  };

  const PLACES = {
    name: "PLACES", x: 790, y: 310,
    cols: [
      { name: "place_id", w: 110, isPk: true },
      { name: "name", w: 115 },
      { name: "description", w: 120 },
      { name: "location (Pt)", w: 125 },
      { name: "time_zone", w: 105 },
      { name: "created_by_user_id", w: 165, isFk: true }
    ]
  };

  const PLACE_CATEGORIES = {
    name: "PLACE_CATEGORIES", x: 790, y: 470,
    cols: [
      { name: "place_id", w: 120, isPk: true, isFk: true },
      { name: "category_id", w: 135, isPk: true, isFk: true }
    ]
  };

  const CHECK_INS = {
    name: "CHECK_INS", x: 1090, y: 470,
    cols: [
      { name: "check_in_id", w: 120, isPk: true },
      { name: "user_id", w: 105, isFk: true },
      { name: "place_id", w: 105, isFk: true }
    ]
  };

  const PLACE_WEEKLY_HOURS = {
    name: "PLACE_WEEKLY_HOURS", x: 790, y: 630,
    cols: [
      { name: "place_id", w: 110, isPk: true, isFk: true },
      { name: "iso_weekday", w: 120, isPk: true, isPkPart: true },
      { name: "period_no", w: 105, isPk: true, isPkPart: true },
      { name: "is_closed", w: 100 },
      { name: "opens_at", w: 105 },
      { name: "closes_at", w: 105 }
    ]
  };

  // Render Left Cascade
  svg += drawTable(USERS.name, USERS.x, USERS.y, USERS.cols);
  svg += drawTable(AUTH_SESSIONS.name, AUTH_SESSIONS.x, AUTH_SESSIONS.y, AUTH_SESSIONS.cols);
  svg += drawTable(REVIEWS.name, REVIEWS.x, REVIEWS.y, REVIEWS.cols);
  svg += drawTable(REVIEW_EMBEDDINGS.name, REVIEW_EMBEDDINGS.x, REVIEW_EMBEDDINGS.y, REVIEW_EMBEDDINGS.cols);
  svg += drawTable(GPS_TRACES.name, GPS_TRACES.x, GPS_TRACES.y, GPS_TRACES.cols);

  // Render Right Cascade
  svg += drawTable(CATEGORIES.name, CATEGORIES.x, CATEGORIES.y, CATEGORIES.cols);
  svg += drawTable(PLACES.name, PLACES.x, PLACES.y, PLACES.cols);
  svg += drawTable(PLACE_CATEGORIES.name, PLACE_CATEGORIES.x, PLACE_CATEGORIES.y, PLACE_CATEGORIES.cols);
  svg += drawTable(CHECK_INS.name, CHECK_INS.x, CHECK_INS.y, CHECK_INS.cols);
  svg += drawTable(PLACE_WEEKLY_HOURS.name, PLACE_WEEKLY_HOURS.x, PLACE_WEEKLY_HOURS.y, PLACE_WEEKLY_HOURS.cols);

  // -------------------------------------------------------------
  // STEPPED BLACK REFERENTIAL INTEGRITY ARROWS (EXACT IMAGE 1 MATCH)
  // -------------------------------------------------------------
  svg += `\n  <!-- Referential Integrity Constraints (Foreign Keys) -->\n`;

  // 1. AUTH_SESSIONS.user_id -> USERS.user_id (Up and left into bottom of USERS.user_id)
  svg += drawFkStepped(
    AUTH_SESSIONS.cols[1].midX, AUTH_SESSIONS.cols[1].topY,
    USERS.cols[0].midX + 25, USERS.cols[0].botY,
    260
  );

  // 2. REVIEWS.author_user_id -> USERS.user_id
  svg += drawFkStepped(
    REVIEWS.cols[2].midX, REVIEWS.cols[2].topY,
    USERS.cols[0].midX + 45, USERS.cols[0].botY,
    275
  );

  // 3. REVIEW_EMBEDDINGS.review_id -> REVIEWS.review_id
  svg += drawFkStepped(
    REVIEW_EMBEDDINGS.cols[0].midX, REVIEW_EMBEDDINGS.cols[0].topY,
    REVIEWS.cols[0].midX + 20, REVIEWS.cols[0].botY,
    570
  );

  // 4. GPS_TRACES.userId (NoSQL Loose Ref) -> USERS.user_id
  svg += `  <path d="M ${GPS_TRACES.cols[1].midX} ${GPS_TRACES.cols[1].topY} L ${GPS_TRACES.cols[1].midX} 730 L 40 730 L 40 230 L ${USERS.cols[0].midX} 230 L ${USERS.cols[0].midX} ${USERS.cols[0].botY + 1}" fill="none" stroke="#0284c7" stroke-width="1.6" stroke-dasharray="4 4" marker-end="url(#nosql-arrow)" />\n`;

  // 5. CATEGORIES.parent_category_id -> CATEGORIES.category_id (Self loop)
  const catParent = CATEGORIES.cols[4];
  const catPk = CATEGORIES.cols[0];
  svg += `  <path d="M ${catParent.midX} ${catParent.botY} L ${catParent.midX} 210 L ${catPk.midX - 25} 210 L ${catPk.midX - 25} ${catPk.botY + 1}" fill="none" stroke="#000000" stroke-width="1.6" marker-end="url(#fk-arrow)" />\n`;

  // 6. PLACES.created_by_user_id -> USERS.user_id (Cross cascade)
  svg += `  <path d="M ${PLACES.cols[5].midX} ${PLACES.cols[5].topY} L ${PLACES.cols[5].midX} 250 L ${USERS.cols[0].midX + 65} 250 L ${USERS.cols[0].midX + 65} ${USERS.cols[0].botY + 1}" fill="none" stroke="#000000" stroke-width="1.6" marker-end="url(#fk-arrow)" />\n`;

  // 7. PLACE_CATEGORIES.place_id -> PLACES.place_id
  svg += drawFkStepped(
    PLACE_CATEGORIES.cols[0].midX, PLACE_CATEGORIES.cols[0].topY,
    PLACES.cols[0].midX + 25, PLACES.cols[0].botY,
    420
  );

  // 8. PLACE_CATEGORIES.category_id -> CATEGORIES.category_id
  svg += `  <path d="M ${PLACE_CATEGORIES.cols[1].midX} ${PLACE_CATEGORIES.cols[1].topY} L ${PLACE_CATEGORIES.cols[1].midX} 270 L ${CATEGORIES.cols[0].midX + 25} 270 L ${CATEGORIES.cols[0].midX + 25} ${CATEGORIES.cols[0].botY + 1}" fill="none" stroke="#000000" stroke-width="1.6" marker-end="url(#fk-arrow)" />\n`;

  // 9. REVIEWS.place_id -> PLACES.place_id
  svg += `  <path d="M ${REVIEWS.cols[1].midX} ${REVIEWS.cols[1].topY} L ${REVIEWS.cols[1].midX} 435 L ${PLACES.cols[0].midX + 50} 435 L ${PLACES.cols[0].midX + 50} ${PLACES.cols[0].botY + 1}" fill="none" stroke="#000000" stroke-width="1.6" marker-end="url(#fk-arrow)" />\n`;

  // 10. CHECK_INS.place_id -> PLACES.place_id
  svg += `  <path d="M ${CHECK_INS.cols[2].midX} ${CHECK_INS.cols[2].topY} L ${CHECK_INS.cols[2].midX} 410 L ${PLACES.cols[0].midX + 75} 410 L ${PLACES.cols[0].midX + 75} ${PLACES.cols[0].botY + 1}" fill="none" stroke="#000000" stroke-width="1.6" marker-end="url(#fk-arrow)" />\n`;

  // 11. CHECK_INS.user_id -> USERS.user_id
  svg += `  <path d="M ${CHECK_INS.cols[1].midX} ${CHECK_INS.cols[1].topY} L ${CHECK_INS.cols[1].midX} 290 L ${USERS.cols[0].midX + 85} 290 L ${USERS.cols[0].midX + 85} ${USERS.cols[0].botY + 1}" fill="none" stroke="#000000" stroke-width="1.6" marker-end="url(#fk-arrow)" />\n`;

  // 12. PLACE_WEEKLY_HOURS.place_id -> PLACES.place_id
  svg += `  <path d="M ${PLACE_WEEKLY_HOURS.cols[0].midX} ${PLACE_WEEKLY_HOURS.cols[0].topY} L ${PLACE_WEEKLY_HOURS.cols[0].midX} 580 L 760 580 L 760 380 L ${PLACES.cols[0].midX} 380 L ${PLACES.cols[0].midX} ${PLACES.cols[0].botY + 1}" fill="none" stroke="#000000" stroke-width="1.6" marker-end="url(#fk-arrow)" />\n`;

  // -------------------------------------------------------------
  // COMPACT BOTTOM LEGEND
  // -------------------------------------------------------------
  svg += `
  <!-- Bottom Legend Bar -->
  <g transform="translate(60, 930)">
    <rect x="0" y="0" width="1380" height="75" rx="6" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.2" />
    <text x="24" y="24" font-size="14" font-weight="bold" fill="#0f172a">LEGEND &amp; CONVENTIONS (3NF RELATIONAL MODEL):</text>

    <!-- Red Arrow explanation -->
    <line x1="30" y1="50" x2="80" y2="50" stroke="#d90429" stroke-width="1.8" marker-end="url(#fd-arrow)" />
    <text x="92" y="54" font-size="13" font-weight="bold" fill="#d90429">Functional Dependency (FD):</text>
    <text x="290" y="54" font-size="13" fill="#334155">Primary Key determines non-prime attributes in 3NF (no partial or transitive dependencies).</text>

    <!-- Black Arrow explanation -->
    <line x1="880" y1="50" x2="930" y2="50" stroke="#000000" stroke-width="1.8" marker-end="url(#fk-arrow)" />
    <text x="942" y="54" font-size="13" font-weight="bold" fill="#000000">Referential Integrity (FK):</text>
    <text x="1115" y="54" font-size="13" fill="#334155">Foreign Key $\rightarrow$ Primary Key.</text>
  </g>
</svg>`;

  return svg;
}

// ----------------------------------------------------------------------
// 2. GENERATE CHEN'S ER DIAGRAM (EXACT IMAGE 2 MATCH - A4 LANDSCAPE)
// ----------------------------------------------------------------------
function generateChenERA4() {
  const width = 1500;
  const height = 1060;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
  <defs>
    <!-- Soft Gradients from Image 2 -->
    <linearGradient id="entity-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#bbf7d0" />
      <stop offset="100%" stop-color="#86efac" />
    </linearGradient>
    <linearGradient id="rel-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e0e7ff" />
      <stop offset="100%" stop-color="#c7d2fe" />
    </linearGradient>
    <linearGradient id="attr-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffe4e6" />
      <stop offset="100%" stop-color="#fecdd3" />
    </linearGradient>
  </defs>

  <!-- Clean Header (Title & Authors Only) -->
  <g transform="translate(60, 45)">
    <text x="690" y="22" font-size="24" font-weight="bold" text-anchor="middle" fill="#000000" letter-spacing="-0.01em">
      Meridian Geospatial Platform Conceptual ER Diagram (Chen Notation)
    </text>
    <text x="690" y="48" font-size="16" font-weight="bold" text-anchor="middle" fill="#1e293b">
      Sia Simran A (PES1UG24CS453) &amp; Simret M Kotian (PES1UG24CS456)
    </text>
  </g>
`;

  // Draw Entity Box
  function renderEntity(name, cx, cy, w = 150, h = 48, isWeak = false) {
    const x = cx - w / 2;
    const y = cy - h / 2;
    let res = `  <g id="entity-${name.toLowerCase()}">\n`;
    res += `    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#entity-grad)" stroke="#16a34a" stroke-width="2" />\n`;
    if (isWeak) {
      res += `    <rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="2" fill="none" stroke="#16a34a" stroke-width="1.4" />\n`;
    }
    res += `    <text x="${cx}" y="${cy + 6}" font-size="15" font-weight="bold" text-anchor="middle" fill="#14532d">${name}</text>\n`;
    res += `  </g>\n`;
    return res;
  }

  // Draw Diamond Relationship
  function renderRelationship(name, cx, cy, w = 115, h = 54, isIdentifying = false) {
    const pts = `${cx},${cy - h/2} ${cx + w/2},${cy} ${cx},${cy + h/2} ${cx - w/2},${cy}`;
    let res = `  <g id="rel-${name.toLowerCase()}">\n`;
    res += `    <polygon points="${pts}" fill="url(#rel-grad)" stroke="#4338ca" stroke-width="2" />\n`;
    if (isIdentifying) {
      const sw = w - 8;
      const sh = h - 6;
      const innerPts = `${cx},${cy - sh/2} ${cx + sw/2},${cy} ${cx},${cy + sh/2} ${cx - sw/2},${cy}`;
      res += `    <polygon points="${innerPts}" fill="none" stroke="#4338ca" stroke-width="1.4" />\n`;
    }
    res += `    <text x="${cx}" y="${cy + 5}" font-size="13" font-weight="bold" text-anchor="middle" fill="#312e81">${name}</text>\n`;
    res += `  </g>\n`;
    return res;
  }

  // Draw Attribute Oval
  function renderAttribute(name, cx, cy, rx = 55, ry = 22, isPk = false, isMulti = false, isDerived = false, isPartial = false) {
    let strokeDash = isDerived ? `stroke-dasharray="4 3"` : "";
    let res = `  <g id="attr-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}">\n`;
    res += `    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#attr-grad)" stroke="#e11d48" stroke-width="1.8" ${strokeDash} />\n`;
    if (isMulti) {
      res += `    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 4}" ry="${ry - 3}" fill="none" stroke="#e11d48" stroke-width="1.4" />\n`;
    }

    let textStyle = `font-size="13" text-anchor="middle" fill="#881337"`;
    if (isPk) {
      textStyle += ` font-weight="bold" text-decoration="underline"`;
    } else if (isPartial) {
      textStyle += ` font-weight="bold"`;
    } else {
      textStyle += ` font-weight="600"`;
    }

    res += `    <text x="${cx}" y="${cy + 5}" ${textStyle}>${name}</text>\n`;

    if (isPartial) {
      const len = name.length * 7;
      res += `    <line x1="${cx - len/2}" y1="${cy + 8}" x2="${cx + len/2}" y2="${cy + 8}" stroke="#e11d48" stroke-width="1.4" stroke-dasharray="2.5 2.5" />\n`;
    }

    res += `  </g>\n`;
    return res;
  }

  function renderLine(x1, y1, x2, y2, stroke = "#000000", strokeWidth = 1.6, dash = "") {
    const dashAttr = dash ? `stroke-dasharray="${dash}"` : "";
    return `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" ${dashAttr} />\n`;
  }

  function renderCard(text, x, y) {
    return `  <text x="${x}" y="${y}" font-size="14" font-weight="bold" fill="#000000" text-anchor="middle">${text}</text>\n`;
  }

  // -------------------------------------------------------------
  // ENTITY & RELATIONSHIP LAYOUT
  // -------------------------------------------------------------
  // Row 1 (y=210): User (x=240), Creates (x=530), Place (x=820), ClassifiedIn (x=1110), Category (x=1360)
  // Row 2 (y=490): CheckIn (x=240), ReceivesReview (x=820), PlaceWeeklyHours (x=1360)
  // Row 3 (y=770): Review (x=820), GeneratesEmbedding (x=1110), ReviewEmbedding (x=1360), GPSTrace (x=240)

  svg += `\n  <!-- Relationship Connectors & Cardinalities -->\n`;

  // User <-> Place via "Creates"
  svg += renderLine(240, 210, 530, 210);
  svg += renderLine(530, 210, 820, 210);
  svg += renderCard("1", 340, 200);
  svg += renderCard("N", 720, 200);

  // Place <-> Category via "ClassifiedIn"
  svg += renderLine(820, 210, 1110, 210);
  svg += renderLine(1110, 210, 1360, 210);
  svg += renderCard("M", 920, 200);
  svg += renderCard("N", 1260, 200);

  // User <-> CheckIn via "Logs"
  svg += renderLine(240, 210, 240, 350);
  svg += renderLine(240, 350, 240, 490);
  svg += renderCard("1", 255, 270);
  svg += renderCard("N", 255, 430);

  // Place <-> CheckIn via "VisitedAt"
  svg += renderLine(820, 210, 530, 350);
  svg += renderLine(530, 350, 240, 490);
  svg += renderCard("1", 720, 270);
  svg += renderCard("N", 340, 430);

  // Place <-> Review via "Receives"
  svg += renderLine(820, 210, 820, 490);
  svg += renderLine(820, 490, 820, 770);
  svg += renderCard("1", 835, 270);
  svg += renderCard("N", 835, 710);

  // User <-> Review via "Writes"
  svg += renderLine(240, 210, 530, 630);
  svg += renderLine(530, 630, 820, 770);
  svg += renderCard("1", 340, 300);
  svg += renderCard("N", 720, 720);

  // Review <-> ReviewEmbedding via "HasVector"
  svg += renderLine(820, 770, 1110, 770);
  svg += renderLine(1110, 770, 1360, 770);
  svg += renderCard("1", 920, 760);
  svg += renderCard("1", 1260, 760);

  // Place <-> PlaceWeeklyHours via "HasSchedule"
  svg += renderLine(820, 210, 1110, 350);
  svg += renderLine(1110, 350, 1360, 490);
  svg += renderCard("1", 920, 270);
  svg += renderCard("N", 1260, 430);

  // User <-> GPSTrace via "Generates" (Cross-store dashed)
  svg += renderLine(240, 490, 240, 630, "#0284c7", 1.8, "4 4");
  svg += renderLine(240, 630, 240, 770, "#0284c7", 1.8, "4 4");
  svg += renderCard("1", 255, 550);
  svg += renderCard("N", 255, 710);

  // -------------------------------------------------------------
  // ATTRIBUTE LINES (Connecting Entity to Attributes)
  // -------------------------------------------------------------
  // User Attributes
  const uAttrs = [
    { name: "user_id", x: 90, y: 140, isPk: true },
    { name: "email", x: 90, y: 190 },
    { name: "display_name", x: 90, y: 240 },
    { name: "role", x: 90, y: 290 }
  ];
  uAttrs.forEach(a => svg += renderLine(240, 210, a.x, a.y, "#e11d48", 1.3));

  // Place Attributes
  const pAttrs = [
    { name: "place_id", x: 700, y: 130, isPk: true },
    { name: "name", x: 820, y: 110 },
    { name: "location (Pt)", x: 940, y: 130 },
    { name: "avg_rating", x: 940, y: 290, isDerived: true }
  ];
  pAttrs.forEach(a => svg += renderLine(820, 210, a.x, a.y, "#e11d48", 1.3));

  // Category Attributes
  const cAttrs = [
    { name: "category_id", x: 1360, y: 120, isPk: true },
    { name: "name", x: 1460, y: 160 },
    { name: "slug", x: 1460, y: 240 }
  ];
  cAttrs.forEach(a => svg += renderLine(1360, 210, a.x, a.y, "#e11d48", 1.3));

  // CheckIn Attributes
  const ciAttrs = [
    { name: "check_in_id", x: 90, y: 460, isPk: true },
    { name: "checked_at", x: 90, y: 520 }
  ];
  ciAttrs.forEach(a => svg += renderLine(240, 490, a.x, a.y, "#e11d48", 1.3));

  // PlaceWeeklyHours Attributes
  const pwhAttrs = [
    { name: "iso_weekday", x: 1450, y: 430, isPartial: true },
    { name: "period_no", x: 1460, y: 490, isPartial: true },
    { name: "opens_at", x: 1450, y: 550 }
  ];
  pwhAttrs.forEach(a => svg += renderLine(1360, 490, a.x, a.y, "#e11d48", 1.3));

  // Review Attributes
  const revAttrs = [
    { name: "review_id", x: 700, y: 850, isPk: true },
    { name: "rating", x: 820, y: 870 },
    { name: "body", x: 940, y: 850 }
  ];
  revAttrs.forEach(a => svg += renderLine(820, 770, a.x, a.y, "#e11d48", 1.3));

  // ReviewEmbedding Attributes
  const embAttrs = [
    { name: "embedding (v384)", x: 1360, y: 860 },
    { name: "model_name", x: 1460, y: 800 }
  ];
  embAttrs.forEach(a => svg += renderLine(1360, 770, a.x, a.y, "#e11d48", 1.3));

  // GPSTrace Attributes
  const gpsAttrs = [
    { name: "_id", x: 90, y: 740, isPk: true },
    { name: "deviceId", x: 90, y: 800 },
    { name: "points", x: 240, y: 870, isMulti: true }
  ];
  gpsAttrs.forEach(a => svg += renderLine(240, 770, a.x, a.y, "#0284c7", 1.3));

  // -------------------------------------------------------------
  // RENDER ENTITIES & RELATIONSHIPS
  // -------------------------------------------------------------
  // Entities
  svg += renderEntity("User", 240, 210);
  svg += renderEntity("Place", 820, 210);
  svg += renderEntity("Category", 1360, 210);
  svg += renderEntity("CheckIn", 240, 490);
  svg += renderEntity("PlaceWeeklyHours", 1360, 490, 160, 48, true); // Weak Entity
  svg += renderEntity("Review", 820, 770);
  svg += renderEntity("ReviewEmbedding", 1360, 770, 160, 48, true); // Weak Entity
  svg += renderEntity("GPSTrace (NoSQL)", 240, 770, 160, 48);

  // Relationships
  svg += renderRelationship("Creates", 530, 210);
  svg += renderRelationship("ClassifiedIn", 1110, 210, 125);
  svg += renderRelationship("Logs", 240, 350, 100);
  svg += renderRelationship("VisitedAt", 530, 350, 110);
  svg += renderRelationship("HasSchedule", 1110, 350, 125, 54, true); // Identifying
  svg += renderRelationship("Receives", 820, 490, 115);
  svg += renderRelationship("Writes", 530, 630, 110);
  svg += renderRelationship("HasVector", 1110, 770, 120, 54, true); // Identifying
  svg += renderRelationship("Generates", 240, 630, 110);

  // Render Attributes
  uAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, a.name.length > 8 ? 58 : 50, 20, a.isPk));
  pAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, a.name.length > 8 ? 58 : 50, 20, a.isPk, false, a.isDerived));
  cAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, a.name.length > 8 ? 58 : 50, 20, a.isPk));
  ciAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, 50, 20, a.isPk));
  pwhAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, 52, 20, false, false, false, a.isPartial));
  revAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, 50, 20, a.isPk));
  embAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, 65, 20));
  gpsAttrs.forEach(a => svg += renderAttribute(a.name, a.x, a.y, 48, 20, a.isPk, a.isMulti));

  // Bottom Legend
  svg += `
  <!-- Bottom Legend Bar -->
  <g transform="translate(60, 930)">
    <rect x="0" y="0" width="1380" height="75" rx="6" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.2" />
    <text x="24" y="24" font-size="14" font-weight="bold" fill="#0f172a">CHEN'S ER NOTATION CONVENTIONS:</text>

    <!-- Entity -->
    <rect x="30" y="38" width="65" height="24" rx="2" fill="url(#entity-grad)" stroke="#16a34a" stroke-width="1.5" />
    <text x="105" y="54" font-size="13" font-weight="bold" fill="#14532d">Entity Set</text>

    <!-- Weak Entity -->
    <rect x="200" y="38" width="65" height="24" rx="2" fill="url(#entity-grad)" stroke="#16a34a" stroke-width="1.5" />
    <rect x="203" y="41" width="59" height="18" rx="2" fill="none" stroke="#16a34a" stroke-width="1" />
    <text x="275" y="54" font-size="13" font-weight="bold" fill="#14532d">Weak Entity Set</text>

    <!-- Relationship -->
    <polygon points="415,38 435,50 415,62 395,50" fill="url(#rel-grad)" stroke="#4338ca" stroke-width="1.5" />
    <text x="445" y="54" font-size="13" font-weight="bold" fill="#312e81">Relationship</text>

    <!-- Attribute -->
    <ellipse cx="560" cy="50" rx="24" ry="12" fill="url(#attr-grad)" stroke="#e11d48" stroke-width="1.4" />
    <text x="560" y="54" font-size="10" font-weight="bold" text-anchor="middle" text-decoration="underline" fill="#881337">Key</text>
    <text x="595" y="54" font-size="13" font-weight="bold" fill="#881337">Primary Key</text>

    <!-- Multivalued -->
    <ellipse cx="710" cy="50" rx="24" ry="12" fill="url(#attr-grad)" stroke="#e11d48" stroke-width="1.4" />
    <ellipse cx="710" cy="50" rx="20" ry="9" fill="none" stroke="#e11d48" stroke-width="1" />
    <text x="745" y="54" font-size="13" font-weight="bold" fill="#881337">Multivalued Attribute</text>

    <!-- Cardinality -->
    <text x="940" y="54" font-size="14" font-weight="bold" fill="#000000">1 : N / M : N</text>
    <text x="1030" y="54" font-size="13" fill="#334155">Cardinality Ratios</text>

    <!-- NoSQL -->
    <line x1="1165" y1="50" x2="1205" y2="50" stroke="#0284c7" stroke-width="1.8" stroke-dasharray="4 4" />
    <text x="1215" y="54" font-size="13" font-weight="bold" fill="#0284c7">NoSQL Boundary Reference</text>
  </g>
</svg>`;

  return svg;
}

// Write files
const schemaSvg = generateRelationalSchemaA4();
fs.writeFileSync(path.join(outDir, 'relational_schema_3nf.svg'), schemaSvg, 'utf8');
fs.writeFileSync(path.join(pubDir, 'relational_schema_3nf.svg'), schemaSvg, 'utf8');
fs.writeFileSync(path.join(artifactDir, 'relational_schema_3nf.svg'), schemaSvg, 'utf8');
console.log('✓ Successfully generated A4 Landscape: relational_schema_3nf.svg');

const chenSvg = generateChenERA4();
fs.writeFileSync(path.join(outDir, 'chen_er_diagram.svg'), chenSvg, 'utf8');
fs.writeFileSync(path.join(pubDir, 'chen_er_diagram.svg'), chenSvg, 'utf8');
fs.writeFileSync(path.join(artifactDir, 'chen_er_diagram.svg'), chenSvg, 'utf8');
console.log('✓ Successfully generated A4 Landscape: chen_er_diagram.svg');
