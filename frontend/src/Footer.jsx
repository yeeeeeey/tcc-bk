import React from "react";
import Reveal from "./Reveal";
 
// Ícones feitos à mão em SVG — evita depender de nomes de exportação
// específicos do lucide-react, que mudam entre versões do pacote.
function InstagramIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LinkedinIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2 3.77-2 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V21H9z"/>
    </svg>
  );
}
function GithubIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.6.23 2.78.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.7 5.4-5.27 5.68.42.36.78 1.08.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}
function MailIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M3 6.5 12 13l9-6.5" />
    </svg>
  );
}
function ArrowUpRightIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}
 
// ---------------------------------------------------------------------------
// Rodapé final da landing page: logo + tagline, colunas de links rápidos,
// e um bloco de redes sociais. Mesma paleta violeta do Hero/Vantagens/Planos.
// ---------------------------------------------------------------------------
 
const colunas = [
  {
    titulo: "Produto",
    links: ["Soluções", "Recursos", "Planos", "Como funciona"],
  },
  {
    titulo: "Empresa",
    links: ["Sobre nós", "Contato", "Trabalhe conosco"],
  },
];
 
const redes = [
  { Icon: InstagramIcon, label: "Instagram", href: "#" },
  { Icon: LinkedinIcon, label: "LinkedIn", href: "#" },
  { Icon: GithubIcon, label: "GitHub", href: "#" },
];
 
export default function FooterSection() {
  return (
    <footer
      id="contato"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: "#0A0716",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "64px 6vw 28px",
        color: "#F4F2FB",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .ft-display { font-family: 'Space Grotesk', sans-serif; }
 
        .ft-top {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr 1.1fr;
          gap: 40px;
          padding-bottom: 48px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ft-brand-row { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 700; margin-bottom: 14px; }
        .ft-logo-mark {
          width: 28px; height: 28px; border-radius: 8px;
          background: linear-gradient(135deg,#8B5CF6,#C084FC);
          display: inline-flex; align-items: center; justify-content: center; font-size: 14px;
        }
        .ft-tagline { font-size: 13.5px; color: #8981A8; line-height: 1.6; max-width: 280px; }
 
        .ft-col-title { font-size: 13px; font-weight: 700; color: #C9C3E0; margin: 0 0 16px; text-transform: uppercase; letter-spacing: .04em; }
        .ft-link-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
        .ft-link {
          color: #8981A8; text-decoration: none; font-size: 14px; transition: color .2s ease;
        }
        .ft-link:hover { color: #C9B8FA; }
 
        .ft-social-title { font-size: 13px; font-weight: 700; color: #C9C3E0; margin: 0 0 16px; text-transform: uppercase; letter-spacing: .04em; }
        .ft-social-row { display: flex; gap: 10px; margin-bottom: 20px; }
        .ft-social-btn {
          width: 40px; height: 40px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
          color: #C9C3E0; text-decoration: none;
          transition: transform .2s ease, border-color .2s ease, background .2s ease, color .2s ease;
        }
        .ft-social-btn:hover {
          transform: translateY(-3px);
          background: linear-gradient(135deg,#8B5CF6,#7C3AED);
          border-color: transparent;
          color: white;
          box-shadow: 0 10px 24px -10px rgba(139,92,246,0.6);
        }
        .ft-contact-link {
          display: inline-flex; align-items: center; gap: 6px;
          color: #C9B8FA; text-decoration: none; font-size: 13.5px; font-weight: 600;
        }
        .ft-contact-link:hover { color: #E9D5FF; }
 
        .ft-bottom {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
          padding-top: 24px;
          font-size: 12.5px; color: #6E6890;
        }
 
        @media (max-width: 820px) {
          .ft-top { grid-template-columns: 1fr 1fr; row-gap: 36px; }
        }
        @media (max-width: 520px) {
          .ft-top { grid-template-columns: 1fr; }
        }
      `}</style>
 
      <Reveal>
        <div className="ft-top">
          <div>
            <div className="ft-display ft-brand-row">
              <span className="ft-logo-mark">💀</span>
              Bankai
            </div>
            <p className="ft-tagline">
              Rastreie. Controle. Confie. <br></br>Acompanhe cada passo da entrega, do centro de distribuição até o cliente.
            </p>
          </div>
 
          {colunas.map((col) => (
            <div key={col.titulo}>
              <p className="ft-col-title">{col.titulo}</p>
              <ul className="ft-link-list">
                {col.links.map((link) => (
                  <li key={link}>
                    <a className="ft-link" href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
 
          <div>
            <p className="ft-social-title">Redes sociais</p>
            <div className="ft-social-row">
              {redes.map(({ Icon, label, href }) => (
                <a key={label} className="ft-social-btn" href={href} aria-label={label} target="_blank" rel="noreferrer">
                  <Icon size={17} />
                </a>
              ))}
            </div>
            <a className="ft-contact-link" href="mailto:bankai_rastreio@gmail.com">
              <MailIcon size={14} />
              bankai_rastreio@gmail.com
              <ArrowUpRightIcon size={13} />
            </a>
          </div>
        </div>
      </Reveal>
 
      <Reveal delay={0.1}>
        <div className="ft-bottom">
          <span>© {new Date().getFullYear()} Bankai. Todos os direitos reservados ao Matheus Guimarães, Matheus Gaiga, Augusto, Afonso e Lucas.</span>
          <span>Projeto acadêmico de TCC — logística e rastreabilidade.</span>
        </div>
      </Reveal>
    </footer>
  );
}