// SEC-03 e SEC-13: cadastro público, criação administrativa e validação sem 500
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, pool, request, SENHA, prepararBanco, entrar, encerrar } = require("./ajuda");

describe("Usuários", () => {
    let ids;
    let admin;

    before(async () => {
        ids = await prepararBanco();
        admin = await entrar("admin");
    });
    after(encerrar);

    it("cadastro público recusa o campo perfil", async () => {
        const resposta = await request(app).post("/usuarios/cadastro")
            .send({ nome: "Mallory", email: "mallory@teste.com", senha: "Senha12345", perfil: "administrador" });
        assert.equal(resposta.status, 400);
        assert.match(resposta.body.erro, /perfil/);
        const existe = await pool.query("SELECT 1 FROM usuarios WHERE email = 'mallory@teste.com'");
        assert.equal(existe.rowCount, 0);
    });

    it("cadastro público cria operador INATIVO, que só entra após aprovação", async () => {
        const cadastro = await request(app).post("/usuarios/cadastro")
            .send({ nome: "Maria", email: "Maria@Teste.com", senha: "Senha12345", cnpj: null });
        assert.equal(cadastro.status, 201);
        assert.equal(cadastro.body.ativo, false);
        assert.equal(cadastro.body.email, "maria@teste.com");

        const linha = await pool.query("SELECT perfil, ativo FROM usuarios WHERE id = $1", [cadastro.body.id]);
        assert.deepEqual(linha.rows[0], { perfil: "operador", ativo: false });

        const antes = await request(app).post("/usuarios/login").send({ login: "maria@teste.com", senha: "Senha12345" });
        assert.equal(antes.status, 403);

        const aprovacao = await admin.put(`/usuarios/${cadastro.body.id}`).send({ ativo: true });
        assert.equal(aprovacao.status, 200);

        const depois = await request(app).post("/usuarios/login").send({ login: "maria@teste.com", senha: "Senha12345" });
        assert.equal(depois.status, 200);
        assert.equal(depois.body.perfil, "operador");

        const auditoria = await pool.query("SELECT 1 FROM auditoria WHERE acao = 'aprovar' AND recurso_id = $1", [String(cadastro.body.id)]);
        assert.equal(auditoria.rowCount, 1);
    });

    it("e-mail longo (até 150) não gera mais erro 500", async () => {
        const email = `${"a".repeat(130)}@teste.com.br`;
        const resposta = await request(app).post("/usuarios/cadastro").send({ nome: "Longo", email, senha: "Senha12345" });
        assert.equal(resposta.status, 201);
    });

    it("entradas inválidas na criação administrativa viram 400, nunca 500", async () => {
        const casos = [
            { login: "novo1", senha: 12345678 },
            { login: "novo2", senha: "curta1" },
            { login: "novo3", senha: "somenteletras" },
            { login: "com espaco", senha: "Senha12345" },
            { login: "novo4", senha: "Senha12345", perfil: "superadmin" },
            { login: "novo5", senha: "Senha12345", email: "invalido" },
            { login: "novo6", senha: "Senha12345", email: `${"b".repeat(150)}@x.com` },
            { login: "novo7", senha: "Senha12345", cnpj: "12.345.678/0001-00" },
            { login: "novo8", senha: "Senha12345", campoDesconhecido: 1 },
            { login: ["array"], senha: "Senha12345" },
            {}
        ];
        for (const corpo of casos) {
            const resposta = await admin.post("/usuarios").send(corpo);
            assert.equal(resposta.status, 400, JSON.stringify(corpo));
            assert.ok(resposta.body.erro);
        }
    });

    it("cadastro público e criação administrativa seguem a mesma regra de senha", async () => {
        const publico = await request(app).post("/usuarios/cadastro").send({ nome: "X", email: "x@teste.com", senha: "12345678" });
        const administrativo = await admin.post("/usuarios").send({ login: "x2", senha: "12345678" });
        assert.equal(publico.status, 400);
        assert.equal(administrativo.status, 400);
    });

    it("JSON malformado e corpo vazio viram 400", async () => {
        const malformado = await admin.post("/usuarios").set("Content-Type", "application/json").send("{login:");
        assert.equal(malformado.status, 400);
        const vazio = await admin.post("/usuarios");
        assert.equal(vazio.status, 400);
    });

    it("administrador cria usuário com perfil, e a criação é auditada sem senha", async () => {
        const resposta = await admin.post("/usuarios").send({ login: "Gerente2", senha: "Senha12345", perfil: "gerente_logistico" });
        assert.equal(resposta.status, 201);
        assert.equal(resposta.body.login, "gerente2");
        assert.equal(resposta.body.senha, undefined);

        const duplicado = await admin.post("/usuarios").send({ login: "GERENTE2", senha: "Senha12345" });
        assert.equal(duplicado.status, 409);

        const auditoria = await pool.query("SELECT detalhes FROM auditoria WHERE acao = 'criar' AND recurso = 'usuarios'");
        assert.equal(auditoria.rowCount, 1);
        assert.doesNotMatch(JSON.stringify(auditoria.rows[0].detalhes), /senha|Senha12345/i);
    });

    it("administrador não remove o próprio acesso nem o último administrador", async () => {
        assert.equal((await admin.put(`/usuarios/${ids.admin}`).send({ perfil: "operador" })).status, 409);
        assert.equal((await admin.put(`/usuarios/${ids.admin}`).send({ ativo: false })).status, 409);
        assert.equal((await admin.delete(`/usuarios/${ids.admin}`)).status, 409);
    });

    it("exclusão de usuário é lógica e derruba as sessões dele", async () => {
        const op2 = await entrar("operador2");
        assert.equal((await admin.delete(`/usuarios/${ids.operador2}`)).status, 200);
        assert.equal((await op2.get("/produtos")).status, 401);
        const linha = await pool.query("SELECT excluido_em IS NOT NULL AS excluido FROM usuarios WHERE id = $1", [ids.operador2]);
        assert.equal(linha.rows[0].excluido, true);
    });

    it("meu perfil: edita nome e preferências, mas não o próprio perfil", async () => {
        const operador = await entrar("operador");
        const tentativa = await operador.put("/usuarios/me").send({ perfil: "administrador" });
        assert.equal(tentativa.status, 400);

        const resposta = await operador.put("/usuarios/me").send({ nome: "Olga S.", preferencias: { itens_por_pagina: 50 } });
        assert.equal(resposta.status, 200);
        assert.equal(resposta.body.nome, "Olga S.");
        assert.equal(resposta.body.preferencias.itens_por_pagina, 50);

        const outra = await operador.put("/usuarios/me").send({ preferencias: { tela_inicial: "entregas" } });
        assert.deepEqual(outra.body.preferencias, { itens_por_pagina: 50, tela_inicial: "entregas" });
    });

    it("troca de senha exige a senha atual e encerra as outras sessões", async () => {
        const navegador1 = await entrar("gerente");
        const navegador2 = await entrar("gerente");

        const errada = await navegador1.put("/usuarios/me/senha").send({ senha_atual: "errada", nova_senha: "NovaSenha123" });
        assert.equal(errada.status, 400);

        const certa = await navegador1.put("/usuarios/me/senha").send({ senha_atual: SENHA, nova_senha: "NovaSenha123" });
        assert.equal(certa.status, 200);
        assert.equal((await navegador1.get("/usuarios/me")).status, 200);
        assert.equal((await navegador2.get("/usuarios/me")).status, 401);

        assert.equal((await request(app).post("/usuarios/login").send({ login: "gerente", senha: SENHA })).status, 401);
        assert.equal((await request(app).post("/usuarios/login").send({ login: "gerente", senha: "NovaSenha123" })).status, 200);
    });
});
