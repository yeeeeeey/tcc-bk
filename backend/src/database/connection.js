const path = require("path");
const { Pool, types } = require("pg");

// .env fica na raiz do repositório. Na Vercel ele não existe: as variáveis vêm do painel.
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env"), quiet: true });

// Colunas DATE voltam como texto "AAAA-MM-DD". Sem isso o pg cria um Date no fuso
// do servidor e a data pode "voltar um dia" quando o front está em outro fuso.
types.setTypeParser(1082, (valor) => valor);

// A Neon fornece essa string em "Connection Details" do painel.
// Formato: postgresql://usuario:senha@host/nome_do_banco?sslmode=require
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida. Crie o arquivo .env na raiz do repositório (veja .env.example) ou defina a variável no painel da Vercel.");
}

// A Neon exige SSL. Para um Postgres local sem SSL, use DATABASE_SSL=false no .env
const usarSSL = process.env.DATABASE_SSL !== "false";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: usarSSL ? { rejectUnauthorized: false } : false
});

module.exports = pool;
