import React, { useEffect, useState } from "react";
import {
  LayoutDashboard, Package, Warehouse, Truck as TruckIcon, Search as SearchIcon,
  ClipboardList, AlertTriangle, Users, Shield, Bell, Boxes, ArrowLeftRight, ScrollText,
  CircleUser, CheckCircle2, Clock, Car, MapPin, LogOut, RefreshCw, Menu, X,
} from "lucide-react";
import { buscarDashboard } from "./api";
import { navegar } from "./navegacao";
import ListaRecurso from "./painel/ListaRecurso";
import ResultadosBusca from "./painel/ResultadosBusca";
import GestaoUsuarios from "./painel/GestaoUsuarios";
import MeuPerfil from "./painel/MeuPerfil";
import Perfis from "./painel/Perfis";
import Relatorios from "./painel/Relatorios";
import { NOMES_PERFIL, formatarData, nomeDoStatus } from "./painel/formatacao";
 
// ---------------------------------------------------------------------------
// Tela de Dashboard, primeira tela após o login. Mesma paleta do restante do
// site: fundo #0A0716, acento violeta (#8B5CF6/#7C3AED) com toques de ciano
// (#22D3EE), Space Grotesk nos títulos, Inter no corpo.
// ---------------------------------------------------------------------------
 
// Cada item tem uma URL própria (/app/<slug>) e a permissão necessária para vê-lo.
// Esconder o item é só conveniência: o backend recusa (403) quem não tem permissão.
const navGroups = [
  {
    titulo: null,
    items: [{ slug: "dashboard", label: "Dashboard", Icon: LayoutDashboard, permissao: "dashboard:ler" }],
  },
  {
    titulo: "Operações",
    items: [
      { slug: "produtos", label: "Produtos", Icon: Package, permissao: "produtos:ler" },
      { slug: "armazens", label: "Armazém", Icon: Warehouse, permissao: "armazens:ler" },
      { slug: "estoque", label: "Estoque", Icon: Boxes, permissao: "estoque:ler" },
      { slug: "entregas", label: "Logística", Icon: TruckIcon, permissao: "entregas:ler" },
      { slug: "rastreamento", label: "Rastreamento", Icon: SearchIcon, permissao: "rastreamento:ler" },
      { slug: "movimentacoes", label: "Movimentações", Icon: ArrowLeftRight, permissao: "movimentacoes:ler" },
    ],
  },
  {
    titulo: "Gestão",
    items: [
      { slug: "relatorios", label: "Relatórios", Icon: ClipboardList, permissao: "relatorios:ler" },
      { slug: "alertas", label: "Alertas", Icon: AlertTriangle, permissao: "dashboard:ler" },
      { slug: "transportadoras", label: "Transportadora", Icon: TruckIcon, permissao: "transportadoras:ler" },
      { slug: "veiculos", label: "Veículos", Icon: Car, permissao: "veiculos:ler" },
    ],
  },
  {
    titulo: "Administração",
    items: [
      { slug: "usuarios", label: "Usuários", Icon: Users, permissao: "usuarios:ler" },
      { slug: "perfis", label: "Perfis", Icon: Shield, permissao: "perfis:ler" },
      { slug: "auditoria", label: "Auditoria", Icon: ScrollText, permissao: "auditoria:ler" },
    ],
  },
  {
    titulo: "Conta",
    items: [{ slug: "perfil", label: "Meu perfil", Icon: CircleUser, permissao: null }],
  },
];

const TODOS_OS_ITENS = navGroups.flatMap((grupo) => grupo.items);

// Telas do menu que listam dados direto da API: [coluna da API, título da coluna]
const PAGINAS_DE_LISTA = {
  produtos: {
    recurso: "produtos",
    colunas: [["id", "#"], ["nome", "Nome"], ["codigo", "Código"], ["categoria", "Categoria"], ["preco", "Preço"], ["quantidade", "Qtd. total"]],
  },
  armazens: {
    recurso: "armazens",
    colunas: [["id", "#"], ["nome", "Nome"], ["localizacao", "Localização"], ["ocupacao", "Ocupação"], ["capacidade_maxima", "Capacidade"], ["status", "Status"]],
  },
  estoque: {
    recurso: "estoque",
    colunas: [["armazem_nome", "Armazém"], ["produto_nome", "Produto"], ["produto_codigo", "Código"], ["quantidade_disponivel", "Disponível"]],
  },
  entregas: {
    recurso: "entregas",
    colunas: [["id", "#"], ["produto_nome", "Produto"], ["quantidade", "Qtd."], ["armazem_nome", "Saída de"], ["destino", "Destino"], ["data_prevista", "Previsão"], ["status", "Status"]],
  },
  rastreamento: {
    recurso: "rastreamento",
    colunas: [["id", "#"], ["entrega_id", "Entrega"], ["localizacao_atual", "Localização"], ["data_hora", "Data/hora"], ["status", "Status"]],
  },
  movimentacoes: {
    recurso: "movimentacoes",
    colunas: [["id", "#"], ["produto_nome", "Produto"], ["quantidade", "Qtd."], ["origem", "Origem"], ["destino", "Destino"], ["data_movimentacao", "Data"], ["estornado_em", "Estornada em"]],
  },
  transportadoras: {
    recurso: "transportadoras",
    colunas: [["id", "#"], ["nome", "Nome"], ["cnpj", "CNPJ"], ["contato", "Contato"]],
  },
  veiculos: {
    recurso: "veiculos",
    colunas: [["id", "#"], ["placa", "Placa"], ["modelo", "Modelo"], ["capacidade_carga", "Capacidade"], ["status", "Status"], ["transportadora_nome", "Transportadora"]],
  },
  auditoria: {
    recurso: "auditoria",
    colunas: [["criado_em", "Data/hora"], ["usuario_login", "Usuário"], ["perfil", "Perfil"], ["acao", "Ação"], ["recurso", "Recurso"], ["recurso_id", "ID"], ["resultado", "Resultado"], ["ip", "IP"]],
  },
};

function caminhoDa(slug) {
  return slug === "dashboard" ? "/app" : `/app/${slug}`;
}

const CORES_STATUS = {
  entregue: "#4ADE80",
  "em transito": "#8B95C9",
  processando: "#A78BFA",
  pendente: "#FACC15",
  atrasado: "#F87171",
  cancelado: "#94A3B8",
};
const CORES_EXTRAS = ["#22D3EE", "#FB923C", "#C084FC"];

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
 
export default function DashboardScreen({ usuario, pagina = "dashboard", query = "", onSair, onUsuarioAtualizado }) {
  const activeItem = pagina;
  const setActiveItem = (slug) => navegar(caminhoDa(slug));
  const parametros = new URLSearchParams(query);
  const permissoes = new Set(usuario?.permissoes || []);
  const pode = (permissao) => !permissao || permissoes.has(permissao);
  const itensPorPagina = usuario?.preferencias?.itens_por_pagina || 20;

  const [termoBusca, setTermoBusca] = useState(pagina === "busca" ? parametros.get("q") || "" : "");
  const [erroBusca, setErroBusca] = useState("");
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [versao, setVersao] = useState(0);
  const [menuAberto, setMenuAberto] = useState(false);

  // Gaveta do menu (celular): fecha com Esc
  useEffect(() => {
    if (!menuAberto) return undefined;
    const aoTeclar = (e) => e.key === "Escape" && setMenuAberto(false);
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [menuAberto]);

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

  function buscar(evento) {
    evento.preventDefault();
    const termo = termoBusca.trim();
    if (termo.length < 2) {
      setErroBusca("Digite pelo menos 2 caracteres.");
      return;
    }
    setErroBusca("");
    navegar(`/app/busca?q=${encodeURIComponent(termo)}`);
  }

  const nomeUsuario = usuario?.nome || usuario?.login || "usuário";
  const primeiroNome = nomeUsuario.split(" ")[0];
  const inicial = nomeUsuario.charAt(0).toUpperCase();

  const totais = dados?.totais;
  const stats = totais
    ? [
        { label: "Produtos cadastrados", value: totais.produtos, link: "Ver produtos", pagina: "produtos", Icon: Package },
        { label: "Armazéns ativos", value: totais.armazens_ativos, link: "Ver detalhes", pagina: "armazens", Icon: Warehouse },
        { label: "Em trânsito", value: totais.em_transito, Icon: TruckIcon },
        { label: "Entregas", value: totais.entregas, link: "Ver entregas", pagina: "entregas", Icon: CheckCircle2 },
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
  const itemAtual = TODOS_OS_ITENS.find((item) => item.slug === activeItem);
  const semPermissao = itemAtual && !pode(itemAtual.permissao);
  const paginaDeLista = !semPermissao && PAGINAS_DE_LISTA[activeItem];
  const buscaDaUrl = parametros.get("busca") || "";

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

        a.db-nav-item { text-decoration: none; }
        button.db-icon-btn { background: none; border: none; padding: 0; display: inline-flex; }
        button.db-avatar { border: none; color: #fff; cursor: pointer; font-family: inherit; }
        .db-search { position: relative; }
        .db-search-erro { position: absolute; left: 12px; bottom: -18px; font-size: 11px; color: #FCA5A5; }
        .db-main > .db-panel, .db-main > form.db-panel, .db-main > .db-row-2 { margin-bottom: 16px; }
        .db-panel-head-wrap { flex-wrap: wrap; gap: 12px; }
        .db-lista-ferramentas { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .db-filtro {
          display: flex; align-items: center; gap: 8px; color: #6E6890;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 9px; padding: 6px 10px;
        }
        .db-filtro input { background: transparent; border: none; outline: none; color: #F4F2FB; font-size: 13px; width: 170px; font-family: inherit; }
        .db-paginacao { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 14px; font-size: 12.5px; color: #8981A8; }
        .db-btn {
          display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9px; border: none;
          background: linear-gradient(135deg,#8B5CF6,#7C3AED); color: #fff; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit;
        }
        .db-btn:disabled { opacity: .5; cursor: not-allowed; }
        .db-btn.secundario { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); color: #C9C3E0; font-weight: 500; }
        .db-btn.secundario:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
        .db-btn.perigo { color: #FCA5A5; border-color: rgba(248,113,113,0.35); }
        .db-input {
          display: block; width: 100%; margin-top: 6px; padding: 9px 11px; border-radius: 9px; outline: none;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); color: #F4F2FB;
          font-size: 13.5px; font-family: inherit;
        }
        .db-input:focus { border-color: #8B5CF6; }
        .db-input:disabled { opacity: .6; }
        .db-input option { background: #100B20; }
        .db-input-compacto { display: inline-block; width: auto; margin-top: 0; padding: 6px 8px; font-size: 12.5px; }
        .db-form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
        .db-form-grid.uma-coluna { grid-template-columns: 1fr; }
        .db-form-grid label { font-size: 12px; color: #8981A8; font-weight: 600; }
        .db-dica { font-size: 12px; color: #6E6890; margin: 12px 0; }
        .db-msg.sucesso {
          color: #86EFAC; background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3);
          border-radius: 10px; padding: 10px 14px; margin-bottom: 16px;
        }
        .db-acoes { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .db-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .db-segmentos { display: inline-flex; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; padding: 3px; }
        .db-segmentos button { background: none; border: none; color: #9891B5; font-size: 12.5px; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-family: inherit; }
        .db-segmentos button.ativo { background: rgba(139,92,246,0.25); color: #F4F2FB; }
        .db-busca-item {
          display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; margin-bottom: 8px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px;
          padding: 10px 12px; color: #E9E6F5; cursor: pointer; font-family: inherit; font-size: 13px;
        }
        .db-busca-item:hover { border-color: rgba(139,92,246,0.4); }
        .db-busca-item span { font-size: 11.5px; color: #8981A8; }

        .db-menu-btn, .db-menu-fechar {
          display: none; background: none; border: 1px solid rgba(255,255,255,0.12); color: #C9C3E0;
          border-radius: 10px; padding: 7px; cursor: pointer; align-items: center; justify-content: center;
        }
        .db-menu-fechar { margin-left: auto; border: none; }
        .db-menu-fundo { position: fixed; inset: 0; background: rgba(5,3,15,0.6); z-index: 39; }

        /* Relatórios */
        .db-rel-filtros { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .db-rel-data { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #8981A8; font-weight: 600; }
        .db-rel-data input { color-scheme: dark; }
        .db-rel-conteudo { transition: opacity .2s ease; }
        .db-rel-conteudo > .db-panel { margin-bottom: 16px; }
        .db-rel-conteudo.atualizando { opacity: .55; }
        .db-rel-kpis { grid-template-columns: repeat(6, 1fr); }
        .db-rel-detalhe { font-size: 11px; color: #6E6890; margin-top: 6px; }
        .db-rel-sub { margin: 2px 0 0; font-size: 12px; color: #8981A8; }
        .db-rel-grafico { display: grid; grid-template-columns: auto 1fr; grid-template-rows: 180px 22px; column-gap: 10px; }
        .db-rel-eixo-y {
          grid-row: 1; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end;
          font-size: 11px; color: #6E6890; font-variant-numeric: tabular-nums; margin: -6px 0;
        }
        .db-rel-area { grid-row: 1; grid-column: 2; position: relative; }
        .db-rel-grade { position: absolute; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.07); }
        .db-rel-colunas { position: absolute; inset: 0; display: flex; align-items: flex-end; outline: none; border-radius: 6px; }
        .db-rel-colunas:focus-visible { box-shadow: 0 0 0 2px rgba(139,92,246,0.6); }
        .db-rel-coluna { flex: 1; height: 100%; display: flex; align-items: flex-end; justify-content: center; padding: 0 1px; }
        .db-rel-barra { display: block; width: 100%; max-width: 24px; background: #8B5CF6; border-radius: 4px 4px 0 0; transition: background .15s ease; }
        .db-rel-coluna.ativa .db-rel-barra { background: #A78BFA; }
        .db-rel-coluna.ativa { background: rgba(255,255,255,0.03); }
        .db-rel-tooltip {
          position: absolute; top: -8px; transform: translate(-50%, -100%); pointer-events: none; white-space: nowrap;
          background: #1A1530; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 6px 10px;
          font-size: 12px; color: #C9C3E0; box-shadow: 0 8px 24px rgba(0,0,0,0.4); z-index: 2;
        }
        .db-rel-tooltip strong { color: #F4F2FB; font-size: 13px; }
        .db-rel-tooltip span { display: block; color: #8981A8; font-size: 11px; }
        .db-rel-eixo-x { grid-row: 2; grid-column: 2; position: relative; font-size: 11px; color: #6E6890; }
        .db-rel-eixo-x span { position: absolute; top: 6px; transform: translateX(-50%); white-space: nowrap; }
        .db-rel-eixo-x span:first-child { transform: none; left: 0 !important; }
        .db-rel-eixo-x span:last-child:not(:first-child) { transform: none; left: auto !important; right: 0; }
        .db-rel-tabela { max-height: 320px; overflow-y: auto; }
        .db-table .num { text-align: right; font-variant-numeric: tabular-nums; }
        .db-rel-ranking, .db-rel-medidores { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
        .db-rel-ranking li { display: grid; grid-template-columns: minmax(90px, 32%) 1fr; align-items: center; gap: 12px; }
        .db-rel-rotulo { font-size: 13px; color: #C9C3E0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .db-rel-trilho { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .db-rel-barra-h { display: block; height: 12px; min-width: 2px; background: #8B5CF6; border-radius: 0 4px 4px 0; flex-shrink: 1; }
        .db-rel-valor { font-size: 12px; color: #8981A8; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .db-rel-medidor-topo { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
        .db-rel-figura { font-size: 12px; color: #8981A8; white-space: nowrap; }
        .db-rel-medidor { display: block; height: 8px; border-radius: 999px; background: rgba(139,92,246,0.18); overflow: hidden; }
        .db-rel-medidor-fill { display: block; height: 100%; border-radius: 999px; background: #8B5CF6; }
        .db-rel-medidor-fill.alerta { background: #FACC15; }
        .db-rel-medidor-fill.critico { background: #F87171; }
        .db-rel-mov { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .db-rel-mov div { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 14px; }
        .db-rel-mov strong { display: block; font-size: 22px; font-family: 'Space Grotesk', sans-serif; }
        .db-rel-mov span { font-size: 12px; color: #8981A8; }

        @media (max-width: 1100px) {
          .db-stats-grid { grid-template-columns: repeat(3, 1fr); }
          .db-row-2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
          .db-sidebar {
            position: fixed; left: 0; top: 0; z-index: 40; width: 270px; max-width: 85vw;
            transform: translateX(-100%); box-shadow: 12px 0 40px rgba(0,0,0,0.5);
            /* Fechada, fica fora da tela E fora do alcance do Tab/leitor de tela */
            visibility: hidden; transition: transform .22s ease, visibility 0s linear .22s;
          }
          .db-sidebar.aberto { transform: none; visibility: visible; transition: transform .22s ease; }
          .db-menu-btn, .db-menu-fechar { display: inline-flex; }
          .db-main { padding: 18px 16px 48px; }
          .db-stats-grid { grid-template-columns: repeat(2, 1fr); }
          .db-search { order: 3; max-width: none; flex-basis: 100%; }
          .db-rel-mov { grid-template-columns: 1fr; }
          .db-rel-ranking li { grid-template-columns: 1fr; gap: 4px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .db-sidebar, .db-rel-conteudo { transition: none; }
        }
      `}</style>
 
      {/* SIDEBAR (no celular vira uma gaveta aberta pelo botão de menu) */}
      {menuAberto && <div className="db-menu-fundo" onClick={() => setMenuAberto(false)} aria-hidden="true" />}
      <aside id="db-menu-lateral" className={`db-sidebar${menuAberto ? " aberto" : ""}`}>
        <div className="db-display db-marca" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, fontWeight: 700, padding: "6px 10px 18px" }}>
          <span
            style={{
              width: 26, height: 26, borderRadius: 8,
              background: "linear-gradient(135deg,#8B5CF6,#C084FC)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13,
            }}
          >
            💀
          </span>
          Bankai
          <button type="button" className="db-menu-fechar" aria-label="Fechar menu" onClick={() => setMenuAberto(false)}>
            <X size={18} />
          </button>
        </div>
 
        <nav aria-label="Menu do painel">
          {navGroups.map((group, gi) => {
            const itens = group.items.filter((item) => pode(item.permissao));
            if (itens.length === 0) return null;
            return (
              <div key={gi}>
                {group.titulo && <p className="db-nav-group-title">{group.titulo}</p>}
                {itens.map(({ slug, label, Icon }) => (
                  <a
                    key={slug}
                    href={caminhoDa(slug)}
                    className={`db-nav-item ${activeItem === slug ? "active" : ""}`}
                    aria-current={activeItem === slug ? "page" : undefined}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
                      e.preventDefault();
                      setMenuAberto(false);
                      setActiveItem(slug);
                    }}
                  >
                    <Icon size={17} />
                    {label}
                  </a>
                ))}
              </div>
            );
          })}
        </nav>
 
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
            <button
              type="button"
              className="db-menu-btn"
              aria-label="Abrir menu"
              aria-expanded={menuAberto}
              aria-controls="db-menu-lateral"
              onClick={() => setMenuAberto(true)}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="db-display">Olá, {primeiroNome}! 👋</h1>
              <p>Acompanhe toda a sua operação em tempo real.</p>
            </div>
          </div>
 
          <form className="db-search" role="search" onSubmit={buscar}>
            <SearchIcon size={15} />
            <input
              type="search"
              placeholder="Buscar produtos, entregas, armazéns..."
              aria-label="Buscar no sistema"
              maxLength={100}
              value={termoBusca}
              onChange={(e) => {
                setTermoBusca(e.target.value);
                if (erroBusca) setErroBusca("");
              }}
            />
            {erroBusca && <span className="db-search-erro" role="alert">{erroBusca}</span>}
          </form>
 
          <div className="db-topbar-icons">
            <button type="button" className="db-icon-btn" title="Atualizar dados" aria-label="Atualizar dados" onClick={() => setVersao((v) => v + 1)}>
              <RefreshCw size={18} />
            </button>
            <button type="button" className="db-icon-btn" title="Alertas" aria-label="Alertas" onClick={() => setActiveItem("alertas")}>
              <Bell size={19} />
              {alerts.length > 0 && <span className="db-badge">{alerts.length}</span>}
            </button>
            <button
              type="button"
              className="db-avatar"
              style={{ width: 32, height: 32, fontSize: 12 }}
              title="Meu perfil"
              aria-label="Meu perfil"
              onClick={() => setActiveItem("perfil")}
            >
              {inicial}
            </button>
          </div>
        </div>
 
        {erro && (
          <p className="db-msg erro">
            {erro}{" "}
            <button className="db-stat-link" onClick={() => setVersao((v) => v + 1)}>Tentar de novo</button>
          </p>
        )}

        {semPermissao && (
          <div className="db-panel">
            <p className="db-msg">Seu perfil não tem acesso a esta tela.</p>
          </div>
        )}

        {!itemAtual && activeItem !== "busca" && (
          <div className="db-panel">
            <p className="db-msg">Página não encontrada.</p>
          </div>
        )}

        {paginaDeLista && (
          <ListaRecurso
            key={`${paginaDeLista.recurso}:${buscaDaUrl}`}
            titulo={itemAtual.label}
            limite={itensPorPagina}
            buscaInicial={buscaDaUrl}
            {...paginaDeLista}
          />
        )}

        {activeItem === "busca" && <ResultadosBusca key={parametros.get("q") || ""} termo={parametros.get("q") || ""} />}

        {activeItem === "usuarios" && !semPermissao && (
          <GestaoUsuarios usuarioLogado={usuario} limite={itensPorPagina} buscaInicial={buscaDaUrl} />
        )}

        {activeItem === "perfis" && !semPermissao && <Perfis />}

        {activeItem === "perfil" && <MeuPerfil usuario={usuario} onAtualizado={onUsuarioAtualizado} />}

        {activeItem === "relatorios" && !semPermissao && <Relatorios />}

        {activeItem === "alertas" && (
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

        {activeItem === "dashboard" && !dados && !erro && <p className="db-msg">Carregando dados...</p>}

        {activeItem === "dashboard" && dados && (
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
                  <button className="db-panel-link" onClick={() => setActiveItem("rastreamento")}>ver todos</button>
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
                  <button className="db-panel-link" onClick={() => setActiveItem("alertas")}>ver todos</button>
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
                    onClick={() => setActiveItem("armazens")}
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