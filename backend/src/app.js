const ambiente = require("./config/ambiente");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { rateLimit } = require("express-rate-limit");

const pool = require("./database/connection");
const { identificarUsuario, exigirAutenticacao } = require("./middlewares/autenticacao");
const { rotaNaoEncontrada, tratarErros } = require("./middlewares/erros");

const produtoRoutes = require("./routes/produtoRoutes");

const usuarioRoutes = require("./routes/usuarioRoutes");

const armazemRoutes = require("./routes/armazemRoutes");

const estoqueRoutes = require("./routes/estoqueRoutes");

const movimentacaoRoutes = require("./routes/movimentacaoRoutes");

const entregaRoutes = require("./routes/entregaRoutes");

const rastreamentoRoutes = require("./routes/rastreamentoRoutes");

const transportadoraRoutes = require("./routes/transportadoraRoutes");

const veiculoRoutes = require("./routes/veiculoRoutes");

const dashboardRoutes = require("./routes/dashboardRoutes");

const buscaRoutes = require("./routes/buscaRoutes");

const administracaoRoutes = require("./routes/administracaoRoutes");

const relatorioRoutes = require("./routes/relatorioRoutes");


const app = express();

// IP real do cliente atrás do proxy da Vercel (usado no limite de tentativas)
app.set("trust proxy", ambiente.trustProxy);

// Cabeçalhos de segurança (SEC-16): remove X-Powered-By e adiciona
// X-Content-Type-Options, HSTS, CSP restritiva para respostas da API etc.
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] }
    },
    strictTransportSecurity: ambiente.emProducao ? { maxAge: 63072000, includeSubDomains: true } : false
}));

// CORS com lista explícita de origens (SEC-15). Sem FRONTEND_URL em produção,
// nenhuma origem externa é aceita: o site usa a API pelo mesmo domínio (/api).
app.use(cors({ origin: ambiente.origensPermitidas, credentials: true }));

// Limite geral por IP (o login tem um limite próprio e mais rígido)
app.use(rateLimit({
    windowMs: 60 * 1000,
    limit: ambiente.limites.apiPorMinuto,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { erro: "Muitas requisições. Aguarde um instante e tente de novo." }
}));

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Respostas da API têm dados internos: não devem ficar em cache
app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

app.use(identificarUsuario);

const rotas = express.Router();

// ---- Rotas públicas (lista explícita) ----
rotas.get("/", (req, res) => {
    res.json({ mensagem: "Sistema de Logística funcionando!" });
});

// Confere se a API consegue falar com o banco
rotas.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ status: "ok", banco: "conectado" });
    } catch (erro) {
        console.error(JSON.stringify({ tipo: "erro_health", mensagem: erro.message }));
        res.status(503).json({ status: "erro", banco: "sem conexão" });
    }
});

// /usuarios tem rotas públicas (cadastro, login, logout); as demais exigem login lá dentro
rotas.use("/usuarios", usuarioRoutes);

// ---- Todas as rotas abaixo exigem login (401 sem sessão válida) ----
rotas.use("/produtos", exigirAutenticacao, produtoRoutes);

rotas.use("/armazens", exigirAutenticacao, armazemRoutes);

rotas.use("/estoque", exigirAutenticacao, estoqueRoutes);

rotas.use("/movimentacoes", exigirAutenticacao, movimentacaoRoutes);

rotas.use("/entregas", exigirAutenticacao, entregaRoutes);

rotas.use("/rastreamento", exigirAutenticacao, rastreamentoRoutes);

rotas.use("/transportadoras", exigirAutenticacao, transportadoraRoutes);

rotas.use("/veiculos", exigirAutenticacao, veiculoRoutes);

rotas.use("/dashboard", exigirAutenticacao, dashboardRoutes);

rotas.use("/busca", exigirAutenticacao, buscaRoutes);

rotas.use("/relatorios", exigirAutenticacao, relatorioRoutes);

rotas.use("/perfis", exigirAutenticacao, administracaoRoutes.perfis);

rotas.use("/auditoria", exigirAutenticacao, administracaoRoutes.auditoria);

// Na Vercel a API fica em /api (mesmo domínio do site). Localmente funciona com e sem o /api.
app.use("/api", rotas);
app.use("/", rotas);

app.use(rotaNaoEncontrada);

// JSON malformado, erros do banco e erros inesperados
app.use(tratarErros);

module.exports = app;
