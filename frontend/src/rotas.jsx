import { useEffect, useState } from "react";

// Roteamento mínimo com a History API do navegador. Cada tela tem uma URL
// própria (/login, /cadastro, /app/produtos...), então a seta "voltar" do
// navegador volta para a tela anterior em vez de sair do site.

const EVENTO_NAVEGACAO = "bankai:navegacao";

function lerLocalizacao() {
  return { caminho: window.location.pathname, query: window.location.search };
}

export function navegar(destino, { substituir = false } = {}) {
  const atual = window.location.pathname + window.location.search;
  if (destino === atual) return;
  window.history[substituir ? "replaceState" : "pushState"](null, "", destino);
  window.dispatchEvent(new Event(EVENTO_NAVEGACAO));
  if (!destino.includes("#")) window.scrollTo(0, 0);
}

export function useLocalizacao() {
  const [localizacao, setLocalizacao] = useState(lerLocalizacao);

  useEffect(() => {
    const atualizar = () => setLocalizacao(lerLocalizacao());
    window.addEventListener("popstate", atualizar);
    window.addEventListener(EVENTO_NAVEGACAO, atualizar);
    return () => {
      window.removeEventListener("popstate", atualizar);
      window.removeEventListener(EVENTO_NAVEGACAO, atualizar);
    };
  }, []);

  return localizacao;
}

// Redireciona sem criar entrada nova no histórico
export function Redirecionar({ para }) {
  useEffect(() => {
    navegar(para, { substituir: true });
  }, [para]);
  return null;
}

// Link interno: navega sem recarregar, mas mantém Ctrl/⌘+clique e "abrir em nova aba"
export function Link({ para, children, onClick, ...props }) {
  function aoClicar(evento) {
    onClick?.(evento);
    if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey || props.target) {
      return;
    }
    evento.preventDefault();
    navegar(para);
  }

  return (
    <a href={para} onClick={aoClicar} {...props}>
      {children}
    </a>
  );
}
