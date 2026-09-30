const express = require("express");
const router = express.Router();
const armazemControllers = require("../controllers/armazemControllers");
 
router.get("/", armazemControllers.listar);
router.get("/:id", armazemControllers.buscarPorId);
router.post("/", armazemControllers.criar);
router.put("/:id", armazemControllers.atualizar);
router.delete("/:id", armazemControllers.deletar);
 
module.exports = router;