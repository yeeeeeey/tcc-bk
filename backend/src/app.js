const express = require("express");
const cors = require("cors");

const pool = require("./database/connection");

const produtoRoutes = require("./routes/produtoRoutes");

const usuarioRoutes = require("./routes/usuarioRoutes");

const armazemRoutes = require("./routes/armazemRoutes");

const movimentacaoRoutes = require("./routes/movimentacaoRoutes");

const entregaRoutes = require("./routes/entregaRoutes");

const rastreamentoRoutes = require("./routes/rastreamentoRoutes");

const transportadoraRoutes = require("./routes/transportadoraRoutes");

const veiculoRoutes = require("./routes/veiculoRoutes");

const dashboardRoutes = require("./routes/dashboardRoutes");


const app = express();

// FRONTEND_URL aceita uma ou mais origens separadas por vírgula.
// Sem ela (desenvolvimento), qualquer origem é aceita.
const origensPermitidas = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((origem) => origem.trim())
    : true;

app.use(express.json());
app.use(cors({ origin: origensPermitidas }));

const rotas = express.Router();

rotas.use("/produtos", produtoRoutes);

rotas.use("/usuarios", usuarioRoutes);

rotas.use("/armazens", armazemRoutes);

rotas.use("/movimentacoes", movimentacaoRoutes);

rotas.use("/entregas", entregaRoutes);

rotas.use("/rastreamento", rastreamentoRoutes);

rotas.use("/transportadoras", transportadoraRoutes);

rotas.use("/veiculos", veiculoRoutes);

rotas.use("/dashboard", dashboardRoutes);

rotas.get("/", (req, res) => {
    res.json({ mensagem: "Sistema de Logística funcionando!" });
});

// Confere se a API consegue falar com o banco
rotas.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ status: "ok", banco: "conectado" });
    } catch (erro) {
        console.error(erro);
        res.status(503).json({ status: "erro", banco: "sem conexão" });
    }
});

// Na Vercel a API fica em /api (mesmo domínio do site). Localmente funciona com e sem o /api.
app.use("/api", rotas);
app.use("/", rotas);

app.use((req, res) => {
    res.status(404).json({ erro: "Rota não encontrada" });
});

// JSON malformado no corpo da requisição
app.use((erro, req, res, next) => {
    if (erro.type === "entity.parse.failed") {
        return res.status(400).json({ erro: "JSON inválido no corpo da requisição" });
    }

    console.error(erro);
    res.status(500).json({ erro: "Erro interno do servidor" });
});

module.exports = app;
