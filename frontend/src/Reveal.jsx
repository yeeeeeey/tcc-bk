import React, { useEffect, useRef, useState } from "react";
 
// ---------------------------------------------------------------------------
// Componente reutilizável: envolve qualquer conteúdo e faz ele aparecer com
// fade + leve deslize pra cima quando entra na viewport, usando
// IntersectionObserver (sem dependências externas). Uma vez visível, fica
// visível — não some de novo ao rolar pra cima, pra não distrair.
//
// Uso:
//   <Reveal><h2>Título</h2></Reveal>
//   <Reveal delay={0.15}><div className="card">...</div></Reveal>
// ---------------------------------------------------------------------------
 
export default function Reveal({ children, delay = 0, as: Tag = "div", style = {}, className = "" }) {
  const ref = useRef(null);
  // Respeita quem prefere menos movimento na tela: já começa visível
  const [visible, setVisible] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
 
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
 
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);
 
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(26px)",
        transition: `opacity .65s cubic-bezier(.22,.61,.36,1) ${delay}s, transform .65s cubic-bezier(.22,.61,.36,1) ${delay}s`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}