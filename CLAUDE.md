# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Food Tracker is a calorie tracking app that scans food barcodes, fetches nutrition data from OpenFoodFacts, and logs daily food entries. Stack: React (frontend) + FastAPI (backend) + PostgreSQL.

## Commands

### Backend
```bash
# Activate virtualenv (Python 3.14)
source venv/bin/activate

# Run the FastAPI server (from repo root)
uvicorn backend.main:app --reload
# Server runs on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm start        # Dev server on http://localhost:3000
npm run build    # Production build
npm test         # Run tests (Jest / React Testing Library)
npm test -- --testPathPattern=<file>  # Run a single test file
```

## Architecture

### Backend (`backend/main.py`)
Single-file FastAPI app. Key areas:
- **`/lookup`** (POST) — proxies barcode to OpenFoodFacts API, returns product + nutriments
- **`/api/entries`** (GET/POST/DELETE) — CRUD for food log entries; GET and DELETE require JWT auth
- **`/api/signup`**, **`/api/token`** — registration and login (OAuth2 password flow, JWT via `python-jose`)
- **`/api/me`** — returns current user from token

Auth: JWT tokens signed with `SECRET_KEY` (env var), bcrypt password hashing via `passlib`. Token stored by frontend in `localStorage`.

Database: PostgreSQL via `psycopg2`. Uses `get_db_connection()` which reads env vars (`DATABASE_URL`, `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_HOST`, `DB_PORT`) with hardcoded localhost defaults as fallback. Two tables: `users` and `entries`.

CORS is configured to allow only `http://localhost:3000`.

### Frontend (`frontend/src/`)
Create React App with React Router v7.

**Data flow:**
1. `BarcodeScanner.js` — root page (`/`). Initializes Quagga camera scanner and a 2s scan cooldown. Posts barcode to `/lookup`, sets `product` state.
2. `ProductInfo.js` — displays nutriments from OpenFoodFacts data; handles serving size math; POSTs to `/api/entries` via `authFetch`. Calls `onAdded(createdEntry)` on success so the parent can trigger a refresh.
3. `ManualBarcodeInput.js` — text input that calls the same `lookupBarcode` function as the scanner.
4. `DailySummary.js` — shows today's calorie totals, macros (fat/carbs/protein), a progress ring, and the entry list. Fetches `/api/entries/` every 30s and on `lastUpdated` change. Supports optimistic prepend of newly added entries and optimistic delete. Daily goal is persisted to `localStorage`.
5. `EntryRow.js` / `ProgressRing.js` — presentational components.

**Auth:**
- `src/auth/AuthProvider.js` — React context wrapping token state and `fetchMe`. Validates token on mount via `/api/me`.
- `src/api/auth.js` — `authFetch` wrapper that injects `Authorization: Bearer <token>` header; `signup`/`login` helpers. API base defaults to `http://localhost:8000` or `REACT_APP_API_BASE` env var.

### Key field name mapping
The backend `entries` table uses `total_fat`, `total_carbs`; the frontend sends both `fat`/`carbs` (simple) and `total_fat`/`total_carbs` for compatibility. `DailySummary` reads both shapes defensively.
