import { useState } from "react";
import { cadastrar } from "./api";

const styles = `
  .signup-root{
    --bg-outer-1:#4a3fb0;
    --bg-outer-2:#2c2470;
    --panel-bg:#12102a;
    --panel-border:#1f1c3d;
    --img-border:#4f7fff;
    --img-bg:#d9d9d9;
    --text-main:#f5f3ff;
    --text-muted:#a9a3c9;
    --input-bg:#ffffff;
    --input-text:#1a1730;
    --accent:#7c5cff;
    --accent-hover:#6b4ae6;
    --link:#a78bfa;
    --error:#ff6b6b;
    --success:#4ade80;

    min-height:100vh;
    font-family:'Segoe UI', system-ui, -apple-system, sans-serif;
    background:
      radial-gradient(circle at 15% 85%, rgba(90,70,200,.55), transparent 55%),
      linear-gradient(135deg, var(--bg-outer-1) 0%, var(--bg-outer-2) 60%);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:40px 16px;
    color:var(--text-main);
    box-sizing:border-box;
  }
  .signup-root *{ box-sizing:border-box; }

  .card{
    width:100%;
    max-width:820px;
    background:var(--panel-bg);
    border:1px solid var(--panel-border);
    border-radius:22px;
    display:flex;
    gap:28px;
    padding:28px;
    box-shadow:0 30px 80px rgba(0,0,0,.45);
  }

  .art-panel{
    position:relative;
    flex:0 0 44%;
    border-radius:16px;
    border:1px solid var(--img-border);
    background:var(--img-bg);
    min-height:460px;
    overflow:hidden;
  }
  .art-panel img{
    width:100%;
    height:100%;
    object-fit:cover;
    display:block;
  }

  .form-panel{
    flex:1;
    min-width:0;
    display:flex;
    flex-direction:column;
  }

  .signup-root h1{
    margin:0 0 6px;
    font-size:26px;
    font-weight:500;
    letter-spacing:.2px;
    color: #fff
  }
  .subtitle{
    margin:0 0 22px;
    font-size:13px;
    color:var(--text-muted);
  }
  .subtitle a{ color:var(--link); text-decoration:underline; }

  .signup-root form{ display:flex; flex-direction:column; gap:12px; }

  .row{ display:flex; gap:10px; }
  .row .field{ flex:1; min-width:0; }

  .field{ position:relative; }

  .signup-root input[type="text"], .signup-root input[type="email"], .signup-root input[type="password"]{
    width:100%;
    padding:13px 14px;
    border-radius:8px;
    border:1.5px solid transparent;
    background:var(--input-bg);
    color:var(--input-text);
    font-size:14px;
    outline:none;
    transition:border-color .15s ease, box-shadow .15s ease;
  }
  .signup-root input::placeholder{ color:#8a8494; }
  .signup-root input:focus{
    border-color:var(--accent);
    box-shadow:0 0 0 3px rgba(124,92,255,.25);
  }
  .signup-root input.invalid{ border-color:var(--error); }

  .field.has-toggle input{ padding-right:42px; }
  .toggle-eye{
    position:absolute;
    right:12px;
    top:50%;
    transform:translateY(-50%);
    background:none;
    border:none;
    cursor:pointer;
    padding:4px;
    color:#6b6478;
    display:flex;
  }
  .toggle-eye:hover{ color:#1a1730; }
  .toggle-eye svg{ width:18px; height:18px; }

  .field-error{
    font-size:11.5px;
    color:var(--error);
    min-height:14px;
    margin-top:2px;
    display:none;
  }
  .field-error.show{ display:block; }

  .inline-check{
    display:flex;
    align-items:center;
    gap:6px;
    font-size:12px;
    color:var(--text-muted);
    margin-top:2px;
    user-select:none;
  }
  .inline-check input{ width:13px; height:13px; accent-color:var(--accent); cursor:pointer; }
  .inline-check a{ color:var(--link); text-decoration:underline; }

  .terms-row{
    display:flex;
    align-items:flex-start;
    gap:9px;
    margin-top:6px;
    font-size:13px;
    color:var(--text-muted);
  }
  .terms-row input{
    width:16px; height:16px;
    margin-top:1px;
    accent-color:var(--accent);
    cursor:pointer;
    flex-shrink:0;
  }
  .terms-row a{ color:var(--link); text-decoration:underline; }
  .terms-row label{ cursor:pointer; }

  .btn-primary{
    margin-top:14px;
    width:100%;
    padding:14px;
    border:none;
    border-radius:10px;
    background:var(--accent);
    color:#fff;
    font-size:15px;
    font-weight:600;
    cursor:pointer;
    transition:background .15s ease, transform .05s ease;
  }
  .btn-primary:hover{ background:var(--accent-hover); }
  .btn-primary:active{ transform:scale(.99); }
  .btn-primary:disabled{ opacity:.55; cursor:not-allowed; }

  .divider{
    display:flex;
    align-items:center;
    gap:12px;
    margin:18px 0 14px;
    color:var(--text-muted);
    font-size:11.5px;
  }
  .divider::before, .divider::after{
    content:"";
    flex:1;
    height:1px;
    background:#332f57;
  }

  .oauth-row{ display:flex; gap:12px; }
  .btn-oauth{
    flex:1;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    padding:11px;
    border-radius:9px;
    border:1px solid #332f57;
    background:#1a1738;
    color:var(--text-main);
    font-size:14px;
    cursor:pointer;
    transition:background .15s ease;
  }
  .btn-oauth:hover{ background:#221f47; }
  .btn-oauth svg{ width:17px; height:17px; }

  .status-banner{
    display:none;
    margin-top:14px;
    padding:12px 14px;
    border-radius:8px;
    font-size:13px;
    line-height:1.4;
  }
  .status-banner.show{ display:block; }
  .status-banner.success{ background:rgba(74,222,128,.12); border:1px solid rgba(74,222,128,.4); color:var(--success); }

  .success-screen{
    display:flex;
    flex-direction:column;
    align-items:flex-start;
    gap:10px;
  }
  .success-screen .check{
    width:52px; height:52px;
    border-radius:50%;
    background:rgba(74,222,128,.15);
    display:flex; align-items:center; justify-content:center;
    margin-bottom:6px;
  }
  .success-screen h2{ margin:0; font-size:22px; font-weight:500; }
  .success-screen p{ margin:0; color:var(--text-muted); font-size:13.5px; line-height:1.5; }
  .success-screen .summary{
    margin-top:6px;
    width:100%;
    background:#181633;
    border:1px solid #2a2650;
    border-radius:10px;
    padding:14px 16px;
    font-size:13px;
  }
  .success-screen .summary div{ display:flex; justify-content:space-between; padding:4px 0; color:var(--text-muted); }
  .success-screen .summary div span:last-child{ color:var(--text-main); font-weight:500; }
  .btn-secondary{
    margin-top:12px;
    padding:11px 18px;
    border-radius:9px;
    border:1px solid #332f57;
    background:transparent;
    color:var(--text-main);
    font-size:13.5px;
    cursor:pointer;
  }
  .btn-secondary:hover{ background:#1a1738; }

  @media (max-width:680px){
    .card{ flex-direction:column; padding:20px; }
    .art-panel{ min-height:180px; flex:none; }
    .row{ flex-direction:column; }
  }
  .link-btn{
  background:none;
  border:none;
  padding:0;
  font:inherit;
  color:var(--link);
  text-decoration:underline;
  cursor:pointer; }

  .status-banner.erro{ background:rgba(255,107,107,.12); border:1px solid rgba(255,107,107,.4); color:var(--error); }

  .voltar-btn{ display:block; margin:18px auto 0; font-size:13px; text-decoration:none; }

  .success-screen .acoes{ display:flex; gap:10px; flex-wrap:wrap; align-items:stretch; width:100%; }
  .success-screen .acoes button{ flex:1 1 140px; width:auto; margin:0; }
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

function maskCNPJ(raw) {
  let v = raw.replace(/\D/g, "").slice(0, 14);
  v = v.replace(/^(\d{2})(\d)/, "$1.$2");
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
  v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
  v = v.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  return v;
}

function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validCNPJDigits(v) {
  return v.replace(/\D/g, "").length === 14;
}

export default function SignupForm({ onGoToLogin, onVoltar }) {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [naoEmpresa, setNaoEmpresa] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [termos, setTermos] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleNaoEmpresaChange(e) {
    const checked = e.target.checked;
    setNaoEmpresa(checked);
    if (checked) {
      setCnpj("");
      setErrors((prev) => ({ ...prev, cnpj: false }));
    }
  }

  function handleCnpjChange(e) {
    setCnpj(maskCNPJ(e.target.value));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setStatusMessage("");

    const newErrors = {};
    let valid = true;

    if (!nome.trim()) {
      newErrors.nome = true;
      valid = false;
    }

    if (!naoEmpresa) {
      if (!validCNPJDigits(cnpj)) {
        newErrors.cnpj = true;
        valid = false;
      }
    }

    if (!validEmail(email)) {
      newErrors.email = true;
      valid = false;
    }

    if (senha.length < 8) {
      newErrors.senha = true;
      valid = false;
    }

    if (!termos) {
      newErrors.termos = true;
      valid = false;
    }

    setErrors(newErrors);
    if (!valid) return;

    setLoading(true);
    try {
      const usuario = await cadastrar({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        cnpj: naoEmpresa ? null : cnpj,
      });

      setSummary({
        nome: usuario.nome,
        tipo: usuario.cnpj ? "Empresa" : "Pessoa física",
        cnpj: usuario.cnpj,
        email: usuario.email,
      });
      setSubmitted(true);
    } catch (erro) {
      setStatusMessage(erro.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setNome("");
    setCnpj("");
    setNaoEmpresa(false);
    setEmail("");
    setSenha("");
    setTermos(false);
    setShowSenha(false);
    setErrors({});
    setStatusMessage("");
    setSubmitted(false);
    setSummary(null);
  }

  return (
    <div className="signup-root">
      <style>{styles}</style>

      <div className="card">
        <div className="art-panel">
          <img
            src="/imagem-inicial.webp"
            alt="Ilustração de boas-vindas"
          />
        </div>

        <div className="form-panel">
          {!submitted ? (
            <div>
              <h1>Crie uma conta</h1>
              <p className="subtitle">
                Já tem uma conta?{" "}
                <button type="button" className="link-btn" onClick={() => onGoToLogin()}>
                  Login
                </button>
              </p>

              <form noValidate onSubmit={handleSubmit}>
                <div className="row">
                  <div className="field">
                    <input
                      type="text"
                      placeholder="Nome"
                      autoComplete="name"
                      className={errors.nome ? "invalid" : ""}
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                    <div className={`field-error${errors.nome ? " show" : ""}`}>
                      Informe seu nome.
                    </div>
                  </div>
                  <div className="field">
                    <input
                      type="text"
                      placeholder={naoEmpresa ? "CNPJ (não aplicável)" : "CNPJ"}
                      autoComplete="off"
                      className={errors.cnpj ? "invalid" : ""}
                      value={cnpj}
                      onChange={handleCnpjChange}
                      disabled={naoEmpresa}
                    />
                    <div className="inline-check">
                      <input
                        type="checkbox"
                        id="naoEmpresa"
                        checked={naoEmpresa}
                        onChange={handleNaoEmpresaChange}
                      />
                      <label htmlFor="naoEmpresa">
                        Não sou uma{" "}
                        <a href="#" onClick={(e) => e.preventDefault()}>
                          empresa
                        </a>
                      </label>
                    </div>
                    <div className={`field-error${errors.cnpj ? " show" : ""}`}>
                      Informe um CNPJ válido (14 dígitos).
                    </div>
                  </div>
                </div>

                <div className="field">
                  <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    className={errors.email ? "invalid" : ""}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className={`field-error${errors.email ? " show" : ""}`}>
                    Informe um email válido.
                  </div>
                </div>

                <div className="field has-toggle">
                  <input
                    type={showSenha ? "text" : "password"}
                    placeholder="Senha"
                    autoComplete="new-password"
                    className={errors.senha ? "invalid" : ""}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle-eye"
                    aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
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
                  <div className={`field-error${errors.senha ? " show" : ""}`}>
                    Mínimo de 8 caracteres.
                  </div>
                </div>

                <div className="terms-row">
                  <input
                    type="checkbox"
                    id="termos"
                    checked={termos}
                    onChange={(e) => setTermos(e.target.checked)}
                  />
                  <label htmlFor="termos">
                    Eu aceito os{" "}
                    <a href="#" onClick={(e) => e.preventDefault()}>
                      termos de uso
                    </a>
                  </label>
                </div>
                <div
                  className={`field-error${errors.termos ? " show" : ""}`}
                  style={{ marginTop: "-6px" }}
                >
                  Você precisa aceitar os termos.
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Criando conta..." : "Criar conta"}
                </button>

                {statusMessage && (
                  <div className="status-banner show erro" role="alert">{statusMessage}</div>
                )}
              </form>

              <div className="divider">ou registre-se com</div>

              <div className="oauth-row">
                <button
                  type="button"
                  className="btn-oauth"
                  onClick={() =>
                    setStatusMessage(
                      "Cadastro com Google ainda não configurado nesta demo."
                    )
                  }
                >
                  <svg viewBox="0 0 48 48">
                    <path
                      fill="#FFC107"
                      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.7 34.9 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.6 5.6C41.5 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
                    />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  className="btn-oauth"
                  onClick={() =>
                    setStatusMessage(
                      "Cadastro com Apple ainda não configurado nesta demo."
                    )
                  }
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.365 1.43c0 1.14-.462 2.106-1.232 2.87-.83.828-2.087 1.462-3.172 1.375-.13-1.096.462-2.24 1.19-2.964.83-.83 2.13-1.42 3.214-1.28zM20.617 17.41c-.552 1.28-1.213 2.542-2.196 3.628-.94 1.03-1.977 2.04-3.32 2.06-1.32.02-1.747-.79-3.253-.79-1.507 0-1.98.77-3.228.81-1.31.04-2.31-1.116-3.26-2.14-2-2.14-3.532-6.05-1.48-8.68 1.02-1.3 2.83-2.13 4.79-2.16 1.28-.02 2.48.83 3.26.83.77 0 2.23-1.03 3.76-.88.64.03 2.44.26 3.6 1.94-.09.06-2.15 1.25-2.13 3.72.02 2.95 2.6 3.93 2.63 3.95l-.16.71z" />
                  </svg>
                  Apple
                </button>
              </div>

              <button type="button" className="link-btn voltar-btn" onClick={onVoltar}>
                ← Voltar ao início
              </button>
            </div>
          ) : (
            <div className="success-screen">
              <div className="check">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4ade80"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2>Conta criada!</h2>
              <p>Sua conta foi criada com sucesso. Confira os dados abaixo.</p>
              <div className="summary">
                <div>
                  <span>Nome</span>
                  <span>{summary?.nome}</span>
                </div>
                <div>
                  <span>Tipo de conta</span>
                  <span>{summary?.tipo}</span>
                </div>
                {summary?.cnpj && (
                  <div>
                    <span>CNPJ</span>
                    <span>{summary.cnpj}</span>
                  </div>
                )}
                <div>
                  <span>Email</span>
                  <span>{summary?.email}</span>
                </div>
              </div>
              <div className="acoes">
                <button className="btn-primary" onClick={() => onGoToLogin(summary?.email)}>
                  Fazer login
                </button>
                <button className="btn-secondary" onClick={handleReset}>
                  Criar outra conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
