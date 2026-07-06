# ParkPilot — AI-Assisted Smart Parking Management System

A full-stack parking management web app built with React 19 + Vite, powered by real-time cloud sync via Supabase and AI-based license plate recognition through Plate Recognizer's Snapshot Cloud API. Designed for real-world parking lots, malls, offices, or campuses that need a clean kiosk-style interface for attendants and guests alike.

---

## What This Actually Does

ParkPilot handles the complete lifecycle of a vehicle's visit — from the moment it rolls in to when it pays and exits.

A **guest** walks up to a kiosk or uses their phone to check in, scan their plate, and generate a UPI QR payment on checkout. An **admin** (the parking attendant or manager) logs into a separate, hidden dashboard at `/admin` to see occupancy in real time, review vehicle history, configure slot counts and rates, and track daily revenue with charts.

The AI part is the automatic number plate recognition (ANPR): instead of manually typing `MH12AB1234`, the attendant points the camera at the plate, and the system reads it — then lets them correct it before confirming. No OCR engine runs in the browser; images are routed through a small Vercel serverless function that keeps the API token safely server-side.

Data lives in Supabase (PostgreSQL), so multiple devices and tabs stay in sync automatically. `localStorage` is kept as a fallback cache so the app doesn't break if Supabase is temporarily unreachable.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| UI Framework | React 19 + Vite 8 | Fast HMR, modern concurrent features |
| Backend / DB | Supabase (PostgreSQL) | Real-time sync, free tier, minimal config |
| ANPR | Plate Recognizer Snapshot Cloud | Best accuracy for Indian plates |
| Serverless Proxy | Vercel Functions (`/api/anpr.js`) | Keeps API token off the client entirely |
| Payments | UPI QR via `qrcode` library | Works with any UPI app, no payment gateway needed |
| Charts | Recharts | Revenue area chart + occupancy pie chart |
| Linting | OXLint | Much faster than ESLint for CI |

---

## Project Structure

```
ai-smart-parking-system-main/
├── api/
│   └── anpr.js              # Vercel Serverless Function — ANPR proxy (holds the API token)
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── _redirects           # Netlify SPA fallback route
├── src/
│   ├── components/
│   │   ├── AdminLogin.jsx         # PIN login + cross-device session enforcement
│   │   ├── AdminPanel.jsx         # Tab shell: Dashboard / Vehicles / Settings
│   │   ├── AmbientBackground.jsx  # Decorative animated background
│   │   ├── CheckInFlow.jsx        # Vehicle check-in with ANPR + duplicate detection
│   │   ├── CheckOutFlow.jsx       # Fee calculation + UPI QR payment flow
│   │   ├── DashboardTab.jsx       # Revenue charts, occupancy stats, slot breakdown
│   │   ├── GuestMenu.jsx          # Entry point for guest (check-in / check-out)
│   │   ├── GuestPanel.jsx         # Guest-facing wrapper
│   │   ├── HomeScreen.jsx         # Landing screen with theme toggle
│   │   ├── LiveCameraCapture.jsx  # Live camera stream + auto-capture loop (1 fps)
│   │   ├── PlateCapture.jsx       # Unified plate input — camera or file upload
│   │   ├── PriceChartOverlay.jsx  # Pricing tier overlay shown during check-in
│   │   ├── SettingsTab.jsx        # Slot counts, rates, UPI config, data wipe
│   │   ├── ThemeToggle.jsx        # Light/dark switcher
│   │   ├── VehicleListingTab.jsx  # Sortable/filterable vehicle history table
│   │   └── VehicleLoader.jsx      # Loading screen animation
│   ├── hooks/
│   │   ├── useRoute.js      # Lightweight hash/path router (no React Router)
│   │   ├── useStore.js      # Central state — loads from Supabase, syncs on change
│   │   └── useTheme.js      # OS-preference-aware dark mode, persisted to localStorage
│   ├── lib/
│   │   ├── anpr.js          # Client-side fetch wrapper for POST /api/anpr
│   │   ├── format.js        # uid(), fmtDateTime(), fmtMoney(), isSameDay()
│   │   ├── plate.js         # Indian plate regex validators (loose + strict)
│   │   ├── storage.js       # localStorage helpers + defaultStore factory
│   │   └── supabase.js      # Supabase client, CRUD sync, admin session management
│   ├── App.jsx              # Top-level routing + admin session lifecycle
│   ├── index.css            # Global CSS, CSS variables, theme tokens
│   └── main.jsx             # React entry point
├── .env.example
├── index.html
├── package.json
├── vercel.json              # SPA rewrite: all paths → index.html
└── vite.config.js
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
cd ai-smart-parking-system-main
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
PLATERECOGNIZER_TOKEN=XXXXXXXXXXXXXXXXXXXX
VITE_SUPABASE_URL=XXXXXXXXXXXXXXXXX
VITE_SUPABASE_ANON_KEY=XXXXXXXXXXXXX

`PLATERECOGNIZER_TOKEN` is read only by the serverless function — it is never bundled into client-side JavaScript. The two `VITE_` variables are embedded in the browser bundle (they're public Supabase credentials, which is intentional and safe with correct RLS policies).

### 3. Start the development server

For full functionality including ANPR plate detection, you need the Vercel dev server (not plain Vite), because `/api/anpr.js` is a serverless function:

```bash
vercel dev
```

Plain Vite still works for everything except plate detection:

```bash
npm run dev
```

If plate detection is unavailable, the camera/upload UI shows a "service unavailable" error from the missing `/api/anpr` endpoint — this is expected behavior, not a bug.

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

This app requires Vercel specifically for ANPR to work, because `/api/anpr.js` is a Vercel Serverless Function. Any other static host can serve the frontend, but you'd need to adapt the serverless function separately (see [Other Hosts](#other-hosts)).

```bash
npm install -g vercel   # if not already installed
vercel
```

During setup: Framework preset → **Vite**, Build command → `npm run build`, Output directory → `dist`.

Then add your environment variable in **Project Settings → Environment Variables**:

```
PLATERECOGNIZER_TOKEN = your_token_here
```

The `VITE_SUPABASE_*` variables should also be added here (not just in your local `.env`) so the production build has access to them.

> Plate detection will silently fail with a 500 error until `PLATERECOGNIZER_TOKEN` is set in Vercel's environment — it is never read from `.env` in production.

### Other Hosts

If you need to deploy to Netlify, GitHub Pages, or a custom server:

- The client-side code in `src/lib/anpr.js` just expects a `POST /api/anpr` endpoint — it doesn't care how or where it's hosted.
- Port `api/anpr.js` to your platform's equivalent (Netlify Functions, an Express server, a separate Lambda, etc.)
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

How it works under the hood:

- On login, the app writes a random `session_token` and `session_at` timestamp to the `settings` table in Supabase
- A heartbeat refreshes `session_at` every 5 minutes while the session is active
- The session expires automatically after 30 minutes of inactivity (no heartbeat)
- On logout or tab close, the token is cleared via `releaseAdminSession`
- Same-browser tabs also get notified via `BroadcastChannel` so they don't require a Supabase round-trip

### Dashboard Tabs

**Dashboard** — at-a-glance stats (active vehicles, empty slots, today's revenue vs yesterday) plus a 7-day revenue area chart and a slot-type occupancy pie chart. Includes a fixed ₹150/day operating cost line on the revenue chart.

**Vehicles** — full sortable table of all vehicle records with status badges (parked / completed). Includes a force-checkout button for vehicles that left without checking out.

**Settings** — configure total slot count, per-type slot allocation (Standard / EV / Disabled), hourly rates per type, UPI VPA and payee name, and a "wipe all data" button for resetting between deployments.

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
- **Rate limits on the free tier.** Plate Recognizer's free plan caps at 1 lookup/second. The live camera runs at ~1 fps, so occasional `429 Too Many Requests` responses are expected. Upgrading to a paid plan raises the limit to 8/second.
- **Plate detection requires connectivity.** If `PLATERECOGNIZER_TOKEN` is unset, wrong, or the account is out of credits, detection fails hard — it doesn't degrade gracefully to manual entry, it just shows an error.
- **Indian plates only (default).** The ANPR proxy sends `regions=in` to Plate Recognizer. To support other countries, edit the `DEFAULT_REGION` constant in `api/anpr.js`.

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

| Variable | Where it's used | Required |
|---|---|---|
| `PLATERECOGNIZER_TOKEN` | `api/anpr.js` (server-side only) | Yes, for ANPR |
| `VITE_SUPABASE_URL` | `src/lib/supabase.js` (client-side) | Yes, for cloud sync |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.js` (client-side) | Yes, for cloud sync |

Missing `VITE_SUPABASE_*` vars → app falls back to `localStorage` only, no cross-device sync.  
Missing `PLATERECOGNIZER_TOKEN` → plate detection returns a 500 error; everything else works normally.

---

## License

Private project. All rights reserved.
