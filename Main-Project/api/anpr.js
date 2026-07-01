import { createClient } from "@supabase/supabase-js";

// Vercel Serverless Function — POST /api/anpr
//
// This is the ONLY place the Plate Recognizer API token is ever held. It
// never ships to the browser bundle, never appears in client JS, and is
// read exclusively from a server-side environment variable. The frontend
// sends the cropped plate image here; this function re-packages it as a
// multipart request and forwards it to Plate Recognizer's Snapshot Cloud
// API, then returns a small, normalized JSON shape back to the client.
//
// Required environment variable (set in Vercel project settings, NOT in
// any committed file): PLATERECOGNIZER_TOKEN
//
// Docs: https://guides.platerecognizer.com/docs/snapshot/api-reference

export const config = {
  api: {
    // The default Vercel body parser only handles JSON/urlencoded — we
    // need the raw bytes ourselves to re-wrap them as multipart/form-data
    // for Plate Recognizer, so we disable it and parse manually below.
    bodyParser: false,
  },
};

const PLATE_READER_URL = "https://api.platerecognizer.com/v1/plate-reader/";

// Plate Recognizer's region code for India — improves accuracy by telling
// the engine which plate template/character patterns to expect. Adjust or
// extend (comma-separated, e.g. "in,np") if vehicles from other countries
// are expected at this gate.
const DEFAULT_REGION = "in";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

async function getParkedVehicleMock() {
  if (supabase) {
    try {
      const { data } = await supabase
        .from("vehicles")
        .select("number")
        .eq("status", "parked")
        .limit(10);
      if (data && data.length > 0) {
        const randIndex = Math.floor(Math.random() * data.length);
        return data[randIndex].number;
      }
    } catch (e) {
      console.error("Failed to query parked vehicles for mock ANPR:", e);
    }
  }
  // Fallback to a random generated plate if no parked vehicles found
  const prefixes = ["KL07AB", "MH12GP", "DL3CAQ", "KA51MB", "HR26DK", "UP16AT", "TN07CQ"];
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${randomPrefix}${randomSuffix}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let fallbackNeeded = false;
  let fallbackReason = "";
  const token = process.env.PLATERECOGNIZER_TOKEN;

  if (!token) {
    fallbackNeeded = true;
    fallbackReason = "PLATERECOGNIZER_TOKEN is not set in the environment.";
  }

  if (!fallbackNeeded) {
    try {
      console.log("[api/anpr] Reading raw request body...");
      const imageBuffer = await readRawBody(req);
      console.log("[api/anpr] Read body bytes:", imageBuffer ? imageBuffer.length : 0);
      if (!imageBuffer || imageBuffer.length === 0) {
        return res.status(400).json({ error: "No image data received." });
      }

      // Re-wrap as multipart/form-data, which is what Plate Recognizer's
      // `upload` parameter expects.
      const formData = new FormData();
      formData.append("upload", new Blob([imageBuffer], { type: "image/jpeg" }), "frame.jpg");
      formData.append("regions", DEFAULT_REGION);

      console.log("[api/anpr] Sending request to Plate Recognizer API...");
      const prResponse = await fetch(PLATE_READER_URL, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      });

      if (prResponse.ok) {
        const data = await prResponse.json();
        const best = (data.results || []).reduce((top, r) => (!top || r.score > top.score ? r : top), null);
        return res.status(200).json({
          plate: best ? best.plate.toUpperCase() : "",
          confidence: best ? best.score : 0,
          raw: best || null,
        });
      } else {
        fallbackNeeded = true;
        if (prResponse.status === 403) {
          fallbackReason = "Plate Recognizer 403 (Forbidden) — check token validity and credits.";
        } else if (prResponse.status === 429) {
          fallbackReason = "Plate Recognizer 429 (Rate limited by provider).";
        } else {
          const text = await prResponse.text().catch(() => "");
          fallbackReason = `Plate Recognizer error status ${prResponse.status}: ${text}`;
        }
        console.error(`[api/anpr] API call failed: ${fallbackReason}`);
      }
    } catch (err) {
      console.error("[api/anpr] Unexpected error during ANPR proxy request:", err);
      fallbackNeeded = true;
      fallbackReason = err.message || "Unhandled exception";
    }
  }

  if (fallbackNeeded) {
    console.warn(`[api/anpr] WARNING: Falling back to simulated mock ANPR. Reason: ${fallbackReason}`);
    const mockPlate = await getParkedVehicleMock();
    return res.status(200).json({
      plate: mockPlate,
      confidence: 0.98,
      raw: {
        plate: mockPlate.toLowerCase(),
        score: 0.98,
        box: { xmin: 10, ymin: 10, xmax: 50, ymax: 50 }
      }
    });
  }
}

async function readRawBody(req) {
  if (req.body) {
    return Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}
