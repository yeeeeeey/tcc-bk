import { useEffect, useMemo, useState } from "react";
import { Download, Table2, BarChart3 } from "lucide-react";
import { buscarRelatorio } from "../api";
import { formatarData, nomeDoStatus } from "./formatacao";

// Relatório gerencial (gerente logístico e administrador).
// Gráficos de uma série só, em uma cor (sem legenda: o título diz o que é);
// cada gráfico tem tooltip no mouse e no teclado, e uma alternativa em tabela.

const PRESETS = [
  [7, "7 dias"],
  [30, "30 dias"],
  [90, "90 dias"],
];

function hojeLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function somarDias(data, dias) {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const numero = new Intl.NumberFormat("pt-BR");

// Teto "redondo" para o eixo: 1, 2, 5, 10, 20, 50...
function tetoDoEixo(maximo) {
  if (maximo <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  const passo = [1, 2, 5, 10].find((m) => m * potencia >= maximo);
  return passo * potencia;
}

function diaCurto(data) {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

// ---------------------------------------------------------------------------
// Exportação CSV (separador ";" e BOM para abrir certo no Excel em português)
// ---------------------------------------------------------------------------
function celulaCsv(valor) {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function exportarCsv(r) {
  const linhas = [];
  const bloco = (titulo, cabecalho, registros) => {
    linhas.push([titulo], cabecalho, ...registros, []);
  };
  const e = r.entregas;

  bloco(`Relatório Bankai — ${formatarData(r.periodo.de)} a ${formatarData(r.periodo.ate)}`, ["Indicador", "Valor"], [
    ["Entregas criadas", e.criadas],
    ["Entregues", e.entregues],
    ["Entregues no prazo", e.entregues_no_prazo],
    ["Taxa no prazo (%)", e.taxa_no_prazo ?? "sem dados"],
    ["Canceladas", e.canceladas],
    ["Em andamento", e.em_andamento],
    ["Atrasadas (em aberto)", e.atrasadas],
    ["Unidades enviadas", e.unidades_enviadas],
    ["Movimentações: entradas (un.)", r.movimentacoes.entradas],
    ["Movimentações: saídas (un.)", r.movimentacoes.saidas],
    ["Movimentações: transferências (un.)", r.movimentacoes.transferencias],
  ]);
  bloco("Entregas criadas por dia", ["Data", "Entregas"], r.entregas_por_dia.map((d) => [formatarData(d.dia), d.total]));
  bloco("Entregas por status", ["Status", "Entregas"], r.entregas_por_status.map((s) => [nomeDoStatus(s.status), s.total]));
  bloco("Produtos mais enviados", ["Produto", "Unidades", "Entregas"], r.produtos_mais_enviados.map((p) => [p.nome, p.unidades, p.entregas]));
  bloco("Ocupação dos armazéns (atual)", ["Armazém", "Ocupação", "Capacidade"], r.armazens.map((a) => [a.nome, a.ocupacao, a.capacidade_maxima || "sem limite"]));

  const csv = "﻿" + linhas.map((l) => l.map(celulaCsv).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-bankai-${r.periodo.de}-a-${r.periodo.ate}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Gráfico de colunas: entregas criadas por dia
// ---------------------------------------------------------------------------
function ColunasPorDia({ dias }) {
  const [ativo, setAtivo] = useState(null);
  const [verTabela, setVerTabela] = useState(false);
  const teto = tetoDoEixo(Math.max(0, ...dias.map((d) => d.total)));
  const marcas = [teto, teto / 2, 0];
  const total = dias.reduce((soma, d) => soma + d.total, 0);
  const rotulosX = dias.length > 1 ? [0, Math.floor((dias.length - 1) / 2), dias.length - 1] : [0];

  function teclado(e) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    setAtivo((atual) => {
      if (e.key === "Home") return 0;
      if (e.key === "End") return dias.length - 1;
      const base = atual ?? (e.key === "ArrowLeft" ? dias.length : -1);
      return Math.min(dias.length - 1, Math.max(0, base + (e.key === "ArrowRight" ? 1 : -1)));
    });
  }

  const selecionado = ativo !== null ? dias[ativo] : null;

  return (
    <div className="db-panel">
      <div className="db-panel-head">
        <div>
          <span className="db-panel-title">Entregas criadas por dia</span>
          <p className="db-rel-sub">{numero.format(total)} no período</p>
        </div>
        <button className="db-btn secundario" onClick={() => setVerTabela((v) => !v)} aria-pressed={verTabela}>
          {verTabela ? <BarChart3 size={15} /> : <Table2 size={15} />} {verTabela ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>

      {verTabela ? (
        <div className="db-table-wrap db-rel-tabela">
          <table className="db-table">
            <thead><tr><th>Data</th><th className="num">Entregas</th></tr></thead>
            <tbody>
              {dias.map((d) => (
                <tr key={d.dia}><td>{formatarData(d.dia)}</td><td className="num">{d.total}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="db-rel-grafico">
          <div className="db-rel-eixo-y" aria-hidden="true">
            {marcas.map((m) => <span key={m}>{numero.format(m)}</span>)}
          </div>
          <div className="db-rel-area">
            {marcas.map((m) => (
              <div key={m} className="db-rel-grade" style={{ bottom: `${(m / teto) * 100}%` }} />
            ))}
            <div
              className="db-rel-colunas"
              role="img"
              tabIndex={0}
              aria-label={`Entregas criadas por dia: ${numero.format(total)} no período. Use as setas para ler cada dia.`}
              onKeyDown={teclado}
              onBlur={() => setAtivo(null)}
              onMouseLeave={() => setAtivo(null)}
            >
              {dias.map((d, i) => (
                <div
                  key={d.dia}
                  className={`db-rel-coluna${ativo === i ? " ativa" : ""}`}
                  onMouseEnter={() => setAtivo(i)}
                >
                  <span className="db-rel-barra" style={{ height: d.total ? `${(d.total / teto) * 100}%` : 0 }} />
                </div>
              ))}
            </div>
            {selecionado && (
              <div
                className="db-rel-tooltip"
                role="status"
                style={{ left: `${((ativo + 0.5) / dias.length) * 100}%` }}
              >
                <strong>{selecionado.total}</strong> {selecionado.total === 1 ? "entrega" : "entregas"}
                <span>{formatarData(selecionado.dia)}</span>
              </div>
            )}
          </div>
          <div className="db-rel-eixo-x" aria-hidden="true">
            {rotulosX.map((i) => (
              <span key={i} style={{ left: `${((i + 0.5) / dias.length) * 100}%` }}>{diaCurto(dias[i].dia)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barras horizontais ranqueadas (um tom só; o valor fica na ponta da barra)
// ---------------------------------------------------------------------------
function BarrasRanqueadas({ titulo, itens, unidade, vazio }) {
  const maximo = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <div className="db-panel">
      <div className="db-panel-head">
        <span className="db-panel-title">{titulo}</span>
      </div>
      {itens.length === 0 && <p className="db-msg">{vazio}</p>}
      <ul className="db-rel-ranking">
        {itens.map((item) => (
          <li key={item.rotulo}>
            <span className="db-rel-rotulo">{item.rotulo}</span>
            <span className="db-rel-trilho">
              <span className="db-rel-barra-h" style={{ width: `${(item.valor / maximo) * 100}%` }} />
              <span className="db-rel-valor">{numero.format(item.valor)} {unidade}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lista de medidores: ocupação de cada armazém
// ---------------------------------------------------------------------------
function OcupacaoArmazens({ armazens }) {
  return (
    <div className="db-panel">
      <div className="db-panel-head">
        <span className="db-panel-title">Ocupação dos armazéns</span>
        <span className="db-track-pill">agora</span>
      </div>
      {armazens.length === 0 && <p className="db-msg">Nenhum armazém cadastrado.</p>}
      <ul className="db-rel-medidores">
        {armazens.map((a) => {
          const pct = a.capacidade_maxima > 0 ? Math.round((a.ocupacao / a.capacidade_maxima) * 100) : null;
          const nivel = pct === null ? "" : pct >= 95 ? "critico" : pct >= 80 ? "alerta" : "";
          return (
            <li key={a.id}>
              <div className="db-rel-medidor-topo">
                <span className="db-rel-rotulo">{a.nome}</span>
                <span className="db-rel-figura">
                  {numero.format(a.ocupacao)}
                  {pct !== null ? ` / ${numero.format(a.capacidade_maxima)} un. · ${pct}%` : " un. · sem limite"}
                  {nivel === "critico" && " · cheio"}
                  {nivel === "alerta" && " · quase cheio"}
                </span>
              </div>
              {pct !== null && (
                <span className="db-rel-medidor" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(pct, 100)} aria-label={`Ocupação de ${a.nome}`}>
                  <span className={`db-rel-medidor-fill ${nivel}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Relatorios() {
  const hoje = hojeLocal();
  const [preset, setPreset] = useState(30);
  const [periodo, setPeriodo] = useState({ de: somarDias(hoje, -29), ate: hoje });
  const [relatorio, setRelatorio] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const erroLocal = useMemo(() => {
    if (!periodo.de || !periodo.ate) return "Informe as duas datas.";
    if (periodo.de > periodo.ate) return "A data inicial não pode ser depois da final.";
    return "";
  }, [periodo]);

  useEffect(() => {
    if (erroLocal) return undefined;
    let ativo = true;
    buscarRelatorio(periodo)
      .then((dados) => {
        if (!ativo) return;
        setRelatorio(dados);
        setErro("");
      })
      .catch((e) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [periodo, erroLocal]);

  // Ao trocar o período, o relatório anterior fica visível (esmaecido) até o novo chegar
  function escolherPreset(dias) {
    setCarregando(true);
    setPreset(dias);
    setPeriodo({ de: somarDias(hoje, -(dias - 1)), ate: hoje });
  }

  function alterarData(campo, valor) {
    setCarregando(true);
    setPreset(null);
    setPeriodo((p) => ({ ...p, [campo]: valor }));
  }

  const e = relatorio?.entregas;
  const m = relatorio?.movimentacoes;
  const tiles = e
    ? [
        ["Entregas criadas", numero.format(e.criadas)],
        ["Entregues", numero.format(e.entregues)],
        ["No prazo", e.taxa_no_prazo === null ? "—" : `${String(e.taxa_no_prazo).replace(".", ",")}%`, e.taxa_no_prazo === null ? "sem entregas com previsão" : `${e.entregues_no_prazo} de ${e.entregues_com_previsao} com previsão`],
        ["Atrasadas em aberto", numero.format(e.atrasadas)],
        ["Canceladas", numero.format(e.canceladas)],
        ["Unidades enviadas", numero.format(e.unidades_enviadas)],
      ]
    : [];

  return (
    <>
      {/* Filtros: uma linha acima de tudo o que eles afetam */}
      <div className="db-toolbar">
        <div className="db-rel-filtros">
          <div className="db-segmentos" role="group" aria-label="Período">
            {PRESETS.map(([dias, rotulo]) => (
              <button key={dias} className={preset === dias ? "ativo" : ""} onClick={() => escolherPreset(dias)}>{rotulo}</button>
            ))}
          </div>
          <label className="db-rel-data">De
            <input type="date" className="db-input db-input-compacto" value={periodo.de} max={periodo.ate || undefined} onChange={(ev) => alterarData("de", ev.target.value)} />
          </label>
          <label className="db-rel-data">Até
            <input type="date" className="db-input db-input-compacto" value={periodo.ate} min={periodo.de || undefined} onChange={(ev) => alterarData("ate", ev.target.value)} />
          </label>
        </div>
        <button className="db-btn secundario" disabled={!relatorio || carregando} onClick={() => exportarCsv(relatorio)}>
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      {(erroLocal || erro) && <p className="db-msg erro">{erroLocal || erro}</p>}
      {!relatorio && !erro && !erroLocal && <p className="db-msg">Carregando relatório...</p>}

      {relatorio && (
        <div className={`db-rel-conteudo${carregando ? " atualizando" : ""}`} aria-busy={carregando}>
          <div className="db-stats-grid db-rel-kpis">
            {tiles.map(([rotulo, valor, detalhe]) => (
              <div className="db-stat-card" key={rotulo}>
                <div className="db-stat-value">{valor}</div>
                <div className="db-stat-label">{rotulo}</div>
                {detalhe && <div className="db-rel-detalhe">{detalhe}</div>}
              </div>
            ))}
          </div>

          <ColunasPorDia dias={relatorio.entregas_por_dia} />

          <div className="db-row-2">
            <BarrasRanqueadas
              titulo="Entregas por status"
              itens={relatorio.entregas_por_status.map((s) => ({ rotulo: nomeDoStatus(s.status), valor: s.total }))}
              unidade=""
              vazio="Nenhuma entrega criada no período."
            />
            <BarrasRanqueadas
              titulo="Produtos mais enviados"
              itens={relatorio.produtos_mais_enviados.map((p) => ({ rotulo: p.nome, valor: p.unidades }))}
              unidade="un."
              vazio="Nenhum produto enviado no período."
            />
          </div>

          <div className="db-row-2">
            <div className="db-panel">
              <div className="db-panel-head">
                <span className="db-panel-title">Movimentações de estoque</span>
                <span className="db-track-pill">{m.registros} registro(s)</span>
              </div>
              <div className="db-rel-mov">
                <div><strong>{numero.format(m.entradas)}</strong><span>un. de entrada</span></div>
                <div><strong>{numero.format(m.saidas)}</strong><span>un. de saída</span></div>
                <div><strong>{numero.format(m.transferencias)}</strong><span>un. transferidas</span></div>
              </div>
              <p className="db-dica">Estornos não entram na conta. Entregas reservam estoque à parte das movimentações.</p>
            </div>
            <OcupacaoArmazens armazens={relatorio.armazens} />
          </div>
        </div>
      )}
    </>
  );
}
