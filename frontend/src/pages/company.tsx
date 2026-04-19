import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingDown, LogOut, Globe2, X, Search, Plus, Settings } from "lucide-react";
import { shortId } from "@/hooks/useSSE";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { clearRole } from "@/lib/role";
import { JobModal, type JobSubmissionPayload } from "@/components/JobModal";
import { SettingsModal } from "@/components/SettingsModal";

const MOCK = true;

type Stage = "submitted" | "sharding" | "dispatching" | "processing" | "verifying" | "complete";
const STAGES: Stage[] = ["submitted", "sharding", "dispatching", "processing", "verifying", "complete"];
const STAGE_LABEL: Record<Stage, string> = {
  submitted: "Submitted",
  sharding: "Sharding",
  dispatching: "Dispatching",
  processing: "Processing",
  verifying: "Verifying",
  complete: "Complete",
};

type CompanyTab = "pipeline" | "regions" | "analytics" | "fleet";

interface PipelineJob {
  job_id: string;
  texts: number;
  chunks_total: number;
  cost_usd: number;
  aws_cost_usd: number;
  stage: Stage;
  failed_chunks: number;
  created_at: number;
  regions_used: string[];
  model: string;
  chunk_size: number;
}

interface FleetRow {
  region: string;
  workers: number;
  reputation: number;
  chunks: number;
  verification_failures: number;
  latency_ms: number;
  lat: number;
  lng: number;
}

interface IntegrityEvent {
  region: string;
  worker_region: string;
  ts: number;
}

const REGIONS_INFO: Omit<FleetRow, "workers" | "chunks" | "verification_failures">[] = [
  { region: "us-east-1", reputation: 96, latency_ms: 28, lat: 37.9, lng: -77.0 },
  { region: "us-west-2", reputation: 94, latency_ms: 41, lat: 45.5, lng: -122.6 },
  { region: "eu-west-1", reputation: 92, latency_ms: 84, lat: 53.3, lng: -6.2 },
  { region: "eu-central-1", reputation: 91, latency_ms: 92, lat: 50.1, lng: 8.6 },
  { region: "ap-southeast-1", reputation: 89, latency_ms: 174, lat: 1.3, lng: 103.8 },
  { region: "ap-northeast-1", reputation: 90, latency_ms: 162, lat: 35.6, lng: 139.7 },
  { region: "sa-east-1", reputation: 87, latency_ms: 138, lat: -23.5, lng: -46.6 },
];

function randomFleetRow(r: typeof REGIONS_INFO[number]): FleetRow {
  return {
    ...r,
    workers: Math.floor(Math.random() * 180) + 30,
    chunks: Math.floor(Math.random() * 6000) + 800,
    verification_failures: Math.random() < 0.18 ? Math.floor(Math.random() * 4) + 1 : 0,
  };
}

function makeJobId() { return "job_" + Math.random().toString(36).slice(2, 10); }
const AWS_MULTIPLIER = 7.1;

const TABS: { id: CompanyTab; label: string }[] = [
  { id: "pipeline", label: "Pipeline" },
  { id: "regions", label: "Regions" },
  { id: "analytics", label: "Analytics" },
  { id: "fleet", label: "Fleet" },
];

// ----- Status pill -----
type DisplayStatus = "Queued" | "Processing" | "Verifying" | "Complete" | "Failed";

function stageToStatus(stage: Stage): DisplayStatus {
  if (stage === "submitted") return "Queued";
  if (stage === "verifying") return "Verifying";
  if (stage === "complete") return "Complete";
  return "Processing";
}

function StatusPill({ status }: { status: DisplayStatus }) {
  const styles: Record<DisplayStatus, string> = {
    Queued: "text-amber-300 bg-amber-500/15 border-amber-500/30",
    Processing: "text-blue-300 bg-blue-500/15 border-blue-500/30 animate-pulse",
    Verifying: "text-purple-300 bg-purple-500/15 border-purple-500/30 animate-pulse",
    Complete: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
    Failed: "text-red-300 bg-red-500/15 border-red-500/30",
  };
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${styles[status]}`}>{status}</span>;
}

// ----- React Flow node -----
function StageNode({ data }: NodeProps<{ label: string; active: boolean; complete: boolean; failed: number }>) {
  const { label, active, complete, failed } = data;
  return (
    <div
      className={`bg-card border rounded-md px-3 py-2 min-w-[120px] text-center shadow-sm transition-all ${
        complete ? "border-emerald-500/50 bg-emerald-500/10" : active ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-card-border"
      }`}
    >
      <Handle type="target" position={Position.Left} style={{ background: "transparent", border: "none" }} />
      <p className={`text-xs font-medium ${complete ? "text-emerald-300" : active ? "text-primary" : "text-foreground"}`}>{label}</p>
      {failed > 0 && <span className="block mt-1 text-[10px] font-mono text-red-400 font-medium">×{failed} failed</span>}
      <Handle type="source" position={Position.Right} style={{ background: "transparent", border: "none" }} />
    </div>
  );
}
const nodeTypes = { stage: StageNode };

function buildSingleJobGraph(job: PipelineJob | null): { nodes: Node[]; edges: Edge[] } {
  if (!job) return { nodes: [], edges: [] };
  const reachedIdx = STAGES.indexOf(job.stage);
  const COL_W = 170;
  const nodes: Node[] = STAGES.map((stage, i) => {
    const active = i === reachedIdx && job.stage !== "complete";
    const complete = i < reachedIdx || job.stage === "complete";
    return {
      id: `${job.job_id}-${stage}`,
      type: "stage",
      position: { x: i * COL_W, y: 0 },
      data: { label: STAGE_LABEL[stage], active, complete, failed: stage === "verifying" ? job.failed_chunks : 0 },
    };
  });
  const edges: Edge[] = STAGES.slice(1).map((stage, i) => {
    const idx = i + 1;
    return {
      id: `${job.job_id}-${STAGES[i]}->${stage}`,
      source: `${job.job_id}-${STAGES[i]}`,
      target: `${job.job_id}-${stage}`,
      animated: idx <= reachedIdx,
      style: { stroke: idx <= reachedIdx ? "#7EB8F7" : "#1A2236", strokeWidth: 1.5 },
    };
  });
  return { nodes, edges };
}

const DARK_MAP_STYLE: any[] = [
  { elementType: "geometry", stylers: [{ color: "#0a1024" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5b6477" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a1024" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#1f2937" }, { visibility: "on" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#10172a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#06091a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3b4760" }] },
];

function GoogleHeatmap({ fleet, pulseRegions }: { fleet: FleetRow[]; pulseRegions: Set<string> }) {
  const { google, error } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const heatmapRef = useRef<any>(null);
  const pulseCirclesRef = useRef<Map<string, any>>(new Map());
  const pulseAnimRef = useRef<number | null>(null);
  const infoWindowRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!google || !containerRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(containerRef.current, {
      center: { lat: 25, lng: 10 },
      zoom: 2,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "cooperative",
      backgroundColor: "#0a1024",
      styles: DARK_MAP_STYLE,
      minZoom: 2,
      maxZoom: 5,
    });
    infoWindowRef.current = new google.maps.InfoWindow();
  }, [google]);

  useEffect(() => {
    if (!google || !mapRef.current) return;
    const points = fleet.map((f) => ({ location: new google.maps.LatLng(f.lat, f.lng), weight: f.workers }));
    if (!heatmapRef.current) {
      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: points, map: mapRef.current, radius: 42, opacity: 0.8,
        gradient: [
          "rgba(30, 58, 95, 0)", "rgba(30, 58, 95, 0.6)", "rgba(37, 99, 235, 0.7)",
          "rgba(59, 130, 246, 0.85)", "rgba(147, 197, 253, 0.95)",
        ],
      });
    } else {
      heatmapRef.current.setData(points);
    }
    markersRef.current.forEach((m) => { google.maps.event.clearInstanceListeners(m); m.setMap(null); });
    markersRef.current = fleet.map((f) => {
      const marker = new google.maps.Marker({
        position: { lat: f.lat, lng: f.lng }, map: mapRef.current,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillOpacity: 0, strokeOpacity: 0 },
        title: f.region,
      });
      marker.addListener("mouseover", () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(
            `<div style="font-family: 'Menlo', monospace; font-size: 11px; color: #111827;">
              <div style="font-weight: 600;">${f.region}</div>
              <div>~${f.latency_ms}ms · ${f.workers} workers</div>
            </div>`,
          );
          infoWindowRef.current.open(mapRef.current, marker);
        }
      });
      marker.addListener("mouseout", () => infoWindowRef.current?.close());
      return marker;
    });
  }, [google, fleet]);

  useEffect(() => {
    if (!google || !mapRef.current) return;
    pulseCirclesRef.current.forEach((circle, region) => {
      if (!pulseRegions.has(region)) { circle.setMap(null); pulseCirclesRef.current.delete(region); }
    });
    pulseRegions.forEach((region) => {
      if (pulseCirclesRef.current.has(region)) return;
      const r = REGIONS_INFO.find((x) => x.region === region);
      if (!r) return;
      const circle = new google.maps.Circle({
        strokeColor: "#7EB8F7", strokeOpacity: 0.9, strokeWeight: 2,
        fillColor: "#7EB8F7", fillOpacity: 0.15,
        map: mapRef.current, center: { lat: r.lat, lng: r.lng }, radius: 200000,
      });
      pulseCirclesRef.current.set(region, circle);
    });
    if (pulseCirclesRef.current.size > 0 && pulseAnimRef.current === null) {
      const start = Date.now();
      const tick = () => {
        const t = ((Date.now() - start) % 1600) / 1600;
        const radius = 150000 + t * 600000;
        const opacity = 0.6 * (1 - t);
        pulseCirclesRef.current.forEach((c) => {
          c.setRadius(radius);
          c.setOptions({ strokeOpacity: opacity, fillOpacity: opacity * 0.3 });
        });
        pulseAnimRef.current = requestAnimationFrame(tick);
      };
      pulseAnimRef.current = requestAnimationFrame(tick);
    } else if (pulseCirclesRef.current.size === 0 && pulseAnimRef.current !== null) {
      cancelAnimationFrame(pulseAnimRef.current);
      pulseAnimRef.current = null;
    }
  }, [google, pulseRegions]);

  useEffect(() => {
    return () => {
      if (pulseAnimRef.current !== null) cancelAnimationFrame(pulseAnimRef.current);
      pulseCirclesRef.current.forEach((c) => c.setMap(null));
      pulseCirclesRef.current.clear();
      markersRef.current.forEach((m) => { google?.maps.event.clearInstanceListeners(m); m.setMap(null); });
      markersRef.current = [];
      if (heatmapRef.current) { heatmapRef.current.setMap(null); heatmapRef.current = null; }
      if (infoWindowRef.current) { infoWindowRef.current.close(); infoWindowRef.current = null; }
      if (mapRef.current && google) google.maps.event.clearInstanceListeners(mapRef.current);
    };
  }, [google]);

  if (error) {
    return (
      <div className="w-full bg-muted border border-card-border rounded-md flex items-center justify-center text-xs text-muted-foreground" style={{ paddingBottom: "45%" }}>
        <span className="absolute">Map failed to load</span>
      </div>
    );
  }
  return (
    <div className="relative w-full bg-[#06091a] rounded-md overflow-hidden border border-card-border" style={{ paddingBottom: "45%" }}>
      {!google && <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">Loading map…</div>}
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}

// ===== Main Component =====
export default function CompanyDashboard() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<CompanyTab>("pipeline");
  const [modalOpen, setModalOpen] = useState(false);
  const [jobs, setJobs] = useState<PipelineJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [historicalSpend, setHistoricalSpend] = useState<{ name: string; corex: number; aws: number }[]>([
    { name: "1", corex: 0.0124, aws: 0.088 },
    { name: "2", corex: 0.0231, aws: 0.164 },
    { name: "3", corex: 0.0089, aws: 0.063 },
    { name: "4", corex: 0.0341, aws: 0.242 },
    { name: "5", corex: 0.0157, aws: 0.111 },
    { name: "6", corex: 0.0203, aws: 0.144 },
  ]);
  const [fleet, setFleet] = useState<FleetRow[]>(() => REGIONS_INFO.map(randomFleetRow));
  const [pulseRegions, setPulseRegions] = useState<Set<string>>(new Set());
  const [integrityEvents, setIntegrityEvents] = useState<IntegrityEvent[]>([]);
  const [fleetFilter, setFleetFilter] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    typeof window !== "undefined" && sessionStorage.getItem("corex.company.banner") === "1",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pipeline advancement
  useEffect(() => {
    if (!MOCK) return;
    const id = setInterval(() => {
      setJobs((prev) => {
        const finishedRegionsToClear: string[][] = [];
        const newSpend: { name: string; corex: number; aws: number }[] = [];
        const next = prev.map((job) => {
          const idx = STAGES.indexOf(job.stage);
          if (idx >= STAGES.length - 1) return job;
          const nextStage = STAGES[idx + 1];
          const failed = nextStage === "verifying" ? (Math.random() < 0.3 ? Math.floor(Math.random() * 2) + 1 : 0) : job.failed_chunks;
          const updated: PipelineJob = { ...job, stage: nextStage, failed_chunks: failed };
          if (nextStage === "complete") {
            finishedRegionsToClear.push(job.regions_used);
            newSpend.push({ name: "", corex: job.cost_usd, aws: job.aws_cost_usd });
          }
          return updated;
        });
        if (newSpend.length > 0) {
          setHistoricalSpend((prev) => {
            const arr = [...prev];
            newSpend.forEach((s) => arr.push({ ...s, name: String(arr.length + 1) }));
            return arr.slice(-12);
          });
        }
        if (finishedRegionsToClear.length > 0) {
          setPulseRegions((p) => {
            const n = new Set(p);
            finishedRegionsToClear.forEach((rs) => rs.forEach((r) => n.delete(r)));
            return n;
          });
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Cost ticker (live cost grows during processing/verifying)
  useEffect(() => {
    if (!MOCK) return;
    const id = setInterval(() => {
      setJobs((prev) =>
        prev.map((j) => {
          if (j.stage === "processing" || j.stage === "verifying") {
            const factor = j.stage === "processing" ? 0.4 : 0.15;
            const inc = j.cost_usd * factor * Math.random() * 0.3;
            const awsInc = inc * AWS_MULTIPLIER;
            return { ...j, cost_usd: parseFloat((j.cost_usd + inc).toFixed(6)), aws_cost_usd: parseFloat((j.aws_cost_usd + awsInc).toFixed(6)) };
          }
          return j;
        }),
      );
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // Fleet refresh
  useEffect(() => {
    if (!MOCK) return;
    const id = setInterval(() => {
      setFleet((prev) =>
        prev.map((f) => ({
          ...f,
          workers: Math.max(20, Math.min(220, f.workers + Math.floor(Math.random() * 14) - 7)),
          chunks: f.chunks + Math.floor(Math.random() * 30),
          verification_failures: Math.random() < 0.05 ? f.verification_failures + 1 : f.verification_failures,
        })),
      );
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Integrity events
  useEffect(() => {
    if (!MOCK) return;
    const id = setInterval(() => {
      const r1 = REGIONS_INFO[Math.floor(Math.random() * REGIONS_INFO.length)];
      const r2 = REGIONS_INFO[Math.floor(Math.random() * REGIONS_INFO.length)];
      setIntegrityEvents((prev) => [{ region: r1.region, worker_region: r2.region, ts: Date.now() }, ...prev].slice(0, 6));
      setFleet((prev) => prev.map((f) => (f.region === r2.region ? { ...f, verification_failures: f.verification_failures + 1 } : f)));
    }, 12000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleJobSubmit = useCallback((p: JobSubmissionPayload) => {
    const chunks_total = Math.max(1, Math.ceil(p.texts.length / p.chunkSize));
    const cost = chunks_total * 0.000011;
    const regionsUsed = REGIONS_INFO.slice(0, Math.min(3, Math.floor(Math.random() * 3) + 2)).map((r) => r.region);
    const newJob: PipelineJob = {
      job_id: makeJobId(),
      texts: p.texts.length,
      chunks_total,
      cost_usd: cost,
      aws_cost_usd: cost * AWS_MULTIPLIER,
      stage: "submitted",
      failed_chunks: 0,
      created_at: Date.now(),
      regions_used: regionsUsed,
      model: p.model,
      chunk_size: p.chunkSize,
    };
    setJobs((prev) => [newJob, ...prev]);
    setSelectedJobId(newJob.job_id);
    setPulseRegions((s) => {
      const n = new Set(s);
      regionsUsed.forEach((r) => n.add(r));
      return n;
    });
    setModalOpen(false);
    setTab("pipeline");
    setToast(`Job submitted · ${p.texts.length} texts · ${chunks_total} chunks`);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Auto-select newest if none selected
  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) setSelectedJobId(jobs[0].job_id);
  }, [jobs, selectedJobId]);

  const selectedJob = useMemo(() => jobs.find((j) => j.job_id === selectedJobId) || jobs[0] || null, [jobs, selectedJobId]);
  const { nodes, edges } = useMemo(() => buildSingleJobGraph(selectedJob), [selectedJob]);

  const totalLiveCost = jobs.filter((j) => j.stage !== "complete").reduce((s, j) => s + j.cost_usd, 0);
  const totalLiveAws = jobs.filter((j) => j.stage !== "complete").reduce((s, j) => s + j.aws_cost_usd, 0);
  const sessionSavings = jobs.reduce((s, j) => s + (j.aws_cost_usd - j.cost_usd), 0);

  const filteredFleet = useMemo(() => {
    const q = fleetFilter.trim().toLowerCase();
    return q ? fleet.filter((f) => f.region.toLowerCase().includes(q)) : fleet;
  }, [fleet, fleetFilter]);

  const dismissBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem("corex.company.banner", "1");
  };
  const exitToHome = () => { clearRole(); navigate("/", { replace: true }); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* TOP NAVBAR (logo + center tabs + right controls) */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-6">
        <div className="max-w-7xl mx-auto h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base font-bold text-foreground tracking-tight">Corex</span>
            <span className="text-[11px] text-muted-foreground hidden md:inline">· Core in. Execute out.</span>
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
                  tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {t.label}
                {tab === t.id && <span className="absolute left-3 right-3 -bottom-px h-0.5 bg-primary rounded-full" />}
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
            <span className="text-xs text-muted-foreground hidden sm:inline" data-testid="text-logged-in">demo@company.com</span>
            <button
              data-testid="button-switch-role"
              onClick={exitToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md border border-border transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Switch role
            </button>
          </div>
        </div>
      </header>

      {/* PAGE HEADER */}
      <section className="border-b border-border px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight" data-testid="text-page-title">
              {tab === "pipeline" && "Job Pipeline"}
              {tab === "regions" && "Worker Regions"}
              {tab === "analytics" && "Cost Analytics"}
              {tab === "fleet" && "Worker Fleet"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
              {tab === "pipeline" && "Monitor active jobs as they move through the distributed compute network in real time."}
              {tab === "regions" && "Live compute availability and worker density across all active geographic regions."}
              {tab === "analytics" && "Track spend, compare against cloud pricing, and monitor savings across all submitted jobs."}
              {tab === "fleet" && "Aggregated health, integrity scores, and performance metrics across the worker network."}
            </p>
          </div>
        </div>
      </section>

      {/* ANNOUNCEMENT BANNER */}
      {!bannerDismissed && (
        <div data-testid="banner-announcement" className="border-b border-border bg-primary/5 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-sm flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Globe2 className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium text-foreground">Worker network expanded.</span>
              <span className="text-muted-foreground truncate">3 new regions online — ap-south-1, me-south-1, af-south-1</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                data-testid="button-banner-action"
                onClick={() => setTab("regions")}
                className="px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors"
              >
                View regions →
              </button>
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
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {tab === "pipeline" && (
          <>
            {/* Add Job button */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {selectedJob ? <>Pipeline · <span className="font-mono-accent text-xs" title={selectedJob.job_id}>{shortId(selectedJob.job_id)}</span></> : "Pipeline"}
              </h2>
              <button
                data-testid="button-add-job"
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-card-border hover:bg-muted hover:border-primary/50 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Job
              </button>
            </div>

            {/* Pipeline visualization */}
            <div data-testid="section-pipeline" className="bg-card border border-card-border rounded-lg p-5">
              <div className="bg-background border border-border rounded-md" style={{ height: "200px" }}>
                {!selectedJob ? (
                  <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-3">
                    <span>No jobs yet</span>
                    <button onClick={() => setModalOpen(true)} className="text-primary hover:underline text-xs">
                      Submit one to watch it shard live →
                    </button>
                  </div>
                ) : (
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    panOnDrag={true}
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background color="#1A2236" gap={16} />
                    <Controls showInteractive={false} />
                  </ReactFlow>
                )}
              </div>
              {selectedJob && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div><span className="text-muted-foreground">Texts</span> <span className="font-mono-accent ml-1">{selectedJob.texts}</span></div>
                  <div><span className="text-muted-foreground">Chunks</span> <span className="font-mono-accent ml-1">{selectedJob.chunks_total}</span></div>
                  <div><span className="text-muted-foreground">Model</span> <span className="font-mono ml-1 text-foreground">{selectedJob.model}</span></div>
                  <div><span className="text-muted-foreground">Cost</span> <span className="font-mono-accent ml-1">${selectedJob.cost_usd.toFixed(4)}</span></div>
                </div>
              )}
            </div>

            {/* All jobs table */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">All jobs ({jobs.length})</h2>
              <div className="bg-card border border-card-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Job ID</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Texts</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Chunks</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Cost</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Submitted at</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {jobs.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No jobs submitted yet</td></tr>
                    )}
                    {jobs.map((j) => {
                      const isSel = j.job_id === selectedJobId;
                      return (
                        <tr
                          key={j.job_id}
                          data-testid={`row-job-${j.job_id}`}
                          onClick={() => setSelectedJobId(j.job_id)}
                          className={`cursor-pointer transition-colors ${isSel ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/30 border-l-2 border-l-transparent"}`}
                        >
                          <td className="px-4 py-2.5 font-mono-accent text-xs" title={j.job_id}>{shortId(j.job_id)}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{j.texts}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{j.chunks_total}</td>
                          <td className="px-4 py-2.5 text-right text-xs font-mono-accent">${j.cost_usd.toFixed(4)}</td>
                          <td className="px-4 py-2.5"><StatusPill status={stageToStatus(j.stage)} /></td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground font-mono">{new Date(j.created_at).toLocaleTimeString("en-US", { hour12: false })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === "regions" && (
          <>
            <div data-testid="section-regional-map" className="bg-card border border-card-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-foreground mb-1">Worker availability</h2>
              <p className="text-xs text-muted-foreground mb-4">Heat intensity = idle worker count per region</p>
              <GoogleHeatmap fleet={fleet} pulseRegions={pulseRegions} />
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{fleet.reduce((s, f) => s + f.workers, 0)} workers across {fleet.length} regions</span>
                <span>{pulseRegions.size > 0 ? `${pulseRegions.size} regions active` : "all idle"}</span>
              </div>
            </div>
            <FleetTable rows={fleet} testIdPrefix="row-region" />
          </>
        )}

        {tab === "analytics" && (
          <>
            <div data-testid="section-cost-analytics" className="bg-card border border-card-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Cost ticker</h2>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                  <TrendingDown className="w-3 h-3" />
                  86% cheaper than AWS
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-card-border rounded-md p-4 bg-primary/10">
                  <p className="text-xs text-muted-foreground mb-1">Live Corex cost</p>
                  <p className="text-3xl font-semibold font-mono-accent tabular-nums" data-testid="text-live-corex-cost">${totalLiveCost.toFixed(4)}</p>
                </div>
                <div className="border border-card-border rounded-md p-4 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">AWS equivalent</p>
                  <p className="text-3xl font-semibold text-muted-foreground tabular-nums font-mono" data-testid="text-live-aws-cost">${totalLiveAws.toFixed(4)}</p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Spend over time</h2>
              <div className="h-72 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicalSpend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A2236" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B7FA3" }} axisLine={{ stroke: "#1A2236" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#6B7FA3" }} axisLine={{ stroke: "#1A2236" }} tickLine={false} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                    <Tooltip contentStyle={{ background: "#0C1220", border: "1px solid #1A2236", borderRadius: "6px", fontSize: "12px", color: "#EAF0FF" }} formatter={(v: number) => `$${v.toFixed(4)}`} />
                    <Legend wrapperStyle={{ fontSize: "11px", color: "#6B7FA3" }} />
                    <Bar dataKey="corex" fill="#7EB8F7" name="Corex" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="aws" fill="#374151" name="AWS" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-5 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total session savings</span>
              <span className="text-2xl font-semibold text-emerald-400 tabular-nums font-mono">${sessionSavings.toFixed(4)}</span>
            </div>
          </>
        )}

        {tab === "fleet" && (
          <>
            <div className="flex items-center gap-2 bg-card border border-card-border rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                data-testid="input-fleet-filter"
                value={fleetFilter}
                onChange={(e) => setFleetFilter(e.target.value)}
                placeholder="Filter by region (e.g. us-east, eu)"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {fleetFilter && (
                <button onClick={() => setFleetFilter("")} className="text-xs text-muted-foreground hover:text-foreground" aria-label="Clear filter">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <FleetTable rows={filteredFleet} testIdPrefix="row-fleet" detailed />
            {integrityEvents.length > 0 && (
              <div data-testid="section-integrity-events">
                <h2 className="text-sm font-semibold text-foreground mb-3">Integrity check events</h2>
                <div className="bg-card border border-card-border rounded-lg overflow-hidden">
                  {integrityEvents.map((e, i) => (
                    <div key={i} className={`flex items-center justify-between px-4 py-2.5 text-xs ${i > 0 ? "border-t border-border" : ""} bg-red-500/5`}>
                      <span className="text-red-400 font-medium">Mismatch</span>
                      <span className="font-mono text-muted-foreground">{e.region} ↔ {e.worker_region}</span>
                      <span className="font-mono text-muted-foreground">{new Date(e.ts).toLocaleTimeString("en-US", { hour12: false })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <JobModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleJobSubmit} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} role="company" />

      {/* Toast */}
      {toast && (
        <div
          data-testid="toast-notification"
          role="status"
          className="fixed bottom-6 right-6 z-50 bg-card border border-card-border shadow-lg rounded-md px-4 py-3 text-sm text-foreground flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

function FleetTable({ rows, testIdPrefix, detailed = false }: { rows: FleetRow[]; testIdPrefix: string; detailed?: boolean }) {
  return (
    <div className="bg-card border border-card-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Region</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Workers</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Reputation</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Chunks Processed</th>
            {detailed && <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Latency</th>}
            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide" title="Verified chunks ÷ total chunks">Integrity Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 && (
            <tr><td colSpan={detailed ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground text-sm">No regions match</td></tr>
          )}
          {rows.map((f) => {
            const score = f.chunks > 0 ? ((f.chunks - f.verification_failures) / f.chunks) * 100 : 100;
            const rateLabel = `${score.toFixed(1)}%`;
            const rateClass = score > 95 ? "text-emerald-400" : score >= 80 ? "text-amber-400" : "text-red-400 font-medium";
            return (
              <tr key={f.region} data-testid={`${testIdPrefix}-${f.region}`} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 font-mono-accent text-sm">{f.region}</td>
                <td className="px-4 py-2.5 text-right text-foreground">{f.workers}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{f.reputation}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground font-mono">{f.chunks.toLocaleString()}</td>
                {detailed && <td className="px-4 py-2.5 text-right text-muted-foreground font-mono">~{f.latency_ms}ms</td>}
                <td className={`px-4 py-2.5 text-right font-mono ${rateClass}`}>{rateLabel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
