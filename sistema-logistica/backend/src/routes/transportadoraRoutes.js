const express = require("express");
const router = express.Router();
const transportadoraControllers = require("../controllers/transportadoraControllers");

router.get("/", transportadoraControllers.listar);
router.get("/:id", transportadoraControllers.buscarPorId);
router.post("/", transportadoraControllers.criar);
router.put("/:id", transportadoraControllers.atualizar);
router.delete("/:id", transportadoraControllers.deletar);

module.exports = router;