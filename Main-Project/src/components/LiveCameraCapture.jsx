import { useState, useRef, useEffect, useCallback } from "react";
import { normalizeIndianPlate } from "../lib/plate";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const SCAN_INTERVAL_MS = 1000; // how often we grab + analyze a frame
const VOTES_REQUIRED = 3; // consecutive identical readings needed to "lock"
const SCAN_ZONE = { wPct: 0.7, hPct: 0.22 }; // scanning zone size, % of video frame

// UI state machine — exactly the 4 states from spec, plus "error" for the
// camera-permission/hardware failure path (we still need somewhere to put it).
const PHASE = {
  INITIALIZING: "Initializing Camera...",
  ACTIVE: "Camera Active - Align Plate",
  PROCESSING: "Processing Frame...",
  DETECTED: "Plate Detected",
  ERROR: "Camera Unavailable",
};

export default function LiveCameraCapture({ onDetected }) {
  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null); // visible canvas: draws the aiming box
  const captureCanvasRef = useRef(null); // hidden canvas: holds the cropped frame for OCR
  const streamRef = useRef(null);

  // AbortController + a monotonically increasing id are both used to guard
  // against race conditions: the controller cancels in-flight work, the id
  // lets an async callback know "am I still the most recent request?" even
  // after the controller has already moved on to the next one.
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const intervalRef = useRef(null);

  // Rolling "votes" buffer for the debounce/voting mechanism. Kept in a ref
  // (not state) because we mutate it inside the interval loop and don't want
  // every frame's read to trigger a React re-render — only state we actually
  // display should live in state.
  const voteBufferRef = useRef([]);

  const [phase, setPhase] = useState(PHASE.INITIALIZING);
  const [lockedPlate, setLockedPlate] = useState(null);
  const [lastSeenRaw, setLastSeenRaw] = useState(""); // live "what the AI just saw" readout

  // -------------------------------------------------------------------------
  // CAMERA LIFECYCLE — acquire the stream on mount, release it on unmount.
  // This is the #1 place real-world ANPR demos leak memory: forgetting to
  // stop every MediaStreamTrack tears down the <video> element but leaves
  // the camera LED on and the browser tab pinned in memory.
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        // The component may have unmounted while getUserMedia() was awaiting
        // a permission prompt — if so, stop the stream immediately instead of
        // attaching it to a dead video element.
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPhase(PHASE.ACTIVE);
      } catch (err) {
        console.error("Camera init failed:", err);
        if (!cancelled) setPhase(PHASE.ERROR);
      }
    }

    startCamera();

    return () => {
      cancelled = true;

      // 1. Stop the auto-capture loop first so it can't fire one more tick
      //    against a video element that's about to disappear.
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // 2. Abort any AI request that's still in flight — otherwise its
      //    .then()/.catch() callback resolves later and tries to call
      //    setState on an unmounted component.
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 3. Stop every track on the MediaStream. stream.getTracks().stop()
      //    is the part that actually turns the camera light off — clearing
      //    srcObject alone does NOT release the hardware.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run once on mount
  }, []);

  // -------------------------------------------------------------------------
  // OVERLAY DRAWING — paints the aiming-guide rectangle on top of the video.
  // Re-runs on every video resize so the box stays correctly positioned
  // regardless of the actual camera resolution negotiated by getUserMedia.
  // -------------------------------------------------------------------------
  const drawOverlay = useCallback(() => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const zone = getScanZoneRect(canvas.width, canvas.height);

    // Dim everything outside the scan zone so the operator's eye is drawn
    // to where the plate actually needs to sit.
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(zone.x, zone.y, zone.w, zone.h);

    // Bounding box, color reflects current phase for quick at-a-glance status.
    ctx.strokeStyle = phase === PHASE.PROCESSING ? "#E0A93B" : phase === PHASE.DETECTED ? "#3FCB87" : "#5B9BB5";
    ctx.lineWidth = 3;
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    // Corner brackets — purely cosmetic, mimics the "targeting" look of
    // real traffic-camera ANPR overlays.
    const cornerLen = 22;
    ctx.lineWidth = 4;
    [
      [zone.x, zone.y, 1, 1],
      [zone.x + zone.w, zone.y, -1, 1],
      [zone.x, zone.y + zone.h, 1, -1],
      [zone.x + zone.w, zone.y + zone.h, -1, -1],
    ].forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + cornerLen * dy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + cornerLen * dx, cy);
      ctx.stroke();
    });
  }, [phase]);

  useEffect(() => {
    drawOverlay();
    window.addEventListener("resize", drawOverlay);
    return () => window.removeEventListener("resize", drawOverlay);
  }, [drawOverlay]);

  // -------------------------------------------------------------------------
  // FRAME CROPPING — maps the on-screen scan zone (CSS pixels) to the
  // video's native resolution (actual pixels), since those two coordinate
  // spaces differ whenever the <video> element is styled to a different
  // size than its native feed (which is almost always).
  // -------------------------------------------------------------------------
  const cropFrameToBlob = useCallback(() => {
    const video = videoRef.current;
    const captureCanvas = captureCanvasRef.current;
    if (!video || !captureCanvas || !video.videoWidth) return Promise.resolve(null);

    // Scale factor between the video's native pixel dimensions and the
    // CSS-rendered size of the <video> element on screen.
    const scaleX = video.videoWidth / video.clientWidth;
    const scaleY = video.videoHeight / video.clientHeight;

    // Same percentage-based zone as the overlay, but converted into the
    // video's actual pixel grid rather than the on-screen CSS grid.
    const cssZone = getScanZoneRect(video.clientWidth, video.clientHeight);
    const sx = cssZone.x * scaleX;
    const sy = cssZone.y * scaleY;
    const sw = cssZone.w * scaleX;
    const sh = cssZone.h * scaleY;

    captureCanvas.width = sw;
    captureCanvas.height = sh;
    const ctx = captureCanvas.getContext("2d");

    // drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh)
    // We read only the (sx,sy,sw,sh) rectangle from the live video frame —
    // i.e. only the pixels inside the scanning zone — and paint them at
    // full size into the small hidden canvas. This is what crops out
    // background noise and keeps the payload small before it ever reaches
    // processFrameToAI().
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, captureCanvas.width, captureCanvas.height);

    return new Promise((resolve) => {
      captureCanvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
    });
  }, []);

  // -------------------------------------------------------------------------
  // MOCK AI BACKEND CALL
  // Mocks a POST to a FastAPI-style endpoint: POST /api/anpr/scan with a
  // multipart image blob, returning { plate: string, confidence: number }.
  //
  // NOTE ON ARCHITECTURE: this project's stated privacy model is that plate
  // images never leave the browser (see README) — so today this function
  // resolves locally via tesseract.js rather than actually issuing a
  // network request. It is written so that swapping the body for a real
  // `fetch("/api/anpr/scan", { method: "POST", body: formData, signal })`
  // is a drop-in change later: same signature, same abort handling, same
  // return shape.
  // -------------------------------------------------------------------------
  const processFrameToAI = useCallback(async (imageBlob, signal) => {
    // --- Real network call would look like this ---
    // const formData = new FormData();
    // formData.append("frame", imageBlob, "frame.jpg");
    // const res = await fetch("https://your-fastapi-host/api/anpr/scan", {
    //   method: "POST",
    //   body: formData,
    //   signal, // <-- AbortController wiring goes here
    // });
    // if (!res.ok) throw new Error(`ANPR backend error: ${res.status}`);
    // return res.json(); // { plate, confidence }

    if (!imageBlob) return { plate: "", confidence: 0 };

    const dataUrl = await blobToDataUrl(imageBlob);
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    const { default: Tesseract } = await import("tesseract.js");
    const result = await Tesseract.recognize(dataUrl, "eng", {
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    });

    // Tesseract has no native abort signal, so we check again after the
    // (potentially slow) recognize() call resolves — if a newer frame has
    // since been captured, discard this stale result rather than voting on it.
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    const plate = normalizeIndianPlate(result.data.text || "");
    return { plate, confidence: result.data.confidence ?? 0 };
  }, []);

  // -------------------------------------------------------------------------
  // VOTING / DEBOUNCE LOGIC
  // Pushes a new reading into the rolling buffer and checks whether the
  // last VOTES_REQUIRED readings are all identical and non-empty. Only then
  // do we "lock" the plate and surface it to the parent via onDetected.
  // -------------------------------------------------------------------------
  const registerVote = useCallback(
    (plate, photoDataUrl) => {
      const buf = voteBufferRef.current;
      buf.push(plate);
      if (buf.length > VOTES_REQUIRED) buf.shift(); // keep only the most recent N

      const isUnanimous = buf.length === VOTES_REQUIRED && plate !== "" && buf.every((p) => p === plate);

      if (isUnanimous) {
        setLockedPlate(plate);
        setPhase(PHASE.DETECTED);
        onDetected(plate, photoDataUrl);
        // Reset so a *different* plate can still be picked up if the
        // operator moves on to the next vehicle without leaving the screen.
        voteBufferRef.current = [];
      } else {
        setPhase(PHASE.ACTIVE);
      }
    },
    [onDetected]
  );

  // -------------------------------------------------------------------------
  // AUTO-CAPTURE LOOP
  // A plain cleanable setInterval is used instead of requestAnimationFrame:
  // rAF fires ~60 times/sec tied to display refresh, which is the wrong
  // tool for "every 1000ms, on a wall-clock cadence regardless of whether
  // the tab is actively repainting." setInterval is the correct primitive
  // here; rAF is reserved for the overlay's *visual* redraws if we ever
  // animate it continuously.
  // -------------------------------------------------------------------------
  const cameraNotReady = phase === PHASE.ERROR || phase === PHASE.INITIALIZING;

  useEffect(() => {
    if (cameraNotReady) return;

    intervalRef.current = setInterval(async () => {
      // Race-condition guard #1: if a previous request is still in flight,
      // abort it now — its result is about to be superseded by a fresher
      // frame and we never want an old, slow response to land after a new,
      // fast one and overwrite the UI with stale data.
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Race-condition guard #2: a unique id per request, captured by
      // closure. Even if .abort() didn't exist, comparing this id against
      // requestIdRef.current after the await lets us detect "a newer
      // request has since started" and bail out without touching state.
      const myRequestId = ++requestIdRef.current;

      setPhase(PHASE.PROCESSING);

      try {
        const blob = await cropFrameToBlob();
        if (!blob || controller.signal.aborted || myRequestId !== requestIdRef.current) return;

        const photoDataUrl = await blobToDataUrl(blob);
        const { plate } = await processFrameToAI(blob, controller.signal);

        // Stale-response guard: only act on this result if nothing newer
        // has started since we kicked off this particular frame.
        if (controller.signal.aborted || myRequestId !== requestIdRef.current) return;

        setLastSeenRaw(plate || "—");
        registerVote(plate, photoDataUrl);
      } catch (err) {
        if (err?.name === "AbortError") return; // expected during normal operation, not a real error
        console.error("Frame processing failed:", err);
        setPhase(PHASE.ACTIVE);
      }
    }, SCAN_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cropFrameToBlob/processFrameToAI/registerVote are stable via useCallback
  }, [cameraNotReady]);

  const resetScan = () => {
    voteBufferRef.current = [];
    setLockedPlate(null);
    setLastSeenRaw("");
    setPhase(PHASE.ACTIVE);
  };

  return (
    <div>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4 / 3",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          background: "#000",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {/* Visible overlay canvas — purely a UI aid, never read from for OCR */}
        <canvas
          ref={overlayCanvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        />
        {/* Hidden capture canvas — this is the one cropFrameToBlob() actually reads pixels from */}
        <canvas ref={captureCanvasRef} style={{ display: "none" }} />

        <StatusBadge phase={phase} />

        {phase === PHASE.ERROR && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 8,
              color: "#fff",
              background: "rgba(0,0,0,0.75)",
              padding: 20,
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Couldn't access the camera.</span>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Check permissions, or switch to Manual Upload below.</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
        <span>
          Last read: <span className="mono" style={{ color: "var(--ink)", fontWeight: 600 }}>{lastSeenRaw || "—"}</span>
        </span>
        {lockedPlate && (
          <button type="button" onClick={resetScan} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
            Scan next vehicle
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Computes the scan-zone rectangle (in whatever pixel space w/h are given in)
// centered in the frame, sized as a percentage of the frame dimensions.
function getScanZoneRect(frameW, frameH) {
  const w = frameW * SCAN_ZONE.wPct;
  const h = frameH * SCAN_ZONE.hPct;
  return { x: (frameW - w) / 2, y: (frameH - h) / 2, w, h };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function StatusBadge({ phase }) {
  const palette = {
    [PHASE.INITIALIZING]: { bg: "rgba(91,155,181,0.9)", icon: "spin" },
    [PHASE.ACTIVE]: { bg: "rgba(91,155,181,0.9)", icon: "dot" },
    [PHASE.PROCESSING]: { bg: "rgba(224,169,59,0.92)", icon: "spin" },
    [PHASE.DETECTED]: { bg: "rgba(63,203,135,0.92)", icon: "check" },
    [PHASE.ERROR]: { bg: "rgba(226,104,90,0.92)", icon: "warn" },
  };
  const { bg, icon } = palette[phase] || palette[PHASE.ACTIVE];

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 12px",
        borderRadius: 20,
        background: bg,
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        backdropFilter: "blur(4px)",
      }}
    >
      {icon === "spin" && (
        <span className="spin" style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />
      )}
      {icon === "dot" && <span className="pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", display: "inline-block" }} />}
      {icon === "check" && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
      {icon === "warn" && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
          <path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.7 3.86a2 2 0 0 0-3.4 0z" />
        </svg>
      )}
      {phase}
    </div>
  );
}
