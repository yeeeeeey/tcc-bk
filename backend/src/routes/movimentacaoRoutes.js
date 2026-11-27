const express = require("express");
const router = express.Router();
const movimentacaoControllers = require("../controllers/movimentacaoControllers");
const { exigirPermissao } = require("../middlewares/autenticacao");
const { validar } = require("../middlewares/validacao");
const esquemas = require("../validacao/esquemas");

router.get("/", exigirPermissao("movimentacoes:ler"), validar({ query: esquemas.consultaLista }), movimentacaoControllers.listar);
router.get("/:id", exigirPermissao("movimentacoes:ler"), validar({ params: esquemas.parametrosId }), movimentacaoControllers.buscarPorId);
router.post("/", exigirPermissao("movimentacoes:criar"), validar({ body: esquemas.criarMovimentacao }), movimentacaoControllers.criar);
// Sem PUT: movimentações não são editadas. DELETE = estorno (inverte os saldos).
router.delete("/:id", exigirPermissao("movimentacoes:estornar"), validar({ params: esquemas.parametrosId }), movimentacaoControllers.estornar);

module.exports = router;
