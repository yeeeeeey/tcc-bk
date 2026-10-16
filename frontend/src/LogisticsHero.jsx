import React, { useState, useEffect, useRef } from "react";
import { Factory, Truck, Box, ShoppingCart, User, ArrowRight, ChevronDown, Menu, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens
// bg base:      #0A0716  (quase preto, tom roxo-noite)
// bg panel:     #130D26
// accent:       #8B5CF6 -> #C084FC (gradiente violeta)
// accent solid: #7C3AED
// text muted:   #A9A3C4
// display font: "Space Grotesk" (geométrica, técnica)
// body font:    "Inter"
// ---------------------------------------------------------------------------

const stages = [
  { id: "fabrica", label: "Fábrica", desc: "Produção e registro do lote.", Icon: Factory },
  { id: "transporte", label: "Transporte", desc: "Rastreio em tempo real da carga.", Icon: Truck },
  { id: "centro", label: "Centro de Distribuição", desc: "Conferência e triagem de estoque.", Icon: Box },
  { id: "loja", label: "Loja", desc: "Chegada conferida no ponto de venda.", Icon: ShoppingCart },
  { id: "cliente", label: "Cliente", desc: "Entrega validada com prova de origem.", Icon: User },
];

function useNodePositions(count, containerRef) {
  // Returns normalized x positions (0..1) for `count` evenly spaced nodes
  return Array.from({ length: count }, (_, i) => (i + 0.5) / count);
}

export default function LogisticsHero({ onEntrar, onComecar }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStage, setActiveStage] = useState(0);

  // cycle the "package in transit" highlight along the route
  useEffect(() => {
    const t = setInterval(() => {
      setActiveStage((s) => (s + 1) % stages.length);
    }, 1800);
    return () => clearInterval(t);
  }, []);

  const positions = useNodePositions(stages.length);

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background:
          "radial-gradient(1200px 600px at 15% -10%, rgba(139,92,246,0.16), transparent 60%), radial-gradient(900px 500px at 100% 10%, rgba(192,132,252,0.10), transparent 55%), #0A0716",
        minHeight: "auto",
        color: "#F4F2FB",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .lh-display { font-family: 'Space Grotesk', sans-serif; }
        .lh-btn { transition: transform .18s ease, box-shadow .18s ease, background .18s ease; }
        .lh-btn:hover { transform: translateY(-1px); }
        .lh-navlink { position: relative; color: #C9C3E0; text-decoration: none; font-size: 14px; font-weight: 500; }
        .lh-navlink::after {
          content: ""; position: absolute; left: 0; bottom: -6px; height: 1px; width: 0%;
          background: linear-gradient(90deg,#8B5CF6,#C084FC); transition: width .25s ease;
        }
        .lh-navlink:hover::after { width: 100%; }
        .lh-node { transition: transform .35s ease; }
        .lh-node.active { transform: translateY(-4px); }
        .lh-node-circle { transition: box-shadow .35s ease, background .35s ease, border-color .35s ease; }
        @keyframes lh-dash { to { stroke-dashoffset: -400; } }
        @media (prefers-reduced-motion: reduce) {
          .lh-route-anim { animation: none !important; }
        }
        @media (max-width: 880px) {
          .lh-hero-grid { grid-template-columns: 1fr !important; }
          .lh-nav-links { display: none !important; }
          .lh-mobile-toggle { display: inline-flex !important; }
          .lh-route-wrap { margin-top: 40px; }
        }
      `}</style>

      {/* NAV */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "22px 6vw",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="lh-display" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 20, fontWeight: 700 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg,#8B5CF6,#C084FC)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            💀​
          </span>
          Bankai
        </div>

        <nav className="lh-nav-links" style={{ display: "flex", gap: 36 }}>
          <a className="lh-navlink" href="#inicio">Início</a>
          <a className="lh-navlink" href="#solucoes">Soluções</a>
          <a className="lh-navlink" href="#recursos">Recursos</a>
          <a className="lh-navlink" href="#planos">Planos</a>
          <a className="lh-navlink" href="#contato">Contato</a>
        </nav>

        <button
          className="lh-btn"
          onClick={onEntrar}
          style={{
            background: "linear-gradient(135deg,#8B5CF6,#7C3AED)",
            border: "none",
            color: "white",
            padding: "10px 22px",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 8px 24px -8px rgba(139,92,246,0.6)",
          }}
        >
          Entrar
        </button>

        <button
          className="lh-mobile-toggle"
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: "none",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            color: "white",
            padding: 8,
            marginLeft: 10,
          }}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {menuOpen && (
        <div style={{ padding: "16px 6vw", display: "flex", flexDirection: "column", gap: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            ["Início", "#inicio"],
            ["Soluções", "#solucoes"],
            ["Recursos", "#recursos"],
            ["Planos", "#planos"],
            ["Contato", "#contato"],
          ].map(([l, href]) => (
            <a key={l} href={href} className="lh-navlink" onClick={() => setMenuOpen(false)}>{l}</a>
          ))}
          <button
            className="lh-navlink"
            onClick={onEntrar}
            style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", font: "inherit" }}
          >
            Entrar
          </button>
        </div>
      )}

      {/* HERO */}
      <main id="inicio" style={{ padding: "72px 6vw 100px" }}>
        <div className="lh-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 48, alignItems: "center" }}>
          {/* Left: copy */}
          <div>
            <h1
              className="lh-display"
              style={{
                fontSize: "clamp(38px, 5vw, 58px)",
                lineHeight: 1.05,
                margin: 0,
                fontWeight: 700,
                color: "#F4F2FB",
              }}
            >
              Rastreie.
              <br />
              Controle.{" "}
              <span
                style={{
                  background: "linear-gradient(135deg,#A78BFA,#F0ABFC)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Confie.
              </span>
            </h1>

            <p style={{ color: "#A9A3C4", fontSize: 17, lineHeight: 1.65, marginTop: 22, maxWidth: 440 }}>
              Tenha controle total sobre a jornada dos seus produtos, desde a origem até o destino final — com registros verificáveis em cada etapa.
            </p>

            <div style={{ display: "flex", gap: 14, marginTop: 34, flexWrap: "wrap" }}>
              <button
                className="lh-btn"
                onClick={onComecar}
                style={{
                  background: "linear-gradient(135deg,#8B5CF6,#7C3AED)",
                  border: "none",
                  color: "white",
                  padding: "13px 24px",
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 10px 30px -10px rgba(139,92,246,0.7)",
                }}
              >
                Começar agora <ArrowRight size={16} />
              </button>
              <button
                className="lh-btn"
                onClick={() => document.getElementById("solucoes")?.scrollIntoView({ behavior: "smooth" })}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#EDEBF7",
                  padding: "13px 22px",
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Conheça a solução <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Right: supply chain route */}
          <div className="lh-route-wrap" style={{ position: "relative", display: "flex" }}>
            <RouteDiagram stages={stages} positions={positions} activeStage={activeStage} />
          </div>
        </div>
      </main>
    </div>
  );
}

function RouteDiagram({ stages, positions, activeStage }) {
  const width = 780;
  const height = 300;
  const y = 90;
  const pts = positions.map((p) => p * (width - 100) + 50);

  // build a smooth-ish path through the points
  const pathD = pts
    .map((x, i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ");

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20,
        padding: "24px 20px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ overflow: "visible", display: "block", maxWidth: 780, margin: "0 auto", height: "auto" }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#F0ABFC" />
          </linearGradient>
        </defs>

        {/* base path */}
        <path d={pathD} stroke="rgba(139,92,246,0.18)" strokeWidth="3" fill="none" />
        {/* animated dashed overlay = the "signature" traceability motion */}
        <path
          className="lh-route-anim"
          d={pathD}
          stroke="url(#routeGrad)"
          strokeWidth="3"
          strokeDasharray="10 10"
          fill="none"
          style={{ animation: "lh-dash 6s linear infinite" }}
        />

        {stages.map((s, i) => {
          const x = pts[i];
          const isActive = i === activeStage;
          const Icon = s.Icon;
          return (
            <g key={s.id} className={`lh-node ${isActive ? "active" : ""}`}>
              <circle
                className="lh-node-circle"
                cx={x}
                cy={y}
                r="30"
                fill={isActive ? "#8B5CF6" : "rgba(255,255,255,0.06)"}
                stroke={isActive ? "#C084FC" : "rgba(34,211,238,0.45)"}
                strokeWidth="1.5"
              />
              <foreignObject x={x - 17} y={y - 17} width="34" height="34">
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={19} color={isActive ? "#fff" : "#B9B2D6"} />
                </div>
              </foreignObject>

              <text
                x={x}
                y={y + 84}
                textAnchor="middle"
                fill={isActive ? "#F4F2FB" : "#C9C3E0"}
                fontSize="16"
                fontWeight="600"
                fontFamily="'Space Grotesk', sans-serif"
              >
                {s.label.length > 16 ? s.label.split(" ")[0] : s.label}
              </text>
              {s.label.split(" ").length > 1 && s.label.length > 16 && (
                <text
                  x={x}
                  y={y + 104}
                  textAnchor="middle"
                  fill={isActive ? "#F4F2FB" : "#C9C3E0"}
                  fontSize="16"
                  fontWeight="600"
                  fontFamily="'Space Grotesk', sans-serif"
                >
                  {s.label.split(" ").slice(1).join(" ")}
                </text>
              )}
              <foreignObject x={x - 62} y={y + (s.label.length > 16 ? 116 : 96)} width="124" height="60">
                <div style={{ fontSize: 12.5, color: "#8981A8", textAlign: "center", lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
                  {s.desc}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
