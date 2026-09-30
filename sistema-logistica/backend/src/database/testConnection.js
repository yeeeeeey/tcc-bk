const pool = require("./connection");  

async function testarConexao() {
    try {
        const cliente = await pool.connect();

        console.log("Conectado ao banco de dados com sucesso!");

        cliente.release();
    } catch (erro) {
        console.error("Erro ao conectar ao banco:", erro.message);
    } finally {
        await pool.end();
    }
}

testarConexao();
