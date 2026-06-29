# ParkPilot — AI Smart Parking System

A Vite + React app for managing a parking lot: admin dashboard, guest check-in/check-out, AI-assisted Indian number-plate detection (via the Plate Recognizer Snapshot Cloud API), and UPI QR payments. App data (vehicles, settings, revenue log) is stored in the browser via `localStorage` (single device). Plate recognition is handled by a small serverless function — see [Plate detection & privacy](#plate-detection--privacy) below.

## Stack

- **React 19** + **Vite** (build tool)
- **Vercel Serverless Function** (`/api/anpr.js`) — proxies plate images to Plate Recognizer; the only place the API token is held
- **Plate Recognizer Snapshot Cloud API** — server-side ANPR/OCR for plate detection
- **qrcode** — generates UPI payment QR codes (lazy-loaded)
- **recharts** — dashboard charts (lazy-loaded with the Admin panel)

## Getting started

You'll need a Plate Recognizer API token (free trial available at [platerecognizer.com](https://app.platerecognizer.com/service/snapshot-cloud/)) for plate detection to work.

```bash
npm install
cp .env.example .env   # then fill in PLATERECOGNIZER_TOKEN
```

The `/api/anpr.js` serverless function only runs under Vercel's dev server, not plain Vite — so for full functionality (including plate detection) use:

```bash
npm install -g vercel   # if you don't have it already
vercel dev
```

Plain `npm run dev` still works for everything except plate detection (the camera/upload UI will show a "service unavailable" error from the missing `/api/anpr` endpoint, since Vite alone doesn't run serverless functions).

## Build for production

```bash
npm run build
npm run preview   # serve the built dist/ folder locally to sanity-check
```

Output goes to `dist/`.

## Deploying

This app now requires Vercel specifically (not just any static host) because `/api/anpr.js` is a Vercel Serverless Function.

```bash
npm install -g vercel
vercel
```

Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.

**Important:** set `PLATERECOGNIZER_TOKEN` in your Vercel project's Environment Variables (Project Settings → Environment Variables) — it is not read from any file committed to the repo. Plate detection will fail with a 500 error until this is set.

If you need to deploy to Netlify/GitHub Pages/another static host instead, you'll need to port `/api/anpr.js` to that platform's equivalent (Netlify Functions, a separate Express server, etc.) — the client-side code in `src/lib/anpr.js` just expects a `POST /api/anpr` endpoint to exist somewhere and doesn't care how it's hosted.

## Project structure

```
api/
  anpr.js              Vercel Serverless Function — proxies frames to Plate Recognizer (holds the API token)
src/
  components/          UI components (one per screen/section)
  hooks/useStore.js     localStorage-backed state hook
  lib/                  pure utility functions (formatting, plate normalization/validation, ANPR client, storage)
  App.jsx               top-level routing between Home / Admin / Guest
  main.jsx               React entry point
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

## Plate detection & privacy

**This changed from earlier versions of this project, which ran OCR entirely in the browser via tesseract.js with a strict "no photo ever leaves the device" guarantee. That guarantee no longer holds.**

Plate images (both from the live camera's auto-capture loop and manual photo uploads) are now sent over the network to `/api/anpr.js`, which forwards them to **Plate Recognizer's Snapshot Cloud API** (a third-party service) for recognition. Concretely:

- Every ~1 second while the live camera is active, a cropped frame is uploaded to Plate Recognizer's servers.
- Manual photo uploads are sent in full.
- Plate Recognizer's own [privacy/retention policy](https://platerecognizer.com/privacy-policy/) governs what happens to images on their end — this app has no control over that once the request leaves `/api/anpr.js`.
- The Plate Recognizer API token lives only in the server-side environment variable `PLATERECOGNIZER_TOKEN` (read by `/api/anpr.js`) — it is never bundled into client JS or exposed to the browser.

Detected text is still always shown in an editable field before submission — no OCR engine, cloud or local, is reliable enough on phone photos to trust blindly, especially when the result feeds into billing.

If the "nothing leaves the browser" guarantee matters for your deployment (e.g. data-residency or privacy requirements), this is a meaningful architecture change to be aware of before deploying — not just a drop-in OCR engine swap.

## Known limitations

- Single device only — `localStorage` doesn't sync across browsers/devices.
- No real authentication — the admin PIN is a placeholder.
- OCR accuracy depends heavily on photo angle, lighting, and plate condition.
- **Plate detection requires network connectivity and a Plate Recognizer account.** The Free Trial plan is limited to 1 lookup/second — the live camera's 1-frame/second auto-capture loop runs right at that ceiling, so expect occasional `429` rate-limit responses on the free tier; a paid plan raises this to 8/second. Detection will fail entirely (not just degrade) if `PLATERECOGNIZER_TOKEN` is unset or the account is out of credits.
- Photos are sent to a third-party cloud service — see [Plate detection & privacy](#plate-detection--privacy) above.
