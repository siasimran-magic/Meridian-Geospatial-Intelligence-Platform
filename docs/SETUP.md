# Setup & Run Guide — Windows PowerShell

This document outlines the step-by-step instructions to run, test, and demonstrate Person 2's GPS Analytics Module on a Windows machine.

---

## 1. Prerequisites Verification

Before starting, verify that **Node.js**, **npm**, and **MongoDB** are available.

Open **Windows PowerShell** and execute:

```powershell
# 1. Verify Node.js (version 20+ recommended)
node -v

# 2. Verify npm package manager
npm -v

# 3. Verify MongoDB Shell (mongosh)
mongosh --version

# 4. Verify local MongoDB Server connectivity (port 27017)
Test-NetConnection -ComputerName 127.0.0.1 -Port 27017
```

*Expected output:* `TcpTestSucceeded : True`

If MongoDB service is stopped on Windows, start it using PowerShell (Run as Administrator):
```powershell
Start-Service MongoDB
```

---

## 2. Environment Configuration

Copy the example environment configuration into `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Ensure `.env.local` contains:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/geospatial_platform
```

---

## 3. Install Dependencies

Install required dependencies:

```powershell
npm install
```

---

## 4. Seed the Database

Run the idempotent database seed script to configure MongoDB collection-level JSON Schema validation, build spatial and compound indexes, and insert realistic synthetic traces across Bengaluru:

```powershell
npm run seed
```

*Console Output will display:*
- MongoDB JSON schema validation status
- 5 Created indexes (`idx_userId_createdAt`, `idx_deviceId_createdAt`, `idx_points_timestamp`, `idx_createdAt`, `idx_geo_coordinates`)
- Breakdown of seeded Bengaluru routes across multiple days and users

---

## 5. Run Automated Tests

Execute the Vitest automated test suite:

```powershell
npm test
```

The test runner will execute:
- `tests/haversine.test.ts` (Haversine formula, known distance validation, speed distinctions)
- `tests/validation.test.ts` (Zod schemas, ObjectId validation, forbidden update guardrails)
- `tests/crud_and_analytics.test.ts` (Isolated database CRUD operations and aggregation pipelines)
- `tests/api.test.ts` (App Router HTTP API endpoint verification)

---

## 6. Start the Next.js Development Server

```powershell
npm run dev
```

Open your browser and navigate to:
[http://localhost:3000](http://localhost:3000)

### Key Pages:
- **Overview Dashboard & Route Explorer:** [http://localhost:3000](http://localhost:3000)
- **Trace Management (CRUD):** [http://localhost:3000/traces](http://localhost:3000/traces)
- **Analytics & Trends:** [http://localhost:3000/analytics](http://localhost:3000/analytics)
- **DBMS Concepts & Viva Guide:** [http://localhost:3000/dbms-concepts](http://localhost:3000/dbms-concepts)

---

## 7. Production Build Validation

To verify type safety and produce a production-ready build:

```powershell
npm run build
npm start
```
