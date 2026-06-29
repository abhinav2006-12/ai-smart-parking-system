// Client-side helper for ANPR lookups. Every plate read in this app —
// whether from the live camera loop or a manually uploaded photo — goes
// through this one function, which posts the image to our own /api/anpr
// serverless function (never directly to Plate Recognizer, and never with
// the API token, which lives only on the server).
//
// `signal` is optional and is forwarded to fetch for AbortController
// support, so callers can cancel a stale in-flight request.
export async function recognizePlate(imageBlob, { signal } = {}) {
  if (!imageBlob) return { plate: "", confidence: 0 };

  const res = await fetch("/api/anpr", {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: imageBlob,
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `ANPR request failed (${res.status})`);
  }

  const data = await res.json();
  return { plate: data.plate || "", confidence: data.confidence || 0 };
}
