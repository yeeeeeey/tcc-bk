const path = require("path");

// .env fica na raiz do repositório. Na Vercel ele não existe: as variáveis vêm do painel.
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env"), quiet: true });

const emTeste = process.env.NODE_ENV === "test";
const emProducao = !emTeste && (process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL));

function numero(nome, padrao) {
    const valor = Number(process.env[nome]);
    return Number.isFinite(valor) && valor > 0 ? valor : padrao;
}

function lista(nome) {
    return (process.env[nome] || "")
        .split(",")
        .map((item) => item.trim().replace(/\/$/, ""))
        .filter(Boolean);
}

// Origens que podem chamar a API de outro domínio (CORS). Em produção o site e a
// API ficam no mesmo domínio (/api), então nenhuma origem externa é liberada por
// padrão. Em desenvolvimento só o Vite local.
function origensPermitidas() {
    const definidas = lista("FRONTEND_URL");
    if (definidas.length > 0) return definidas;
    if (emProducao) return [];
    return ["http://localhost:5173", "http://127.0.0.1:5173"];
}

// Quantos proxies confiáveis ficam na frente do Express (necessário para ler o IP
// real do cliente no limite de tentativas). Na Vercel há um proxy.
function trustProxy() {
    const valor = process.env.TRUST_PROXY;
    if (valor === undefined || valor === "") return process.env.VERCEL ? 1 : false;
    if (valor === "true") return true;
    if (valor === "false") return false;
    const n = Number(valor);
    return Number.isInteger(n) ? n : valor;
}

module.exports = {
    emTeste,
    emProducao,
    origensPermitidas: origensPermitidas(),
    trustProxy: trustProxy(),
    sessao: {
        nomeCookie: "bankai_sessao",
        horas: numero("SESSAO_HORAS", 8),
        // Cookie "Secure" (só trafega em HTTPS). Desligado apenas no desenvolvimento local em HTTP.
        cookieSeguro: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : emProducao
    },
    limites: {
        apiPorMinuto: numero("LIMITE_API_POR_MINUTO", 300),
        cadastrosPorHora: numero("LIMITE_CADASTROS_POR_HORA", 10)
    },
    // Limite de tentativas de login (SEC-11). Contadores ficam no banco para
    // funcionar mesmo com várias instâncias serverless.
    login: {
        janelaMinutos: numero("LOGIN_JANELA_MINUTOS", 15),
        limiteContaIp: numero("LOGIN_LIMITE_CONTA_IP", 5),
        limiteIp: numero("LOGIN_LIMITE_IP", 20),
        limiteConta: numero("LOGIN_LIMITE_CONTA", 50),
        bloqueioInicialSegundos: numero("LOGIN_BLOQUEIO_INICIAL_SEGUNDOS", 60),
        bloqueioMaximoSegundos: numero("LOGIN_BLOQUEIO_MAXIMO_SEGUNDOS", 900)
    }
};
