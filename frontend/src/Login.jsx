import { useState } from "react";
import { login } from "./api";

const styles = `
  .login-root{
    --panel-bg:#0d0b22;
    --text-muted:#94a3b8;
    --accent:#8b5cf6;
    --accent-hover:#7c3aed;
    --link:#a78bfa;
    --error:#f87171;

    min-height:100vh;
    width:100%;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:24px;
    box-sizing:border-box;
    font-family:'Segoe UI', system-ui, -apple-system, sans-serif;
    color:#fff;
    background:linear-gradient(135deg, #312e81 0%, #1e1b4b 50%, #020617 100%);
  }
  .login-root *{ box-sizing:border-box; }

  .lg-card{
    width:100%;
    max-width:384px;
    background:var(--panel-bg);
    border:1px solid rgba(255,255,255,.1);
    border-radius:24px;
    padding:32px;
    box-shadow:0 25px 60px rgba(0,0,0,.5);
  }

  .lg-title{
    margin:0 0 8px;
    text-align:center;
    font-family:Georgia, 'Times New Roman', serif;
    font-weight:400;
    font-size:36px;
    color:#fff;
  }
  .lg-subtitle{
    margin:0 0 32px;
    text-align:center;
    font-size:14px;
    color:var(--text-muted);
  }
  .lg-link{
    background:none;
    border:none;
    padding:0;
    font:inherit;
    color:var(--link);
    text-decoration:underline;
    cursor:pointer;
  }
  .lg-link:hover{ color:#c4b5fd; }

  .lg-form{ display:flex; flex-direction:column; gap:12px; }

  .lg-field{ position:relative; }
  .lg-input{
    width:100%;
    padding:14px 16px;
    border-radius:12px;
    border:2px solid transparent;
    background:#fff;
    color:#0f172a;
    font-size:14px;
    outline:none;
    transition:border-color .15s ease;
  }
  .lg-input::placeholder{ color:#64748b; }
  .lg-input:focus{ border-color:var(--accent); }
  .lg-input.invalid{ border-color:var(--error); }
  .lg-input.has-toggle{ padding-right:44px; }

  .lg-eye{
    position:absolute;
    right:12px;
    top:50%;
    transform:translateY(-50%);
    background:none;
    border:none;
    padding:4px;
    display:flex;
    cursor:pointer;
    color:#64748b;
  }
  .lg-eye:hover{ color:#1e293b; }
  .lg-eye svg{ width:18px; height:18px; }

  .lg-error{ margin:4px 0 0; font-size:12px; color:var(--error); }

  .lg-btn-primary{
    margin-top:12px;
    width:100%;
    padding:14px;
    border:none;
    border-radius:12px;
    background:var(--accent);
    color:#fff;
    font-size:14px;
    font-weight:600;
    cursor:pointer;
    transition:background .15s ease;
  }
  .lg-btn-primary:hover{ background:var(--accent-hover); }
  .lg-btn-primary:disabled{ opacity:.6; cursor:not-allowed; }

  .lg-notice{
    margin:16px 0 0;
    text-align:center;
    font-size:12px;
    color:#cbd5e1;
  }

  .lg-voltar{
    display:block;
    margin:20px auto 0;
    font-size:13px;
    text-decoration:none;
  }



  .lg-success{
    display:flex;
    flex-direction:column;
    align-items:center;
    text-align:center;
    gap:16px;
    padding:24px 0;
  }
  .lg-check{
    width:56px; height:56px;
    border-radius:50%;
    background:rgba(52,211,153,.1);
    display:flex; align-items:center; justify-content:center;
  }
  .lg-success h1{
    margin:0;
    font-family:Georgia, 'Times New Roman', serif;
    font-weight:400;
    font-size:24px;
  }
  .lg-success p{
    margin:0;
    font-size:14px;
    color:var(--text-muted);
    word-break:break-all;
  }
  .lg-success p span{ color:#e2e8f0; }
  .lg-btn-secondary{
    margin-top:8px;
    padding:10px 20px;
    border-radius:12px;
    border:1px solid rgba(255,255,255,.1);
    background:transparent;
    color:#e2e8f0;
    font-size:14px;
    cursor:pointer;
  }
  .lg-btn-secondary:hover{ background:rgba(255,255,255,.05); }

  .lg-sr{
    position:absolute;
    width:1px; height:1px;
    overflow:hidden;
    clip:rect(0,0,0,0);
    white-space:nowrap;
  }
`;

const EYE_OPEN = (
  <>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </>
);

const EYE_CLOSED = (
  <>
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.61 3.79M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </>
);

export default function LoginScreen({ onGoToSignup, onLogin, onVoltar, emailInicial = "", avisoInicial = "" }) {
  const [email, setEmail] = useState(emailInicial);
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(avisoInicial);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim();
    const nextErrors = {};
    if (!cleanEmail) nextErrors.email = "Informe seu email ou login.";
    if (!senha) nextErrors.senha = "Informe sua senha.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setEmail(cleanEmail);
    setNotice("");
    setLoading(true);
    try {
      const usuario = await login(cleanEmail, senha);
      onLogin(usuario);
    } catch (erro) {
      setNotice(erro.message);
      setLoading(false);
    }
  }

  function clearError(field) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  return (
    <div className="login-root">
      <style>{styles}</style>

      <div className="lg-card">
          <>
            <h1 className="lg-title">Login</h1>
            <p className="lg-subtitle">
              Não possui conta?{" "}
              <button type="button" className="lg-link" onClick={onGoToSignup}>
                cadastro
              </button>
            </p>

            <form className="lg-form" noValidate onSubmit={handleSubmit}>
              <div className="lg-field">
                <label htmlFor="lg-email" className="lg-sr">
                  Email ou login
                </label>
                <input
                  id="lg-email"
                  type="text"
                  autoComplete="username"
                  placeholder="Email ou login"
                  value={email}
                  className={`lg-input${errors.email ? " invalid" : ""}`}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "lg-email-erro" : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError("email");
                  }}
                />
                {errors.email && (
                  <p id="lg-email-erro" className="lg-error">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="lg-field">
                <label htmlFor="lg-senha" className="lg-sr">
                  Senha
                </label>
                <input
                  id="lg-senha"
                  type={showSenha ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Senha"
                  value={senha}
                  className={`lg-input has-toggle${errors.senha ? " invalid" : ""}`}
                  aria-invalid={!!errors.senha}
                  aria-describedby={errors.senha ? "lg-senha-erro" : undefined}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    clearError("senha");
                  }}
                />
                <button
                  type="button"
                  className="lg-eye"
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showSenha}
                  onClick={() => setShowSenha((v) => !v)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {showSenha ? EYE_CLOSED : EYE_OPEN}
                  </svg>
                </button>
                {errors.senha && (
                  <p id="lg-senha-erro" className="lg-error">
                    {errors.senha}
                  </p>
                )}
              </div>

              <button type="submit" className="lg-btn-primary" disabled={loading}>
                {loading ? "Entrando..." : "Fazer login"}
              </button>
            </form>

            {notice && (
              <p className="lg-notice" role="alert" style={{ color: "var(--error)" }}>
                {notice}
              </p>
            )}

            <button type="button" className="lg-link lg-voltar" onClick={onVoltar}>
              ← Voltar ao início
            </button>
          </>
      </div>
    </div>
  );
}