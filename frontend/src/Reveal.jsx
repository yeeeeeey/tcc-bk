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
  const [visible, setVisible] = useState(false);
 
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
 
    // Respeita quem prefere menos movimento na tela
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }
 
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
  }, []);
 
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