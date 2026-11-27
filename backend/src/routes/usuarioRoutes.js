const express = require("express");
const { rateLimit } = require("express-rate-limit");
const router = express.Router();
const usuarioControllers = require("../controllers/usuarioControllers");
const { exigirAutenticacao, exigirPermissao } = require("../middlewares/autenticacao");
const { validar } = require("../middlewares/validacao");
const esquemas = require("../validacao/esquemas");
const ambiente = require("../config/ambiente");

// Freia criação de contas em massa a partir do mesmo IP
const limiteDeCadastro = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: ambiente.limites.cadastrosPorHora,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { erro: "Muitos cadastros a partir desta rede. Tente novamente mais tarde." }
});

// ---- Rotas públicas (as únicas desta API além de / e /health) ----
router.post("/cadastro", limiteDeCadastro, validar({ body: esquemas.cadastroPublico }), usuarioControllers.cadastrar);
router.post("/login", validar({ body: esquemas.entrarNoSistema }), usuarioControllers.login);
router.post("/logout", usuarioControllers.logout);

// ---- Daqui para baixo, só com login ----
router.use(exigirAutenticacao);

// Conta do próprio usuário (precisam vir antes de /:id)
router.get("/me", usuarioControllers.meuPerfil);
router.put("/me", validar({ body: esquemas.atualizarMeuPerfil }), usuarioControllers.atualizarMeuPerfil);
router.put("/me/senha", validar({ body: esquemas.alterarMinhaSenha }), usuarioControllers.alterarMinhaSenha);
router.delete("/me/sessoes", usuarioControllers.encerrarOutrasSessoes);

// Gestão de usuários: administrador
router.get("/", exigirPermissao("usuarios:ler"), validar({ query: esquemas.consultaUsuarios }), usuarioControllers.listar);
// Próprio usuário ou administrador (checado no controller)
router.get("/:id", validar({ params: esquemas.parametrosId }), usuarioControllers.buscarPorId);
router.post("/", exigirPermissao("usuarios:criar"), validar({ body: esquemas.criarUsuario }), usuarioControllers.criar);
router.put("/:id", exigirPermissao("usuarios:editar"), validar({ params: esquemas.parametrosId, body: esquemas.atualizarUsuario }), usuarioControllers.atualizar);
router.delete("/:id", exigirPermissao("usuarios:excluir"), validar({ params: esquemas.parametrosId }), usuarioControllers.deletar);

module.exports = router;
