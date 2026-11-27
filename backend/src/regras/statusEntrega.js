const { conflito } = require("../utils/erros");

// Ciclo de vida de uma entrega (SEC-24). A entrega nasce "pendente"; cada evento
// de rastreamento leva a um novo status, desde que a transição esteja aqui.
const TRANSICOES = {
    pendente: ["processando", "em transito", "cancelado"],
    processando: ["em transito", "cancelado"],
    "em transito": ["em transito", "entregue", "cancelado"],
    entregue: [],
    cancelado: []
};

const STATUS_ENTREGA = Object.keys(TRANSICOES);
// Status que um evento de rastreamento pode registrar ("pendente" é só o inicial)
const STATUS_RASTREAMENTO = ["processando", "em transito", "entregue", "cancelado"];
const STATUS_FINAIS = ["entregue", "cancelado"];

function transicaoPermitida(de, para) {
    return (TRANSICOES[de] || []).includes(para);
}

function validarTransicao(de, para) {
    if (!transicaoPermitida(de, para)) {
        const permitidos = TRANSICOES[de] || [];
        const dica = permitidos.length > 0
            ? `Status permitidos a partir de "${de}": ${permitidos.join(", ")}`
            : `A entrega já está "${de}" e não aceita novos status`;
        throw conflito(`Transição de status inválida: "${de}" → "${para}". ${dica}.`);
    }
}

function estaFinalizada(status) {
    return STATUS_FINAIS.includes(status);
}

module.exports = {
    TRANSICOES,
    STATUS_ENTREGA,
    STATUS_RASTREAMENTO,
    STATUS_FINAIS,
    transicaoPermitida,
    validarTransicao,
    estaFinalizada
};
