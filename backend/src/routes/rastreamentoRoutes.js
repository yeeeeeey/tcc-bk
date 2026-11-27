const express = require("express");
const router = express.Router();
const rastreamentoControllers = require("../controllers/rastreamentoControllers");
const { exigirPermissao } = require("../middlewares/autenticacao");
const { validar } = require("../middlewares/validacao");
const esquemas = require("../validacao/esquemas");

router.get("/", exigirPermissao("rastreamento:ler"), validar({ query: esquemas.consultaLista }), rastreamentoControllers.listar);

// Essa rota precisa vir ANTES de /:id, senão o Express entende "entrega" como um id
router.get("/entrega/:entrega_id", exigirPermissao("rastreamento:ler"), validar({ params: esquemas.parametrosEntrega }), rastreamentoControllers.buscarPorEntrega);

router.get("/:id", exigirPermissao("rastreamento:ler"), validar({ params: esquemas.parametrosId }), rastreamentoControllers.buscarPorId);
router.post("/", exigirPermissao("rastreamento:criar"), validar({ body: esquemas.criarRastreamento }), rastreamentoControllers.criar);

// Alterar ou remover eventos já registrados é correção retroativa: só administrador
router.put("/:id", exigirPermissao("rastreamento:corrigir"), validar({ params: esquemas.parametrosId, body: esquemas.atualizarRastreamento }), rastreamentoControllers.atualizar);
router.delete("/:id", exigirPermissao("rastreamento:corrigir"), validar({ params: esquemas.parametrosId }), rastreamentoControllers.deletar);

module.exports = router;
