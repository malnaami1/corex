import { useEffect, useMemo, useRef, useState } from "react";
import { Type, Mic, Image as ImageIcon, Upload, X, Copy, Check, FileText } from "lucide-react";

const MODELS = [
  { id: "all-MiniLM-L6-v2", label: "all-MiniLM-L6-v2", sub: "Fast · 384 dims" },
  { id: "all-mpnet-base-v2", label: "all-mpnet-base-v2", sub: "Accurate · 768 dims" },
  { id: "paraphrase-MiniLM-L3-v2", label: "paraphrase-MiniLM-L3-v2", sub: "Ultra-fast · 384 dims" },
];

const CHUNK_SIZES = [10, 25, 50];

export interface JobSubmissionPayload {
  texts: string[];
  model: string;
  chunkSize: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: JobSubmissionPayload) => void;
}

export function JobModal({ open, onClose, onSubmit }: Props) {
  const [jobType, setJobType] = useState<"text" | "audio" | "image" | "custom">("text");
  const [textarea, setTextarea] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [model, setModel] = useState(MODELS[0].id);
  const [chunkSize, setChunkSize] = useState(10);
  const [view, setView] = useState<"form" | "api">("form");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ESC closes (use ref so we don't re-register on every parent re-render)
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  const lines = useMemo(() => textarea.split("\n").map((l) => l.trim()).filter(Boolean), [textarea]);
  const lineCount = lines.length;
  const chunkCount = Math.max(0, Math.ceil(lineCount / chunkSize));
  const cost = chunkCount * 0.000011;

  const apiSnippet = useMemo(() => {
    const inputsArray = lineCount === 0 ? ["your text here"] : lines.slice(0, 3);
    const inputsStr = JSON.stringify(inputsArray) + (lineCount > 3 ? '.slice(0, 3) + "..."' : "");
    const inputsRendered = lineCount > 3
      ? `[${inputsArray.map((l) => JSON.stringify(l)).join(", ")}, "..."]`
      : `[${inputsArray.map((l) => JSON.stringify(l)).join(", ")}]`;
    void inputsStr;
    return `curl -X POST https://api.corex.dev/v1/jobs/submit \\
  -H "Authorization: Bearer sk-corex-••••••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_type": "text_embeddings",
    "model": "${model}",
    "chunk_size": ${chunkSize},
    "inputs": ${inputsRendered},
    "webhook_url": "https://your-app.com/webhook"
  }'`;
  }, [lines, lineCount, model, chunkSize]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setTextarea(text);
    setFilename(file.name);
  };

  const handleTextareaChange = (v: string) => {
    setTextarea(v);
    if (filename) setFilename(null);
  };

  const handleSubmit = () => {
    if (lineCount === 0) return;
    onSubmit({ texts: lines, model, chunkSize });
    // reset for next time
    setTextarea("");
    setFilename(null);
    setView("form");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        data-testid="overlay-modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      />
      <div
        data-testid="modal-submit-job"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[560px] max-h-[90vh] flex flex-col bg-card border border-border rounded-lg shadow-2xl animate-in zoom-in-95 fade-in duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 id="modal-title" className="text-base font-semibold text-foreground">Submit embedding job</h2>
          <button
            data-testid="button-close-modal"
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Job type selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              data-testid="button-job-type-text"
              onClick={() => setJobType("text")}
              className={`relative flex flex-col items-start gap-1 p-2.5 border rounded-md text-left transition-colors ${
                jobType === "text" ? "border-primary bg-primary/10" : "border-card-border hover:bg-muted/40"
              }`}
            >
              <Type className={`w-4 h-4 ${jobType === "text" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[11px] font-medium ${jobType === "text" ? "text-primary" : "text-foreground"}`}>Text Embeddings</span>
            </button>
            {[
              { id: "audio" as const, icon: Mic, label: "Audio Transcription" },
              { id: "image" as const, icon: ImageIcon, label: "Image Classification" },
              { id: "custom" as const, icon: Upload, label: "Custom Model" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                data-testid={`button-job-type-${id}`}
                disabled
                title="Coming soon"
                className="relative flex flex-col items-start gap-1 p-2.5 border border-card-border rounded-md text-left opacity-60 cursor-not-allowed bg-muted/20"
              >
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                <span className="absolute top-1 right-1 text-[9px] font-medium text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1 py-0.5 rounded">Coming soon</span>
              </button>
            ))}
          </div>

          {/* View tabs (Form / API) */}
          <div className="flex items-center gap-1 border-b border-border -mx-5 px-5">
            <button
              data-testid="tab-form"
              onClick={() => setView("form")}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                view === "form" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Form
            </button>
            <button
              data-testid="tab-api"
              onClick={() => setView("api")}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                view === "api" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              API
            </button>
          </div>

          {view === "form" && (
            <>
              {filename && (
                <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  Loaded: {filename} · {lineCount} lines
                </p>
              )}

              <textarea
                data-testid="input-texts"
                value={textarea}
                onChange={(e) => handleTextareaChange(e.target.value)}
                placeholder="Paste your texts here, one per line..."
                className="w-full px-3 py-2.5 text-xs border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                style={{ minHeight: "180px" }}
              />

              <div className="flex items-center gap-3">
                <span className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-muted-foreground">or</span>
                <span className="flex-1 h-px bg-border" />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <button
                data-testid="button-upload-file"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-md hover:border-primary/60 hover:bg-primary/5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                style={{ minHeight: "60px" }}
              >
                <Upload className="w-4 h-4" />
                Upload .txt or .csv file
              </button>

              <p className="text-[11px] text-muted-foreground font-mono" data-testid="text-estimate">
                <span className="text-foreground">{lineCount}</span> texts → <span className="text-foreground">{chunkCount}</span> chunks → ~<span className="text-foreground">${cost.toFixed(4)}</span> estimated
              </p>

              {/* Settings row */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Model</span>
                  <select
                    data-testid="select-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="px-2.5 py-2 text-xs bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label} — {m.sub}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Chunk size</span>
                  <select
                    data-testid="select-chunk-size"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(parseInt(e.target.value, 10))}
                    className="px-2.5 py-2 text-xs bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {CHUNK_SIZES.map((c) => (
                      <option key={c} value={c}>{c} texts per chunk</option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}

          {view === "api" && (
            <div className="relative">
              <button
                data-testid="button-copy-snippet"
                onClick={handleCopy}
                className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground bg-card border border-border hover:text-foreground hover:bg-muted rounded transition-colors"
              >
                {copied ? (<><Check className="w-3 h-3" /> Copied</>) : (<><Copy className="w-3 h-3" /> Copy</>)}
              </button>
              <pre className="bg-background border border-border rounded-md p-3 pr-16 text-[11px] font-mono text-foreground/90 overflow-x-auto leading-relaxed">
{apiSnippet}
              </pre>
              <p className="text-[11px] text-muted-foreground font-mono mt-3" data-testid="text-estimate">
                <span className="text-foreground">{lineCount}</span> texts → <span className="text-foreground">{chunkCount}</span> chunks → ~<span className="text-foreground">${cost.toFixed(4)}</span> estimated
              </p>
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="px-5 py-4 border-t border-border">
          <button
            data-testid="button-submit-job"
            onClick={handleSubmit}
            disabled={lineCount === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#05070F] bg-primary hover:bg-[#A8D0FF] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Job <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
