import { useEffect, useState } from "react";
import { buscarGlobal } from "../api";
import { navegar } from "../rotas";

const GRUPOS = [
  ["produtos", "Produtos", "produtos"],
  ["armazens", "Armazéns", "armazens"],
  ["entregas", "Entregas", "entregas"],
  ["transportadoras", "Transportadoras", "transportadoras"],
  ["veiculos", "Veículos", "veiculos"],
  ["usuarios", "Usuários", "usuarios"],
];

// Resultado do campo de busca do topo (GET /busca?q=). O painel usa key={termo},
// então cada busca nova começa com o estado limpo.
export default function ResultadosBusca({ termo }) {
  const [resposta, setResposta] = useState(null);
  const [erro, setErro] = useState("");
  const termoValido = termo.trim().length >= 2;

  useEffect(() => {
    if (!termoValido) return undefined;
    let ativo = true;
    buscarGlobal(termo.trim())
      .then((dados) => ativo && setResposta(dados))
      .catch((e) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [termo, termoValido]);

  return (
    <div className="db-panel">
      <div className="db-panel-head">
        <span className="db-panel-title">Resultados para “{termo}”</span>
        {resposta && <span className="db-track-pill">{resposta.total} encontrado(s)</span>}
      </div>

      {!termoValido && <p className="db-msg">Digite pelo menos 2 caracteres para buscar.</p>}
      {erro && <p className="db-msg erro">{erro}</p>}
      {termoValido && !erro && !resposta && <p className="db-msg">Buscando...</p>}
      {resposta && resposta.total === 0 && <p className="db-msg">Nenhum registro encontrado.</p>}

      {resposta &&
        GRUPOS.filter(([chave]) => resposta.resultados[chave]?.length > 0).map(([chave, rotulo, pagina]) => (
          <div key={chave} className="db-busca-grupo">
            <p className="db-nav-group-title" style={{ margin: "14px 0 8px" }}>{rotulo}</p>
            {resposta.resultados[chave].map((item) => (
              <button
                key={item.id}
                className="db-busca-item"
                onClick={() => navegar(`/app/${pagina}?busca=${encodeURIComponent(chave === "entregas" ? String(item.id) : item.titulo)}`)}
              >
                <strong>{item.titulo}</strong>
                {item.detalhe && <span>{item.detalhe}</span>}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}
