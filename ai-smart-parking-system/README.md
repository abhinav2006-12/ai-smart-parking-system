# AI Parking Management System

Full-stack parking operations platform with FastAPI, PostgreSQL, YOLO, EasyOCR, OpenCV, and React.

## Features

- Vehicle entry and exit from uploaded image/video or RTSP camera snapshots
- YOLO number plate detection and EasyOCR plate extraction
- Duplicate active-session prevention
- Automatic duration and billing calculation
- Configurable pricing through environment variables
- JWT-protected REST API with Swagger docs
- React dashboard for live entries, active vehicles, completed sessions, search, details, revenue, occupancy, payment updates, and CSV export
- PostgreSQL schema and sample seed data
- Dockerfiles and `docker-compose.yml`

## Project Structure

```text
backend/      FastAPI API, SQLAlchemy ORM, Pydantic schemas, services, tests
frontend/     Docker build target for the React app
ai_service/   OpenCV, YOLO, and EasyOCR plate reader
database/     PostgreSQL schema and seed data
docker/       Backend and frontend Dockerfiles
src/          React dashboard source
```

## Quick Start With Docker

```bash
docker compose up --build
```

Open:

- Dashboard: http://localhost:5173
- API docs: http://localhost:8000/docs

Default login:

```text
username: admin
password: admin123
```

## Local Development

Backend:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
copy backend\.env.example backend\.env
$env:DATABASE_URL="sqlite:///./parking-local.db"
$env:PYTHONPATH=".;backend"
uvicorn app.main:app --app-dir backend --reload
```

For quick local UI testing without PostgreSQL, the SQLite `DATABASE_URL` above is enough. Use PostgreSQL through `docker compose up --build` or set `DATABASE_URL` to your PostgreSQL connection string for production-like runs.

Frontend:

```bash
npm install
copy .env.example .env
npm run dev
```

PostgreSQL is required locally. Set `DATABASE_URL` in `backend/.env`.

## API Overview

All endpoints except `POST /auth/login` require `Authorization: Bearer <token>`.

- `POST /entry` accepts `plate_number`, `camera_id`, or uploaded `video`/image as multipart form data.
- `POST /exit` detects or accepts a plate, closes the active session, calculates fee, and returns invoice data.
- `GET /sessions` supports `status`, `plate`, `limit`, and `offset`.
- `GET /sessions/{id}` returns session details and invoice data when available.
- `GET /dashboard/stats` returns occupancy, counts, revenue, and daily revenue.
- `PUT /session/{id}/payment` marks an invoice paid or unpaid.
- `GET /export/sessions.csv` exports session history.
- `GET /reports/daily-revenue` returns daily revenue report rows.

## Billing Rules

Configured in `backend/.env.example`:

```text
BASE_FEE=20
INCLUDED_MINUTES=60
ADDITIONAL_HOURLY_FEE=10
```

The first hour is included in the base fee. Additional time is rounded up by hour.

## AI Model Setup

Place a trained YOLO license-plate model at the configured `YOLO_MODEL_PATH`, for example:

```text
backend/models/license_plate.pt
```

If the model is absent, the backend logs a warning and runs EasyOCR over the full frame so API testing remains possible.

## Test Data

`database/seed.sql` creates two cameras and several sample sessions, including active, unpaid, and paid records. You can also create records from the dashboard by entering a plate manually in the Entry form.

## Useful Commands

```bash
npm run build
$env:PYTHONPATH=".;backend"; pytest backend/app/tests
docker compose down -v
```
