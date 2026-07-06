# ParkPilot — AI-Assisted Smart Parking Management System

A full-stack parking management web app built with React 19 + Vite, powered by real-time cloud sync via Supabase and AI-based license plate recognition through Plate Recognizer's Snapshot Cloud API. Designed for real-world parking lots, malls, offices, or campuses that need a clean kiosk-style interface for attendants and guests alike.

---

## What This Actually Does

ParkPilot handles the complete lifecycle of a vehicle's visit — from the moment it rolls in to when it pays and exits.

A **guest** walks up to a kiosk or uses their phone to check in, scan their plate, and generate a UPI QR payment on checkout. An **admin** (the parking attendant or manager) logs into a separate, hidden dashboard at `/admin` to see occupancy in real time, review vehicle history, configure slot counts and rates, and track daily revenue with charts.

The **AI Operations Overview** — the newest feature — automatically analyses today's parking data every time the Dashboard opens and generates a short executive summary at the top of the admin panel. It explains what is happening (demand rising, capacity near full, revenue outpacing volume, etc.) rather than just showing numbers. Think Microsoft Copilot or Notion AI applied to your parking operations.

The **ANPR** feature is the automatic number plate recognition: instead of manually typing `MH12AB1234`, the attendant points the camera at the plate, and the system reads it — then lets them correct it before confirming. No OCR engine runs in the browser; images are routed through a small Vercel serverless function that keeps the API token safely server-side.

Data lives in Supabase (PostgreSQL), so multiple devices and tabs stay in sync automatically. `localStorage` is kept as a fallback cache so the app doesn't break if Supabase is temporarily unreachable.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| UI Framework | React 19 + Vite 8 | Fast HMR, modern concurrent features |
| Backend / DB | Supabase (PostgreSQL) | Real-time sync, free tier, minimal config |
| AI Operations | Gemini 2.5 Flash → OpenAI → Local engine | Three-tier fallback ensures insight is always shown |
| ANPR | Plate Recognizer Snapshot Cloud | Best accuracy for Indian plates |
| Serverless Proxy | Vercel Functions (`/api/*.js`) | Keeps all API tokens off the client entirely |
| Payments | UPI QR via `qrcode` library | Works with any UPI app, no payment gateway needed |
| Charts | Recharts | Revenue area chart + occupancy pie chart |
| Linting | OXLint | Much faster than ESLint for CI |

---

## Project Structure

```
ai-smart-parking-system/
├── api/
│   ├── anpr.js                  # Vercel Serverless — ANPR proxy (Plate Recognizer)
│   ├── chatbot.js               # Vercel Serverless — AI chatbot endpoint
│   ├── dashboard-insight.js     # Vercel Serverless — AI Operations Overview endpoint
│   └── express.js               # Express backend (admin auth, /api/chat, /api/health)
├── backend/
│   ├── config/
│   │   └── env.js               # Unified environment variable loader
│   ├── controllers/
│   │   └── authController.js    # Admin session token issuing + validation
│   └── services/
│       ├── aiService.js         # AI service for the chatbot (Gemini / OpenAI)
│       ├── analyticsService.js  # Computes today vs yesterday metrics from Supabase
│       ├── insightAIService.js  # AI Operations engine: Gemini → OpenAI → local fallback
│       └── supabaseService.js   # Raw Supabase queries + data normalisation
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── _redirects               # Netlify SPA fallback route
├── src/
│   ├── components/
│   │   ├── AIInsightCard.jsx        # 🆕 AI Operations Overview card (glassmorphism UI)
│   │   ├── AdminLogin.jsx           # PIN login + cross-device session enforcement
│   │   ├── AdminPanel.jsx           # Tab shell: Dashboard / Vehicles / Settings
│   │   ├── AmbientBackground.jsx    # Decorative animated background
│   │   ├── CheckInFlow.jsx          # Vehicle check-in with ANPR + duplicate detection
│   │   ├── CheckOutFlow.jsx         # Fee calculation + UPI QR payment flow
│   │   ├── DashboardTab.jsx         # Revenue charts, occupancy stats, slot breakdown
│   │   ├── GuestMenu.jsx            # Entry point for guest (check-in / check-out)
│   │   ├── GuestPanel.jsx           # Guest-facing wrapper
│   │   ├── HomeScreen.jsx           # Landing screen with theme toggle
│   │   ├── LiveCameraCapture.jsx    # Live camera stream + auto-capture loop (1 fps)
│   │   ├── PlateCapture.jsx         # Unified plate input — camera or file upload
│   │   ├── PriceChartOverlay.jsx    # Pricing tier overlay shown during check-in
│   │   ├── SettingsTab.jsx          # Slot counts, rates, UPI config, data wipe
│   │   ├── ThemeToggle.jsx          # Light/dark switcher
│   │   ├── VehicleListingTab.jsx    # Sortable/filterable vehicle history table
│   │   └── VehicleLoader.jsx        # Loading screen animation
│   ├── hooks/
│   │   ├── useAIInsight.js    # 🆕 Fetches AI insight with 5-min client-side cache
│   │   ├── useRoute.js        # Lightweight hash/path router (no React Router)
│   │   ├── useStore.js        # Central state — loads from Supabase, syncs on change
│   │   └── useTheme.js        # OS-preference-aware dark mode, persisted to localStorage
│   ├── lib/
│   │   ├── anpr.js            # Client-side fetch wrapper for POST /api/anpr
│   │   ├── format.js          # uid(), fmtDateTime(), fmtMoney(), isSameDay()
│   │   ├── plate.js           # Indian plate regex validators (loose + strict)
│   │   ├── storage.js         # localStorage helpers + defaultStore factory
│   │   └── supabase.js        # Supabase client, CRUD sync, admin session management
│   ├── App.jsx                # Top-level routing + admin session lifecycle
│   ├── index.css              # Global CSS, CSS variables, theme tokens, AI card styles
│   └── main.jsx               # React entry point
├── .env.example
├── index.html
├── package.json
├── vercel.json                # Rewrites: /api/* → serverless functions, SPA fallback
└── vite.config.js             # Mounts all /api/* handlers as Vite dev middlewares
```

---

## Prerequisites

- **Node.js** 18 or higher
- A **Plate Recognizer** account — free trial available at [platerecognizer.com](https://app.platerecognizer.com/service/snapshot-cloud/) (1 lookup/second on the free tier)
- A **Supabase** project with the schema below applied
- **Vercel CLI** for local development with plate detection (`npm i -g vercel`)

### Supabase Schema

Run this in your Supabase project's SQL editor before first launch:

```sql
-- Settings (single row, id = 1)
create table settings (
  id              integer primary key default 1,
  total_slots     integer,
  slots_by_type   jsonb,
  rates           jsonb,
  upi_vpa         text,
  upi_payee_name  text,
  currency        text,
  session_token   text,
  session_at      bigint
);

insert into settings (id, total_slots, slots_by_type, rates, upi_vpa, upi_payee_name, currency)
values (1, 50, '{"standard":40,"ev":5,"disabled":5}', '{"standard":30,"ev":40,"disabled":20}', '', 'ParkPilot', 'INR');

-- Vehicles
create table vehicles (
  id            text primary key,
  number        text,
  type          text,
  entry_time    bigint,
  exit_time     bigint,
  status        text,
  fee           numeric,
  duration_mins integer,
  entry_photo   text,
  exit_photo    text
);

-- Revenue log
create table revenue_log (
  id          text primary key,
  vehicle_id  text references vehicles(id),
  amount      numeric,
  date        bigint
);
```

---

## Getting Started

### 1. Clone and install

```bash
git clone
cd ai-smart-parking-system
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
PLATERECOGNIZER_TOKEN=your_platerecognizer_api_token
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_jwt_signing_secret_key
```

- `PLATERECOGNIZER_TOKEN`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, and `JWT_SECRET` are read only by serverless functions and backend services — they are never exposed to client-side JavaScript.
- The two `VITE_` variables are embedded in the browser bundle (public Supabase credentials, protected by database RLS policies).

### 3. Start the development server

```bash
npm run dev
```

Vite is configured (`vite.config.js`) to mount all backend serverless APIs as middlewares, so plain `npm run dev` supports all features — ANPR plate detection, AI Operations Overview, Express backend routing, and AI chatbot — without needing `vercel dev` locally.

Alternatively, to emulate the Vercel cloud environment locally:

```bash
vercel dev
```

---

## Building for Production

```bash
npm run build
npm run preview   # verify the build locally before deploying
```

Output goes to `dist/`. The preview server serves this folder statically so you can catch any build-time issues before they hit production.

---

## Deploying

### Vercel (recommended)

```bash
npm install -g vercel   # if not already installed
vercel
```

During setup: Framework preset → **Vite**, Build command → `npm run build`, Output directory → `dist`.

Then add your environment variables in **Project Settings → Environment Variables**:

- `PLATERECOGNIZER_TOKEN` — Your Plate Recognizer API token.
- `GEMINI_API_KEY` — Google Gemini API key (AI Operations Overview + chatbot).
- `OPENAI_API_KEY` — OpenAI API key (optional fallback for both AI features).
- `JWT_SECRET` — Random secure string for signing admin session tokens.
- `VITE_SUPABASE_URL` — Public Supabase URL.
- `VITE_SUPABASE_ANON_KEY` — Public Supabase anonymous key.

> Plate detection and AI features will return errors until their respective keys are configured in Vercel's environment settings. They are never read from `.env` in production.

### Other Hosts

If you need to deploy to Netlify, GitHub Pages, or a custom server:

- The client-side code just expects `POST /api/anpr`, `POST /api/dashboard-insight`, etc. — it doesn't care where they're hosted.
- Port the `api/*.js` functions to your platform's equivalent (Netlify Functions, an Express server, a separate Lambda, etc.)
- Deep-link routing (direct URL access to `/admin`) needs configuration per platform:
  - **Netlify** — `public/_redirects` is already included
  - **GitHub Pages** — use a `404.html` redirect hack or avoid hard-refreshing on sub-routes
  - **Vercel** — `vercel.json` is already included

---

## Admin Dashboard

The admin interface is intentionally not linked from anywhere in the UI. It's only reachable by navigating directly to:

```
http://localhost:5173/admin    (dev)
https://yoursite.com/admin     (production)
```

**Demo PIN:** `1234` — hardcoded in `src/components/AdminLogin.jsx`. Replace with real authentication before any live deployment. A hidden URL is obscurity, not security.

### Cross-Device Session Locking

Only one admin session can be active at a time. If a second device tries to log in while a session is running, it will see a "blocked" banner with the option to force-reset the session (useful if a tab crashed without releasing it).

How it works:

- On login, the app writes a random `session_token` and `session_at` timestamp to the `settings` table in Supabase
- A heartbeat refreshes `session_at` every 5 minutes while the session is active
- The session expires automatically after 30 minutes of inactivity (no heartbeat)
- On logout or tab close, the token is cleared via `releaseAdminSession`
- Same-browser tabs also get notified via `BroadcastChannel` so they don't require a Supabase round-trip

### Dashboard Tabs

**Dashboard** — The first thing you see is the **AI Operations Overview** card (see below), followed by at-a-glance stats (active vehicles, empty slots, today's revenue vs yesterday), a 7-day revenue area chart, and a slot-type occupancy pie chart.

**Vehicles** — Full sortable table of all vehicle records with status badges (parked / completed). Includes a force-checkout button for vehicles that left without checking out.

**Settings** — Configure total slot count, per-type slot allocation (Standard / EV / Disabled), hourly rates per type, UPI VPA and payee name, and a "wipe all data" button for resetting between deployments.

---

## AI Operations Overview

When an admin opens the Dashboard, ParkPilot automatically analyses today's parking data and generates a short executive summary — similar to Microsoft Copilot or Notion AI applied to your parking operations.

### What the card shows

- **Headline** — A one-line summary of the current situation (e.g. *"Parking demand is rising steadily today"*)
- **Priority badge** — High / Medium / Low, based on urgency of the situation
- **Trend badge** — ↑ Up / ↓ Down / → Stable, with % change vs yesterday
- **Summary** — 2–4 sentences of context: occupancy, check-ins, revenue, peak hour
- **Recommendation** — One practical action for the operations team
- **Metric pills** — Trend %, Revenue, Occupancy, Peak Hour, AI Confidence
- **Refresh Insight** — Manually regenerate outside the 5-minute cache window
- **View Analytics** — Smoothly scrolls to the stats section below

### How the AI engine works

```
Admin opens Dashboard
  └── useAIInsight hook fires POST /api/dashboard-insight
       └── analyticsService queries Supabase
               ∟ vehicles (entry_time, exit_time, status, type, fee)
               ∟ revenue_log (amount, date)
               ∟ settings (total_slots, slots_by_type)
           Computes: check-ins, occupancy %, revenue, peak hour,
                     avg duration, type breakdown — today vs yesterday
       └── insightAIService calls providers in order:
               1. Gemini 2.5 Flash (5s timeout)
               2. OpenAI GPT-4o-mini (if Gemini unavailable)
               3. Rich local analytics engine (always works)
       └── Returns structured JSON:
               { title, summary, recommendation,
                 priority, trend, confidence, analytics }
       └── Cached for 5 minutes server-side + client-side
           Cache invalidated if analytics change significantly
```

### Fallback tiers

| Tier | Activated when | Confidence |
|---|---|---|
| **Gemini 2.5 Flash** | `GEMINI_API_KEY` is set and API responds | 85–95% |
| **OpenAI GPT-4o-mini** | Gemini unavailable, `OPENAI_API_KEY` is set | 82–90% |
| **Local analytics engine** | No API keys, or both APIs fail | 87–92% |

The local engine covers **12 distinct scenarios** (capacity critical, demand surge, demand drop, high occupancy, EV-dominant, long stays, revenue efficiency, stable ops, and more) with randomised natural-language variants, so the card always shows a meaningful, non-generic summary — regardless of API availability.

> No new database tables are created for this feature. All analytics are computed from the existing `vehicles`, `revenue_log`, and `settings` tables.

---

## Plate Detection & Privacy

> **Important change from earlier versions**: Previous versions of this project ran OCR entirely in the browser using `tesseract.js`, with a strict "no image ever leaves the device" guarantee. That guarantee no longer holds.

Plate images are now sent over the network to Plate Recognizer's Snapshot Cloud API via the `/api/anpr.js` proxy. Specifically:

- While the live camera is active, a cropped frame is uploaded to Plate Recognizer's servers approximately once per second
- Manual photo uploads are forwarded in full
- Plate Recognizer's own [privacy policy](https://platerecognizer.com/privacy-policy/) governs image retention on their end — this app has no control over what happens after the request leaves the proxy

The API token (`PLATERECOGNIZER_TOKEN`) lives exclusively in the server-side environment variable and is never bundled into the browser.

The detected plate text is always shown in an editable field before the check-in is confirmed. No OCR engine — cloud or local — is reliable enough on phone photos to trust blindly, especially when the result feeds into billing.

**If "nothing leaves the browser" is a hard requirement** for your deployment (data residency, GDPR, internal policy), this architecture change matters and is not a drop-in swap.

---

## How the Data Flow Works

Understanding the sync strategy helps when debugging unexpected state:

1. On mount, `useStore` attempts to load from Supabase first
2. If Supabase returns data, it overwrites localStorage (Supabase is the source of truth)
3. If Supabase returns nothing (no settings row), it seeds the database from localStorage defaults
4. If Supabase throws an error, it falls back to whatever is in localStorage
5. Every time `updateStore` is called, the change is written to localStorage immediately and synced to Supabase in the background (non-blocking)
6. The sync is diff-based — only changed vehicles are upserted, deleted vehicles are removed

This means the app remains usable offline or when Supabase is slow, but cross-device sync only works when both ends can reach the database.

---

## Known Limitations

- **No real authentication.** The admin PIN is a placeholder. Anyone who finds the `/admin` URL can try PINs. Add proper auth (Supabase Auth, Clerk, etc.) before using in production.
- **Single-device offline mode.** localStorage doesn't sync across browsers or devices on its own — Supabase handles that, but only when online.
- **ANPR accuracy.** Results depend heavily on photo quality — lighting, angle, plate condition, and whether there's dirt or glare. Always verify the detected plate before confirming.
- **Rate limits on the free tier.** Plate Recognizer's free plan caps at 1 lookup/second. The live camera runs at ~1 fps, so occasional `429 Too Many Requests` responses are expected.
- **Plate detection requires connectivity.** If `PLATERECOGNIZER_TOKEN` is unset, wrong, or the account is out of credits, detection fails hard — it doesn't degrade gracefully to manual entry, it just shows an error.
- **Indian plates only (default).** The ANPR proxy sends `regions=in` to Plate Recognizer. To support other countries, edit the `DEFAULT_REGION` constant in `api/anpr.js`.
- **Gemini free-tier output limits.** The free Gemini API key has low output token limits that can cause truncated JSON responses. The fallback chain handles this automatically. Use a paid API key for full AI-generated summaries.

---

## Theme

Light and dark mode are supported via a toggle in the top-right corner of the home screen. The preference is persisted to `localStorage` and defaults to the OS-level preference (`prefers-color-scheme`) on first visit.

---

## Linting

```bash
npm run lint   # runs OXLint
```

OXLint is configured via `.oxlintrc.json`. It's significantly faster than ESLint for large codebases and serves as the project's only linter.

---

## Environment Variables Reference

| Variable | Where it's used | Required | Description |
|---|---|---|---|
| `PLATERECOGNIZER_TOKEN` | `api/anpr.js` | Yes (for ANPR) | Authentication token for Plate Recognizer API. |
| `GEMINI_API_KEY` | `api/dashboard-insight.js`, `api/chatbot.js`, `backend/services/aiService.js` | Yes (for AI features) | API key for Gemini 2.5 Flash. Used by AI Operations Overview and AI chatbot. |
| `OPENAI_API_KEY` | `backend/services/insightAIService.js`, `backend/services/aiService.js` | No (optional fallback) | OpenAI key — fallback when Gemini is unavailable. |
| `JWT_SECRET` | `backend/controllers/authController.js` | Yes (in production) | Key used to sign admin session tokens. |
| `VITE_SUPABASE_URL` | `src/lib/supabase.js` (client-side) | Yes (for sync) | Endpoint URL for the Supabase database. |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.js` (client-side) | Yes (for sync) | Anonymous client key for Supabase. |

**Degradation behaviour:**
- Missing `VITE_SUPABASE_*` → App runs entirely in local mode using `localStorage`.
- Missing `PLATERECOGNIZER_TOKEN` → Automatic plate detection shows a configuration error; manual entry still works.
- Missing `GEMINI_API_KEY` and `OPENAI_API_KEY` → AI Operations Overview uses the built-in local analytics engine (87–92% confidence). AI chatbot falls back to offline keyword matching.

---

## License

Private project. All rights reserved.
