const express = require("express");
const router = express.Router();
const entregaControllers = require("../controllers/entregaControllers");
const { exigirPermissao } = require("../middlewares/autenticacao");
const { validar } = require("../middlewares/validacao");
const esquemas = require("../validacao/esquemas");

router.get("/", exigirPermissao("entregas:ler"), validar({ query: esquemas.consultaLista }), entregaControllers.listar);
router.get("/:id", exigirPermissao("entregas:ler"), validar({ params: esquemas.parametrosId }), entregaControllers.buscarPorId);
router.post("/", exigirPermissao("entregas:criar"), validar({ body: esquemas.criarEntrega }), entregaControllers.criar);
router.put("/:id", exigirPermissao("entregas:editar"), validar({ params: esquemas.parametrosId, body: esquemas.atualizarEntrega }), entregaControllers.atualizar);
router.delete("/:id", exigirPermissao("entregas:excluir"), validar({ params: esquemas.parametrosId }), entregaControllers.deletar);

module.exports = router;
