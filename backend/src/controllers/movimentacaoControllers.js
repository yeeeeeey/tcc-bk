const movimentacaoModel = require("../models/movimentacaoModel");
const estoque = require("../services/estoque");
const { gravarComAuditoria } = require("../services/auditoria");
const { naoEncontrado, conflito } = require("../utils/erros");

async function listar(req, res) {
    res.json(await movimentacaoModel.listarMovimentacoes(req.dados.query));
}

async function buscarPorId(req, res) {
    const movimentacao = await movimentacaoModel.buscarMovimentacaoPorId(req.dados.params.id);
    if (!movimentacao) throw naoEncontrado("Movimentação não encontrada");
    res.json(movimentacao);
}

// Registra a movimentação e altera os saldos na mesma transação (SEC-23):
//   origem e destino = transferência entre armazéns (total do produto não muda)
//   só destino       = entrada externa (soma no armazém e no total)
//   só origem        = saída externa (subtrai do armazém e do total)
// Saldo insuficiente na origem ou capacidade excedida no destino = 409, nada gravado.
async function criar(req, res) {
    const dados = req.dados.body;

    const movimentacao = await gravarComAuditoria(
        req,
        {
            acao: "criar",
            recurso: "movimentacoes",
            detalhes: {
                produto_id: dados.produto_id,
                quantidade: dados.quantidade,
                armazem_origem_id: dados.armazem_origem_id ?? null,
                armazem_destino_id: dados.armazem_destino_id ?? null
            }
        },
        async (cliente) => {
            await estoque.bloquearProduto(cliente, dados.produto_id);
            const armazens = await estoque.bloquearArmazens(cliente, [dados.armazem_origem_id, dados.armazem_destino_id]);
            const origem = armazens.get(dados.armazem_origem_id);
            const destino = armazens.get(dados.armazem_destino_id);

            if (destino) estoque.exigirArmazemAtivo(destino);

            if (origem) await estoque.debitar(cliente, { produtoId: dados.produto_id, armazem: origem, quantidade: dados.quantidade });
            if (destino) await estoque.creditar(cliente, { produtoId: dados.produto_id, armazem: destino, quantidade: dados.quantidade });

            const id = await movimentacaoModel.inserirMovimentacao(cliente, {
                ...dados,
                origem: dados.origem ?? origem?.nome ?? "Entrada externa",
                destino: dados.destino ?? destino?.nome ?? "Saída externa",
                usuario_id: req.usuario.id
            });

            return movimentacaoModel.buscarMovimentacaoPorId(id, cliente);
        }
    );

    res.status(201).json(movimentacao);
}

// Movimentações são um livro-razão: não são editadas. Um erro é desfeito por
// estorno (somente administrador), que inverte o efeito nos saldos e mantém o registro.
async function estornar(req, res) {
    const movimentacao = await gravarComAuditoria(
        req,
        { acao: "estornar", recurso: "movimentacoes", detalhes: (m) => ({ produto_id: m.produto_id, quantidade: m.quantidade }) },
        async (cliente) => {
            const atual = await movimentacaoModel.bloquearMovimentacao(cliente, req.dados.params.id);
            if (!atual) return null;
            if (atual.estornado_em) throw conflito("Esta movimentação já foi estornada");

            // Movimentações antigas (sem quantidade/armazéns) não mexeram em saldos
            if (atual.quantidade) {
                await cliente.query("SELECT id FROM produtos WHERE id = $1 FOR UPDATE", [atual.produto_id]);
                const armazens = await estoque.bloquearArmazens(cliente, [atual.armazem_origem_id, atual.armazem_destino_id]);
                const origem = armazens.get(atual.armazem_origem_id);
                const destino = armazens.get(atual.armazem_destino_id);

                if (destino) await estoque.debitar(cliente, { produtoId: atual.produto_id, armazem: destino, quantidade: atual.quantidade });
                if (origem) await estoque.creditar(cliente, { produtoId: atual.produto_id, armazem: origem, quantidade: atual.quantidade });
            }

            await movimentacaoModel.marcarEstornada(cliente, atual.id);
            return atual;
        }
    );

    if (!movimentacao) throw naoEncontrado("Movimentação não encontrada");
    res.json({ mensagem: "Movimentação estornada e saldos ajustados" });
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    estornar
};
