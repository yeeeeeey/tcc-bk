const fs = require("fs");
const path = require("path");

// Roda o database/schema.sql no banco do DATABASE_URL.
// O script só usa CREATE/ALTER ... IF NOT EXISTS e blocos que conferem o catálogo,
// então pode ser rodado de novo sem apagar dados. Tudo acontece em uma transação.
const caminhoSchema = path.resolve(__dirname, "../../../database/schema.sql");

async function aplicarSchema() {
    const pool = require("./connection");
    try {
        const sql = fs.readFileSync(caminhoSchema, "utf8");
        await pool.query("SET client_min_messages = warning");
        await pool.query(sql);
    } finally {
        await pool.end();
    }
}

// "npm run db:schema"
if (require.main === module) {
    aplicarSchema()
        .then(() => console.log("Schema aplicado com sucesso!"))
        .catch((erro) => {
            console.error("Erro ao aplicar o schema:", erro.message);
            process.exitCode = 1;
        });
}

module.exports = { aplicarSchema };
