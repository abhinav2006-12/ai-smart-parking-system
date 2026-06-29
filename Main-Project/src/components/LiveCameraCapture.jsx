import { useState, useRef, useEffect, useCallback } from "react";
import { normalizeIndianPlate } from "../lib/plate";
import { recognizePlate } from "../lib/anpr";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const SCAN_INTERVAL_MS = 1000; // how often we grab + analyze a frame
const VOTES_REQUIRED = 1; // Plate Recognizer AI is high-confidence; lock immediately on valid detection

// UI state machine — exactly the 4 states from spec, plus "error" for the
// camera-permission/hardware failure path (we still need somewhere to put it).
const PHASE = {
  INITIALIZING: "Initializing Camera...",
  ACTIVE: "Camera Active - Align Plate",
  PROCESSING: "Processing Frame...",
  DETECTED: "Plate Detected",
  ERROR: "Camera Unavailable",
};

export default function LiveCameraCapture({ onDetected, onLiveRead }) {
  const videoRef = useRef(null);
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
  const [scanError, setScanError] = useState("");

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

  // Note: overlay canvas drawing has been removed since we now use the full live camera.

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

    // Send the full frame (scaled down to max 1024px width for fast upload)
    // so Plate Recognizer's AI engine detects the plate wherever it sits.
    const maxW = 1024;
    const scale = video.videoWidth > maxW ? maxW / video.videoWidth : 1;
    captureCanvas.width = video.videoWidth * scale;
    captureCanvas.height = video.videoHeight * scale;
    const ctx = captureCanvas.getContext("2d");

    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

    return new Promise((resolve) => {
      captureCanvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
    });
  }, []);

  // -------------------------------------------------------------------------
  // AI BACKEND CALL — Plate Recognizer Snapshot Cloud API
  // Posts the cropped scan-zone frame to our own /api/anpr serverless
  // function (see /api/anpr.js), which holds the Plate Recognizer API
  // token server-side and proxies the request on. The frame DOES leave the
  // browser at this point — see README for the updated privacy posture.
  //
  // AbortController wiring: `signal` is forwarded straight into fetch, so
  // aborting the controller in the calling effect immediately cancels the
  // underlying network request rather than just ignoring its eventual
  // result — this matters for a 1-request-per-second cadence where slow
  // responses can otherwise pile up.
  // -------------------------------------------------------------------------
  const processFrameToAI = useCallback(async (imageBlob, signal) => {
    if (!imageBlob) return { plate: "", confidence: 0 };

    const { plate: rawPlate, confidence } = await recognizePlate(imageBlob, { signal });
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    // Plate Recognizer's own OCR is generally cleaner than Tesseract's, but
    // we still run it through normalizeIndianPlate to collapse any stray
    // separators and apply the same letter/digit confusion fixes (O/0,
    // I/1, etc.) for consistency with manually-typed entries elsewhere in
    // the app.
    const plate = normalizeIndianPlate(rawPlate);
    return { plate, confidence };
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

    let active = true;
    let timeoutId = null;

    async function tick() {
      if (!active) return;

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const myRequestId = ++requestIdRef.current;

      setPhase(PHASE.PROCESSING);
      setScanError(""); // Clear any previous transient scan error on new attempt

      try {
        const blob = await cropFrameToBlob();
        if (!blob || !active || controller.signal.aborted || myRequestId !== requestIdRef.current) {
          if (active) timeoutId = setTimeout(tick, SCAN_INTERVAL_MS);
          return;
        }

        const photoDataUrl = await blobToDataUrl(blob);
        const { plate } = await processFrameToAI(blob, controller.signal);

        if (!active || controller.signal.aborted || myRequestId !== requestIdRef.current) {
          if (active) timeoutId = setTimeout(tick, SCAN_INTERVAL_MS);
          return;
        }

        if (plate) {
          setLastSeenRaw(plate);
          if (onLiveRead) onLiveRead(plate);
          registerVote(plate, photoDataUrl);
        }
      } catch (err) {
        if (err?.name !== "AbortError" && active) {
          console.error("Frame processing failed:", err);
          setScanError(err.message || "Failed to process frame");
        }
      }

      if (active) {
        timeoutId = setTimeout(tick, SCAN_INTERVAL_MS);
      }
    }

    timeoutId = setTimeout(tick, SCAN_INTERVAL_MS);

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cropFrameToBlob/processFrameToAI/registerVote are stable via useCallback
  }, [cameraNotReady]);

  const resetScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    voteBufferRef.current = [];
    setLockedPlate(null);
    setLastSeenRaw("");
    setScanError("");
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
        {/* Hidden capture canvas — this is the one cropFrameToBlob() actually reads pixels from */}
        <canvas ref={captureCanvasRef} style={{ display: "none" }} />

        <StatusBadge phase={phase} lastSeenRaw={phase === PHASE.DETECTED ? lockedPlate : lastSeenRaw} />

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

      {scanError && (
        <div style={{ color: "var(--danger)", fontSize: 11.5, marginTop: 6, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
          <span>⚠</span>
          <span>ANPR API error: {scanError}</span>
        </div>
      )}

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



function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function StatusBadge({ phase, lastSeenRaw }) {
  const palette = {
    [PHASE.INITIALIZING]: { bg: "rgba(91,155,181,0.9)", icon: "spin" },
    [PHASE.ACTIVE]: { bg: "rgba(91,155,181,0.9)", icon: "dot" },
    [PHASE.PROCESSING]: { bg: "rgba(224,169,59,0.92)", icon: "spin" },
    [PHASE.DETECTED]: { bg: "rgba(63,203,135,0.92)", icon: "check" },
    [PHASE.ERROR]: { bg: "rgba(226,104,90,0.92)", icon: "warn" },
  };
  const { bg, icon } = palette[phase] || palette[PHASE.ACTIVE];

  const displayText = (() => {
    if (phase === PHASE.DETECTED && lastSeenRaw) {
      return `Plate Detected: ${lastSeenRaw}`;
    }
    if (phase === PHASE.PROCESSING && lastSeenRaw) {
      return `Processing Frame... (${lastSeenRaw})`;
    }
    return phase;
  })();

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
      {displayText}
    </div>
  );
}
