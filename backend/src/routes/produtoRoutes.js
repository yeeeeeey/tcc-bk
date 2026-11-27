const express = require("express");
const router = express.Router();
const produtoControllers = require("../controllers/produtoControllers");
const { exigirPermissao } = require("../middlewares/autenticacao");
const { validar } = require("../middlewares/validacao");
const esquemas = require("../validacao/esquemas");

// Todas as rotas daqui exigem login (aplicado em app.js) e a permissão indicada.
// Não há catálogo público: os produtos são inventário interno (SEC-08).
router.get("/", exigirPermissao("produtos:ler"), validar({ query: esquemas.consultaLista }), produtoControllers.listar);
router.get("/:id", exigirPermissao("produtos:ler"), validar({ params: esquemas.parametrosId }), produtoControllers.buscarPorId);
router.post("/", exigirPermissao("produtos:criar"), validar({ body: esquemas.criarProduto }), produtoControllers.criar);
router.put("/:id", exigirPermissao("produtos:editar"), validar({ params: esquemas.parametrosId, body: esquemas.atualizarProduto }), produtoControllers.atualizar);
router.delete("/:id", exigirPermissao("produtos:excluir"), validar({ params: esquemas.parametrosId }), produtoControllers.deletar);

module.exports = router;
