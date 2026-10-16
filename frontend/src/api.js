// Endereço do backend. Em desenvolvimento é o servidor local; no build (Vercel) a API fica
// no mesmo domínio, em /api. VITE_API_URL no .env sobrescreve os dois (veja .env.example).
const API_PADRAO = import.meta.env.DEV ? "http://localhost:3000" : "/api";
export const API_URL = (import.meta.env.VITE_API_URL || API_PADRAO).replace(/\/$/, "");

async function request(caminho, { method = "GET", body } = {}) {
  let resposta;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
  }

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro ${resposta.status} ao falar com o servidor.`);
  }

  return dados;
}

export function login(email, senha) {
  return request("/usuarios/login", { method: "POST", body: { login: email, senha } });
}

export function cadastrar({ nome, email, senha, cnpj }) {
  return request("/usuarios/cadastro", { method: "POST", body: { nome, email, senha, cnpj } });
}

export function buscarDashboard() {
  return request("/dashboard");
}

// recurso = "produtos", "armazens", "entregas", "rastreamento", "transportadoras", "veiculos", "usuarios"
export function listar(recurso) {
  return request(`/${recurso}`);
}
