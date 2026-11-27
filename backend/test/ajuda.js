// Preparação comum dos testes de integração.
//
// ATENÇÃO: os testes APAGAM e recriam todas as tabelas do banco indicado em
// TEST_DATABASE_URL. Nunca aponte para o banco de produção. Por segurança, os
// testes não usam DATABASE_URL.
//
//   TEST_DATABASE_URL=postgresql://usuario:senha@localhost:5432/bankai_teste npm test
const fs = require("fs");
const path = require("path");

if (!process.env.TEST_DATABASE_URL) {
    console.error("Defina TEST_DATABASE_URL apontando para um banco de TESTE (ele será apagado).");
    process.exit(1);
}

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DATABASE_SSL = process.env.TEST_DATABASE_SSL ?? "false";
process.env.LIMITE_API_POR_MINUTO = "100000";
process.env.LIMITE_CADASTROS_POR_HORA = "1000";
delete process.env.FRONTEND_URL;

const bcrypt = require("bcryptjs");
const request = require("supertest");
const pool = require("../src/database/connection");
const app = require("../src/app");

const SENHA = "Senha12345";

const USUARIOS = {
    admin: { login: "admin", perfil: "administrador", nome: "Ana Admin" },
    gerente: { login: "gerente", perfil: "gerente_logistico", nome: "Gil Gerente" },
    operador: { login: "operador", perfil: "operador", nome: "Olga Operadora", cnpj: "11.222.333/0001-81" },
    operador2: { login: "operador2", perfil: "operador", nome: "Otto Operador" }
};

async function prepararBanco() {
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await pool.query("SET client_min_messages = warning");
    const schema = fs.readFileSync(path.resolve(__dirname, "../../database/schema.sql"), "utf8");
    await pool.query(schema);

    const hash = await bcrypt.hash(SENHA, 4);
    const ids = {};
    for (const [chave, u] of Object.entries(USUARIOS)) {
        const resultado = await pool.query(
            "INSERT INTO usuarios (login, senha, perfil, nome, cnpj, ativo) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id",
            [u.login, hash, u.perfil, u.nome, u.cnpj || null]
        );
        ids[chave] = resultado.rows[0].id;
    }
    return ids;
}

// Agente com cookie de sessão já logado
async function entrar(chave, senha = SENHA) {
    const agente = request.agent(app);
    const resposta = await agente.post("/usuarios/login").send({ login: USUARIOS[chave]?.login || chave, senha });
    if (resposta.status !== 200) {
        throw new Error(`Login de ${chave} falhou: ${resposta.status} ${JSON.stringify(resposta.body)}`);
    }
    return agente;
}

async function encerrar() {
    await pool.end();
}

module.exports = { app, pool, request, SENHA, USUARIOS, prepararBanco, entrar, encerrar };
