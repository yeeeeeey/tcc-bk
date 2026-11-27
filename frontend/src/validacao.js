// Mesmas regras do backend (backend/src/validacao/esquemas.js). Validar aqui só
// melhora a experiência; quem garante é o servidor.

export const TAMANHO_MINIMO_SENHA = 8;

export function emailValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) && valor.length <= 150;
}

export function senhaValida(valor) {
  return (
    valor.length >= TAMANHO_MINIMO_SENHA &&
    new TextEncoder().encode(valor).length <= 72 &&
    /[A-Za-zÀ-ÿ]/.test(valor) &&
    /\d/.test(valor)
  );
}

export const MENSAGEM_SENHA = `Mínimo de ${TAMANHO_MINIMO_SENHA} caracteres, com letras e números.`;

// CNPJ numérico ou alfanumérico (formato da Receita a partir de 2026)
function normalizarCnpj(valor) {
  return String(valor).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function cnpjValido(valor) {
  const cnpj = normalizarCnpj(valor);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) return false;

  const digito = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = [...base].reduce((total, c, i) => total + (c.charCodeAt(0) - 48) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = digito(cnpj.slice(0, 12));
  const d2 = digito(cnpj.slice(0, 12) + d1);
  return cnpj.endsWith(`${d1}${d2}`);
}

// Máscara XX.XXX.XXX/XXXX-XX aceitando letras nas 12 primeiras posições
export function mascararCnpj(valor) {
  const c = normalizarCnpj(valor).slice(0, 14);
  let saida = c.slice(0, 2);
  if (c.length > 2) saida += "." + c.slice(2, 5);
  if (c.length > 5) saida += "." + c.slice(5, 8);
  if (c.length > 8) saida += "/" + c.slice(8, 12);
  if (c.length > 12) saida += "-" + c.slice(12, 14);
  return saida;
}
