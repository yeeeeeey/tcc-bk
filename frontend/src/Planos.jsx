import React from "react";
import { Package, Truck, Building2, CheckCircle2 } from "lucide-react";
import Reveal from "./Reveal";
 
// ---------------------------------------------------------------------------
// Volta à paleta violeta do Hero/Vantagens. O topo da seção tem um fade que
// sai do ciano (herdado do "Como funciona" acima) e se resolve em violeta,
// mantendo a mesma técnica de transição usada nas seções anteriores.
// ---------------------------------------------------------------------------
 
const planos = [
  {
    id: "essencial",
    nome: "Essencial",
    Icon: Package,
    descricao: "Perfeito para pequenas operações que estão começando.",
    preco: "79",
    destaque: true,
    features: [
      "Até 500 produtos",
      "Rastreamento completo",
      "Dashboard básico",
      "Suporte por e-mail",
    ],
  },
  {
    id: "profissional",
    nome: "Profissional",
    Icon: Truck,
    descricao: "Ideal para empresas que precisam de mais controle e relatórios.",
    preco: "199",
    destaque: false,
    features: [
      "Até 5.000 produtos",
      "Rastreamento completo",
      "Relatórios avançados",
      "Suporte prioritário",
      "Integração",
    ],
  },
  {
    id: "empresarial",
    nome: "Empresarial",
    Icon: Building2,
    descricao: "Solução completa para grandes operações e equipes.",
    preco: "399",
    destaque: false,
    accent: "cyan",
    features: [
      "Produtos ilimitados",
      "Rastreamento completo",
      "Relatórios personalizados",
      "Suporte 24/7",
      "Integrações avançadas",
      "Gerente de conta dedicado",
    ],
  },
];
 
export default function PlanosSection({ onEscolherPlano }) {
  return (
    <section
      id="planos"
      style={{
        fontFamily: "'Inter', sans-serif",
        background:
          "radial-gradient(1100px 550px at 50% -8%, rgba(34,211,238,0.09), transparent 55%), radial-gradient(1000px 550px at 30% 40%, rgba(139,92,246,0.10), transparent 60%), #0A0716",
        padding: "60px 6vw 120px",
        color: "#F4F2FB",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .pl-display { font-family: 'Space Grotesk', sans-serif; }
        .pl-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 22px;
        }
        .pl-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 18px;
          padding: 26px 24px 24px;
          display: flex;
          flex-direction: column;
          transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease;
        }
        .pl-card:hover {
          transform: translateY(-4px);
          border-color: rgba(139,92,246,0.6);
          box-shadow: 0 0 0 1px rgba(139,92,246,0.25), 0 20px 45px -20px rgba(139,92,246,0.35);
        }
        .pl-card.featured {
          background: rgba(139,92,246,0.05);
        }
        .pl-card.accent-cyan:hover {
          border-color: rgba(34,211,238,0.55);
          box-shadow: 0 0 0 1px rgba(34,211,238,0.22), 0 20px 45px -20px rgba(34,211,238,0.35);
        }
        .pl-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 22px; }
        .pl-icon-badge {
          flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg,#8B5CF6,#7C3AED);
          box-shadow: 0 6px 18px -6px rgba(139,92,246,0.55);
        }
        .pl-icon-badge.cyan {
          background: linear-gradient(135deg,#22D3EE,#0891B2);
          box-shadow: 0 6px 18px -6px rgba(34,211,238,0.5);
        }
        .pl-nome { font-size: 16.5px; font-weight: 700; margin: 0 0 4px; font-family: 'Space Grotesk', sans-serif; }
        .pl-nome.gradient {
          background: linear-gradient(135deg,#A78BFA,#F0ABFC);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .pl-desc { font-size: 12.5px; color: #8981A8; line-height: 1.5; margin: 0; }
        .pl-price-row { margin-bottom: 22px; white-space: nowrap; }
        .pl-currency { font-size: 15px; font-weight: 600; color: #C9C3E0; }
        .pl-price {
          font-size: 40px; font-weight: 700; font-family: 'Space Grotesk', sans-serif;
          margin: 0 3px;
          background: linear-gradient(135deg,#A78BFA,#C084FC);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .pl-price.cyan {
          background: linear-gradient(135deg,#67E8F9,#22D3EE);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .pl-period { font-size: 13px; color: #8981A8; }
        .pl-features { list-style: none; margin: 0 0 26px; padding: 0; display: flex; flex-direction: column; gap: 12px; flex: 1; }
        .pl-features li { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #D8D4EA; }
        .pl-features svg { flex-shrink: 0; color: #67E8F9; }
        .pl-btn {
          width: 100%; border-radius: 10px; padding: 12px; font-weight: 600; font-size: 14px;
          cursor: pointer; transition: transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease;
          font-family: 'Inter', sans-serif;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.14); color: #EDEBF7;
        }
        .pl-btn:hover {
          transform: translateY(-1px);
          background: linear-gradient(135deg,#8B5CF6,#7C3AED);
          border-color: transparent;
          box-shadow: 0 10px 26px -10px rgba(139,92,246,0.65);
        }
        .pl-btn.cyan:hover {
          background: linear-gradient(135deg,#22D3EE,#0891B2);
          box-shadow: 0 10px 26px -10px rgba(34,211,238,0.55);
        }
        @media (max-width: 880px) {
          .pl-grid { grid-template-columns: 1fr; }
        }
      `}</style>
 
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2 className="pl-display" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 700, margin: 0 }}>
              Escolha o plano ideal
            </h2>
            <p style={{ color: "#A9A3C4", fontSize: 15.5, marginTop: 12 }}>
              Todos os planos incluem rastreabilidade completa. Faça upgrade quando precisar.
            </p>
          </div>
        </Reveal>
 
        <div className="pl-grid">
          {planos.map((p, index) => {
            const Icon = p.Icon;
            return (
              <Reveal key={p.id} delay={index * 0.1}>
                <div className={`pl-card ${p.destaque ? "featured" : ""} ${p.accent === "cyan" ? "accent-cyan" : ""}`}>
                  <div className="pl-header">
                    <span className="pl-icon-badge">
                      <Icon size={20} color="#fff" />
                    </span>
                    <div>
                      <h3 className={`pl-nome ${p.id === "empresarial" ? "gradient" : ""}`}>{p.nome}</h3>
                      <p className="pl-desc">{p.descricao}</p>
                    </div>
                  </div>
 
                  <div className="pl-price-row">
                    <span className="pl-currency">R$</span>
                    <span className="pl-price">{p.preco}</span>
                    <span className="pl-period">/ mês</span>
                  </div>
 
                  <ul className="pl-features">
                    {p.features.map((f) => (
                      <li key={f}>
                        <CheckCircle2 size={16} />
                        {f}
                      </li>
                    ))}
                  </ul>
 
                  <button className={`pl-btn ${p.accent === "cyan" ? "cyan" : ""}`} onClick={onEscolherPlano}>
                    Escolher Plano
                  </button>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}