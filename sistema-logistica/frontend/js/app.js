const express = require("express");
const cors = require("cors");

const produtoRoutes = require("./routes/produtoRoutes");

const usuarioRoutes = require("./routes/usuarioRoutes");

const app = express();

app.use(express.json());
app.use(cors());


app.use("/produtos", produtoRoutes);

app.use("/usuarios", usuarioRoutes);

app.get("/", (req, res) => {
    res.json({ mensagem: "Sistema de Logística funcionando!" });
});



module.exports = app;
