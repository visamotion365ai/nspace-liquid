export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="app-shell items-center justify-center">
      <div className="lg lg-panel mx-auto mt-24 max-w-md p-8 text-center">
        <p className="eyebrow">No connection</p>
        <h1 className="display mt-3 text-4xl">Offline</h1>
        <p className="mt-3 text-sm" style={{ color: "var(--ink-mute)" }}>
          The shell still works. Your vault tracks and library stay on this device.
          Reconnect to search the live catalogue again.
        </p>
        <a
          href="/"
          className="press mt-6 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--accent)" }}
        >
          Reopen N Space
        </a>
      </div>
    </main>
  );
}
