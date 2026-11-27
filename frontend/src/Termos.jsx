import { useEffect, useRef } from "react";
import { Link } from "./rotas";

// Termos de uso do Bankai. Texto-base para o projeto acadêmico: antes de qualquer
// uso comercial, deve ser revisado por um profissional da área jurídica.

const styles = `
  .termos-texto{ color:#C9C3E0; font-size:14px; line-height:1.65; }
  .termos-texto h2{ font-size:16px; color:#F4F2FB; margin:22px 0 6px; font-weight:600; }
  .termos-texto p, .termos-texto ul{ margin:0 0 10px; }
  .termos-texto ul{ padding-left:20px; }
  .termos-texto a{ color:#A78BFA; }
  .termos-pagina{
    min-height:100vh; background:#0A0716; padding:48px 16px; box-sizing:border-box;
    font-family:'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  .termos-cartao{
    max-width:760px; margin:0 auto; background:#12102a; border:1px solid #1f1c3d;
    border-radius:20px; padding:32px clamp(20px, 5vw, 40px);
  }
  .termos-cartao h1{ color:#fff; font-size:26px; margin:0 0 4px; font-weight:600; }
  .termos-atualizacao{ color:#8981A8; font-size:12.5px; margin:0 0 8px; }
  .termos-voltar{ display:inline-block; margin-top:24px; color:#A78BFA; font-size:14px; }
  .termos-fundo{
    position:fixed; inset:0; background:rgba(5,3,15,.72); display:flex; align-items:center;
    justify-content:center; padding:16px; z-index:50;
  }
  .termos-modal{
    width:100%; max-width:640px; max-height:85vh; display:flex; flex-direction:column;
    background:#12102a; border:1px solid #2a2650; border-radius:18px; box-shadow:0 30px 80px rgba(0,0,0,.5);
    font-family:'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  .termos-modal header{ display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1px solid #2a2650; }
  .termos-modal header h2{ margin:0; color:#fff; font-size:18px; font-weight:600; }
  .termos-modal .termos-corpo{ overflow-y:auto; padding:4px 22px 18px; }
  .termos-modal footer{ padding:14px 22px; border-top:1px solid #2a2650; display:flex; justify-content:flex-end; gap:10px; }
  .termos-fechar{ background:none; border:none; color:#a9a3c9; font-size:22px; line-height:1; cursor:pointer; padding:4px 8px; border-radius:8px; }
  .termos-fechar:hover{ background:#1a1738; color:#fff; }
  .termos-btn{ padding:10px 18px; border-radius:10px; border:none; font-size:14px; cursor:pointer; background:#7c5cff; color:#fff; font-weight:600; }
  .termos-btn.secundario{ background:transparent; border:1px solid #332f57; color:#f5f3ff; font-weight:500; }
`;

export function TermosConteudo() {
  return (
    <div className="termos-texto">
      <p>
        Estes termos regem o uso da plataforma <strong>Bankai</strong>, sistema de gestão logística e
        rastreabilidade desenvolvido como projeto acadêmico de Trabalho de Conclusão de Curso (TCC).
        Ao criar uma conta, você declara que leu e concorda com as condições abaixo.
      </p>

      <h2>1. Finalidade</h2>
      <p>
        A plataforma permite cadastrar produtos, armazéns, transportadoras e veículos, controlar estoque,
        registrar entregas e acompanhar o rastreamento. Por ser um projeto acadêmico, não há garantia de
        disponibilidade contínua nem de adequação a operações comerciais reais.
      </p>

      <h2>2. Conta e acesso</h2>
      <ul>
        <li>O cadastro público cria uma conta de <strong>operador</strong>, que só é liberada após aprovação de um administrador.</li>
        <li>Perfis com mais permissões (gerente logístico e administrador) são atribuídos apenas por administradores.</li>
        <li>Você é responsável por manter sua senha em sigilo e por todas as ações feitas com sua conta.</li>
        <li>Contas podem ser desativadas em caso de uso indevido ou a pedido do titular.</li>
      </ul>

      <h2>3. Uso adequado</h2>
      <p>
        É proibido tentar acessar dados ou funções sem autorização, contornar controles de segurança,
        sobrecarregar o serviço ou inserir informações falsas ou de terceiros sem permissão. Tentativas de
        acesso negadas e alterações em registros ficam gravadas na trilha de auditoria.
      </p>

      <h2>4. Dados pessoais</h2>
      <p>
        O tratamento de dados segue os princípios da Lei Geral de Proteção de Dados Pessoais
        (Lei nº 13.709/2018). Coletamos apenas o necessário para o funcionamento da plataforma:
      </p>
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail e, opcionalmente, CNPJ.</li>
        <li><strong>Segurança:</strong> registros de acesso e de alterações (usuário, ação, data, hora e endereço IP).</li>
        <li><strong>Preferências:</strong> configurações de exibição escolhidas por você.</li>
      </ul>
      <p>
        As senhas são armazenadas apenas na forma de hash criptográfico; ninguém da equipe tem acesso a
        elas. Os dados não são vendidos nem compartilhados com terceiros, exceto quando exigido por lei,
        e são mantidos pelo tempo necessário à finalidade acadêmica do projeto.
      </p>

      <h2>5. Seus direitos</h2>
      <p>
        Você pode consultar e corrigir seus dados na tela <em>Meu perfil</em> e solicitar a exclusão da
        conta pelo contato abaixo.
      </p>

      <h2>6. Alterações e contato</h2>
      <p>
        Estes termos podem ser atualizados; a versão vigente fica sempre disponível nesta página.
        Dúvidas e solicitações: <a href="mailto:bankai_rastreio@gmail.com">bankai_rastreio@gmail.com</a>.
      </p>
    </div>
  );
}

export function TermosModal({ onFechar, onAceitar }) {
  const fecharRef = useRef(null);

  useEffect(() => {
    fecharRef.current?.focus();
    const aoTeclar = (e) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [onFechar]);

  return (
    <div className="termos-fundo" onClick={onFechar}>
      <style>{styles}</style>
      <div
        className="termos-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="termos-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2 id="termos-titulo">Termos de uso</h2>
          <button ref={fecharRef} type="button" className="termos-fechar" aria-label="Fechar" onClick={onFechar}>
            ×
          </button>
        </header>
        <div className="termos-corpo">
          <TermosConteudo />
        </div>
        <footer>
          <button type="button" className="termos-btn secundario" onClick={onFechar}>Fechar</button>
          {onAceitar && (
            <button type="button" className="termos-btn" onClick={onAceitar}>Li e aceito</button>
          )}
        </footer>
      </div>
    </div>
  );
}

export default function TermosPage() {
  return (
    <div className="termos-pagina">
      <style>{styles}</style>
      <article className="termos-cartao">
        <h1>Termos de uso</h1>
        <p className="termos-atualizacao">Bankai · projeto acadêmico de logística e rastreabilidade</p>
        <TermosConteudo />
        <Link para="/" className="termos-voltar">← Voltar ao início</Link>
      </article>
    </div>
  );
}
