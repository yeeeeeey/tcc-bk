const express = require("express");
const router = express.Router();
const movimentacaoControllers = require("../controllers/movimentacaoControllers");

router.get("/", movimentacaoControllers.listar);
router.get("/:id", movimentacaoControllers.buscarPorId);
router.post("/", movimentacaoControllers.criar);
router.put("/:id", movimentacaoControllers.atualizar);
router.delete("/:id", movimentacaoControllers.deletar);

module.exports = router;