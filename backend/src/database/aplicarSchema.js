const fs = require("fs");
const path = require("path");
const pool = require("./connection");

// Roda o database/schema.sql no banco do DATABASE_URL.
// O script só usa CREATE/ALTER ... IF NOT EXISTS, então pode ser rodado de novo sem apagar dados.
const caminhoSchema = path.resolve(__dirname, "../../../database/schema.sql");

async function aplicarSchema() {
    try {
        const sql = fs.readFileSync(caminhoSchema, "utf8");
        await pool.query(sql);
        console.log("Schema aplicado com sucesso!");
    } catch (erro) {
        console.error("Erro ao aplicar o schema:", erro.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

aplicarSchema();
