// SEC-14, SEC-18, SEC-20 a SEC-24: estoque, entregas, rastreamento e movimentações
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool, prepararBanco, entrar, encerrar } = require("./ajuda");

async function saldo(produtoId, armazemId) {
    const r = await pool.query("SELECT quantidade_disponivel FROM estoque WHERE produto_id = $1 AND armazem_id = $2", [produtoId, armazemId]);
    return r.rows[0]?.quantidade_disponivel ?? 0;
}

async function total(produtoId) {
    const r = await pool.query("SELECT quantidade FROM produtos WHERE id = $1", [produtoId]);
    return r.rows[0].quantidade;
}

describe("Logística", () => {
    let admin;
    let gerente;
    let operador;
    let armazemA;
    let armazemB;
    let produto;

    before(async () => {
        await prepararBanco();
        admin = await entrar("admin");
        gerente = await entrar("gerente");
        operador = await entrar("operador");

        armazemA = (await gerente.post("/armazens").send({ nome: "A", localizacao: "SP", capacidade_maxima: 100 })).body;
        armazemB = (await gerente.post("/armazens").send({ nome: "B", localizacao: "PR", capacidade_maxima: 50 })).body;
        produto = (await gerente.post("/produtos").send({ nome: "Caixa", preco: 12.5, quantidade: 30, armazem_id: armazemA.id })).body;
    });
    after(encerrar);

    describe("Estoque e regras de valor (SEC-14)", () => {
        it("estoque inicial entra no armazém e o total do produto acompanha", async () => {
            assert.equal(produto.quantidade, 30);
            assert.equal(await saldo(produto.id, armazemA.id), 30);
        });

        it("valores negativos ou fora do tipo são recusados com 400", async () => {
            assert.equal((await gerente.post("/produtos").send({ nome: "X", preco: -1 })).status, 400);
            assert.equal((await gerente.post("/produtos").send({ nome: "X", preco: "abc" })).status, 400);
            assert.equal((await gerente.post("/armazens").send({ nome: "X", localizacao: "Y", capacidade_maxima: -5 })).status, 400);
            assert.equal((await gerente.post("/entregas").send({ produto_id: produto.id, quantidade: 0, destino: "Rua" })).status, 400);
            assert.equal((await gerente.post("/veiculos").send({ placa: "123", modelo: "VUC" })).status, 400);
            assert.equal((await gerente.post("/armazens").send({ nome: "X", localizacao: "Y", status: "qualquer" })).status, 400);
        });

        it("a quantidade do produto não é editável diretamente", async () => {
            const resposta = await gerente.put(`/produtos/${produto.id}`).send({ quantidade: 999 });
            assert.equal(resposta.status, 400);
            assert.equal(await total(produto.id), 30);
        });

        it("o banco também impede saldo negativo (CHECK)", async () => {
            await assert.rejects(
                pool.query("UPDATE estoque SET quantidade_disponivel = -1 WHERE produto_id = $1", [produto.id]),
                (erro) => erro.code === "23514"
            );
        });

        it("capacidade do armazém não pode ficar abaixo da ocupação", async () => {
            const resposta = await gerente.put(`/armazens/${armazemA.id}`).send({ capacidade_maxima: 10 });
            assert.equal(resposta.status, 409);
        });
    });

    describe("Entregas reservam estoque (SEC-22)", () => {
        it("sem saldo suficiente: 409 e nada gravado", async () => {
            const antes = await pool.query("SELECT COUNT(*)::int AS n FROM entregas");
            const resposta = await gerente.post("/entregas").send({ produto_id: produto.id, quantidade: 31, destino: "Rua A" });
            assert.equal(resposta.status, 409);
            const depois = await pool.query("SELECT COUNT(*)::int AS n FROM entregas");
            assert.equal(depois.rows[0].n, antes.rows[0].n);
            assert.equal(await total(produto.id), 30);
        });

        it("com saldo: reserva no armazém e nasce pendente", async () => {
            const resposta = await gerente.post("/entregas").send({ produto_id: produto.id, quantidade: 10, destino: "Rua A" });
            assert.equal(resposta.status, 201);
            assert.equal(resposta.body.status, "pendente");
            assert.equal(resposta.body.armazem_id, armazemA.id);
            assert.equal(await total(produto.id), 20);
        });

        it("o status não pode ser definido na criação nem na edição", async () => {
            assert.equal((await gerente.post("/entregas").send({ produto_id: produto.id, destino: "Rua", status: "entregue" })).status, 400);
            assert.equal((await gerente.put("/entregas/1").send({ status: "entregue" })).status, 400);
        });

        it("pedidos simultâneos nunca deixam o saldo negativo", async () => {
            // Saldo atual: 20. Cinco pedidos de 6 ao mesmo tempo: só 3 cabem.
            const respostas = await Promise.all(
                Array.from({ length: 5 }, () => gerente.post("/entregas").send({ produto_id: produto.id, quantidade: 6, destino: "Rua B" }))
            );
            const criadas = respostas.filter((r) => r.status === 201).length;
            const recusadas = respostas.filter((r) => r.status === 409).length;
            assert.equal(criadas, 3);
            assert.equal(recusadas, 2);
            assert.equal(await total(produto.id), 2);
            assert.equal(await saldo(produto.id, armazemA.id), 2);
        });
    });

    describe("Rastreamento e transições de status (SEC-20, SEC-21, SEC-24)", () => {
        let entregaId;

        before(async () => {
            await gerente.post("/movimentacoes").send({ produto_id: produto.id, quantidade: 20, armazem_destino_id: armazemA.id, origem: "Fornecedor" });
            entregaId = (await gerente.post("/entregas").send({ produto_id: produto.id, quantidade: 5, destino: "Rua C" })).body.id;
        });

        it("transição inválida é recusada (pendente → entregue)", async () => {
            const resposta = await operador.post("/rastreamento").send({ entrega_id: entregaId, localizacao_atual: "CD", status: "entregue" });
            assert.equal(resposta.status, 409);
        });

        it("evento válido atualiza o status da entrega", async () => {
            const resposta = await operador.post("/rastreamento").send({ entrega_id: entregaId, localizacao_atual: "CD SP" });
            assert.equal(resposta.status, 201);
            const entrega = await pool.query("SELECT status FROM entregas WHERE id = $1", [entregaId]);
            assert.equal(entrega.rows[0].status, "em transito");
        });

        it("falha entre o INSERT do evento e o UPDATE da entrega desfaz os dois (ROLLBACK)", async () => {
            await pool.query(`
                CREATE OR REPLACE FUNCTION falha_simulada() RETURNS trigger AS $$
                BEGIN
                    IF NEW.status = 'entregue' THEN RAISE EXCEPTION 'falha simulada'; END IF;
                    RETURN NEW;
                END; $$ LANGUAGE plpgsql;
                CREATE TRIGGER falha_simulada BEFORE UPDATE ON entregas FOR EACH ROW EXECUTE FUNCTION falha_simulada();
            `);
            try {
                const eventosAntes = await pool.query("SELECT COUNT(*)::int AS n FROM rastreamento WHERE entrega_id = $1", [entregaId]);
                const resposta = await operador.post("/rastreamento").send({ entrega_id: entregaId, localizacao_atual: "Cliente", status: "entregue" });
                assert.equal(resposta.status, 500);
                assert.equal(resposta.body.erro, "Erro interno do servidor");

                const eventosDepois = await pool.query("SELECT COUNT(*)::int AS n FROM rastreamento WHERE entrega_id = $1", [entregaId]);
                assert.equal(eventosDepois.rows[0].n, eventosAntes.rows[0].n, "o evento não pode ficar órfão");
                const entrega = await pool.query("SELECT status FROM entregas WHERE id = $1", [entregaId]);
                assert.equal(entrega.rows[0].status, "em transito");
            } finally {
                await pool.query("DROP TRIGGER falha_simulada ON entregas; DROP FUNCTION falha_simulada();");
            }
        });

        it("correção retroativa: só administrador e só no evento mais recente", async () => {
            const primeiro = (await operador.post("/rastreamento").send({ entrega_id: entregaId, localizacao_atual: "BR-116" })).body;
            const ultimo = (await operador.post("/rastreamento").send({ entrega_id: entregaId, localizacao_atual: "Cliente", status: "entregue" })).body;

            assert.equal((await gerente.put(`/rastreamento/${ultimo.id}`).send({ localizacao_atual: "X" })).status, 403);
            assert.equal((await admin.put(`/rastreamento/${primeiro.id}`).send({ localizacao_atual: "X" })).status, 409);

            const removido = await admin.delete(`/rastreamento/${ultimo.id}`);
            assert.equal(removido.status, 200);
            const entrega = await pool.query("SELECT status FROM entregas WHERE id = $1", [entregaId]);
            assert.equal(entrega.rows[0].status, "em transito", "status recalculado a partir do histórico");

            const auditoria = await pool.query("SELECT detalhes FROM auditoria WHERE recurso = 'rastreamento' AND acao = 'excluir'");
            assert.equal(auditoria.rows[0].detalhes.status_entrega.de, "entregue");
            assert.equal(auditoria.rows[0].detalhes.status_entrega.para, "em transito");

            // O evento continua no banco (exclusão lógica)
            const linha = await pool.query("SELECT excluido_em IS NOT NULL AS excluido FROM rastreamento WHERE id = $1", [ultimo.id]);
            assert.equal(linha.rows[0].excluido, true);
        });

        it("entrega finalizada não aceita novos eventos", async () => {
            await operador.post("/rastreamento").send({ entrega_id: entregaId, localizacao_atual: "Cliente", status: "entregue" });
            const resposta = await operador.post("/rastreamento").send({ entrega_id: entregaId, localizacao_atual: "Volta", status: "em transito" });
            assert.equal(resposta.status, 409);
        });

        it("cancelamento devolve a reserva ao armazém", async () => {
            const antes = await total(produto.id);
            const entrega = (await gerente.post("/entregas").send({ produto_id: produto.id, quantidade: 4, destino: "Rua D" })).body;
            assert.equal(await total(produto.id), antes - 4);
            const cancelamento = await operador.post("/rastreamento").send({ entrega_id: entrega.id, localizacao_atual: "CD", status: "cancelado" });
            assert.equal(cancelamento.status, 201);
            assert.equal(await total(produto.id), antes);
        });
    });

    describe("Movimentações atualizam saldos (SEC-23)", () => {
        it("transferência move o saldo entre armazéns sem mudar o total", async () => {
            const totalAntes = await total(produto.id);
            const aAntes = await saldo(produto.id, armazemA.id);
            const resposta = await operador.post("/movimentacoes").send({
                produto_id: produto.id, quantidade: 10, armazem_origem_id: armazemA.id, armazem_destino_id: armazemB.id
            });
            assert.equal(resposta.status, 201);
            assert.equal(await saldo(produto.id, armazemA.id), aAntes - 10);
            assert.equal(await saldo(produto.id, armazemB.id), 10);
            assert.equal(await total(produto.id), totalAntes);
        });

        it("saldo insuficiente na origem: 409 e nenhum saldo alterado", async () => {
            const resposta = await operador.post("/movimentacoes").send({
                produto_id: produto.id, quantidade: 999, armazem_origem_id: armazemA.id, armazem_destino_id: armazemB.id
            });
            assert.equal(resposta.status, 409);
            assert.equal(await saldo(produto.id, armazemB.id), 10);
        });

        it("capacidade do destino é respeitada", async () => {
            const resposta = await operador.post("/movimentacoes").send({ produto_id: produto.id, quantidade: 41, armazem_destino_id: armazemB.id });
            assert.equal(resposta.status, 409);
            assert.match(resposta.body.erro, /Capacidade/);
        });

        it("saída externa reduz armazém e total", async () => {
            const totalAntes = await total(produto.id);
            const resposta = await operador.post("/movimentacoes").send({ produto_id: produto.id, quantidade: 3, armazem_origem_id: armazemB.id, destino: "Cliente" });
            assert.equal(resposta.status, 201);
            assert.equal(await total(produto.id), totalAntes - 3);
        });

        it("movimentação não é editável; estorno (admin) inverte o efeito uma única vez", async () => {
            const mov = (await operador.post("/movimentacoes").send({ produto_id: produto.id, quantidade: 5, armazem_destino_id: armazemB.id })).body;
            const bAntes = await saldo(produto.id, armazemB.id);

            assert.equal((await operador.put(`/movimentacoes/${mov.id}`).send({ quantidade: 1 })).status, 404);
            assert.equal((await operador.delete(`/movimentacoes/${mov.id}`)).status, 403);

            assert.equal((await admin.delete(`/movimentacoes/${mov.id}`)).status, 200);
            assert.equal(await saldo(produto.id, armazemB.id), bAntes - 5);
            assert.equal((await admin.delete(`/movimentacoes/${mov.id}`)).status, 409);
        });
    });

    describe("Exclusões preservam histórico (SEC-18)", () => {
        it("produto com estoque não pode ser excluído", async () => {
            assert.equal((await gerente.delete(`/produtos/${produto.id}`)).status, 409);
        });

        it("exclusão é lógica: some da API mas continua no banco", async () => {
            const outro = (await gerente.post("/produtos").send({ nome: "Temporário", preco: 1 })).body;
            assert.equal((await gerente.delete(`/produtos/${outro.id}`)).status, 200);
            assert.equal((await gerente.get(`/produtos/${outro.id}`)).status, 404);
            const linha = await pool.query("SELECT excluido_em IS NOT NULL AS excluido FROM produtos WHERE id = $1", [outro.id]);
            assert.equal(linha.rows[0].excluido, true);
        });

        it("o banco recusa exclusão física de produto com histórico (RESTRICT)", async () => {
            await assert.rejects(pool.query("DELETE FROM produtos WHERE id = $1", [produto.id]), (erro) => erro.code === "23503");
        });
    });
});
