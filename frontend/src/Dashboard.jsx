
import React, { useEffect, useState } from "react";
import {
  LayoutDashboard, Package, Warehouse, Truck as TruckIcon, Search as SearchIcon,
  ClipboardList, AlertTriangle, Users, Shield, Settings, Bell,
  HelpCircle, CheckCircle2, Clock, Car, MapPin, LogOut, RefreshCw,
} from "lucide-react";
import { buscarDashboard, listar } from "./api";
 
// ---------------------------------------------------------------------------
// Tela de Dashboard, primeira tela após o login. Mesma paleta do restante do
// site: fundo #0A0716, acento violeta (#8B5CF6/#7C3AED) com toques de ciano
// (#22D3EE), Space Grotesk nos títulos, Inter no corpo.
// ---------------------------------------------------------------------------
 
const navGroups = [
  {
    titulo: null,
    items: [{ label: "Dashboard", Icon: LayoutDashboard, active: true }],
  },
  {
    titulo: "Operações",
    items: [
      { label: "Produtos", Icon: Package },
      { label: "Armazém", Icon: Warehouse },
      { label: "Logística", Icon: TruckIcon },
      { label: "Rastreamento", Icon: SearchIcon },
    ],
  },
  {
    titulo: "Gestão",
    items: [
      { label: "Relatórios", Icon: ClipboardList },
      { label: "Alertas", Icon: AlertTriangle },
      { label: "Transportadora", Icon: TruckIcon },
      { label: "Veículos", Icon: Car },
    ],
  },
  {
    titulo: "Administração",
    items: [
      { label: "Usuários", Icon: Users },
      { label: "Perfis", Icon: Shield },
      { label: "Configuração", Icon: Settings },
    ],
  },
];
 
// Telas do menu que listam dados direto da API: [coluna da API, título da coluna]
const PAGINAS_DE_LISTA = {
  Produtos: {
    recurso: "produtos",
    colunas: [["id", "#"], ["nome", "Nome"], ["descricao", "Descrição"], ["preco", "Preço"], ["quantidade", "Qtd."]],
  },
  "Armazém": {
    recurso: "armazens",
    colunas: [["id", "#"], ["nome", "Nome"], ["localizacao", "Localização"], ["capacidade_maxima", "Capacidade"], ["status", "Status"]],
  },
  "Logística": {
    recurso: "entregas",
    colunas: [["id", "#"], ["produto_id", "Produto"], ["quantidade", "Qtd."], ["destino", "Destino"], ["data_prevista", "Previsão"], ["status", "Status"]],
  },
  Rastreamento: {
    recurso: "rastreamento",
    colunas: [["id", "#"], ["entrega_id", "Entrega"], ["localizacao_atual", "Localização"], ["data_hora", "Data/hora"], ["status", "Status"]],
  },
  Transportadora: {
    recurso: "transportadoras",
    colunas: [["id", "#"], ["nome", "Nome"], ["cnpj", "CNPJ"], ["contato", "Contato"]],
  },
  "Veículos": {
    recurso: "veiculos",
    colunas: [["id", "#"], ["placa", "Placa"], ["modelo", "Modelo"], ["capacidade_carga", "Capacidade"], ["status", "Status"], ["transportadora_id", "Transportadora"]],
  },
  "Usuários": {
    recurso: "usuarios",
    colunas: [["id", "#"], ["nome", "Nome"], ["login", "Login"], ["email", "E-mail"], ["perfil", "Perfil"]],
  },
};

const NOMES_PERFIL = {
  administrador: "Administrador",
  gerente_logistico: "Gerente logístico",
  operador: "Operador",
};

const CORES_STATUS = {
  entregue: "#4ADE80",
  "em transito": "#8B95C9",
  processando: "#A78BFA",
  pendente: "#FACC15",
  atrasado: "#F87171",
};
const CORES_EXTRAS = ["#22D3EE", "#FB923C", "#C084FC"];

function nomeDoStatus(status) {
  if (!status) return "—";
  const texto = status === "em transito" ? "em trânsito" : status;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "2026-09-25" (ou "2026-09-25T00:00:00.000Z") -> "25/09/2026"; data e hora -> "25/09/2026 14:30"
function formatarData(valor) {
  if (!valor) return "—";
  const soDia = String(valor).match(/^(\d{4}-\d{2}-\d{2})(T00:00:00(\.000)?Z)?$/);
  if (soDia) return soDia[1].split("-").reverse().join("/");
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatarCelula(chave, valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (chave.startsWith("data")) return formatarData(valor);
  if (chave === "status") return nomeDoStatus(valor);
  if (chave === "perfil") return NOMES_PERFIL[valor] || valor;
  return String(valor);
}

function montarAlertas(alertas) {
  if (!alertas) return [];
  const atrasadas = alertas.entregas_atrasadas.map((e) => ({
    tone: "red",
    title: "Entrega atrasada",
    subtitle: `Entrega #${e.id} · ${e.produto_nome} · previsão ${formatarData(e.data_prevista)}`,
  }));
  const estoqueBaixo = alertas.estoque_baixo.map((p) => ({
    tone: "yellow",
    title: "Estoque baixo",
    subtitle: `${p.nome} — ${p.quantidade} un.`,
  }));
  return [...atrasadas, ...estoqueBaixo];
}

const toneColors = {
  red: { bg: "rgba(248,113,113,0.14)", bar: "#F87171", text: "#FCA5A5" },
  orange: { bg: "rgba(251,146,60,0.14)", bar: "#FB923C", text: "#FDBA74" },
  yellow: { bg: "rgba(250,204,21,0.14)", bar: "#FACC15", text: "#FDE047" },
  cyan: { bg: "rgba(34,211,238,0.14)", bar: "#22D3EE", text: "#67E8F9" },
};
 
// Tabela simples com os registros de um recurso da API
function ListaRecurso({ titulo, recurso, colunas }) {
  const [linhas, setLinhas] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    listar(recurso)
      .then((dados) => ativo && setLinhas(dados))
      .catch((e) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [recurso]);

  return (
    <div className="db-panel">
      <div className="db-panel-head">
        <span className="db-panel-title">{titulo}</span>
        {linhas && <span className="db-track-pill">{linhas.length} registro(s)</span>}
      </div>
      {erro && <p className="db-msg erro">{erro}</p>}
      {!erro && !linhas && <p className="db-msg">Carregando...</p>}
      {linhas && linhas.length === 0 && <p className="db-msg">Nenhum registro cadastrado ainda.</p>}
      {linhas && linhas.length > 0 && (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead>
              <tr>
                {colunas.map(([chave, rotulo]) => (
                  <th key={chave}>{rotulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.id}>
                  {colunas.map(([chave]) => (
                    <td key={chave}>{formatarCelula(chave, linha[chave])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DashboardScreen({ usuario, onSair }) {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    buscarDashboard()
      .then((resposta) => {
        if (!ativo) return;
        setDados(resposta);
        setErro("");
      })
      .catch((e) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [versao]);

  const nomeUsuario = usuario?.nome || usuario?.login || "usuário";
  const primeiroNome = nomeUsuario.split(" ")[0];
  const inicial = nomeUsuario.charAt(0).toUpperCase();

  const totais = dados?.totais;
  const stats = totais
    ? [
        { label: "Produtos cadastrados", value: totais.produtos, link: "Ver produtos", pagina: "Produtos", Icon: Package },
        { label: "Armazéns ativos", value: totais.armazens_ativos, link: "Ver detalhes", pagina: "Armazém", Icon: Warehouse },
        { label: "Em trânsito", value: totais.em_transito, Icon: TruckIcon },
        { label: "Entregas", value: totais.entregas, link: "Ver entregas", pagina: "Logística", Icon: CheckCircle2 },
        { label: "Atrasos", value: totais.atrasos, Icon: Clock },
      ]
    : [];

  const statusBreakdown = (dados?.entregas_por_status || []).map((s, i) => ({
    label: nomeDoStatus(s.status),
    value: s.total,
    color: CORES_STATUS[s.status] || CORES_EXTRAS[i % CORES_EXTRAS.length],
  }));

  const totalStatus = statusBreakdown.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  const donutStops = totalStatus
    ? statusBreakdown
        .map((s) => {
          const start = (acc / totalStatus) * 360;
          acc += s.value;
          const end = (acc / totalStatus) * 360;
          return `${s.color} ${start}deg ${end}deg`;
        })
        .join(", ")
    : "rgba(255,255,255,0.08) 0deg 360deg";

  const stockByWarehouse = (dados?.estoque_por_armazem || []).map((a) => ({ label: a.nome, value: a.quantidade }));
  const maxStock = Math.max(1, ...stockByWarehouse.map((w) => w.value));

  const alerts = montarAlertas(dados?.alertas);
  const entrega = dados?.entrega_em_destaque;
  const historico = entrega?.historico || [];
  const paginaDeLista = PAGINAS_DE_LISTA[activeItem];

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: "#0A0716",
        minHeight: "100vh",
        color: "#F4F2FB",
        display: "flex",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .db-display { font-family: 'Space Grotesk', sans-serif; }
 
        .db-sidebar {
          width: 240px; flex-shrink: 0; background: #0D0818;
          border-right: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column; padding: 20px 14px;
          position: sticky; top: 0; height: 100vh; overflow-y: auto;
        }
        .db-nav-group-title {
          font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
          color: #4A4568; margin: 20px 10px 8px;
        }
        .db-nav-item {
          display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 10px;
          font-size: 13.5px; font-weight: 500; color: #9891B5; cursor: pointer;
          transition: background .18s ease, color .18s ease;
          border: none; background: transparent; width: 100%; text-align: left; font-family: 'Inter', sans-serif;
        }
        .db-nav-item:hover { background: rgba(255,255,255,0.04); color: #E9E6F5; }
        .db-nav-item.active {
          background: linear-gradient(135deg,#8B5CF6,#7C3AED); color: white;
          box-shadow: 0 6px 18px -8px rgba(139,92,246,0.6);
        }
        .db-sidebar-footer {
          margin-top: auto; display: flex; align-items: center; gap: 10px;
          padding: 12px; border-top: 1px solid rgba(255,255,255,0.07);
        }
        .db-avatar {
          width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg,#8B5CF6,#C084FC);
          display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;
        }
 
        .db-main { flex: 1; min-width: 0; padding: 26px 32px 60px; }
 
        .db-topbar { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 26px; flex-wrap: wrap; }
        .db-greeting { display: flex; align-items: center; gap: 10px; }
        .db-greeting h1 { font-size: 22px; margin: 0; font-weight: 700; }
        .db-greeting p { font-size: 13px; color: #8981A8; margin: 2px 0 0; }
        .db-search {
          flex: 1; max-width: 420px; display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
          border-radius: 11px; padding: 9px 14px; color: #6E6890; min-width: 200px;
        }
        .db-search input { background: transparent; border: none; outline: none; color: #F4F2FB; font-size: 13.5px; width: 100%; }
        .db-topbar-icons { display: flex; align-items: center; gap: 14px; }
        .db-icon-btn { position: relative; color: #9891B5; cursor: pointer; }
        .db-badge {
          position: absolute; top: -6px; right: -7px; background: #F87171; color: white;
          font-size: 10px; font-weight: 700; border-radius: 999px; width: 16px; height: 16px;
          display: flex; align-items: center; justify-content: center;
        }
 
        .db-stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 22px; }
        .db-stat-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 16px 18px;
          transition: transform .2s ease, border-color .2s ease;
        }
        .db-stat-card:hover { transform: translateY(-3px); border-color: rgba(139,92,246,0.35); }
        .db-stat-icon {
          width: 38px; height: 38px; border-radius: 10px; margin-bottom: 12px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(139,92,246,0.14); color: #A78BFA;
        }
        .db-stat-value { font-size: 24px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; }
        .db-stat-label { font-size: 12px; color: #8981A8; margin-top: 2px; }
        .db-stat-delta { font-size: 11px; margin-top: 8px; }
        .db-stat-delta.up { color: #4ADE80; }
        .db-stat-delta.down { color: #F87171; }
        .db-stat-link { font-size: 11px; margin-top: 8px; color: #A78BFA; }
 
        .db-row-2 { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; margin-bottom: 16px; }
        .db-panel {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px; padding: 20px 22px;
        }
        .db-panel.accent-cyan { border-color: rgba(34,211,238,0.45); }
        .db-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .db-panel-title { font-size: 15px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; }
        .db-panel-link {
          font-size: 12px; font-weight: 600; color: #A78BFA; background: rgba(139,92,246,0.1);
          border: 1px solid rgba(139,92,246,0.3); border-radius: 8px; padding: 5px 10px; cursor: pointer;
        }
 
        .db-track-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; font-size: 13px; color: #C9C3E0; }
        .db-track-pill {
          font-size: 11px; font-weight: 600; color: #A78BFA; background: rgba(139,92,246,0.12);
          border: 1px solid rgba(139,92,246,0.3); border-radius: 999px; padding: 3px 10px;
        }
        .db-track-row { display: flex; align-items: flex-start; justify-content: space-between; position: relative; margin-bottom: 20px; }
        .db-track-line {
          position: absolute; top: 20px; left: 5%; right: 5%; height: 2px;
          background: rgba(255,255,255,0.1); z-index: 0;
        }
        .db-track-node { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; text-align: center; }
        .db-track-circle {
          width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.15); color: #8981A8; margin-bottom: 8px;
        }
        .db-track-node.done .db-track-circle { background: linear-gradient(135deg,#8B5CF6,#7C3AED); border-color: transparent; color: white; }
        .db-track-node.active .db-track-circle {
          background: linear-gradient(135deg,#8B5CF6,#7C3AED); border-color: transparent; color: white;
          box-shadow: 0 0 0 5px rgba(139,92,246,0.18);
        }
        .db-track-label { font-size: 12px; font-weight: 600; color: #E9E6F5; }
        .db-track-local { font-size: 10.5px; color: #8981A8; margin-top: 2px; }
        .db-track-data { font-size: 10.5px; color: #6E6890; }
        .db-track-node.active .db-track-data { color: #A78BFA; font-weight: 600; }
 
        .db-track-footer {
          display: flex; flex-wrap: wrap; gap: 10px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.07);
        }
        .db-track-chip {
          font-size: 11.5px; color: #9891B5; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 12px;
        }
 
        .db-alert-item { display: flex; gap: 10px; padding: 12px 14px; border-radius: 12px; margin-bottom: 10px; }
        .db-alert-item:last-child { margin-bottom: 0; }
        .db-alert-icon { flex-shrink: 0; margin-top: 1px; }
        .db-alert-title { font-size: 13px; font-weight: 600; }
        .db-alert-subtitle { font-size: 11.5px; color: #C9C3E0; margin-top: 2px; opacity: .8; }
 
        .db-donut-wrap { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
        .db-donut {
          width: 170px; height: 170px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; position: relative;
        }
        .db-donut-hole {
          width: 96px; height: 96px; border-radius: 50%; background: #100B20;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .db-donut-hole strong { font-size: 20px; font-family: 'Space Grotesk', sans-serif; }
        .db-donut-hole span { font-size: 10px; color: #8981A8; }
        .db-legend { display: flex; flex-direction: column; gap: 10px; font-size: 12.5px; }
        .db-legend-row { display: flex; align-items: center; gap: 8px; color: #C9C3E0; }
        .db-legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .db-legend-value { margin-left: auto; color: #8981A8; font-weight: 600; padding-left: 16px; }
 
        .db-stock-row { margin-bottom: 16px; }
        .db-stock-row:last-child { margin-bottom: 0; }
        .db-stock-top { display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 6px; }
        .db-stock-label { color: #C9C3E0; }
        .db-stock-value { color: #8981A8; font-weight: 600; }
        .db-stock-track { height: 6px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; }
        .db-stock-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#8B5CF6,#22D3EE); }

        .db-msg { font-size: 13px; color: #8981A8; margin: 0; }
        .db-msg.erro {
          color: #FCA5A5; background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3);
          border-radius: 10px; padding: 10px 14px; margin-bottom: 16px;
        }
        .db-stat-link { background: none; border: none; padding: 0; cursor: pointer; font-family: inherit; }
        .db-logout {
          background: none; border: none; color: #8981A8; cursor: pointer; padding: 4px;
          display: inline-flex; border-radius: 8px;
        }
        .db-logout:hover { color: #F4F2FB; background: rgba(255,255,255,0.06); }
        .db-table-wrap { overflow-x: auto; }
        .db-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .db-table th {
          text-align: left; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
          color: #6E6890; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .db-table td { padding: 11px 12px; color: #C9C3E0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .db-table tr:hover td { background: rgba(255,255,255,0.02); }

        @media (max-width: 1100px) {
          .db-stats-grid { grid-template-columns: repeat(3, 1fr); }
          .db-row-2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
          .db-sidebar { display: none; }
          .db-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
 
      {/* SIDEBAR */}
      <aside className="db-sidebar">
        <div className="db-display" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, fontWeight: 700, padding: "6px 10px 18px" }}>
          <span
            style={{
              width: 26, height: 26, borderRadius: 8,
              background: "linear-gradient(135deg,#8B5CF6,#C084FC)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13,
            }}
          >
            ◆
          </span>
          Trilha
        </div>
 
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.titulo && <p className="db-nav-group-title">{group.titulo}</p>}
            {group.items.map(({ label, Icon }) => (
              <button
                key={label}
                className={`db-nav-item ${activeItem === label ? "active" : ""}`}
                onClick={() => setActiveItem(label)}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>
        ))}
 
        <div className="db-sidebar-footer">
          <span className="db-avatar">{inicial}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomeUsuario}</div>
            <div style={{ fontSize: 11, color: "#8981A8" }}>{NOMES_PERFIL[usuario?.perfil] || usuario?.perfil}</div>
          </div>
          <button className="db-logout" onClick={onSair} title="Sair" aria-label="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
 
      {/* MAIN */}
      <main className="db-main">
        {/* TOPBAR */}
        <div className="db-topbar">
          <div className="db-greeting">
            <div>
              <h1 className="db-display">Olá, {primeiroNome}! 👋</h1>
              <p>Acompanhe toda a sua operação em tempo real.</p>
            </div>
          </div>
 
          <div className="db-search">
            <SearchIcon size={15} />
            <input placeholder="Buscar produtos, pedidos, armazéns..." />
          </div>
 
          <div className="db-topbar-icons">
            <span className="db-icon-btn" title="Atualizar dados" onClick={() => setVersao((v) => v + 1)}>
              <RefreshCw size={18} />
            </span>
            <span className="db-icon-btn" title="Alertas" onClick={() => setActiveItem("Alertas")}>
              <Bell size={19} />
              {alerts.length > 0 && <span className="db-badge">{alerts.length}</span>}
            </span>
            <span className="db-icon-btn">
              <HelpCircle size={19} />
            </span>
            <span className="db-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{inicial}</span>
          </div>
        </div>
 
        {erro && (
          <p className="db-msg erro">
            {erro}{" "}
            <button className="db-stat-link" onClick={() => setVersao((v) => v + 1)}>Tentar de novo</button>
          </p>
        )}

        {paginaDeLista && (
          <ListaRecurso key={paginaDeLista.recurso} titulo={activeItem} {...paginaDeLista} />
        )}

        {activeItem === "Alertas" && (
          <div className="db-panel">
            <div className="db-panel-head">
              <span className="db-panel-title">Alertas</span>
            </div>
            {alerts.length === 0 && <p className="db-msg">Nenhum alerta no momento.</p>}
            {alerts.map((a, i) => {
              const c = toneColors[a.tone];
              return (
                <div key={i} className="db-alert-item" style={{ background: c.bg }}>
                  <AlertTriangle size={16} color={c.bar} className="db-alert-icon" />
                  <div>
                    <div className="db-alert-title" style={{ color: c.text }}>{a.title}</div>
                    <div className="db-alert-subtitle">{a.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!paginaDeLista && !["Dashboard", "Alertas"].includes(activeItem) && (
          <div className="db-panel">
            <div className="db-panel-head">
              <span className="db-panel-title">{activeItem}</span>
            </div>
            <p className="db-msg">Esta tela ainda está em construção.</p>
          </div>
        )}

        {activeItem === "Dashboard" && !dados && !erro && <p className="db-msg">Carregando dados...</p>}

        {activeItem === "Dashboard" && dados && (
          <>
            {/* STATS */}
            <div className="db-stats-grid">
              {stats.map((s) => (
                <div className="db-stat-card" key={s.label}>
                  <div className="db-stat-icon">
                    <s.Icon size={18} />
                  </div>
                  <div className="db-stat-value">{s.value}</div>
                  <div className="db-stat-label">{s.label}</div>
                  {s.link && (
                    <button className="db-stat-link" onClick={() => setActiveItem(s.pagina)}>
                      {s.link} →
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* ROW 2: RASTREAMENTO + ALERTAS */}
            <div className="db-row-2">
              <div className="db-panel">
                <div className="db-panel-head">
                  <span className="db-panel-title">Rastreamento em tempo real</span>
                  <button className="db-panel-link" onClick={() => setActiveItem("Rastreamento")}>ver todos</button>
                </div>

                {!entrega && <p className="db-msg">Nenhuma entrega cadastrada ainda.</p>}

                {entrega && (
                  <>
                    <div className="db-track-header">
                      Entrega <strong style={{ color: "#F4F2FB" }}>#{entrega.id}</strong> · {entrega.produto_nome}
                      <span className="db-track-pill">{nomeDoStatus(entrega.status)}</span>
                    </div>

                    <div className="db-track-row">
                      <div className="db-track-line" />
                      {historico.map((ponto, i) => {
                        const ultimo = i === historico.length - 1;
                        const concluido = !ultimo || entrega.status === "entregue";
                        return (
                          <div key={ponto.id} className={`db-track-node ${concluido ? "done" : "active"}`}>
                            <div className="db-track-circle">
                              {concluido ? <CheckCircle2 size={17} /> : <TruckIcon size={16} />}
                            </div>
                            <div className="db-track-label">{nomeDoStatus(ponto.status)}</div>
                            <div className="db-track-local">{ponto.localizacao_atual}</div>
                            <div className="db-track-data">{formatarData(ponto.data_hora)}</div>
                          </div>
                        );
                      })}
                      {entrega.status !== "entregue" && (
                        <div className={`db-track-node ${historico.length === 0 ? "active" : ""}`}>
                          <div className="db-track-circle">
                            <MapPin size={16} />
                          </div>
                          <div className="db-track-label">Destino</div>
                          <div className="db-track-local">{entrega.destino}</div>
                          <div className="db-track-data">{formatarData(entrega.data_prevista)}</div>
                        </div>
                      )}
                    </div>

                    {historico.length === 0 && (
                      <p className="db-msg" style={{ marginBottom: 16 }}>Ainda não há atualizações de rastreamento para esta entrega.</p>
                    )}

                    <div className="db-track-footer">
                      <span className="db-track-chip">Destino: {entrega.destino}</span>
                      <span className="db-track-chip">Quantidade: {entrega.quantidade}</span>
                      <span className="db-track-chip">Previsão de entrega: {formatarData(entrega.data_prevista)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="db-panel">
                <div className="db-panel-head">
                  <span className="db-panel-title">Alertas recentes</span>
                  <button className="db-panel-link" onClick={() => setActiveItem("Alertas")}>ver todos</button>
                </div>
                {alerts.length === 0 && <p className="db-msg">Nenhum alerta no momento.</p>}
                {alerts.slice(0, 4).map((a, i) => {
                  const c = toneColors[a.tone];
                  return (
                    <div key={i} className="db-alert-item" style={{ background: c.bg }}>
                      <AlertTriangle size={16} color={c.bar} className="db-alert-icon" />
                      <div>
                        <div className="db-alert-title" style={{ color: c.text }}>{a.title}</div>
                        <div className="db-alert-subtitle">{a.subtitle}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ROW 3: STATUS + ESTOQUE */}
            <div className="db-row-2">
              <div className="db-panel">
                <div className="db-panel-head">
                  <span className="db-panel-title">Entrega por status</span>
                </div>
                <div className="db-donut-wrap">
                  <div className="db-donut" style={{ background: `conic-gradient(${donutStops})` }}>
                    <div className="db-donut-hole">
                      <strong>{totalStatus}</strong>
                      <span>entregas</span>
                    </div>
                  </div>
                  <div className="db-legend">
                    {statusBreakdown.length === 0 && <p className="db-msg">Sem entregas ainda.</p>}
                    {statusBreakdown.map((s) => (
                      <div className="db-legend-row" key={s.label}>
                        <span className="db-legend-dot" style={{ background: s.color }} />
                        {s.label}
                        <span className="db-legend-value">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="db-panel accent-cyan">
                <div className="db-panel-head">
                  <span className="db-panel-title">Estoque por armazém</span>
                  <button
                    className="db-panel-link"
                    onClick={() => setActiveItem("Armazém")}
                    style={{ color: "#67E8F9", background: "rgba(34,211,238,0.1)", borderColor: "rgba(34,211,238,0.3)" }}
                  >
                    ver todos
                  </button>
                </div>
                {stockByWarehouse.length === 0 && <p className="db-msg">Nenhum armazém cadastrado ainda.</p>}
                {stockByWarehouse.map((w) => (
                  <div className="db-stock-row" key={w.label}>
                    <div className="db-stock-top">
                      <span className="db-stock-label">{w.label}</span>
                      <span className="db-stock-value">{w.value} uni</span>
                    </div>
                    <div className="db-stock-track">
                      <div className="db-stock-fill" style={{ width: `${(w.value / maxStock) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}