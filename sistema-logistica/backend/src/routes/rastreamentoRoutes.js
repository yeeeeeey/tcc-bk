const express = require("express");
const router = express.Router();
const rastreamentoControllers = require("../controllers/rastreamentoControllers");

router.get("/", rastreamentoControllers.listar);

// Essa rota precisa vir ANTES de /:id, senão o Express entende "entrega" como um id
router.get("/entrega/:entrega_id", rastreamentoControllers.buscarPorEntrega);

router.get("/:id", rastreamentoControllers.buscarPorId);
router.post("/", rastreamentoControllers.criar);
router.put("/:id", rastreamentoControllers.atualizar);
router.delete("/:id", rastreamentoControllers.deletar);

module.exports = router;