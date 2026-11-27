// SEC-01 e SEC-10: rotas protegidas, sessão no servidor, logout e expiração reais
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, pool, request, SENHA, prepararBanco, entrar, encerrar } = require("./ajuda");

const ROTAS_PROTEGIDAS = [
    "/usuarios", "/usuarios/1", "/produtos", "/produtos/1", "/armazens", "/estoque", "/movimentacoes",
    "/entregas", "/rastreamento", "/rastreamento/entrega/1", "/transportadoras", "/veiculos",
    "/dashboard", "/busca?q=caixa", "/perfis", "/auditoria", "/usuarios/me"
];

describe("Autenticação", () => {
    before(prepararBanco);
    after(encerrar);

    it("visitante recebe 401 em todas as rotas internas (com e sem /api)", async () => {
        for (const rota of ROTAS_PROTEGIDAS) {
            const semPrefixo = await request(app).get(rota);
            assert.equal(semPrefixo.status, 401, `GET ${rota}`);
            const comPrefixo = await request(app).get(`/api${rota}`);
            assert.equal(comPrefixo.status, 401, `GET /api${rota}`);
        }
    });

    it("visitante recebe 401 também em escritas", async () => {
        assert.equal((await request(app).post("/usuarios").send({ login: "x", senha: "y" })).status, 401);
        assert.equal((await request(app).post("/produtos").send({ nome: "x", preco: 1 })).status, 401);
        assert.equal((await request(app).delete("/veiculos/1")).status, 401);
        assert.equal((await request(app).put("/rastreamento/1").send({ status: "entregue" })).status, 401);
    });

    it("rotas públicas continuam abertas", async () => {
        assert.equal((await request(app).get("/")).status, 200);
        assert.equal((await request(app).get("/health")).status, 200);
    });

    it("login cria cookie HttpOnly + SameSite=Strict e não devolve a senha", async () => {
        const resposta = await request(app).post("/usuarios/login").send({ login: "admin", senha: SENHA });
        assert.equal(resposta.status, 200);
        const cookie = resposta.headers["set-cookie"].find((c) => c.startsWith("bankai_sessao="));
        assert.ok(cookie, "cookie de sessão enviado");
        assert.match(cookie, /HttpOnly/i);
        assert.match(cookie, /SameSite=Strict/i);
        assert.equal(resposta.body.senha, undefined);
        assert.ok(resposta.body.permissoes.includes("usuarios:ler"));
    });

    it("o banco guarda só o hash do token", async () => {
        const resposta = await request(app).post("/usuarios/login").send({ login: "gerente", senha: SENHA });
        const token = resposta.headers["set-cookie"][0].split(";")[0].split("=")[1];
        const linhas = await pool.query("SELECT token_hash FROM sessoes WHERE token_hash = $1", [token]);
        assert.equal(linhas.rowCount, 0);
    });

    it("credenciais erradas recebem a mesma mensagem genérica", async () => {
        const senhaErrada = await request(app).post("/usuarios/login").send({ login: "operador2", senha: "errada123" });
        const loginInexistente = await request(app).post("/usuarios/login").send({ login: "ninguem", senha: "errada123" });
        assert.equal(senhaErrada.status, 401);
        assert.equal(loginInexistente.status, 401);
        assert.equal(senhaErrada.body.erro, loginInexistente.body.erro);
    });

    it("logout apaga a sessão no servidor: o cookie antigo deixa de valer", async () => {
        const resposta = await request(app).post("/usuarios/login").send({ login: "operador", senha: SENHA });
        const cookie = resposta.headers["set-cookie"][0].split(";")[0];

        assert.equal((await request(app).get("/usuarios/me").set("Cookie", cookie)).status, 200);
        assert.equal((await request(app).post("/usuarios/logout").set("Cookie", cookie)).status, 200);
        assert.equal((await request(app).get("/usuarios/me").set("Cookie", cookie)).status, 401);
    });

    it("sessão expirada não vale mais", async () => {
        const agente = await entrar("operador");
        assert.equal((await agente.get("/produtos")).status, 200);
        await pool.query("UPDATE sessoes SET expira_em = NOW() - INTERVAL '1 minute'");
        assert.equal((await agente.get("/produtos")).status, 401);
    });

    it("conta desativada perde o acesso imediatamente", async () => {
        const agente = await entrar("operador2");
        assert.equal((await agente.get("/produtos")).status, 200);
        await pool.query("UPDATE usuarios SET ativo = FALSE WHERE login = 'operador2'");
        assert.equal((await agente.get("/produtos")).status, 401);
        await pool.query("UPDATE usuarios SET ativo = TRUE WHERE login = 'operador2'");
    });

    it("cookie forjado é recusado", async () => {
        const resposta = await request(app).get("/produtos").set("Cookie", "bankai_sessao=forjado-forjado-forjado-forjado");
        assert.equal(resposta.status, 401);
    });
});
