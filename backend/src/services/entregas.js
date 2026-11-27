// Regras que ligam status da entrega e estoque (SEC-21, SEC-22 e SEC-24).
const entregaModel = require("../models/entregaModel");
const estoque = require("./estoque");

// Atualiza a projeção entregas.status e aplica os efeitos no estoque:
//   -> cancelado: a reserva volta para o armazém
//   cancelado -> outro (correção retroativa): a reserva é feita de novo
// Deve ser chamada com a entrega já bloqueada (entregaModel.bloquearEntrega).
async function aplicarMudancaDeStatus(cliente, entrega, novoStatus) {
    const anterior = entrega.status;
    if (anterior === novoStatus) return;

    if (novoStatus === "cancelado") {
        await estoque.devolverReservaDaEntrega(cliente, entrega);
    } else if (anterior === "cancelado" && entrega.armazem_id) {
        await cliente.query("SELECT id FROM produtos WHERE id = $1 FOR UPDATE", [entrega.produto_id]);
        const armazem = (await estoque.bloquearArmazens(cliente, [entrega.armazem_id])).get(entrega.armazem_id);
        await estoque.debitar(cliente, { produtoId: entrega.produto_id, armazem, quantidade: entrega.quantidade });
    }

    await entregaModel.atualizarStatus(cliente, entrega.id, novoStatus);
    entrega.status = novoStatus;
}

module.exports = { aplicarMudancaDeStatus };
