import { useEffect } from "react";
import { navegar } from "./navegacao";

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
