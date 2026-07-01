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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.PLATERECOGNIZER_TOKEN;
  if (!token) {
    // Fail loudly in server logs — a missing token is a deployment
    // misconfiguration, not a user-facing error to guess at.
    console.error("PLATERECOGNIZER_TOKEN is not set in the environment.");
    return res.status(500).json({ error: "ANPR service is not configured." });
  }

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

    if (prResponse.status === 429) {
      return res.status(429).json({ error: "Rate limited by ANPR provider — try again shortly." });
    }
    if (prResponse.status === 403) {
      // Per Plate Recognizer's docs, 403 means either an invalid token or
      // insufficient credits — both are server-config/billing issues, not
      // something the end user (a parking attendant) can act on.
      console.error("Plate Recognizer 403 — check token validity and account credits.");
      return res.status(502).json({ error: "ANPR service unavailable." });
    }
    if (!prResponse.ok) {
      const text = await prResponse.text().catch(() => "");
      console.error(`Plate Recognizer error ${prResponse.status}:`, text);
      return res.status(502).json({ error: "ANPR provider returned an error." });
    }

    const data = await prResponse.json();

    // Plate Recognizer returns a `results` array — one entry per plate
    // detected in the frame. Our scanning zone is cropped tightly around
    // a single plate, so we take the highest-confidence result if more
    // than one comes back (e.g. a reflection or a second vehicle edge).
    const best = (data.results || []).reduce((top, r) => (!top || r.score > top.score ? r : top), null);

    return res.status(200).json({
      plate: best ? best.plate.toUpperCase() : "",
      confidence: best ? best.score : 0,
      // Passed through for callers that want it (e.g. logging); harmless
      // to omit on the client side if unused.
      raw: best || null,
    });
  } catch (err) {
    console.error("ANPR proxy failed:", err);
    return res.status(500).json({ error: "Failed to process frame." });
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
