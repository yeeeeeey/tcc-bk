const express = require("express");
const router = express.Router();
const armazemControllers = require("../controllers/armazemControllers");
const { exigirPermissao } = require("../middlewares/autenticacao");
const { validar } = require("../middlewares/validacao");
const esquemas = require("../validacao/esquemas");

router.get("/", exigirPermissao("armazens:ler"), validar({ query: esquemas.consultaLista }), armazemControllers.listar);
router.get("/:id", exigirPermissao("armazens:ler"), validar({ params: esquemas.parametrosId }), armazemControllers.buscarPorId);
router.post("/", exigirPermissao("armazens:criar"), validar({ body: esquemas.criarArmazem }), armazemControllers.criar);
router.put("/:id", exigirPermissao("armazens:editar"), validar({ params: esquemas.parametrosId, body: esquemas.atualizarArmazem }), armazemControllers.atualizar);
router.delete("/:id", exigirPermissao("armazens:excluir"), validar({ params: esquemas.parametrosId }), armazemControllers.deletar);

module.exports = router;
