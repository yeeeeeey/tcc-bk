import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search as SearchIcon } from "lucide-react";
import { listar } from "../api";
import { formatarCelula } from "./formatacao";

const TAMANHO_MAXIMO_BUSCA = 100;

// Tabela paginada de um recurso da API, com filtro de texto (?busca=) validado
export default function ListaRecurso({ titulo, recurso, colunas, limite = 20, buscaInicial = "", filtrosExtras, renderAcoes, versao = 0 }) {
  const [pagina, setPagina] = useState(1);
  const [texto, setTexto] = useState(buscaInicial);
  const [busca, setBusca] = useState(buscaInicial.trim());
  const [resposta, setResposta] = useState(null);
  const [erro, setErro] = useState("");

  // Espera o usuário parar de digitar antes de consultar
  useEffect(() => {
    const id = setTimeout(() => {
      setBusca(texto.trim().slice(0, TAMANHO_MAXIMO_BUSCA));
      setPagina(1);
    }, 350);
    return () => clearTimeout(id);
  }, [texto]);

  const chaveFiltros = JSON.stringify(filtrosExtras || {});

  useEffect(() => {
    let ativo = true;
    listar(recurso, { pagina, limite, busca, ...JSON.parse(chaveFiltros) })
      .then((dados) => {
        if (!ativo) return;
        setErro("");
        setResposta(dados);
      })
      .catch((e) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [recurso, pagina, limite, busca, chaveFiltros, versao]);

  const linhas = resposta?.dados;
  const totalPaginas = resposta ? Math.max(1, Math.ceil(resposta.total / resposta.limite)) : 1;

  return (
    <div className="db-panel">
      <div className="db-panel-head db-panel-head-wrap">
        <span className="db-panel-title">{titulo}</span>
        <div className="db-lista-ferramentas">
          <label className="db-filtro">
            <SearchIcon size={14} />
            <input
              type="search"
              placeholder="Filtrar..."
              value={texto}
              maxLength={TAMANHO_MAXIMO_BUSCA}
              aria-label={`Filtrar ${titulo}`}
              onChange={(e) => setTexto(e.target.value)}
            />
          </label>
          {resposta && <span className="db-track-pill">{resposta.total} registro(s)</span>}
        </div>
      </div>

      {erro && <p className="db-msg erro">{erro}</p>}
      {!erro && !linhas && <p className="db-msg">Carregando...</p>}
      {linhas && linhas.length === 0 && (
        <p className="db-msg">{busca ? `Nada encontrado para "${busca}".` : "Nenhum registro cadastrado ainda."}</p>
      )}

      {linhas && linhas.length > 0 && (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead>
              <tr>
                {colunas.map(([chave, rotulo]) => (
                  <th key={chave}>{rotulo}</th>
                ))}
                {renderAcoes && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.id}>
                  {colunas.map(([chave]) => (
                    <td key={chave}>{formatarCelula(chave, linha[chave])}</td>
                  ))}
                  {renderAcoes && <td>{renderAcoes(linha)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resposta && resposta.total > resposta.limite && (
        <div className="db-paginacao">
          <button className="db-btn secundario" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            <ChevronLeft size={15} /> Anterior
          </button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button className="db-btn secundario" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
            Próxima <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
