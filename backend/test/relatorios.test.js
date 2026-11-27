// Relatórios gerenciais: permissão, validação do período e cálculos
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, pool, request, prepararBanco, entrar, encerrar } = require("./ajuda");

describe("Relatórios", () => {
    let gerente;
    let operador;
    let hoje;

    before(async () => {
        await prepararBanco();
        gerente = await entrar("gerente");
        operador = await entrar("operador");
        hoje = (await pool.query("SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS d")).rows[0].d;

        const armazem = (await gerente.post("/armazens").send({ nome: "Central", localizacao: "SP", capacidade_maxima: 1000 })).body;
        const caixa = (await gerente.post("/produtos").send({ nome: "Caixa", preco: 1, quantidade: 200, armazem_id: armazem.id })).body;
        const palete = (await gerente.post("/produtos").send({ nome: "Palete", preco: 5, quantidade: 50, armazem_id: armazem.id })).body;

        // 1) entregue no prazo (previsão futura)
        const noPrazo = (await gerente.post("/entregas").send({ produto_id: caixa.id, quantidade: 30, destino: "A", data_prevista: "2099-01-01" })).body;
        await operador.post("/rastreamento").send({ entrega_id: noPrazo.id, localizacao_atual: "CD" });
        await operador.post("/rastreamento").send({ entrega_id: noPrazo.id, localizacao_atual: "Cliente", status: "entregue" });

        // 2) entregue fora do prazo (previsão no passado)
        const atrasada = (await gerente.post("/entregas").send({ produto_id: caixa.id, quantidade: 10, destino: "B", data_prevista: "2020-01-01" })).body;
        await operador.post("/rastreamento").send({ entrega_id: atrasada.id, localizacao_atual: "CD" });
        await operador.post("/rastreamento").send({ entrega_id: atrasada.id, localizacao_atual: "Cliente", status: "entregue" });

        // 3) cancelada (não conta nas unidades enviadas)
        const cancelada = (await gerente.post("/entregas").send({ produto_id: palete.id, quantidade: 5, destino: "C" })).body;
        await operador.post("/rastreamento").send({ entrega_id: cancelada.id, localizacao_atual: "CD", status: "cancelado" });

        // 4) em andamento e vencida
        await gerente.post("/entregas").send({ produto_id: palete.id, quantidade: 4, destino: "D", data_prevista: "2020-01-01" });

        // Movimentações: entrada 20, saída 7, transferência 3 (+ uma estornada que não conta)
        const outro = (await gerente.post("/armazens").send({ nome: "Sul", localizacao: "PR" })).body;
        await operador.post("/movimentacoes").send({ produto_id: caixa.id, quantidade: 20, armazem_destino_id: armazem.id });
        await operador.post("/movimentacoes").send({ produto_id: caixa.id, quantidade: 7, armazem_origem_id: armazem.id });
        await operador.post("/movimentacoes").send({ produto_id: caixa.id, quantidade: 3, armazem_origem_id: armazem.id, armazem_destino_id: outro.id });
        const estornada = (await operador.post("/movimentacoes").send({ produto_id: caixa.id, quantidade: 9, armazem_destino_id: armazem.id })).body;
        const admin = await entrar("admin");
        await admin.delete(`/movimentacoes/${estornada.id}`);
    });
    after(encerrar);

    it("exige login e perfil de gestão", async () => {
        assert.equal((await request(app).get("/relatorios")).status, 401);
        assert.equal((await operador.get("/relatorios")).status, 403);
        assert.equal((await gerente.get("/relatorios")).status, 200);
    });

    it("valida o período", async () => {
        assert.equal((await gerente.get("/relatorios?de=2026-02-30")).status, 400);
        assert.equal((await gerente.get("/relatorios?de=2026-05-10&ate=2026-05-01")).status, 400);
        assert.equal((await gerente.get("/relatorios?de=2024-01-01&ate=2026-01-01")).status, 400);
    });

    it("sem datas, usa os últimos 30 dias até hoje", async () => {
        const { body } = await gerente.get("/relatorios");
        assert.equal(body.periodo.ate, hoje);
        assert.equal(body.entregas_por_dia.length, 30);
        assert.equal(body.entregas_por_dia.at(-1).dia, hoje);
    });

    it("calcula entregas, prazo e unidades", async () => {
        const { body } = await gerente.get(`/relatorios?de=${hoje}&ate=${hoje}`);
        const e = body.entregas;
        assert.equal(e.criadas, 4);
        assert.equal(e.entregues, 2);
        assert.equal(e.canceladas, 1);
        assert.equal(e.em_andamento, 1);
        assert.equal(e.atrasadas, 1);
        assert.equal(e.entregues_no_prazo, 1);
        assert.equal(e.taxa_no_prazo, 50);
        assert.equal(e.unidades_enviadas, 44);
        assert.deepEqual(body.entregas_por_dia, [{ dia: hoje, total: 4 }]);
    });

    it("lista status, produtos mais enviados e ocupação dos armazéns", async () => {
        const { body } = await gerente.get(`/relatorios?de=${hoje}&ate=${hoje}`);
        assert.deepEqual(body.entregas_por_status.find((s) => s.status === "entregue"), { status: "entregue", total: 2 });
        assert.equal(body.produtos_mais_enviados[0].nome, "Caixa");
        assert.equal(body.produtos_mais_enviados[0].unidades, 40);
        const central = body.armazens.find((a) => a.nome === "Central");
        assert.equal(central.capacidade_maxima, 1000);
        assert.ok(central.ocupacao > 0);
    });

    it("separa movimentações por tipo e ignora estornos", async () => {
        const { body } = await gerente.get(`/relatorios?de=${hoje}&ate=${hoje}`);
        assert.deepEqual(body.movimentacoes, { entradas: 20, saidas: 7, transferencias: 3, registros: 3 });
    });

    it("período sem dados devolve zeros, não erro", async () => {
        const { body, status } = await gerente.get("/relatorios?de=2020-01-01&ate=2020-01-31");
        assert.equal(status, 200);
        assert.equal(body.entregas.criadas, 0);
        assert.equal(body.entregas.taxa_no_prazo, null);
        assert.equal(body.entregas_por_dia.length, 31);
    });
});
