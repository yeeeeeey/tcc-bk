const express = require("express");
const router = express.Router();
const veiculoControllers = require("../controllers/veiculoControllers");
const { exigirPermissao } = require("../middlewares/autenticacao");
const { validar } = require("../middlewares/validacao");
const esquemas = require("../validacao/esquemas");

router.get("/", exigirPermissao("veiculos:ler"), validar({ query: esquemas.consultaLista }), veiculoControllers.listar);
router.get("/:id", exigirPermissao("veiculos:ler"), validar({ params: esquemas.parametrosId }), veiculoControllers.buscarPorId);
router.post("/", exigirPermissao("veiculos:criar"), validar({ body: esquemas.criarVeiculo }), veiculoControllers.criar);
router.put("/:id", exigirPermissao("veiculos:editar"), validar({ params: esquemas.parametrosId, body: esquemas.atualizarVeiculo }), veiculoControllers.atualizar);
router.delete("/:id", exigirPermissao("veiculos:excluir"), validar({ params: esquemas.parametrosId }), veiculoControllers.deletar);

module.exports = router;
