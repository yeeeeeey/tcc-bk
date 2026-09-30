const { Pool } = require("pg");
require("dotenv").config();

// A Neon fornece essa string em "Connection Details" do painel.
// Formato: postgresql://usuario:senha@host/nome_do_banco?sslmode=require
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool;
