const express = require("express");
const cors = require("cors");

const produtoRoutes = require("./routes/produtoRoutes");

const app = express();

app.use(express.json());
app.use(cors());

// Rotas de produtos
app.use("/produtos", produtoRoutes);

// Rota inicial
app.get("/", (req, res) => {
    res.json({ mensagem: "Sistema de Logística funcionando!" });
});

module.exports = app;
