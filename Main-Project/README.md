# ParkPilot — AI Smart Parking System

A Vite + React app for managing a parking lot: admin dashboard, guest check-in/check-out, AI-assisted Indian number-plate detection, and UPI QR payments. Data is stored in the browser via `localStorage` (single device, no backend).

## Stack

- **React 19** + **Vite** (build tool)
- **tesseract.js** — in-browser OCR for plate detection (lazy-loaded)
- **qrcode** — generates UPI payment QR codes (lazy-loaded)
- **recharts** — dashboard charts (lazy-loaded with the Admin panel)

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview   # serve the built dist/ folder locally to sanity-check
```

Output goes to `dist/`.

## Deploying

This is a static site after build — deploy `dist/` to Vercel, Netlify, GitHub Pages, or any static host.

**Vercel:**
```bash
npm install -g vercel
vercel
```
Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.

## Project structure

```
src/
  components/        UI components (one per screen/section)
  hooks/useStore.js   localStorage-backed state hook
  lib/                pure utility functions (formatting, plate normalization, storage)
  App.jsx             top-level routing between Home / Admin / Guest
  main.jsx            React entry point
```

## Admin access

The admin dashboard has no link anywhere in the UI — it's only reachable by visiting `/admin` directly in the browser (e.g. `http://localhost:5173/admin` in dev, or `yoursite.com/admin` once deployed).

Demo PIN: `1234` (hardcoded in `src/components/AdminLogin.jsx`). Replace with real authentication before any production use — a hidden URL is obscurity, not security.

If you deploy to a static host, make sure deep-links to `/admin` don't 404 on a hard refresh:
- **Vercel** — `vercel.json` (included) rewrites all paths to `index.html`.
- **Netlify** — `public/_redirects` (included) does the same.
- **GitHub Pages** — doesn't support rewrites natively; either use a `404.html` that redirects to `index.html`, or stick to in-app navigation (no hard refresh on `/admin`).

## Theme

Light/dark mode toggle in the top-right corner, persisted in `localStorage` and defaulting to the OS-level preference on first visit.

## Notes on plate detection

OCR runs entirely in the browser via tesseract.js — no photos are uploaded anywhere. Detected text is always shown in an editable field before submission, since no OCR engine (including paid cloud ANPR services) is reliable enough on phone photos to trust blindly, especially when the result feeds into billing.

## Known limitations

- Single device only — `localStorage` doesn't sync across browsers/devices.
- No real authentication — the admin PIN is a placeholder.
- OCR accuracy depends heavily on photo angle, lighting, and plate condition.
