const express = require("express");
const router = express.Router();
const transportadoraControllers = require("../controllers/transportadoraControllers");
const { exigirPermissao } = require("../middlewares/autenticacao");
const { validar } = require("../middlewares/validacao");
const esquemas = require("../validacao/esquemas");

router.get("/", exigirPermissao("transportadoras:ler"), validar({ query: esquemas.consultaLista }), transportadoraControllers.listar);
router.get("/:id", exigirPermissao("transportadoras:ler"), validar({ params: esquemas.parametrosId }), transportadoraControllers.buscarPorId);
router.post("/", exigirPermissao("transportadoras:criar"), validar({ body: esquemas.criarTransportadora }), transportadoraControllers.criar);
router.put("/:id", exigirPermissao("transportadoras:editar"), validar({ params: esquemas.parametrosId, body: esquemas.atualizarTransportadora }), transportadoraControllers.atualizar);
router.delete("/:id", exigirPermissao("transportadoras:excluir"), validar({ params: esquemas.parametrosId }), transportadoraControllers.deletar);

module.exports = router;
