// Operações de estoque (SEC-22 e SEC-23). Todas recebem o cliente de uma transação
// aberta (utils/transacao.js) e usam bloqueio de linha, então duas operações
// simultâneas sobre o mesmo produto/armazém não leem saldos desatualizados.
//
// Modelo: "estoque" guarda o saldo de cada produto em cada armazém (fonte da
// verdade). produtos.quantidade é o total, mantido pelo gatilho do banco. A ordem
// de bloqueio é sempre produto -> armazém -> linha de estoque, para evitar deadlock.
const { requisicaoInvalida, conflito } = require("../utils/erros");

async function bloquearProduto(cliente, produtoId) {
    const resultado = await cliente.query(
        "SELECT id, nome, quantidade FROM produtos WHERE id = $1 AND excluido_em IS NULL FOR UPDATE",
        [produtoId]
    );
    if (!resultado.rows[0]) {
        throw requisicaoInvalida("produto_id informado não existe");
    }
    return resultado.rows[0];
}

// Bloqueia vários armazéns em ordem crescente de id. Devolve um mapa id -> armazém.
async function bloquearArmazens(cliente, ids) {
    const unicos = [...new Set(ids.filter(Boolean))].sort((a, b) => a - b);
    const armazens = new Map();

    for (const id of unicos) {
        const resultado = await cliente.query(
            "SELECT id, nome, status, capacidade_maxima FROM armazens WHERE id = $1 AND excluido_em IS NULL FOR UPDATE",
            [id]
        );
        if (!resultado.rows[0]) {
            throw requisicaoInvalida(`Armazém ${id} não existe`);
        }
        armazens.set(id, resultado.rows[0]);
    }

    return armazens;
}

function exigirArmazemAtivo(armazem) {
    if (armazem.status !== "ativo") {
        throw conflito(`O armazém "${armazem.nome}" está ${armazem.status} e não pode movimentar mercadorias`);
    }
}

async function debitar(cliente, { produtoId, armazem, quantidade }) {
    const resultado = await cliente.query(
        `UPDATE estoque
         SET quantidade_disponivel = quantidade_disponivel - $3
         WHERE produto_id = $1 AND armazem_id = $2 AND quantidade_disponivel >= $3
         RETURNING quantidade_disponivel`,
        [produtoId, armazem.id, quantidade]
    );

    if (!resultado.rows[0]) {
        const saldo = await cliente.query(
            "SELECT quantidade_disponivel FROM estoque WHERE produto_id = $1 AND armazem_id = $2",
            [produtoId, armazem.id]
        );
        const disponivel = saldo.rows[0]?.quantidade_disponivel ?? 0;
        throw conflito(`Estoque insuficiente no armazém "${armazem.nome}": disponível ${disponivel}, solicitado ${quantidade}`);
    }
}

// O armazém precisa ter sido bloqueado antes (bloquearArmazens), para que a soma
// usada na checagem de capacidade não mude até o fim da transação.
async function creditar(cliente, { produtoId, armazem, quantidade, verificarCapacidade = true }) {
    if (verificarCapacidade && armazem.capacidade_maxima > 0) {
        const ocupacao = await cliente.query(
            "SELECT COALESCE(SUM(quantidade_disponivel), 0)::int AS total FROM estoque WHERE armazem_id = $1",
            [armazem.id]
        );
        const total = ocupacao.rows[0].total;
        if (total + quantidade > armazem.capacidade_maxima) {
            throw conflito(
                `Capacidade do armazém "${armazem.nome}" excedida: ocupação ${total}, capacidade ${armazem.capacidade_maxima}, entrada ${quantidade}`
            );
        }
    }

    await cliente.query(
        `INSERT INTO estoque (produto_id, armazem_id, quantidade_disponivel)
         VALUES ($1, $2, $3)
         ON CONFLICT (produto_id, armazem_id)
         DO UPDATE SET quantidade_disponivel = estoque.quantidade_disponivel + EXCLUDED.quantidade_disponivel`,
        [produtoId, armazem.id, quantidade]
    );
}

// Armazém ativo com maior saldo suficiente para a quantidade pedida
async function escolherArmazemComSaldo(cliente, produtoId, quantidade) {
    const resultado = await cliente.query(
        `SELECT a.id
         FROM estoque e
         JOIN armazens a ON a.id = e.armazem_id
         WHERE e.produto_id = $1
           AND e.quantidade_disponivel >= $2
           AND a.status = 'ativo'
           AND a.excluido_em IS NULL
         ORDER BY e.quantidade_disponivel DESC, a.id
         LIMIT 1`,
        [produtoId, quantidade]
    );

    if (!resultado.rows[0]) {
        throw conflito(`Estoque insuficiente: nenhum armazém ativo tem ${quantidade} unidade(s) deste produto`);
    }

    const armazens = await bloquearArmazens(cliente, [resultado.rows[0].id]);
    return armazens.get(resultado.rows[0].id);
}

// Reserva (debita) o estoque de uma entrega. Devolve o armazém usado.
async function reservarParaEntrega(cliente, { produtoId, quantidade, armazemId }) {
    await bloquearProduto(cliente, produtoId);

    let armazem;
    if (armazemId) {
        armazem = (await bloquearArmazens(cliente, [armazemId])).get(armazemId);
        exigirArmazemAtivo(armazem);
    } else {
        armazem = await escolherArmazemComSaldo(cliente, produtoId, quantidade);
    }

    await debitar(cliente, { produtoId, armazem, quantidade });
    return armazem;
}

// Devolve ao armazém o que foi reservado (cancelamento/exclusão da entrega).
// Não confere capacidade: a mercadoria nunca saiu fisicamente do armazém.
async function devolverReservaDaEntrega(cliente, entrega) {
    if (!entrega.armazem_id) return; // entrega antiga, sem reserva de estoque

    await cliente.query("SELECT id FROM produtos WHERE id = $1 FOR UPDATE", [entrega.produto_id]);
    const armazem = (await bloquearArmazens(cliente, [entrega.armazem_id])).get(entrega.armazem_id);
    await creditar(cliente, { produtoId: entrega.produto_id, armazem, quantidade: entrega.quantidade, verificarCapacidade: false });
}

module.exports = {
    bloquearProduto,
    bloquearArmazens,
    exigirArmazemAtivo,
    debitar,
    creditar,
    reservarParaEntrega,
    devolverReservaDaEntrega
};
