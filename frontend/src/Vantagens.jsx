import React, { useState } from "react";
import { Zap, ShieldCheck, DollarSign, BarChart3, Plus } from "lucide-react";
import Reveal from "./Reveal";
 
// ---------------------------------------------------------------------------
// Mesma linguagem visual do Hero: fundo #0A0716, acento violeta, Space Grotesk
// nos títulos, Inter no corpo. Cada item é um "row" de acordeão: clique
// alterna abrir/fechar, e só um item fica aberto por vez.
// ---------------------------------------------------------------------------
 
const vantagens = [
  {
    id: "agilidade",
    label: "Agilidade",
    resumo: "Reduza atrasos com decisões tomadas em tempo real.",
    Icon: Zap,
    text: [
      "Elimine gargalos e otimize o ritmo da sua cadeia logística. Com ",
      { hl: "monitoramento em tempo real" },
      ", sua equipe acompanha cada etapa do deslocamento com precisão, recebendo dados atualizados e ",
      { hl: "alertas preditivos" },
      ". Essa visibilidade constante permite tomar ",
      { hl: "decisões estratégicas imediatas" },
      " diante de imprevistos no trânsito, redefinir rotas com agilidade e assegurar que as entregas cheguem sempre dentro do prazo combinado com o cliente. Em operações com dezenas ou centenas de trajetos simultâneos, esse tipo de resposta rápida é o que separa uma entrega pontual de um cliente insatisfeito e é exatamente isso que a plataforma foi desenhada para garantir, dia após dia. Cada veículo e centro de distribuição transmite localização via ",
      { hl: "GPS e sensores IoT" },
      " a cada poucos segundos, alimentando um motor que recalcula automaticamente o prazo estimado e usa do histórico de trajetos anteriores, para verificar as rotas mais eficientes. Enquanto sistemas tradicionais atualizam status uma vez por dia, a Bankai ",
      { hl: "processa tudo isso em tempo real" },
      ", o que se traduz em menos multas contratuais por atraso e uma operação que se antecipa aos problemas em vez de apenas reagir a eles.",
    ],
  },
  {
    id: "seguranca",
    label: "Segurança",
    resumo: "Alertas instantâneos contra desvios e violação de carga.",
    Icon: ShieldCheck,
    text: [
      "Garanta máxima proteção para o seu patrimônio desde o centro de distribuição até a entrega ao destino final. A plataforma conta com ",
      { hl: "sensores avançados de rastreamento" },
      " que identificam instantaneamente desvios de rota, paradas não programadas ou tentativas de violação de carga. Ao sinal de risco, o sistema emite ",
      { hl: "notificações em tempo real" },
      " para a central de monitoramento, permitindo uma resposta rápida para evitar contratempos. Todo esse histórico de eventos fica registrado e disponível para consulta, servindo como ",
      { hl: "prova em caso de disputa" },
      " com seguradoras ou questionamentos de clientes sobre o estado da carga durante o transporte. Sensores de ",
      { hl: "monitoramento avançados" },
      " no compartimento de carga geram um evento sempre que algo foge do padrão esperado, e cada alerta chega com localização exata, horário e o tipo de anomalia detectada, permitindo que a equipe avalie a situação sem perder tempo. A maioria das transportadoras só descobre uma violação na conferência de chegada; Aqui ",
      { hl: "o alerta chega no instante em que o desvio acontece" },
      ", dando à equipe a chance real de intervir a tempo de evitar imprevistos.",
    ],
  },
  {
    id: "controle",
    label: "Controle",
    resumo: "Relatórios e indicadores centralizados num só lugar.",
    Icon: DollarSign,
    accent: "cyan",
    text: [
      "Mantenha o domínio total sobre a sua operação através de um ",
      { hl: "ecossistema centralizado e intuitivo" },
      ". Acesse relatórios completos sobre a movimentação de cada item, monitore indicadores de desempenho da frota e consulte o histórico detalhado de trajetos a qualquer momento. A gestão baseada em dados reais garante ",
      { hl: "transparência absoluta" },
      " para os seus clientes, além de facilitar a auditoria de processos e o alinhamento da equipe de logística. Gestores conseguem ",
      { hl: "comparar o desempenho entre diferentes rotas, filiais ou períodos" },
      " com poucos cliques, transformando decisões que antes dependiam de intuição em decisões apoiadas em dados concretos e atualizados. Todo evento de rastreio, cadastro, saída, checkpoint e entrega é registrado num ",
      { hl: "histórico único por produto" },
      ", organizado em de maneira clara permitindo que qualquer pessoa da equipe encontre a resposta que precisa sem depender de outro setor. Enquanto muitas empresas procuram informações de forma exaustante cruzando sistemas separados manualmente, a Trilha centraliza tudo em um ",
      { hl: "sistema unificado" },
      ", encurtando relatórios que levavam dias para ficarem prontos em apenas alguns minutos.",
    ],
  },
  {
    id: "custos",
    label: "Redução de Custos",
    resumo: "Menos combustível, menos perdas, mais margem no fim do mês.",
    Icon: BarChart3,
    text: [
      "Transforme a eficiência operacional em economia financeira direta para o seu negócio. A ",
      { hl: "otimização inteligente de trajetos" },
      " reduz o tempo de viagem, diminuindo o consumo de combustível e o desgaste dos veículos da frota. Além disso, ao mitigar riscos de perdas, roubos e multas por atrasos, a sua empresa elimina custos invisíveis à operação e alcança uma ",
      { hl: "margem de lucro expressivamente maior" },
      " no final do mês. Multiplicado pelo volume de entregas de uma operação de médio ou grande porte, mesmo uma pequena ",
      { hl: "redução percentual" },
      " em combustível e manutenção representa uma economia significativa acumulada ao longo do tempo. O sistema compara o trajeto realizado com o trajeto ideal e aponta ",
      { hl: "padrões de desperdício" },
      "  reunidos em relatórios por rota e por motorista, que também identificam veículos com desempenho em decadência, ajudando a manutenção a agir antes que um problema mecânico gere um custo maior. Em vez de esperar o resultado no fechamento do mês, esses indicadores ficam ",
      { hl: "disponíveis em tempo real" },
      ", permitindo ajustar rotas e processos antes que o desperdício vire prejuízo acumulado.",
    ],
  },
];
 
export default function VantagensSection() {
  const [openId, setOpenId] = useState(null);
 
  return (
    <section
      id="recursos"
      style={{
        fontFamily: "'Inter', sans-serif",
        background:
          "radial-gradient(900px 400px at 20% -5%, rgba(139,92,246,0.06), transparent 55%), radial-gradient(1000px 500px at 50% 115%, rgba(34,211,238,0.08), transparent 65%), #0A0716",
        padding: "100px 6vw 100px",
        color: "#F4F2FB",
      }}
    >
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .vs-display { font-family: 'Space Grotesk', sans-serif; }
        .vs-row-header {
          position: relative;
          display: flex; align-items: center; gap: 16px; width: 100%;
          background: rgba(255,255,255,0.03); border: 1px solid #ffffff14;
          border-radius: 16px; padding: 18px 22px; cursor: pointer;
          transition: background .2s ease, border-color .2s ease, transform .2s ease;
          font: inherit; text-align: left; color: inherit;
          overflow: hidden;
        }
        .vs-row-header::before {
          content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
          background: linear-gradient(180deg,#22D3EE,#67E8F9);
          transform: scaleY(0); transition: transform .3s ease;
        }
        .vs-row-header.accent-cyan::before { background: linear-gradient(180deg,#22D3EE,#67E8F9); }
        .vs-row-header:hover::before, .vs-row-header.open::before { transform: scaleY(1); }
        .vs-row-header:hover { background: rgba(255,255,255,0.055); border-color: rgba(34,211,238,0.5); transform: translateX(2px); }
        .vs-row-header.open { border-color: rgba(34,211,238,0.5); background: rgba(34,211,238,0.06); }
        .vs-row-header.open.accent-cyan { border-color: #22d3ee80; background: rgba(34,211,238,0.06); }
        .vs-index {
          flex-shrink: 0; font-size: 12px; font-weight: 700; color: #4A4568;
          font-family: 'Space Grotesk', sans-serif; width: 20px;
        }
        .vs-icon-badge.accent {
          background: linear-gradient(135deg,#22D3EE,#0891B2);
          box-shadow: 0 6px 18px -6px #8b5cf68c;
        }
        .vs-icon-badge {
          flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg,#8B5CF6,#7C3AED);
          box-shadow: 0 6px 18px -6px rgba(34,211,238,0.5));
          transition: transform .3s ease;
        }
        .vs-row-header:hover .vs-icon-badge { transform: scale(1.08) rotate(-4deg); }
        .vs-text-col { flex: 1; min-width: 0; }
        .vs-label { font-size: 16.5px; font-weight: 600; display: block; }
        .vs-resumo {
          font-size: 12.5px; color: #8981A8; margin-top: 3px; font-weight: 400;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .vs-toggle {
          flex-shrink: 0; width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.06); color: #22D3EE;
          transition: transform .3s ease, background .3s ease, color .3s ease;
        }
        .vs-row-header.open .vs-toggle {
          transform: rotate(45deg); background: #22D3EE; color: white;
        }
        .vs-panel {
          display: grid; grid-template-rows: 0fr; transition: grid-template-rows .35s ease;
        }
        .vs-panel.open { grid-template-rows: 1fr; }
        .vs-panel-inner { overflow: hidden; }
        .vs-panel-content {
          padding: 20px 24px 6px 82px; color: #A9A3C4; font-size: 14.5px; line-height: 1.75;
          text-align: justify; text-justify: inter-word;
          opacity: 0; transform: translateY(-6px); transition: opacity .4s ease .05s, transform .4s ease .05s;
        }
        .vs-panel-content.in { opacity: 1; transform: translateY(0); }
        .vs-highlight {
          color: #22D3EE; font-weight: 600;
          background: linear-gradient(180deg, transparent 72%, rgba(139,92,246,0.35) 72%);
          padding: 0 1px;
        }
        @media (max-width: 640px) {
          .vs-panel-content { padding-left: 22px; }
          .vs-label { font-size: 15px; }
          .vs-resumo { display: none; }
          .vs-index { display: none; }
        }
        .vs-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
      `}</style>

 
      <div style={{ width: "100%" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2 className="vs-display" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 700, margin: 0 }}>
              Vantagens que fazem a diferença
            </h2>
            <p style={{ color: "#A9A3C4", fontSize: 15.5, marginTop: 12 }}>
              Clique em cada item para expandir.
            </p>
          </div>
        </Reveal>
 
        <div className="vs-grid">
          {vantagens.map((v, index) => {
            const isOpen = openId === v.id;
            const Icon = v.Icon;
            return (
              <Reveal key={v.id} delay={index * 0.08}>
                <div>
                  <button
                    className={`vs-row-header ${isOpen ? "open" : ""} ${v.accent === "cyan" ? "accent-cyan" : ""}`}
                    onClick={() => setOpenId(isOpen ? null : v.id)}
                    aria-expanded={isOpen}
                  >
                    <span className="vs-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className={`vs-icon-badge ${v.accent === "cyan" ? "accent-cyan" : ""}`}>
                      <Icon size={20} color="#fff" />
                    </span>
                    <span className="vs-text-col">
                      <span className="vs-label vs-display">{v.label}</span>
                      <span className="vs-resumo">{v.resumo}</span>
                    </span>
                    <span className="vs-toggle">
                      <Plus size={16} />
                    </span>
                  </button>
 
                  <div className={`vs-panel ${isOpen ? "open" : ""}`}>
                    <div className="vs-panel-inner">
                      <p className={`vs-panel-content ${isOpen ? "in" : ""}`}>
                        {v.text.map((chunk, i) =>
                          typeof chunk === "string" ? (
                            <React.Fragment key={i}>{chunk}</React.Fragment>
                          ) : (
                            <span key={i} className="vs-highlight">
                              {chunk.hl}
                            </span>
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}