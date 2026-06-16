import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/* ═══ Auto-heal stale cache ═══════════════════════════════════════════ */
const BUILD_TS = "__BUILD_TIMESTAMP__"; // replaced at build time
const CACHE_KEY = "qbase:last-build";

if (BUILD_TS !== "__BUILD_TIMESTAMP__") {
  const last = localStorage.getItem(CACHE_KEY);
  if (last && last !== BUILD_TS) {
    // Stale build detected — nuke cache and reload once
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(n => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
    }
    localStorage.setItem(CACHE_KEY, BUILD_TS);
    window.location.reload();
  } else {
    localStorage.setItem(CACHE_KEY, BUILD_TS);
  }
}

/* ═══ Lazy-load error recovery ════════════════════════════════════════ */
window.addEventListener("error", (e) => {
  if (e.message?.includes("Loading chunk") || e.message?.includes("ChunkLoadError")) {
    localStorage.clear();
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
