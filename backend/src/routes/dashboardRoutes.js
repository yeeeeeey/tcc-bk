const express = require("express");
const router = express.Router();
const dashboardControllers = require("../controllers/dashboardControllers");
const { exigirPermissao } = require("../middlewares/autenticacao");

router.get("/", exigirPermissao("dashboard:ler"), dashboardControllers.resumo);

module.exports = router;
