// SEC-11: limite de tentativas sem bloquear indiscriminadamente usuários legítimos
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, pool, request, SENHA, prepararBanco, encerrar } = require("./ajuda");

const tentar = (login, senha) => request(app).post("/usuarios/login").send({ login, senha });

describe("Limite de tentativas de login", () => {
    before(prepararBanco);
    after(encerrar);

    it("após 5 falhas na mesma conta e IP, responde 429 com Retry-After", async () => {
        for (let i = 0; i < 5; i++) {
            assert.equal((await tentar("operador", "errada123")).status, 401);
        }
        const bloqueada = await tentar("operador", "errada123");
        assert.equal(bloqueada.status, 429);
        assert.ok(Number(bloqueada.headers["retry-after"]) > 0);
    });

    it("durante o bloqueio, nem a senha certa entra (evita adivinhação)", async () => {
        assert.equal((await tentar("operador", SENHA)).status, 429);
    });

    it("outro usuário legítimo no mesmo IP continua entrando", async () => {
        assert.equal((await tentar("gerente", SENHA)).status, 200);
    });

    it("o bloqueio é temporário", async () => {
        await pool.query("UPDATE tentativas_login SET bloqueado_ate = NOW() - INTERVAL '1 second', atualizado_em = NOW() - INTERVAL '1 hour'");
        assert.equal((await tentar("operador", SENHA)).status, 200);
    });

    it("o bloqueio cresce a cada nova falha (atraso progressivo)", async () => {
        for (let i = 0; i < 5; i++) await tentar("operador2", "errada123");
        const primeiro = await pool.query("SELECT MAX(bloqueado_ate - NOW()) AS resto FROM tentativas_login WHERE bloqueado_ate > NOW()");

        await pool.query("UPDATE tentativas_login SET bloqueado_ate = NOW() - INTERVAL '1 second' WHERE bloqueado_ate > NOW()");
        await tentar("operador2", "errada123");
        const segundo = await pool.query("SELECT MAX(bloqueado_ate - NOW()) AS resto FROM tentativas_login WHERE bloqueado_ate > NOW()");

        const segundos = (intervalo) => (intervalo.minutes || 0) * 60 + (intervalo.seconds || 0);
        assert.ok(segundos(segundo.rows[0].resto) > segundos(primeiro.rows[0].resto));
    });

    it("falhas ficam na auditoria sem a senha digitada", async () => {
        const resultado = await pool.query("SELECT detalhes FROM auditoria WHERE acao = 'login' AND resultado = 'falha'");
        assert.ok(resultado.rowCount >= 5);
        assert.doesNotMatch(JSON.stringify(resultado.rows), /errada123/);
    });
});
