// SEC-02, SEC-03, SEC-04 e SEC-05: RBAC por perfil e acesso a registros de outros
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool, prepararBanco, entrar, encerrar } = require("./ajuda");

describe("Autorização por perfil", () => {
    let ids;
    let admin;
    let gerente;
    let operador;

    before(async () => {
        ids = await prepararBanco();
        admin = await entrar("admin");
        gerente = await entrar("gerente");
        operador = await entrar("operador");
    });
    after(encerrar);

    it("operador consulta dados operacionais", async () => {
        for (const rota of ["/produtos", "/armazens", "/estoque", "/entregas", "/rastreamento", "/veiculos", "/transportadoras", "/movimentacoes", "/dashboard"]) {
            assert.equal((await operador.get(rota)).status, 200, rota);
        }
    });

    it("operador recebe 403 em funções administrativas", async () => {
        assert.equal((await operador.get("/usuarios")).status, 403);
        assert.equal((await operador.post("/usuarios").send({ login: "novo", senha: "Senha12345", perfil: "administrador" })).status, 403);
        assert.equal((await operador.put(`/usuarios/${ids.operador}`).send({ perfil: "administrador" })).status, 403);
        assert.equal((await operador.delete(`/usuarios/${ids.admin}`)).status, 403);
        assert.equal((await operador.get("/auditoria")).status, 403);
        assert.equal((await operador.get("/perfis")).status, 403);
        assert.equal((await operador.post("/produtos").send({ nome: "X", preco: 1 })).status, 403);
        assert.equal((await operador.delete("/armazens/1")).status, 403);
        assert.equal((await operador.put("/rastreamento/1").send({ status: "entregue" })).status, 403);
    });

    it("a permissão é checada antes da validação (403, não 400)", async () => {
        const resposta = await operador.post("/usuarios").send({ lixo: true });
        assert.equal(resposta.status, 403);
    });

    it("gerente mantém cadastros, mas não gerencia usuários nem corrige histórico", async () => {
        assert.equal((await gerente.post("/armazens").send({ nome: "Armazém Norte", localizacao: "Manaus" })).status, 201);
        assert.equal((await gerente.get("/usuarios")).status, 403);
        assert.equal((await gerente.delete("/movimentacoes/1")).status, 403);
        assert.equal((await gerente.put("/rastreamento/1").send({ status: "entregue" })).status, 403);
        assert.equal((await gerente.get("/auditoria")).status, 403);
    });

    it("SEC-05: usuário lê o próprio registro, mas não o de outra pessoa", async () => {
        const proprio = await operador.get(`/usuarios/${ids.operador}`);
        assert.equal(proprio.status, 200);
        assert.equal(proprio.body.login, "operador");

        const outro = await operador.get(`/usuarios/${ids.operador2}`);
        assert.equal(outro.status, 403);
        assert.equal(outro.body.login, undefined);

        assert.equal((await admin.get(`/usuarios/${ids.operador2}`)).status, 200);
    });

    it("SEC-04: listagem de usuários é paginada e não expõe senha, CNPJ ou preferências", async () => {
        const resposta = await admin.get("/usuarios?limite=2");
        assert.equal(resposta.status, 200);
        assert.equal(resposta.body.limite, 2);
        assert.equal(resposta.body.dados.length, 2);
        assert.ok(resposta.body.total >= 4);
        for (const usuario of resposta.body.dados) {
            assert.equal(usuario.senha, undefined);
            assert.equal(usuario.cnpj, undefined);
            assert.equal(usuario.preferencias, undefined);
        }
    });

    it("tentativas negadas ficam na auditoria", async () => {
        const resultado = await pool.query(
            "SELECT COUNT(*)::int AS total FROM auditoria WHERE resultado = 'negado' AND usuario_id = $1",
            [ids.operador]
        );
        assert.ok(resultado.rows[0].total > 0);
    });

    it("mudança de perfil vale na hora (perfil é lido do banco a cada requisição)", async () => {
        const op2 = await entrar("operador2");
        assert.equal((await op2.post("/armazens").send({ nome: "A", localizacao: "B" })).status, 403);
        await pool.query("UPDATE usuarios SET perfil = 'gerente_logistico' WHERE id = $1", [ids.operador2]);
        assert.equal((await op2.post("/armazens").send({ nome: "A", localizacao: "B" })).status, 201);
        await pool.query("UPDATE usuarios SET perfil = 'operador' WHERE id = $1", [ids.operador2]);
    });
});
