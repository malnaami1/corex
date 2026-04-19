import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "corex_settings";

const REGIONS = ["us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-northeast-1", "sa-east-1"];

export interface CorexSettings {
  acceptedJobTypes: { text: boolean; audio: boolean; image: boolean; custom: boolean };
  chunkSizePref: "small" | "medium" | "large";
  maxCpu: 25 | 50 | 75 | 100;
  notif: { jobCompletion: boolean; integrity: boolean; newChunk: boolean };
  region: string;
  display: { compact: boolean; monoIds: boolean };
}

const DEFAULTS: CorexSettings = {
  acceptedJobTypes: { text: true, audio: false, image: false, custom: false },
  chunkSizePref: "medium",
  maxCpu: 75,
  notif: { jobCompletion: true, integrity: true, newChunk: true },
  region: "us-east-1",
  display: { compact: false, monoIds: true },
};

export function loadSettings(): CorexSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(s: CorexSettings) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

interface Props {
  open: boolean;
  onClose: () => void;
  role: "worker" | "company";
}

function Toggle({ checked, onChange, disabled = false, testId, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; testId?: string; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
        disabled ? "bg-muted opacity-40 cursor-not-allowed" : checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function Row({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsModal({ open, onClose, role }: Props) {
  const [s, setS] = useState<CorexSettings>(DEFAULTS);

  useEffect(() => {
    if (open) setS(loadSettings());
  }, [open]);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCloseRef.current(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    saveSettings(s);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div data-testid="overlay-settings" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" />
      <div
        data-testid="modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] max-h-[90vh] flex flex-col bg-card border border-border rounded-lg shadow-2xl animate-in zoom-in-95 fade-in duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 id="settings-title" className="text-base font-semibold text-foreground">Settings</h2>
          <button
            data-testid="button-close-settings"
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {role === "worker" && (
            <>
              <section>
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Job preferences</h3>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">Accepted job types</p>
                  <Row label="Text Embeddings">
                    <Toggle label="Accept Text Embeddings jobs" checked={s.acceptedJobTypes.text} onChange={(v) => setS({ ...s, acceptedJobTypes: { ...s.acceptedJobTypes, text: v } })} testId="toggle-jt-text" />
                  </Row>
                  {(["audio", "image", "custom"] as const).map((k) => {
                    const rowLabel = k === "audio" ? "Audio Transcription" : k === "image" ? "Image Classification" : "Custom Models";
                    return (
                      <Row key={k} label={rowLabel}>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-medium text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">Coming soon</span>
                          <Toggle label={`Accept ${rowLabel} jobs (coming soon)`} checked={false} onChange={() => {}} disabled testId={`toggle-jt-${k}`} />
                        </div>
                      </Row>
                    );
                  })}
                </div>

                <div className="mt-3">
                  <p className="text-[11px] text-muted-foreground mb-2">Chunk size preference</p>
                  <div className="grid grid-cols-3 gap-1 bg-muted rounded-md p-0.5" role="radiogroup">
                    {([
                      { id: "small" as const, label: "Small", sub: "10 texts" },
                      { id: "medium" as const, label: "Medium", sub: "25 texts" },
                      { id: "large" as const, label: "Large", sub: "50 texts" },
                    ]).map((c) => (
                      <button
                        key={c.id}
                        data-testid={`chunk-${c.id}`}
                        role="radio"
                        aria-checked={s.chunkSizePref === c.id}
                        onClick={() => setS({ ...s, chunkSizePref: c.id })}
                        className={`px-2 py-2 rounded text-xs font-medium transition-colors ${
                          s.chunkSizePref === c.id ? "bg-card text-foreground border border-card-border" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {c.label}
                        <span className="block text-[10px] font-normal text-muted-foreground">{c.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] text-muted-foreground">Max CPU usage</p>
                    <span className="text-xs font-mono-accent" data-testid="text-max-cpu">{s.maxCpu}%</span>
                  </div>
                  <input
                    data-testid="slider-max-cpu"
                    type="range"
                    min={25}
                    max={100}
                    step={25}
                    value={s.maxCpu}
                    onChange={(e) => setS({ ...s, maxCpu: parseInt(e.target.value, 10) as CorexSettings["maxCpu"] })}
                    className="w-full accent-primary"
                  />
                  <div className="flex items-center justify-between mt-0.5">
                    {([25, 50, 75, 100] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        data-testid={`cpu-tick-${v}`}
                        onClick={() => setS({ ...s, maxCpu: v })}
                        className={`text-[10px] font-mono px-1 hover:text-foreground transition-colors ${
                          s.maxCpu === v ? "text-primary font-semibold" : "text-muted-foreground"
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Corex will not exceed this threshold</p>
                </div>
              </section>

              <div className="h-px bg-border" />
            </>
          )}

          <section>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">General</h3>

            <p className="text-[11px] text-muted-foreground mt-1 mb-1">Notifications</p>
            <Row label="Job completion alerts">
              <Toggle label="Job completion alerts" checked={s.notif.jobCompletion} onChange={(v) => setS({ ...s, notif: { ...s.notif, jobCompletion: v } })} testId="toggle-notif-job" />
            </Row>
            {role === "company" && (
              <Row label="Integrity check alerts">
                <Toggle label="Integrity check alerts" checked={s.notif.integrity} onChange={(v) => setS({ ...s, notif: { ...s.notif, integrity: v } })} testId="toggle-notif-integrity" />
              </Row>
            )}
            {role === "worker" && (
              <Row label="New chunk alerts">
                <Toggle label="New chunk alerts" checked={s.notif.newChunk} onChange={(v) => setS({ ...s, notif: { ...s.notif, newChunk: v } })} testId="toggle-notif-chunk" />
              </Row>
            )}

            <div className="mt-3">
              <p className="text-[11px] text-muted-foreground mb-1">Region</p>
              <select
                data-testid="select-region"
                value={s.region}
                onChange={(e) => setS({ ...s, region: e.target.value })}
                className="w-full px-2.5 py-2 text-xs bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {REGIONS.map((r) => <option key={r} value={r}>{r}{r === "us-east-1" ? " (auto-detected)" : ""}</option>)}
              </select>
            </div>

            <p className="text-[11px] text-muted-foreground mt-3 mb-1">Display</p>
            <Row label="Compact table rows">
              <Toggle label="Compact table rows" checked={s.display.compact} onChange={(v) => setS({ ...s, display: { ...s.display, compact: v } })} testId="toggle-display-compact" />
            </Row>
            <Row label="Show monospace IDs">
              <Toggle label="Show monospace IDs" checked={s.display.monoIds} onChange={(v) => setS({ ...s, display: { ...s.display, monoIds: v } })} testId="toggle-display-mono" />
            </Row>
          </section>
        </div>

        <div className="px-5 py-4 border-t border-border">
          <button
            data-testid="button-save-settings"
            onClick={handleSave}
            className="w-full px-4 py-2.5 text-sm font-medium text-[#05070F] bg-primary hover:bg-[#A8D0FF] rounded-md transition-colors"
          >
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
