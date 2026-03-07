# Yummy
Track calories by scanning food barcodes. Built with React and FastAPI, backed by PostgreSQL.

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL running locally on port 5432

## Setup

### Backend

```bash
cd Food-Tracker
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## Running the App

You need two terminals.

**Terminal 1 — Backend:**
```bash
source venv/bin/activate        # Windows: venv\Scripts\activate
uvicorn backend.main:app --reload
```
API runs at `http://localhost:8000`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
```
App opens at `http://localhost:3000`

## Database

The backend connects to a local PostgreSQL database (`postgres` db, `postgres` user) by default. You can override with environment variables:

| Variable | Default |
|---|---|
| `DATABASE_URL` | _(overrides all below)_ |
| `DB_NAME` | `postgres` |
| `DB_USER` | `postgres` |
| `DB_PASS` | _(your password)_ |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |

The `users` and `entries` tables must exist in your database before running.
