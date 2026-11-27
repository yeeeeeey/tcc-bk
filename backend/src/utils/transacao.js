const pool = require("../database/connection");

// Executa "fn" dentro de BEGIN/COMMIT usando um único cliente do pool.
// Qualquer erro dispara ROLLBACK, então nenhuma gravação parcial fica no banco.
async function comTransacao(fn) {
    const cliente = await pool.connect();
    let erroDeConexao;

    try {
        await cliente.query("BEGIN");
        const resultado = await fn(cliente);
        await cliente.query("COMMIT");
        return resultado;
    } catch (erro) {
        try {
            await cliente.query("ROLLBACK");
        } catch (erroRollback) {
            // Conexão quebrada: descartada em vez de devolvida ao pool
            erroDeConexao = erroRollback;
        }
        throw erro;
    } finally {
        cliente.release(erroDeConexao);
    }
}

module.exports = { comTransacao };
