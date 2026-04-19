import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Cpu, Building2, Menu, X } from "lucide-react";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const choose = (role: "worker" | "company") => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <style>{`
        .fade-up {
          animation: fadeUp 0.8s ease forwards;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .text-gradient {
          background: linear-gradient(135deg, #A8C8F0 0%, #EAF2FF 50%, #7EB8F7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .core-glow {
          box-shadow: 0 0 40px rgba(74,127,165,0.7), 0 0 80px rgba(74,127,165,0.3), inset 0 0 30px rgba(74,127,165,0.2);
        }
        .core-pulse {
          animation: corePulse 2.5s ease-in-out infinite;
        }
        @keyframes corePulse {
          0%, 100% { box-shadow: 0 0 40px rgba(74,127,165,0.7), 0 0 80px rgba(74,127,165,0.3); }
          50%       { box-shadow: 0 0 60px rgba(74,127,165,0.9), 0 0 120px rgba(74,127,165,0.5), 0 0 160px rgba(74,127,165,0.15); }
        }
        .signal {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #7EB8F7;
          box-shadow: 0 0 10px #7EB8F7, 0 0 20px #4A7FA5;
          pointer-events: none;
        }
        @keyframes signalRight {
          0%   { left: 0%;   opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes signalLeft {
          0%   { left: 100%; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { left: 0%;   opacity: 0; }
        }
        @keyframes signalDown {
          0%   { top: 0%;   opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes signalUp {
          0%   { top: 100%; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 0%;   opacity: 0; }
        }
        @keyframes signalDiagDR {
          0%   { left: 0%; top: 0%;     opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { left: 100%; top: 100%; opacity: 0; }
        }
        @keyframes signalDiagUL {
          0%   { left: 100%; top: 100%; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { left: 0%; top: 0%;    opacity: 0; }
        }
        @keyframes signalDiagUR {
          0%   { left: 0%; top: 100%;  opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { left: 100%; top: 0%;  opacity: 0; }
        }
        @keyframes signalDiagDL {
          0%   { left: 100%; top: 0%;  opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { left: 0%; top: 100%;  opacity: 0; }
        }
        .wire-h {
          position: absolute;
          height: 1px;
          background: linear-gradient(90deg, transparent, #1A3A55 20%, #2A5A7A 50%, #1A3A55 80%, transparent);
        }
        .wire-v {
          position: absolute;
          width: 1px;
          background: linear-gradient(180deg, transparent, #1A3A55 20%, #2A5A7A 50%, #1A3A55 80%, transparent);
        }
        .wire-diag {
          position: absolute;
          height: 1px;
          background: linear-gradient(90deg, transparent, #1A3A55 20%, #2A5A7A 50%, #1A3A55 80%, transparent);
          transform-origin: left center;
        }
        .node {
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid #2A5A7A;
          background: #0C1220;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: nodePulse 3s ease-in-out infinite;
        }
        @keyframes nodePulse {
          0%, 100% { border-color: #2A5A7A; box-shadow: none; }
          50%       { border-color: #4A7FA5; box-shadow: 0 0 12px rgba(74,127,165,0.4); }
        }
        .node-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4A7FA5;
          box-shadow: 0 0 8px #4A7FA5;
        }
        .cpu-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(74,127,165,0.15);
          animation: ringPulse 4s ease-in-out infinite;
        }
        @keyframes ringPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 0.8; transform: scale(1.02); }
        }
        .nav-link {
          position: relative;
          font-size: 13px;
          font-weight: 500;
          color: #6B7FA3;
          transition: color 0.2s;
          padding: 4px 0;
          cursor: pointer;
          background: none;
          border: none;
        }
        .nav-link:hover { color: #EAF2FF; }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 1px;
          background: #7EB8F7;
          transition: width 0.2s;
        }
        .nav-link:hover::after { width: 100%; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          borderBottom: "1px solid #1A2236",
          background: "rgba(5,7,15,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div
          className="max-w-6xl mx-auto px-6"
          style={{ height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Cpu style={{ width: "18px", height: "18px", color: "#7EB8F7" }} />
            <span
              style={{
                fontSize: "17px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #A8C8F0 0%, #EAF2FF 60%, #7EB8F7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Corex
            </span>
          </div>

          {/* Center nav links */}
          <div
            className="hidden md:flex items-center"
            style={{ gap: "32px" }}
          >
            {["About", "How it works", "Pricing", "Docs"].map((label) => (
              <button key={label} className="nav-link">{label}</button>
            ))}
          </div>

          {/* Right CTA buttons */}
          <div className="hidden md:flex items-center" style={{ gap: "10px" }}>
            <button
              onClick={() => choose("worker")}
              style={{
                padding: "7px 16px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#A8C8F0",
                background: "transparent",
                border: "1px solid #2A4A7A",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(126,184,247,0.08)";
                e.currentTarget.style.borderColor = "#7EB8F7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "#2A4A7A";
              }}
            >
              Worker
            </button>
            <button
              onClick={() => choose("company")}
              style={{
                padding: "7px 16px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#05070F",
                background: "#7EB8F7",
                border: "1px solid #7EB8F7",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#A8D0FF"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#7EB8F7"; }}
            >
              Company
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            style={{ color: "#6B7FA3", background: "none", border: "none", cursor: "pointer" }}
          >
            {mobileOpen
              ? <X style={{ width: "20px", height: "20px" }} />
              : <Menu style={{ width: "20px", height: "20px" }} />
            }
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            style={{
              borderTop: "1px solid #1A2236",
              background: "rgba(5,7,15,0.97)",
              padding: "16px 24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {["About", "How it works", "Pricing", "Docs"].map((label) => (
              <button
                key={label}
                onClick={() => setMobileOpen(false)}
                style={{ textAlign: "left", fontSize: "14px", color: "#6B7FA3", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
              >
                {label}
              </button>
            ))}
            <div style={{ borderTop: "1px solid #1A2236", paddingTop: "12px", display: "flex", gap: "10px" }}>
              <button
                onClick={() => choose("worker")}
                style={{ flex: 1, padding: "10px", fontSize: "13px", fontWeight: 600, color: "#A8C8F0", background: "transparent", border: "1px solid #2A4A7A", borderRadius: "6px", cursor: "pointer" }}
              >
                Worker
              </button>
              <button
                onClick={() => choose("company")}
                style={{ flex: 1, padding: "10px", fontSize: "13px", fontWeight: 600, color: "#05070F", background: "#7EB8F7", border: "none", borderRadius: "6px", cursor: "pointer" }}
              >
                Company
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section
        className="relative flex items-center px-8 md:px-16 overflow-hidden"
        style={{ minHeight: "100vh", paddingTop: "60px" }}
      >
        {/* Background glows */}
        <div aria-hidden="true" className="absolute pointer-events-none" style={{ width: "800px", height: "800px", borderRadius: "50%", background: "#1B3A6B", opacity: 0.5, filter: "blur(160px)", top: "-100px", right: "-100px" }} />
        <div aria-hidden="true" className="absolute pointer-events-none" style={{ width: "500px", height: "500px", borderRadius: "50%", background: "#0D2347", opacity: 0.4, filter: "blur(140px)", bottom: "-80px", left: "-80px" }} />

        {/* Left content */}
        <div className="fade-up relative flex-1 min-w-0 z-10 pr-8 mt-25">
          <h1
            className="text-gradient font-black tracking-tighter leading-[0.88] mb-8 ml-[-20px]"
            style={{ fontSize: "clamp(80px, 14vw, 200px)" }}
          >
            Corex.
          </h1>
          <p className="font-light leading-[1.2] mb-10" style={{ fontSize: "clamp(18px, 2.5vw, 32px)", color: "rgba(234,242,255,0.85)", maxWidth: "680px" }}>
            Turn the world's idle CPUs into{" "}
            <span style={{ color: "#7EB8F7", fontWeight: 500 }}> on-demand AI infrastructure.</span>{" "}
          </p>
          <div className="flex items-center gap-3 flex-wrap mb-12">
            <button
              data-testid="cta-worker"
              onClick={() => choose("worker")}
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-md transition-colors"
              style={{ background: "#7EB8F7", color: "#05070F" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#A8D0FF")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#7EB8F7")}
            >
              Join as Worker <ArrowRight className="w-4 h-4" />
            </button>
            <button
              data-testid="cta-company"
              onClick={() => choose("company")}
              className="px-6 py-3 text-sm font-semibold rounded-md border transition-colors"
              style={{ background: "transparent", color: "#EAF2FF", borderColor: "rgba(234,242,255,0.3)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(234,242,255,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Submit a Job
            </button>
          </div>
        </div>

        {/* ── CPU VISUALIZATION ── */}
        <div className="relative shrink-0 items-center justify-center hidden lg:flex" style={{ width: "520px", height: "520px" }}>
          <div className="cpu-ring" style={{ width: "500px", height: "500px", animationDelay: "0s" }} />
          <div className="cpu-ring" style={{ width: "420px", height: "420px", animationDelay: "1s" }} />

          <svg style={{ position: "absolute", top: 0, left: 0, width: "520px", height: "520px", overflow: "visible" }} viewBox="0 0 520 520">
            <defs>
              <linearGradient id="wh" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#2A5A7A" stopOpacity="0" />
                <stop offset="20%"  stopColor="#2A5A7A" stopOpacity="1" />
                <stop offset="80%"  stopColor="#2A5A7A" stopOpacity="1" />
                <stop offset="100%" stopColor="#2A5A7A" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="wv" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#2A5A7A" stopOpacity="0" />
                <stop offset="20%"  stopColor="#2A5A7A" stopOpacity="1" />
                <stop offset="80%"  stopColor="#2A5A7A" stopOpacity="1" />
                <stop offset="100%" stopColor="#2A5A7A" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="jdot">
                <stop offset="0%"   stopColor="#7EB8F7" stopOpacity="1" />
                <stop offset="100%" stopColor="#4A7FA5" stopOpacity="0.3" />
              </radialGradient>
            </defs>
            <line x1="32"  y1="260" x2="190" y2="260" stroke="url(#wh)" strokeWidth="1.5" />
            <line x1="330" y1="260" x2="488" y2="260" stroke="url(#wh)" strokeWidth="1.5" />
            <line x1="60"  y1="160" x2="260" y2="160" stroke="url(#wh)" strokeWidth="1" />
            <line x1="260" y1="160" x2="460" y2="160" stroke="url(#wh)" strokeWidth="1" />
            <line x1="60"  y1="360" x2="260" y2="360" stroke="url(#wh)" strokeWidth="1" />
            <line x1="260" y1="360" x2="460" y2="360" stroke="url(#wh)" strokeWidth="1" />
            <line x1="100" y1="200" x2="190" y2="200" stroke="url(#wh)" strokeWidth="1" />
            <line x1="330" y1="200" x2="420" y2="200" stroke="url(#wh)" strokeWidth="1" />
            <line x1="100" y1="320" x2="190" y2="320" stroke="url(#wh)" strokeWidth="1" />
            <line x1="330" y1="320" x2="420" y2="320" stroke="url(#wh)" strokeWidth="1" />
            <line x1="260" y1="32"  x2="260" y2="190" stroke="url(#wv)" strokeWidth="1.5" />
            <line x1="260" y1="330" x2="260" y2="488" stroke="url(#wv)" strokeWidth="1.5" />
            <line x1="160" y1="60"  x2="160" y2="260" stroke="url(#wv)" strokeWidth="1" />
            <line x1="160" y1="260" x2="160" y2="460" stroke="url(#wv)" strokeWidth="1" />
            <line x1="360" y1="60"  x2="360" y2="260" stroke="url(#wv)" strokeWidth="1" />
            <line x1="360" y1="260" x2="360" y2="460" stroke="url(#wv)" strokeWidth="1" />
            <line x1="200" y1="100" x2="200" y2="190" stroke="url(#wv)" strokeWidth="1" />
            <line x1="200" y1="330" x2="200" y2="420" stroke="url(#wv)" strokeWidth="1" />
            <line x1="320" y1="100" x2="320" y2="190" stroke="url(#wv)" strokeWidth="1" />
            <line x1="320" y1="330" x2="320" y2="420" stroke="url(#wv)" strokeWidth="1" />
            <line x1="190" y1="190" x2="118" y2="118" stroke="#1A3A55" strokeWidth="1" />
            <line x1="330" y1="190" x2="402" y2="118" stroke="#1A3A55" strokeWidth="1" />
            <line x1="190" y1="330" x2="118" y2="402" stroke="#1A3A55" strokeWidth="1" />
            <line x1="330" y1="330" x2="402" y2="402" stroke="#1A3A55" strokeWidth="1" />
            <polyline points="160,200 160,160 200,160" fill="none" stroke="#1E4060" strokeWidth="1" />
            <polyline points="360,200 360,160 320,160" fill="none" stroke="#1E4060" strokeWidth="1" />
            <polyline points="160,320 160,360 200,360" fill="none" stroke="#1E4060" strokeWidth="1" />
            <polyline points="360,320 360,360 320,360" fill="none" stroke="#1E4060" strokeWidth="1" />
            <polyline points="100,200 100,160 160,160" fill="none" stroke="#1A3A55" strokeWidth="1" />
            <polyline points="420,200 420,160 360,160" fill="none" stroke="#1A3A55" strokeWidth="1" />
            <polyline points="100,320 100,360 160,360" fill="none" stroke="#1A3A55" strokeWidth="1" />
            <polyline points="420,320 420,360 360,360" fill="none" stroke="#1A3A55" strokeWidth="1" />
            {[
              [160,160],[260,160],[360,160],
              [160,260],[360,260],
              [160,360],[260,360],[360,360],
              [200,200],[320,200],
              [200,320],[320,320],
              [100,200],[420,200],
              [100,320],[420,320],
            ].map(([cx,cy],i) => (
              <circle key={i} cx={cx} cy={cy} r="3" fill="url(#jdot)" />
            ))}
          </svg>

          {/* Signal dots */}
          <div className="wire-h" style={{ top:"259px", left:"32px",  width:"158px" }}>
            <div className="signal" style={{ animation:"signalRight 2.6s linear infinite", animationDelay:"0s",   top:"-3px" }} />
            <div className="signal" style={{ animation:"signalRight 2.6s linear infinite", animationDelay:"1.3s", top:"-3px" }} />
          </div>
          <div className="wire-h" style={{ top:"259px", left:"330px", width:"158px" }}>
            <div className="signal" style={{ animation:"signalLeft 2.2s linear infinite", animationDelay:"0.4s", top:"-3px" }} />
            <div className="signal" style={{ animation:"signalLeft 2.2s linear infinite", animationDelay:"1.5s", top:"-3px" }} />
          </div>
          <div className="wire-v" style={{ left:"259px", top:"32px",  height:"158px" }}>
            <div className="signal" style={{ animation:"signalDown 2.4s linear infinite", animationDelay:"0.2s", left:"-3px" }} />
            <div className="signal" style={{ animation:"signalDown 2.4s linear infinite", animationDelay:"1.4s", left:"-3px" }} />
          </div>
          <div className="wire-v" style={{ left:"259px", top:"330px", height:"158px" }}>
            <div className="signal" style={{ animation:"signalUp 2s linear infinite", animationDelay:"0.8s", left:"-3px" }} />
            <div className="signal" style={{ animation:"signalUp 2s linear infinite", animationDelay:"1.8s", left:"-3px" }} />
          </div>
          <div className="wire-h" style={{ top:"159px", left:"60px",  width:"130px" }}>
            <div className="signal" style={{ animation:"signalRight 3s linear infinite", animationDelay:"0.6s", top:"-3px" }} />
          </div>
          <div className="wire-h" style={{ top:"159px", left:"330px", width:"130px" }}>
            <div className="signal" style={{ animation:"signalLeft 2.8s linear infinite", animationDelay:"1.0s", top:"-3px" }} />
          </div>
          <div className="wire-h" style={{ top:"359px", left:"60px",  width:"130px" }}>
            <div className="signal" style={{ animation:"signalRight 2.8s linear infinite", animationDelay:"1.2s", top:"-3px" }} />
          </div>
          <div className="wire-h" style={{ top:"359px", left:"330px", width:"130px" }}>
            <div className="signal" style={{ animation:"signalLeft 3s linear infinite", animationDelay:"0.3s", top:"-3px" }} />
          </div>
          <div className="wire-v" style={{ left:"159px", top:"60px",  height:"130px" }}>
            <div className="signal" style={{ animation:"signalDown 3.2s linear infinite", animationDelay:"0.9s", left:"-3px" }} />
          </div>
          <div className="wire-v" style={{ left:"159px", top:"330px", height:"130px" }}>
            <div className="signal" style={{ animation:"signalUp 2.6s linear infinite", animationDelay:"0.5s", left:"-3px" }} />
          </div>
          <div className="wire-v" style={{ left:"359px", top:"60px",  height:"130px" }}>
            <div className="signal" style={{ animation:"signalDown 2.6s linear infinite", animationDelay:"1.6s", left:"-3px" }} />
          </div>
          <div className="wire-v" style={{ left:"359px", top:"330px", height:"130px" }}>
            <div className="signal" style={{ animation:"signalUp 3s linear infinite", animationDelay:"0.1s", left:"-3px" }} />
          </div>
          <div className="wire-diag" style={{ left:"118px", top:"117px", width:"102px", transform:"rotate(45deg)",  transformOrigin:"left center" }}>
            <div className="signal" style={{ animation:"signalDiagUL 2.4s linear infinite", animationDelay:"0.2s", top:"-3px" }} />
          </div>
          <div className="wire-diag" style={{ left:"300px", top:"117px", width:"102px", transform:"rotate(-45deg)", transformOrigin:"left center" }}>
            <div className="signal" style={{ animation:"signalDiagUR 2.6s linear infinite", animationDelay:"1.0s", top:"-3px" }} />
          </div>
          <div className="wire-diag" style={{ left:"118px", top:"400px", width:"102px", transform:"rotate(-45deg)", transformOrigin:"left center" }}>
            <div className="signal" style={{ animation:"signalDiagDL 2s linear infinite", animationDelay:"0.6s", top:"-3px" }} />
          </div>
          <div className="wire-diag" style={{ left:"300px", top:"400px", width:"102px", transform:"rotate(45deg)",  transformOrigin:"left center" }}>
            <div className="signal" style={{ animation:"signalDiagDR 2.8s linear infinite", animationDelay:"1.4s", top:"-3px" }} />
          </div>

          {/* Endpoint nodes */}
          <div className="node" style={{ top:"32px",  left:"50%", transform:"translateX(-50%)", animationDelay:"0s"   }}><div className="node-dot" /></div>
          <div className="node" style={{ bottom:"32px", left:"50%", transform:"translateX(-50%)", animationDelay:"0.8s" }}><div className="node-dot" /></div>
          <div className="node" style={{ left:"32px",  top:"50%",  transform:"translateY(-50%)", animationDelay:"1.6s" }}><div className="node-dot" /></div>
          <div className="node" style={{ right:"32px", top:"50%",  transform:"translateY(-50%)", animationDelay:"0.4s" }}><div className="node-dot" /></div>
          <div className="node" style={{ top:"90px",    left:"90px",   animationDelay:"1.2s" }}><div className="node-dot" /></div>
          <div className="node" style={{ top:"90px",    right:"90px",  animationDelay:"2.0s" }}><div className="node-dot" /></div>
          <div className="node" style={{ bottom:"90px", left:"90px",   animationDelay:"0.6s" }}><div className="node-dot" /></div>
          <div className="node" style={{ bottom:"90px", right:"90px",  animationDelay:"1.8s" }}><div className="node-dot" /></div>

          {/* CPU Core */}
          <div
            className="relative rounded-2xl core-pulse flex flex-col items-center justify-center z-10"
            style={{
              width: "160px", height: "160px",
              background: "linear-gradient(135deg, #0D2347 0%, #1B3A6B 50%, #0C1220 100%)",
              border: "1px solid #4A7FA5",
              boxShadow: "0 0 40px rgba(74,127,165,0.7), 0 0 80px rgba(74,127,165,0.3)",
            }}
          >
            <div
              className="absolute inset-3 rounded-lg opacity-30"
              style={{ backgroundImage: "repeating-linear-gradient(0deg,#4A7FA5 0px,#4A7FA5 1px,transparent 1px,transparent 12px),repeating-linear-gradient(90deg,#4A7FA5 0px,#4A7FA5 1px,transparent 1px,transparent 12px)" }}
            />
            <Cpu className="relative z-10 mb-1" style={{ width:"40px", height:"40px", color:"#7EB8F7" }} />
            <span className="relative z-10 text-xs font-bold tracking-widest" style={{ color:"#4A7FA5" }}>CORE</span>
            {["top-left","top-right","bottom-left","bottom-right"].map((pos) => (
              <div key={pos} className="absolute w-2 h-2 rounded-sm" style={{
                background:"#4A7FA5", boxShadow:"0 0 6px #4A7FA5",
                ...(pos==="top-left"     ? {top:"6px",   left:"6px"}   : {}),
                ...(pos==="top-right"    ? {top:"6px",   right:"6px"}  : {}),
                ...(pos==="bottom-left"  ? {bottom:"6px",left:"6px"}   : {}),
                ...(pos==="bottom-right" ? {bottom:"6px",right:"6px"}  : {}),
              }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-y px-6 py-8" style={{ borderColor: "#1A2236" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "#1A2236" }}>
          {[
            { v: "12,400+",  l: "CPUs contributed" },
            { v: "98.2%",    l: "Job success rate"  },
            { v: "$0.00011", l: "Per embedding"      },
          ].map(({ v, l }) => (
            <div key={l} className="px-6 py-4 sm:py-2 text-center">
              <p className="font-bold tracking-tight" style={{ fontSize:"clamp(24px,4vw,40px)", fontFamily:"monospace", color:"#7EB8F7" }}>{v}</p>
              <p className="text-xs uppercase tracking-wider mt-1" style={{ color:"#6B7FA3" }}>{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROLE CARDS ── */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          {/* Worker card */}
          <div
            data-testid="card-role-worker"
            className="rounded-xl p-8 flex flex-col transition-all duration-300 cursor-pointer"
            style={{ background:"#0C1220", border:"1px solid #1A2236" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow="0 0 40px rgba(59,130,246,0.15)"; (e.currentTarget as HTMLDivElement).style.borderColor="#2A4A7A"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow="none"; (e.currentTarget as HTMLDivElement).style.borderColor="#1A2236"; }}
          >
            <div className="w-12 h-12 rounded-md flex items-center justify-center mb-5" style={{ background:"rgba(34,197,94,0.1)", color:"#22C55E", boxShadow:"0 0 0 1px rgba(34,197,94,0.2)" }}>
              <Cpu className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color:"#EAF2FF" }}>I have compute</h2>
            <p className="text-sm mb-5" style={{ color:"#6B7FA3" }}>Lend your spare cores to the network. Earn credits for every chunk you process.</p>
            <ul className="space-y-2 mb-8 flex-1">
              {["Earn passively from idle CPU time","Run only when your machine is otherwise quiet","Get paid per verified chunk, no minimums"].map((b) => (
                <li key={b} className="text-sm py-0.5 pl-3" style={{ color:"#6B7FA3", borderLeft:"2px solid rgba(34,197,94,0.35)" }}>{b}</li>
              ))}
            </ul>
            <button onClick={() => choose("worker")} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md" style={{ background:"#7EB8F7", color:"#05070F" }} onMouseEnter={(e) => (e.currentTarget.style.background="#A8D0FF")} onMouseLeave={(e) => (e.currentTarget.style.background="#7EB8F7")}>
              Open worker dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Company card */}
          <div
            data-testid="card-role-company"
            className="rounded-xl p-8 flex flex-col transition-all duration-300 cursor-pointer"
            style={{ background:"#0C1220", border:"1px solid #1A2236" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow="0 0 40px rgba(59,130,246,0.15)"; (e.currentTarget as HTMLDivElement).style.borderColor="#2A4A7A"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow="none"; (e.currentTarget as HTMLDivElement).style.borderColor="#1A2236"; }}
          >
            <div className="w-12 h-12 rounded-md flex items-center justify-center mb-5" style={{ background:"rgba(126,184,247,0.1)", color:"#7EB8F7", boxShadow:"0 0 0 1px rgba(126,184,247,0.2)" }}>
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color:"#EAF2FF" }}>I need compute</h2>
            <p className="text-sm mb-5" style={{ color:"#6B7FA3" }}>Submit batched inference jobs and watch them shard across regions in real time.</p>
            <ul className="space-y-2 mb-8 flex-1">
              {["86% cheaper than AWS for batched embeddings","Live pipeline visualisation per job","Pay only for verified results"].map((b) => (
                <li key={b} className="text-sm py-0.5 pl-3" style={{ color:"#6B7FA3", borderLeft:"2px solid rgba(126,184,247,0.35)" }}>{b}</li>
              ))}
            </ul>
            <button onClick={() => choose("company")} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md" style={{ background:"#7EB8F7", color:"#05070F" }} onMouseEnter={(e) => (e.currentTarget.style.background="#A8D0FF")} onMouseLeave={(e) => (e.currentTarget.style.background="#7EB8F7")}>
              Open company dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:"1px solid #1A2236" }}>
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs flex items-center justify-between" style={{ color:"#6B7FA3" }}>
          <span>© 2026 Corex Compute</span>
          <span style={{ fontFamily:"monospace", color:"#7EB8F7" }}>Core in. Execute out.</span>
        </div>
      </footer>
    </div>
  );
}
