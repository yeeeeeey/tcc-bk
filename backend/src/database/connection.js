const { Pool, types } = require("pg");
require("../config/ambiente");

// Colunas DATE voltam como texto "AAAA-MM-DD". Sem isso o pg cria um Date no fuso
// do servidor e a data pode "voltar um dia" quando o front está em outro fuso.
types.setTypeParser(1082, (valor) => valor);

// A Neon fornece essa string em "Connection Details" do painel.
// Formato: postgresql://usuario:senha@host/nome_do_banco?sslmode=require
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida. Crie o arquivo .env na raiz do repositório (veja .env.example) ou defina a variável no painel da Vercel.");
}

// Parâmetros de SSL da URL (sslmode, sslrootcert...) têm precedência sobre a opção
// "ssl" do pg. Eles são removidos para que a configuração abaixo seja a única
// que vale, e ninguém desligue a verificação só trocando a URL (ex.: sslmode=no-verify).
function urlSemParametrosDeSSL(url) {
    try {
        const endereco = new URL(url);
        for (const parametro of ["ssl", "sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"]) {
            endereco.searchParams.delete(parametro);
        }
        return endereco.toString();
    } catch {
        return url;
    }
}

// TLS com verificação do certificado do servidor (SEC-12). A Neon usa certificados
// de autoridades públicas, já reconhecidas pelo Node. Para um provedor com CA
// própria, coloque o certificado (PEM) em DATABASE_CA_CERT.
// Para um Postgres local sem SSL, use DATABASE_SSL=false no .env.
function configuracaoSSL() {
    if (process.env.DATABASE_SSL === "false") {
        return false;
    }

    const ssl = { rejectUnauthorized: true };
    if (process.env.DATABASE_CA_CERT) {
        ssl.ca = process.env.DATABASE_CA_CERT.replace(/\\n/g, "\n");
    }
    return ssl;
}

const pool = new Pool({
    connectionString: urlSemParametrosDeSSL(process.env.DATABASE_URL),
    ssl: configuracaoSSL()
});

// Sem isso, uma conexão ociosa derrubada pelo servidor encerra o processo.
pool.on("error", (erro) => {
    console.error(JSON.stringify({ tipo: "erro_banco", mensagem: erro.message }));
});

module.exports = pool;
