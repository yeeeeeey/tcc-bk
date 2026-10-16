const express = require("express");
const router = express.Router();
const produtoControllers = require("../controllers/produtoControllers");

router.get("/", produtoControllers.listar);
router.get("/:id", produtoControllers.buscarPorId);
router.post("/", produtoControllers.criar);
router.put("/:id", produtoControllers.atualizar);
router.delete("/:id", produtoControllers.deletar);

module.exports = router;
