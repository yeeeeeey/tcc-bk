export const NOMES_PERFIL = {
  administrador: "Administrador",
  gerente_logistico: "Gerente logístico",
  operador: "Operador",
};

export function nomeDoStatus(status) {
  if (!status) return "—";
  const nomes = { "em transito": "em trânsito", "em rota": "em rota", manutencao: "manutenção", disponivel: "disponível" };
  const texto = nomes[status] || status;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "2026-09-25" (ou "2026-09-25T00:00:00.000Z") -> "25/09/2026"; data e hora -> "25/09/2026 14:30"
export function formatarData(valor) {
  if (!valor) return "—";
  const soDia = String(valor).match(/^(\d{4}-\d{2}-\d{2})(T00:00:00(\.000)?Z)?$/);
  if (soDia) return soDia[1].split("-").reverse().join("/");
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarCelula(chave, valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (chave.startsWith("data") || chave.endsWith("_em")) return formatarData(valor);
  if (chave === "status") return nomeDoStatus(valor);
  if (chave === "perfil") return NOMES_PERFIL[valor] || valor;
  if (chave === "preco") return formatoMoeda.format(Number(valor));
  if (chave === "ativo") return valor ? "Ativo" : "Aguardando aprovação";
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}
