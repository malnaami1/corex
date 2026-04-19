import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Cpu, Star, DollarSign, CheckCircle, ChevronLeft, ChevronRight, LogOut, ShieldCheck, X, Settings } from "lucide-react";
import { shortId } from "@/hooks/useSSE";
import { clearRole } from "@/lib/role";
import { SettingsModal } from "@/components/SettingsModal";

const MOCK = true;

type ChunkStatus = "received" | "processing" | "complete";
type WorkerTab = "live" | "history";

interface IncomingChunk {
  chunk_id: string;
  job_id: string;
  text_count: number;
  region: string;
  status: ChunkStatus;
  arrived_at: number;
  cpu_seconds?: number;
  payout?: number;
  job_type: "text" | "audio" | "image";
}

interface HistoryRow {
  chunk_id: string;
  job_id: string;
  texts: number;
  cpu_seconds: number;
  payout: number;
  timestamp: string;
  job_type: "text" | "audio" | "image";
}

interface CpuPoint {
  t: number;
  usage: number;
}

const REGIONS = ["us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-northeast-1", "sa-east-1"];

function makeChunkId() { return Math.random().toString(36).slice(2, 12); }
function makeJobId() { return "job_" + Math.random().toString(36).slice(2, 10); }
function pickRegion() { return REGIONS[Math.floor(Math.random() * REGIONS.length)]; }
function nowTime() { return new Date().toLocaleTimeString("en-US", { hour12: false }); }
function pickJobType(): "text" | "audio" | "image" {
  const r = Math.random();
  return r < 0.6 ? "text" : r < 0.85 ? "audio" : "image";
}

function makeInitialCpu(): CpuPoint[] {
  const now = Date.now();
  const points: CpuPoint[] = [];
  for (let i = 60; i >= 0; i -= 2) {
    points.push({ t: now - i * 1000, usage: Math.floor(Math.random() * 20 + 18) });
  }
  return points;
}

const INITIAL_HISTORY: HistoryRow[] = Array.from({ length: 22 }).map((_, i) => ({
  chunk_id: makeChunkId(),
  job_id: makeJobId(),
  texts: Math.floor(Math.random() * 12) + 4,
  cpu_seconds: parseFloat((Math.random() * 4 + 0.6).toFixed(2)),
  payout: parseFloat((Math.random() * 0.0024 + 0.0004).toFixed(4)),
  timestamp: new Date(Date.now() - i * 60000 - 30000).toLocaleTimeString("en-US", { hour12: false }),
  job_type: pickJobType(),
}));

const TABS: { id: WorkerTab; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "history", label: "History" },
];

export default function WorkerDashboard() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<WorkerTab>("live");
  const [online, setOnline] = useState(true);
  const [cpuPoints, setCpuPoints] = useState<CpuPoint[]>(makeInitialCpu);
  const [chunks, setChunks] = useState<IncomingChunk[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>(INITIAL_HISTORY);
  const [credits, setCredits] = useState(0.0428);
  const [jobsGripped, setJobsGripped] = useState(184);
  const [reputation] = useState(94);
  const [page, setPage] = useState(1);
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    typeof window !== "undefined" && sessionStorage.getItem("corex.worker.banner") === "1",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const totalCores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 8 : 8;

  const spikeUntilRef = useRef(0);
  const onlineRef = useRef(online);
  onlineRef.current = online;

  // Derive activeCores directly from chunks state so it's always in sync
  const activeCores = useMemo(() => {
    const activeChunk = chunks.find(
      (c) => c.status === "received" || c.status === "processing"
    );
    if (!activeChunk || !online) return 0;
    // Deterministic core count seeded from chunk_id so it doesn't
    // flicker on every render — always at least 1
    const seed =
      activeChunk.chunk_id.charCodeAt(0) +
      activeChunk.chunk_id.charCodeAt(1);
    return Math.max(1, (seed % Math.floor(totalCores / 2)) + 1);
  }, [chunks, online, totalCores]);

  // CPU meter interval — only updates the chart
  useEffect(() => {
    if (!MOCK) return;
    const id = setInterval(() => {
      const now = Date.now();
      const isSpiking = onlineRef.current && now < spikeUntilRef.current;
      const usage = !onlineRef.current
        ? Math.floor(Math.random() * 5 + 2)
        : isSpiking
        ? Math.floor(Math.random() * 20 + 75)
        : Math.floor(Math.random() * 20 + 15);
      setCpuPoints((prev) => [...prev, { t: now, usage }].slice(-31));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // Chunk dispatcher
  useEffect(() => {
    if (!MOCK) return;
    const timeouts = new Set<ReturnType<typeof setTimeout>>();
    const track = (t: ReturnType<typeof setTimeout>) => { timeouts.add(t); return t; };
    const id = setInterval(() => {
      if (!onlineRef.current) return;
      const newChunk: IncomingChunk = {
        chunk_id: makeChunkId(),
        job_id: makeJobId(),
        text_count: Math.floor(Math.random() * 14) + 4,
        region: pickRegion(),
        status: "received",
        arrived_at: Date.now(),
        job_type: pickJobType(),
      };

      spikeUntilRef.current = Date.now() + 8000;
      setChunks((prev) => [newChunk, ...prev].slice(0, 12));

      track(setTimeout(() => {
        setChunks((prev) =>
          prev.map((c) =>
            c.chunk_id === newChunk.chunk_id
              ? { ...c, status: "processing" }
              : c
          )
        );
      }, 1000));

      track(setTimeout(() => {
        const cpuSec = parseFloat((Math.random() * 5 + 2).toFixed(2));
        const payout = parseFloat((Math.random() * 0.002 + 0.0006).toFixed(4));
        setChunks((prev) =>
          prev.map((c) =>
            c.chunk_id === newChunk.chunk_id
              ? { ...c, status: "complete", cpu_seconds: cpuSec, payout }
              : c
          )
        );
        setCredits((c) => parseFloat((c + payout).toFixed(4)));
        setJobsGripped((n) => n + 1);
        setHistory((prev) =>
          [
            {
              chunk_id: newChunk.chunk_id,
              job_id: newChunk.job_id,
              texts: newChunk.text_count,
              cpu_seconds: cpuSec,
              payout,
              timestamp: nowTime(),
              job_type: newChunk.job_type,
            },
            ...prev,
          ].slice(0, 80)
        );
      }, 8000));
    }, 8000);
    return () => {
      clearInterval(id);
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [totalCores]);

  const reputationColor =
    reputation >= 90
      ? "text-emerald-400"
      : reputation >= 70
      ? "text-amber-400"
      : "text-red-400";
  const reputationBg =
    reputation >= 90
      ? "bg-emerald-500"
      : reputation >= 70
      ? "bg-amber-500"
      : "bg-red-500";

  const PER_PAGE = 12;
  const totalPages = Math.max(1, Math.ceil(history.length / PER_PAGE));
  const pageStart = (page - 1) * PER_PAGE;
  const pageRows = history.slice(pageStart, pageStart + PER_PAGE);

  const lastUsage = cpuPoints[cpuPoints.length - 1]?.usage ?? 0;
  const lineColor = lastUsage > 60 ? "#EF4444" : "#7EB8F7";

  const dismissBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem("corex.worker.banner", "1");
  };

  const exitToHome = () => {
    clearRole();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* TOP NAVBAR */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-6">
        <div className="max-w-7xl mx-auto h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base font-bold text-foreground tracking-tight">Corex</span>
            <span className="text-[11px] text-muted-foreground hidden md:inline">
              · Core in. Execute out.
            </span>
          </div>
          <nav className="flex items-center gap-1 h-full" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                data-testid={`tab-${t.id}`}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`relative h-full px-4 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <span className="absolute left-3 right-3 -bottom-px h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <button
              data-testid="button-settings"
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* PAGE HEADER */}
      <section className="border-b border-border px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-2xl font-bold text-foreground tracking-tight"
              data-testid="text-page-title"
            >
              {tab === "live" ? "Live Activity" : "Job History"}
            </h1>
            <p
              className="text-sm text-muted-foreground mt-1"
              data-testid="text-page-subtitle"
            >
              {tab === "live"
                ? online
                  ? "Your core is active. Incoming chunks, CPU usage, and earnings update in real time."
                  : "You are offline. Toggle online to start accepting jobs and earning credits."
                : "A full record of every chunk you have processed, with payout and timing details."}
            </p>
          </div>
          <button
            data-testid="button-toggle-status"
            onClick={() => setOnline((o) => !o)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              online
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                : "bg-muted text-muted-foreground border-border hover:bg-muted/70"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                online ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"
              }`}
            />
            {online ? "Online" : "Offline"}
          </button>
        </div>
      </section>

      {/* ANNOUNCEMENT BANNER */}
      {!bannerDismissed && (
        <div
          data-testid="banner-announcement"
          className="border-b border-border bg-primary/5 px-6 py-3"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium text-foreground">Integrity checks active.</span>
              <span className="text-muted-foreground truncate">
                Your results are being spot-checked to maintain network reputation.
              </span>
            </div>
            <button
              data-testid="button-dismiss-banner"
              aria-label="Dismiss"
              onClick={dismissBanner}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {tab === "live" && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                data-testid="card-jobs-gripped"
                className="bg-card border border-card-border rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Jobs Gripped
                  </span>
                </div>
                <p className="text-2xl font-semibold text-foreground">{jobsGripped}</p>
              </div>

              <div
                data-testid="card-credits"
                className="bg-card border border-card-border rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Credits Earned
                  </span>
                </div>
                <p className="text-2xl font-semibold font-mono-accent">${credits.toFixed(4)}</p>
              </div>

              <div
                data-testid="card-cpu-cores"
                className="bg-card border border-card-border rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Cores Used
                  </span>
                </div>
                <p className="text-2xl font-semibold text-foreground">
                  <span className={activeCores > 0 ? "font-mono-accent" : ""}>
                    {activeCores}
                  </span>
                  <span className="text-muted-foreground"> / {totalCores}</span>
                  <span className="text-sm text-muted-foreground font-normal ml-1.5">cores</span>
                </p>
              </div>

              <div
                data-testid="card-reputation"
                className="bg-card border border-card-border rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Star className={`w-4 h-4 ${reputationColor}`} />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Reputation Score
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-semibold ${reputationColor}`}>{reputation}%</p>
                  <span className={`w-2 h-2 rounded-full ${reputationBg}`} />
                </div>
              </div>
            </div>

            {/* CPU Meter */}
            <div
              data-testid="section-cpu-meter"
              className="bg-card border border-card-border rounded-lg p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Core activity</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    CPU % over the last 60 seconds
                  </p>
                </div>
                <span
                  className="font-mono text-sm font-medium"
                  style={{ color: lineColor }}
                >
                  {lastUsage}%
                </span>
              </div>
              <div className="h-56 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={cpuPoints}
                    margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,26%,17%)" />
                    <XAxis
                      dataKey="t"
                      tickFormatter={(v) => {
                        const sec = Math.round((Date.now() - v) / 1000);
                        return sec === 0 ? "now" : `${sec}s`;
                      }}
                      tick={{ fontSize: 10, fill: "#6B7FA3" }}
                      axisLine={{ stroke: "hsl(220,26%,20%)" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: "#6B7FA3" }}
                      axisLine={{ stroke: "hsl(220,26%,20%)" }}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0C1220",
                        border: "1px solid #1A2236",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "#EAF0FF",
                      }}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleTimeString("en-US", { hour12: false })
                      }
                      formatter={(v) => [`${v}%`, "CPU"] as [string, string]}
                    />
                    <Line
                      type="monotone"
                      dataKey="usage"
                      stroke={lineColor}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Incoming Chunks Feed */}
            <div data-testid="section-incoming-chunks">
              <h2 className="text-sm font-semibold text-foreground mb-3">Incoming chunks</h2>
              <div className="bg-card border border-card-border rounded-lg overflow-hidden">
                {chunks.length === 0 ? (
                  <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {online
                      ? "Listening for incoming chunks..."
                      : "Toggle online to receive work"}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {chunks.map((c) => (
                      <div
                        key={c.chunk_id}
                        data-testid={`row-chunk-${c.chunk_id}`}
                        className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-xs animate-in slide-in-from-top-2 fade-in duration-300"
                      >
                        <span
                          className="col-span-3 font-mono-accent"
                          title={c.chunk_id}
                        >
                          {shortId(c.chunk_id)}
                        </span>
                        <span className="col-span-2 text-muted-foreground">
                          {c.text_count} texts
                        </span>
                        <span className="col-span-3 font-mono text-muted-foreground">
                          {c.region}
                        </span>
                        <div className="col-span-2">
                          {c.status === "received" && (
                            <span className="text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              Received
                            </span>
                          )}
                          {c.status === "processing" && (
                            <span className="text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-full">
                              Processing
                            </span>
                          )}
                          {c.status === "complete" && (
                            <span className="text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              Complete
                            </span>
                          )}
                        </div>
                        <span className="col-span-2 text-right font-mono text-muted-foreground">
                          {c.cpu_seconds ? `${c.cpu_seconds}s` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {tab === "history" && (
          <div data-testid="section-job-history">
            <div className="bg-card border border-card-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Chunk ID
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Job ID
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Texts
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      CPU sec
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Payout
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageRows.map((row) => (
                    <tr
                      key={row.chunk_id}
                      data-testid={`row-history-${row.chunk_id}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td
                        className="px-4 py-2.5 font-mono-accent text-xs"
                        title={row.chunk_id}
                      >
                        {shortId(row.chunk_id)}
                      </td>
                      <td
                        className="px-4 py-2.5 font-mono text-xs text-muted-foreground"
                        title={row.job_id}
                      >
                        {shortId(row.job_id)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {row.texts}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                        {row.cpu_seconds}s
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono-accent">
                        ${row.payout.toFixed(4)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                        {row.timestamp}
                      </td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-muted-foreground text-sm"
                      >
                        No history yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      data-testid="button-prev-page"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      aria-label="Previous page"
                      className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      data-testid="button-next-page"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      aria-label="Next page"
                      className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        role="worker"
      />
    </div>
  );
}