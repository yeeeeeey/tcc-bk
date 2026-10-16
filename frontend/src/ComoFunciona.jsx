import React from "react";
import { PackageSearch, Truck, MapPin, ShieldCheck } from "lucide-react";
import Reveal from "./Reveal";

// ---------------------------------------------------------------------------
// Layout diferente das demais seções: em vez de uma grade de cards, os 4
// passos ficam numa linha do tempo vertical, alternando texto à esquerda e
// à direita de uma linha central — quebra o padrão repetitivo de
// "badge + título + grade de cards" usado em Vantagens e Planos.
// ---------------------------------------------------------------------------

const passos = [
  {
    numero: "01",
    titulo: "Cadastre o produto",
    Icon: PackageSearch,
    texto:
      "Registre o item na plataforma com um código único de rastreio, vinculando lote, origem e dados de fabricação logo na saída da fábrica.",
  },
  {
    numero: "02",
    titulo: "Acompanhe a entrega",
    Icon: Truck,
    texto:
      "Sua equipe e seus clientes acompanham o trajeto em tempo real, do centro de distribuição até a chegada ao destino final.",
  },
  {
    numero: "03",
    titulo: "Consulte em tempo real",
    Icon: MapPin,
    texto:
      "Verifique localização, status e histórico completo de qualquer produto a qualquer momento, direto pela plataforma.",
  },
  {
    numero: "04",
    titulo: "Garanta transparência",
    Icon: ShieldCheck,
    texto:
      "Cada etapa fica registrada e verificável, construindo confiança entre fornecedores, transportadoras e clientes.",
  },
];

export default function ComoFuncionaSection() {
  return (
    <section
      id="solucoes"
      style={{
        fontFamily: "'Inter', sans-serif",
        background:
          "radial-gradient(1100px 700px at 50% 5%, rgba(34,211,238,0.11), transparent 68%), radial-gradient(900px 500px at 50% 105%, rgba(34,211,238,0.07), transparent 60%), #0A0716",
        padding: "80px 6vw 90px",
        color: "#F4F2FB",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .cf-display { font-family: 'Space Grotesk', sans-serif; }

        .cf-timeline { position: relative; max-width: 880px; margin: 0 auto; }
        .cf-line {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 2px;
          transform: translateX(-1px);
          background: linear-gradient(180deg, rgba(34,211,238,0.05), rgba(139, 92, 246, 0.55) 10%, rgba(104, 45, 241, 0.55) 90%, rgba(103,232,249,0.05));
        }
        .cf-step {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 60px 1fr;
          align-items: center;
          gap: 0;
          margin-bottom: 56px;
        }
        .cf-step:last-child { margin-bottom: 0; }
        .cf-node {
          grid-column: 2;
          width: 56px; height: 56px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg,#22D3EE,#0891B2);
          box-shadow: 0 0 0 6px #0A0716, 0 8px 22px -6px rgba(32, 211, 238, 0.6);
          z-index: 2;
        }
        .cf-content {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 22px 24px;
          transition: transform .25s ease, border-color .25s ease, background .25s ease;
        }
        .cf-content:hover {
          transform: translateY(-3px);
          border-color: rgba(139, 92, 246, 0.55);
          background: rgba(34,211,238,0.06);
        }
        .cf-step.right .cf-content { grid-column: 3; text-align: left; }
        .cf-step.left .cf-content { grid-column: 1; text-align: right; }
        .cf-step.left .cf-numero-row { justify-content: flex-end; }
        .cf-numero-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .cf-numero {
          font-size: 14px; font-weight: 700; color: #67E8F9;
          font-family: 'Space Grotesk', sans-serif;
        }
        .cf-titulo {
          font-size: 17px; font-weight: 600; margin: 0 0 8px; font-family: 'Space Grotesk', sans-serif;
        }
        .cf-texto {
          font-size: 13.5px; line-height: 1.6; color: #A9A3C4; margin: 0;
        }

        @media (max-width: 720px) {
          .cf-line { left: 27px; }
          .cf-step, .cf-step.left, .cf-step.right {
            grid-template-columns: 56px 1fr;
            margin-bottom: 30px;
          }
          .cf-node { grid-column: 1; width: 44px; height: 44px; }
          .cf-step.left .cf-content, .cf-step.right .cf-content {
            grid-column: 2; text-align: left;
          }
          .cf-step.left .cf-numero-row { justify-content: flex-start; }
        }
      `}</style>

      <Reveal>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 className="cf-display" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 700, margin: 0 }}>
            Como funciona?
          </h2>
        </div>
      </Reveal>

      <div className="cf-timeline">
        <div className="cf-line" />
        {passos.map((p, index) => {
          const Icon = p.Icon;
          const side = index % 2 === 0 ? "right" : "left";
          return (
            <Reveal key={p.numero} delay={index * 0.12}>
              <div className={`cf-step ${side}`}>
                <div className="cf-node">
                  <Icon size={24} color="#fff" />
                </div>
                <div className="cf-content">
                  <div className="cf-numero-row">
                    <span className="cf-numero">{p.numero}</span>
                  </div>
                  <h3 className="cf-titulo">{p.titulo}</h3>
                  <p className="cf-texto">{p.texto}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}