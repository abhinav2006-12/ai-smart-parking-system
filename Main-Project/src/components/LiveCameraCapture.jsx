import { useEffect, useRef, useState } from "react";

export default function LiveCameraCapture() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const streamRef = useRef(null);
  const animationRef = useRef(null);

  const [status, setStatus] = useState("Starting Camera...");
  const [fps, setFps] = useState(0);

  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment",
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;

      video.srcObject = stream;

      await video.play();

      setStatus("Camera Ready");

      startLoop();
    } catch (err) {
      console.error(err);
      setStatus("Camera Error");
    }
  }

  function stopCamera() {
    cancelAnimationFrame(animationRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  }

  function startLoop() {
    const loop = () => {
      drawFrame();

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
  }

  function drawFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0);

    drawScanBox(ctx);

    calculateFPS();
  }

  function drawScanBox(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const boxWidth = w * 0.55;
    const boxHeight = h * 0.18;

    const x = (w - boxWidth) / 2;
    const y = (h - boxHeight) / 2;

    ctx.strokeStyle = "#00ff66";
    ctx.lineWidth = 4;

    ctx.strokeRect(x, y, boxWidth, boxHeight);
  }

  function calculateFPS() {
    frameCountRef.current++;

    const now = performance.now();

    if (now - lastTimeRef.current >= 1000) {
      setFps(frameCountRef.current);

      frameCountRef.current = 0;

      lastTimeRef.current = now;
    }
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "auto",
      }}
    >
      <h2>AI Smart Parking Camera</h2>

      <p>Status : {status}</p>

      <p>FPS : {fps}</p>

      <video
        ref={videoRef}
        style={{
          display: "none",
        }}
      />

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          borderRadius: 10,
          border: "3px solid #00aa55",
        }}
      />
    </div>
  );
}