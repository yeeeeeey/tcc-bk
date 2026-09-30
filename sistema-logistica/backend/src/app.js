const express = require("express");
const cors = require("cors");

const produtoRoutes = require("./routes/produtoRoutes");

const usuarioRoutes = require("./routes/usuarioRoutes");

const armazemRoutes = require("./routes/armazemRoutes");

const movimentacaoRoutes = require("./routes/movimentacaoRoutes");

const entregaRoutes = require("./routes/entregaRoutes");

const rastreamentoRoutes = require("./routes/rastreamentoRoutes");

const transportadoraRoutes = require("./routes/transportadoraRoutes");

const veiculoRoutes = require("./routes/veiculoRoutes");


const app = express();

app.use(express.json());
app.use(cors());


app.use("/produtos", produtoRoutes);

app.use("/usuarios", usuarioRoutes);

app.use("/armazens", armazemRoutes);

app.use("/movimentacoes", movimentacaoRoutes);

app.use("/entregas", entregaRoutes);

app.use("/rastreamento", rastreamentoRoutes);

app.use("/transportadoras", transportadoraRoutes);

app.use("/veiculos", veiculoRoutes);

app.get("/", (req, res) => {
    res.json({ mensagem: "Sistema de Logística funcionando!" });
});

module.exports = app;