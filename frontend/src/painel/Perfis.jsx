import { useEffect, useState } from "react";
import { Check, Minus } from "lucide-react";
import { listarPerfis } from "../api";

const RECURSOS = {
  dashboard: "Dashboard", busca: "Busca", produtos: "Produtos", armazens: "Armazéns", estoque: "Estoque",
  entregas: "Entregas", rastreamento: "Rastreamento", movimentacoes: "Movimentações",
  transportadoras: "Transportadoras", veiculos: "Veículos", usuarios: "Usuários", auditoria: "Auditoria", perfis: "Perfis",
};

const ACOES = { ler: "consultar", criar: "criar", editar: "editar", excluir: "excluir", corrigir: "corrigir histórico", estornar: "estornar" };

// Matriz de permissões (somente leitura): mostra o que cada perfil pode fazer
export default function Perfis() {
  const [perfis, setPerfis] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    listarPerfis().then((r) => setPerfis(r.perfis)).catch((e) => setErro(e.message));
  }, []);

  if (erro) return <p className="db-msg erro">{erro}</p>;
  if (!perfis) return <p className="db-msg">Carregando...</p>;

  const todas = [...new Set(perfis.flatMap((p) => p.permissoes))].sort((a, b) => {
    const [ra] = a.split(":");
    const [rb] = b.split(":");
    return Object.keys(RECURSOS).indexOf(ra) - Object.keys(RECURSOS).indexOf(rb) || a.localeCompare(b);
  });

  return (
    <div className="db-panel">
      <div className="db-panel-head">
        <span className="db-panel-title">Perfis e permissões</span>
      </div>
      <p className="db-dica" style={{ marginTop: 0 }}>
        Definidas no backend (backend/src/config/permissoes.js) e conferidas em cada requisição.
        Para mudar o perfil de alguém, use a tela Usuários.
      </p>
      <div className="db-table-wrap">
        <table className="db-table">
          <thead>
            <tr>
              <th>Permissão</th>
              {perfis.map((p) => <th key={p.perfil} style={{ textAlign: "center" }}>{p.nome}</th>)}
            </tr>
          </thead>
          <tbody>
            {todas.map((permissao) => {
              const [recurso, acao] = permissao.split(":");
              return (
                <tr key={permissao}>
                  <td>{RECURSOS[recurso] || recurso} · {ACOES[acao] || acao}</td>
                  {perfis.map((p) => (
                    <td key={p.perfil} style={{ textAlign: "center" }}>
                      {p.permissoes.includes(permissao)
                        ? <Check size={16} color="#4ADE80" aria-label="permitido" />
                        : <Minus size={16} color="#4A4568" aria-label="negado" />}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
