import { useLocation } from "wouter";
import { ArrowRight, Cpu, Building2 } from "lucide-react";

export default function LandingPage() {
  const [, navigate] = useLocation();

  const choose = (role: "worker" | "company") => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-foreground tracking-tight">Corex</span>
            <p className="text-xs text-muted-foreground">Core in. Execute out.</p>
          </div>
          <span className="text-xs font-mono-accent text-muted-foreground hidden sm:inline">v1.0 · MOCK</span>
        </div>
      </header>

      <section className="relative flex items-center justify-center px-6 overflow-hidden" style={{ minHeight: "calc(100vh - 65px)" }}>
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            width: "720px",
            height: "720px",
            borderRadius: "50%",
            background: "#7EB8F7",
            opacity: 0.07,
            filter: "blur(120px)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 border border-primary/30 px-3 py-1 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Distributed AI compute marketplace
          </span>
          <h1 className="text-6xl sm:text-7xl font-bold text-foreground tracking-tight leading-[1.05] mb-6">
            Compute in.<br />Results out.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
            The distributed AI inference marketplace.<br />
            Idle CPUs put to work. Companies pay only for results.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              data-testid="cta-worker"
              onClick={() => choose("worker")}
              className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-[#05070F] bg-primary hover:bg-[#A8D0FF] rounded-md transition-colors"
            >
              Join as Worker <ArrowRight className="w-4 h-4" />
            </button>
            <button
              data-testid="cta-company"
              onClick={() => choose("company")}
              className="px-5 py-3 text-sm font-medium text-foreground bg-transparent border border-foreground/80 hover:bg-foreground hover:text-background rounded-md transition-colors"
            >
              Submit a Job
            </button>
          </div>
        </div>
      </section>

      <section className="border-y border-border px-6 py-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {[
            { v: "12,400+", l: "CPUs contributed" },
            { v: "98.2%", l: "Job success rate" },
            { v: "$0.00011", l: "Per embedding" },
          ].map(({ v, l }) => (
            <div key={l} className="px-6 py-4 sm:py-2 text-center">
              <p className="text-3xl sm:text-4xl font-bold font-mono-accent tracking-tight">{v}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          <div
            data-testid="card-role-worker"
            className="bg-card border border-card-border rounded-xl p-8 flex flex-col transition-shadow hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]"
          >
            <div className="w-12 h-12 rounded-md bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-5 ring-1 ring-emerald-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">I have compute</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Lend your spare cores to the network. Earn credits for every chunk you process.
            </p>
            <ul className="space-y-2 mb-8 flex-1">
              {[
                "Earn passively from idle CPU time",
                "Run only when your machine is otherwise quiet",
                "Get paid per verified chunk, no minimums",
              ].map((b) => (
                <li key={b} className="text-sm text-muted-foreground pl-3 border-l-2 border-emerald-500/40 py-0.5">
                  {b}
                </li>
              ))}
            </ul>
            <button
              onClick={() => choose("worker")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#05070F] bg-primary hover:bg-[#A8D0FF] rounded-md transition-colors"
            >
              Open worker dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div
            data-testid="card-role-company"
            className="bg-card border border-card-border rounded-xl p-8 flex flex-col transition-shadow hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]"
          >
            <div className="w-12 h-12 rounded-md bg-primary/15 text-primary flex items-center justify-center mb-5 ring-1 ring-primary/20">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">I need compute</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Submit batched inference jobs and watch them shard across regions in real time.
            </p>
            <ul className="space-y-2 mb-8 flex-1">
              {[
                "86% cheaper than AWS for batched embeddings",
                "Live pipeline visualisation per job",
                "Pay only for verified results",
              ].map((b) => (
                <li key={b} className="text-sm text-muted-foreground pl-3 border-l-2 border-primary/40 py-0.5">
                  {b}
                </li>
              ))}
            </ul>
            <button
              onClick={() => choose("company")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#05070F] bg-primary hover:bg-[#A8D0FF] rounded-md transition-colors"
            >
              Open company dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-muted-foreground flex items-center justify-between">
          <span>© 2026 Corex Compute</span>
          <span className="font-mono-accent">Core in. Execute out.</span>
        </div>
      </footer>
    </div>
  );
}
