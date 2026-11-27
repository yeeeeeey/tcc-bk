// SEC-15, SEC-16, SEC-17 e validações gerais de entrada
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, pool, request, prepararBanco, entrar, encerrar } = require("./ajuda");

describe("Cabeçalhos, CORS, auditoria e entradas", () => {
    let admin;

    before(async () => {
        await prepararBanco();
        admin = await entrar("admin");
    });
    after(encerrar);

    it("SEC-16: sem X-Powered-By e com cabeçalhos de segurança", async () => {
        const resposta = await request(app).get("/health");
        assert.equal(resposta.headers["x-powered-by"], undefined);
        assert.equal(resposta.headers["x-content-type-options"], "nosniff");
        assert.match(resposta.headers["content-security-policy"], /default-src 'none'/);
        assert.equal(resposta.headers["cache-control"], "no-store");
    });

    it("SEC-15: origem desconhecida não recebe Access-Control-Allow-Origin", async () => {
        const resposta = await request(app).get("/health").set("Origin", "https://site-malicioso.example");
        assert.equal(resposta.headers["access-control-allow-origin"], undefined);
    });

    it("SEC-15: origem do frontend local é aceita com credenciais", async () => {
        const resposta = await request(app).get("/health").set("Origin", "http://localhost:5173");
        assert.equal(resposta.headers["access-control-allow-origin"], "http://localhost:5173");
        assert.equal(resposta.headers["access-control-allow-credentials"], "true");
    });

    it("SEC-17: ação administrativa gera registro de auditoria completo", async () => {
        const resposta = await admin.post("/transportadoras").send({ nome: "Veloz", cnpj: "11222333000181" });
        assert.equal(resposta.status, 201);
        assert.equal(resposta.body.cnpj, "11.222.333/0001-81");

        const registro = await pool.query(
            "SELECT usuario_login, perfil, acao, recurso, recurso_id, resultado, ip, criado_em FROM auditoria WHERE recurso = 'transportadoras'"
        );
        assert.equal(registro.rowCount, 1);
        const linha = registro.rows[0];
        assert.equal(linha.usuario_login, "admin");
        assert.equal(linha.perfil, "administrador");
        assert.equal(linha.acao, "criar");
        assert.equal(linha.recurso_id, String(resposta.body.id));
        assert.equal(linha.resultado, "sucesso");
        assert.ok(linha.ip);
        assert.ok(linha.criado_em);
    });

    it("a auditoria é consultável pelo administrador, paginada", async () => {
        const resposta = await admin.get("/auditoria?limite=5");
        assert.equal(resposta.status, 200);
        assert.ok(resposta.body.dados.length > 0);
        assert.ok(resposta.body.dados.length <= 5);
    });

    it("parâmetros inválidos viram 400", async () => {
        assert.equal((await admin.get("/produtos/abc")).status, 400);
        assert.equal((await admin.get("/produtos/-1")).status, 400);
        assert.equal((await admin.get("/produtos?limite=500")).status, 400);
        assert.equal((await admin.get("/produtos?pagina=0")).status, 400);
        assert.equal((await admin.get("/busca?q=a")).status, 400);
    });

    it("registro inexistente vira 404 e rota inexistente também", async () => {
        assert.equal((await admin.get("/produtos/999999")).status, 404);
        assert.equal((await admin.get("/rota-que-nao-existe")).status, 404);
    });

    it("corpo grande demais vira 413", async () => {
        const resposta = await admin.post("/produtos").send({ nome: "x".repeat(200 * 1024), preco: 1 });
        assert.equal(resposta.status, 413);
    });

    it("busca trata % e _ como texto (sem curinga injetado)", async () => {
        await admin.post("/produtos").send({ nome: "Palete", preco: 1 });
        const curinga = await admin.get("/busca?q=%25%25");
        assert.equal(curinga.status, 200);
        assert.equal(curinga.body.resultados.produtos.length, 0);

        const real = await admin.get("/busca?q=pal");
        assert.equal(real.body.resultados.produtos[0].titulo, "Palete");
    });

    it("busca respeita o perfil: operador não recebe usuários", async () => {
        const operador = await entrar("operador");
        const resposta = await operador.get("/busca?q=adm");
        assert.equal(resposta.status, 200);
        assert.equal(resposta.body.resultados.usuarios, undefined);
    });

    it("listagens aceitam filtro de busca e paginação", async () => {
        const resposta = await admin.get("/transportadoras?busca=velo&limite=1");
        assert.equal(resposta.status, 200);
        assert.equal(resposta.body.dados.length, 1);
        assert.equal(resposta.body.dados[0].nome, "Veloz");
    });

    it("CNPJ inválido em transportadora vira 400, duplicado vira 409", async () => {
        assert.equal((await admin.post("/transportadoras").send({ nome: "X", cnpj: "11.111.111/1111-11" })).status, 400);
        assert.equal((await admin.post("/transportadoras").send({ nome: "Y", cnpj: "11.222.333/0001-81" })).status, 409);
    });
});
