const entregaModel = require("../models/entregaModel");
const estoque = require("../services/estoque");
const { gravarComAuditoria, camposAlterados } = require("../services/auditoria");
const { estaFinalizada } = require("../regras/statusEntrega");
const { naoEncontrado, conflito } = require("../utils/erros");

async function listar(req, res) {
    res.json(await entregaModel.listarEntregas(req.dados.query));
}

async function buscarPorId(req, res) {
    const entrega = await entregaModel.buscarEntregaPorId(req.dados.params.id);
    if (!entrega) throw naoEncontrado("Entrega não encontrada");
    res.json(entrega);
}

// Cria a entrega e reserva o estoque na mesma transação (SEC-22): sem saldo
// suficiente, nada é gravado e a resposta é 409.
async function criar(req, res) {
    const { produto_id, quantidade, destino, data_prevista, armazem_id } = req.dados.body;

    const entrega = await gravarComAuditoria(
        req,
        {
            acao: "criar",
            recurso: "entregas",
            detalhes: (e) => ({ produto_id: e.produto_id, quantidade: e.quantidade, armazem_id: e.armazem_id })
        },
        async (cliente) => {
            const armazem = await estoque.reservarParaEntrega(cliente, {
                produtoId: produto_id,
                quantidade,
                armazemId: armazem_id
            });

            const id = await entregaModel.inserirEntrega(cliente, {
                produto_id,
                quantidade,
                destino,
                data_prevista,
                armazem_id: armazem.id
            });

            return entregaModel.buscarEntregaPorId(id, cliente);
        }
    );

    res.status(201).json(entrega);
}

async function atualizar(req, res) {
    const id = req.dados.params.id;
    let campos = req.dados.body;

    const entrega = await gravarComAuditoria(
        req,
        { acao: "editar", recurso: "entregas", detalhes: { campos: camposAlterados(req.dados.body) } },
        async (cliente) => {
            const atual = await entregaModel.bloquearEntrega(cliente, id);
            if (!atual) return null;

            if (estaFinalizada(atual.status)) {
                throw conflito(`A entrega está "${atual.status}" e não pode mais ser alterada`);
            }

            const mudaReserva = ["produto_id", "quantidade", "armazem_id"]
                .some((campo) => campos[campo] !== undefined && campos[campo] !== atual[campo]);

            if (mudaReserva) {
                if (atual.status !== "pendente") {
                    throw conflito("Produto, quantidade e armazém só podem mudar enquanto a entrega está pendente");
                }

                // Devolve a reserva antiga e faz a nova, tudo na mesma transação
                await estoque.devolverReservaDaEntrega(cliente, atual);

                const produtoId = campos.produto_id ?? atual.produto_id;
                const armazem = await estoque.reservarParaEntrega(cliente, {
                    produtoId,
                    quantidade: campos.quantidade ?? atual.quantidade,
                    armazemId: campos.armazem_id ?? (produtoId === atual.produto_id ? atual.armazem_id : undefined)
                });
                campos = { ...campos, armazem_id: armazem.id };
            }

            await entregaModel.atualizarCampos(cliente, id, campos);
            return entregaModel.buscarEntregaPorId(id, cliente);
        }
    );

    if (!entrega) throw naoEncontrado("Entrega não encontrada");
    res.json(entrega);
}

// Exclusão lógica; se a entrega ainda não terminou, a reserva volta ao estoque
async function deletar(req, res) {
    const entrega = await gravarComAuditoria(
        req,
        { acao: "excluir", recurso: "entregas", detalhes: (e) => ({ status: e.status }) },
        async (cliente) => {
            const atual = await entregaModel.bloquearEntrega(cliente, req.dados.params.id);
            if (!atual) return null;

            if (!estaFinalizada(atual.status)) {
                await estoque.devolverReservaDaEntrega(cliente, atual);
            }

            await entregaModel.marcarExcluida(cliente, atual.id);
            return atual;
        }
    );

    if (!entrega) throw naoEncontrado("Entrega não encontrada");
    res.json({ mensagem: "Entrega excluída com sucesso" });
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    deletar
};
