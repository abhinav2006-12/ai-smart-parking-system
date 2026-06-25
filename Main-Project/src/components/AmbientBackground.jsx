// Purely decorative — soft blurred color blobs + faint grid behind content.
// No external image requests, so the app stays fully offline-capable.
export default function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
    </div>
  );
}
