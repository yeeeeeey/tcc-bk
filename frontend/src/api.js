// Endereço do backend. Por padrão /api: em desenvolvimento o Vite repassa para o
// servidor local (vite.config.js) e na Vercel a API fica no mesmo domínio.
// VITE_API_URL no .env sobrescreve (veja .env.example).
export const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

// Evento disparado quando o backend responde 401 (sessão expirada ou encerrada)
export const EVENTO_SESSAO_EXPIRADA = "bankai:sessao-expirada";

export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

async function request(caminho, { method = "GET", body, avisar401 = true } = {}) {
  let resposta;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method,
      // O cookie de sessão é HttpOnly: o JavaScript não o lê, só o navegador o envia
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ErroApi("Não foi possível conectar ao servidor. Verifique se o backend está rodando.", 0);
  }

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    if (resposta.status === 401 && avisar401) {
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    }
    throw new ErroApi(dados?.erro || `Erro ${resposta.status} ao falar com o servidor.`, resposta.status);
  }

  return dados;
}

function comParametros(caminho, parametros = {}) {
  const query = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== "") query.set(chave, String(valor));
  }
  const texto = query.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

// ---- Sessão ----
export function login(email, senha) {
  return request("/usuarios/login", { method: "POST", body: { login: email, senha }, avisar401: false });
}

export function logout() {
  return request("/usuarios/logout", { method: "POST", avisar401: false });
}

// Confere se o cookie de sessão ainda vale (usado ao abrir/recarregar o site)
export function sessaoAtual() {
  return request("/usuarios/me", { avisar401: false });
}

export function cadastrar({ nome, email, senha, cnpj }) {
  return request("/usuarios/cadastro", { method: "POST", body: { nome, email, senha, cnpj } });
}

// ---- Minha conta ----
export function atualizarMeuPerfil(dados) {
  return request("/usuarios/me", { method: "PUT", body: dados });
}

export function alterarMinhaSenha(senhaAtual, novaSenha) {
  return request("/usuarios/me/senha", { method: "PUT", body: { senha_atual: senhaAtual, nova_senha: novaSenha } });
}

export function encerrarOutrasSessoes() {
  return request("/usuarios/me/sessoes", { method: "DELETE" });
}

// ---- Dados ----
export function buscarDashboard() {
  return request("/dashboard");
}

// recurso = "produtos", "armazens", "estoque", "entregas", "rastreamento", "movimentacoes",
// "transportadoras", "veiculos", "usuarios", "auditoria". Resposta: { dados, pagina, limite, total }
export function listar(recurso, { pagina, limite, busca, ...filtros } = {}) {
  return request(comParametros(`/${recurso}`, { pagina, limite, busca, ...filtros }));
}

// Relatório gerencial do período (datas AAAA-MM-DD)
export function buscarRelatorio({ de, ate }) {
  return request(comParametros("/relatorios", { de, ate }));
}

export function buscarGlobal(termo) {
  return request(comParametros("/busca", { q: termo }));
}

// ---- Administração ----
export function criarUsuario(dados) {
  return request("/usuarios", { method: "POST", body: dados });
}

export function atualizarUsuario(id, dados) {
  return request(`/usuarios/${id}`, { method: "PUT", body: dados });
}

export function listarPerfis() {
  return request("/perfis");
}
