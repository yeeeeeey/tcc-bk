const express = require("express");
const router = express.Router();
const usuarioControllers = require("../controllers/usuarioControllers");

router.get("/", usuarioControllers.listar);
router.get("/:id", usuarioControllers.buscarPorId);
router.post("/", usuarioControllers.criar);
router.post("/login", usuarioControllers.login);
router.put("/:id", usuarioControllers.atualizar);
router.delete("/:id", usuarioControllers.deletar);

module.exports = router;
