// ============================================================================
// ApiTargetPanel — WHICH SERVER is this build talking to?
// ============================================================================
//
// A dead backend used to look like a broken app: a blank screen, a red
// line in the console (`ERR_NAME_NOT_RESOLVED`), and no way to tell
// "the project is paused" from "the password is wrong" from "the build
// is old".
//
// This panel puts the answer on the page: the address in force, a
// status that names WHICH of the three failures it is, and — because
// the address is resolved at runtime — a way to point the app at a
// working server without a new build.
//
// It is deliberately quiet: a single line until it is needed.
import { useCallback, useEffect, useState } from "react";
import {
  ChevronRight,
  Loader2,
  RefreshCw,
  Server,
  TriangleAlert,
} from "lucide-react";
import {
  apiBaseLabel,
  probeApiBase,
  readApiBaseOverride,
  resolveApiBase,
  writeApiBaseOverride,
  type ApiProbe,
  type ApiProbeStatus,
} from "@/integrations/supabase/apiBase";

/** How each failure is named on the page. */
const STATUS: Record<ApiProbeStatus, { pill: string; label: string; advice: string }> = {
  ok: {
    pill: "status-pill-success",
    label: "Online",
    advice: "",
  },
  quota: {
    pill: "status-pill-warning",
    label: "Over quota",
    advice:
      "The organisation is over its egress quota. Only the project owner can lift this, from the Supabase dashboard.",
  },
  unauthorized: {
    pill: "status-pill-warning",
    label: "Key refused",
    advice: "The server answered but refused this build's key. This address is not the one the build was made for.",
  },
  unreachable: {
    pill: "status-pill-destructive",
    label: "Not answering",
    advice:
      "The address did not answer. The project is paused or gone, or the address is wrong. Point the app at a working server below.",
  },
  misconfigured: {
    pill: "status-pill-destructive",
    label: "No address",
    advice: "This build carries no API address. Set one below.",
  },
};

export function ApiTargetPanel() {
  const current = resolveApiBase();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(current);
  const [probe, setProbe] = useState<ApiProbe | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOverridden = readApiBaseOverride() !== "";

  const runProbe = useCallback(async (base: string) => {
    setChecking(true);
    try {
      setProbe(await probeApiBase(base));
    } finally {
      setChecking(false);
    }
  }, []);

  // Ask once, on load. One request, and it turns "the app is broken"
  // into "the server is paused".
  useEffect(() => {
    void runProbe(current);
  }, [current, runProbe]);

  const apply = () => {
    const value = draft.trim();
    if (!/^https?:\/\/[^\s/]+/i.test(value)) {
      setError("That is not an address. It has to start with http:// or https://");
      return;
    }
    if (!writeApiBaseOverride(value)) {
      setError(
        "This app only talks to a Supabase project or to a server on this machine, so the address was refused.",
      );
      return;
    }
    setError(null);
    // The session belongs to the old server, so the page reloads and
    // asks for the sign-in again — with the new address in force.
    window.location.reload();
  };

  const useBuildAddress = () => {
    setError(null);
    writeApiBaseOverride(null);
    window.location.reload();
  };

  const status = probe ? STATUS[probe.status] : null;

  return (
    <div className="text-left">
      {/* The one line that is always there. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 py-2 text-[11px] text-ink-3 hover:text-ink-2 transition-colors"
        title="Which server this build is talking to"
      >
        <Server className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="font-mono truncate">{apiBaseLabel(current)}</span>
        {isOverridden && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border/60 text-ink-3">
            changed
          </span>
        )}
        {status && (
          <span className={`status-pill ${status.pill} !px-2 !py-0.5 !text-[10px] ml-auto`}>
            {checking ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
            {status.label}
          </span>
        )}
        <ChevronRight
          className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="mt-1 mb-2 space-y-2 rounded-lg border border-border/60 bg-background/60 p-3">
          {probe && probe.status !== "ok" && (
            <p className="flex items-start gap-1.5 text-[11px] text-destructive-tint">
              <TriangleAlert className="h-3 w-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{status?.advice}</span>
            </p>
          )}

          <label className="block text-[11px] text-ink-3" htmlFor="api-base">
            Server address
          </label>
          <input
            id="api-base"
            type="text"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
            spellCheck={false}
            autoComplete="off"
            className="w-full h-9 rounded-md border border-border bg-background px-2 font-mono text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {error && <p className="text-[11px] text-destructive-tint">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={apply}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
            >
              Use this server
            </button>
            <button
              type="button"
              onClick={() => void runProbe(draft)}
              disabled={checking}
              className="h-8 px-3 rounded-md border border-border text-[12px] text-ink-2 hover:bg-muted transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              {checking ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3 w-3" aria-hidden="true" />}
              <span>Test</span>
            </button>
            {isOverridden && (
              <button
                type="button"
                onClick={useBuildAddress}
                className="h-8 px-3 rounded-md text-[12px] text-primary-tint hover:underline"
              >
                Back to the build&apos;s server
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiTargetPanel;
