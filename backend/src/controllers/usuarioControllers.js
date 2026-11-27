// bcryptjs é JavaScript puro (o bcrypt nativo costuma falhar na Vercel) e lê os mesmos hashes
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../database/connection");
const usuarioModel = require("../models/usuarioModel");
const sessoes = require("../services/sessoes");
const limiteLogin = require("../services/limiteLogin");
const ambiente = require("../config/ambiente");
const { listarPermissoes, temPermissao } = require("../config/permissoes");
const { registrarAuditoria, gravarComAuditoria, camposAlterados } = require("../services/auditoria");
const { comTransacao } = require("../utils/transacao");
const { ErroHttp, naoEncontrado, conflito } = require("../utils/erros");

const SALT_ROUNDS = 10;

// Hash de uma senha aleatória: quando o login não existe, comparamos com ele para
// que a resposta demore o mesmo que um login existente (não revela quem tem conta).
let hashFicticio;
function obterHashFicticio() {
    hashFicticio = hashFicticio || bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), SALT_ROUNDS);
    return hashFicticio;
}

function comPermissoes(usuario) {
    return { ...usuario, permissoes: listarPermissoes(usuario.perfil) };
}

// ---------------------------------------------------------------------------
// Rotas públicas
// ---------------------------------------------------------------------------

// POST /usuarios/cadastro -> formulário público do front (SEC-03).
// O e-mail vira o login, o perfil é sempre "operador" e a conta nasce INATIVA:
// só entra no sistema depois que um administrador aprovar.
async function cadastrar(req, res) {
    const { nome, email, senha, cnpj } = req.dados.body;

    if (await usuarioModel.loginOuEmailEmUso(pool, [email])) {
        throw conflito("E-mail já cadastrado");
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    const novoUsuario = await comTransacao(async (cliente) => {
        const criado = await usuarioModel.criarUsuario(cliente, {
            login: email,
            senhaHash,
            perfil: "operador",
            nome,
            email,
            cnpj,
            ativo: false
        });

        await registrarAuditoria(req, {
            acao: "cadastro_publico",
            recurso: "usuarios",
            recursoId: criado.id,
            cliente,
            usuario: { id: criado.id, login: criado.login, perfil: criado.perfil }
        });

        return criado;
    });

    res.status(201).json({
        id: novoUsuario.id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        cnpj: novoUsuario.cnpj,
        ativo: novoUsuario.ativo,
        mensagem: "Um administrador precisa aprovar seu acesso antes do primeiro login."
    });
}

// POST /usuarios/login -> cria a sessão e envia o cookie HttpOnly (SEC-10).
// Aceita { login, senha } ou { email, senha }.
async function login(req, res) {
    const { senha } = req.dados.body;
    const loginRecebido = (req.dados.body.login || req.dados.body.email).trim();

    // Limite de tentativas (SEC-11)
    const espera = await limiteLogin.segundosDeBloqueio(loginRecebido, req.ip);
    if (espera > 0) {
        await registrarAuditoria(req, { acao: "login", recurso: "sessoes", resultado: "bloqueado", detalhes: { login: loginRecebido } });
        res.set("Retry-After", String(espera));
        return res.status(429).json({
            erro: `Muitas tentativas de login. Tente novamente em ${Math.ceil(espera / 60)} minuto(s).`
        });
    }

    const usuario = await usuarioModel.buscarUsuarioParaLogin(loginRecebido);
    const senhaConfere = await bcrypt.compare(senha, usuario?.senha || obterHashFicticio());

    if (!usuario || !senhaConfere) {
        await limiteLogin.registrarFalha(loginRecebido, req.ip);
        await registrarAuditoria(req, { acao: "login", recurso: "sessoes", resultado: "falha", detalhes: { login: loginRecebido } });
        // Mensagem genérica: não diz se o erro foi no login ou na senha
        return res.status(401).json({ erro: "Login ou senha inválidos" });
    }

    await limiteLogin.registrarSucesso(loginRecebido, req.ip);

    if (!usuario.ativo) {
        await registrarAuditoria(req, { acao: "login", recurso: "sessoes", resultado: "negado", usuario, detalhes: { motivo: "conta inativa" } });
        return res.status(403).json({
            erro: "Sua conta ainda não foi aprovada por um administrador ou está desativada."
        });
    }

    // Sessão nova a cada login (evita fixação de sessão); a anterior deste navegador é encerrada
    const tokenAnterior = req.cookies?.[ambiente.sessao.nomeCookie];
    if (tokenAnterior) await sessoes.encerrarSessao(tokenAnterior);

    const { token } = await sessoes.criarSessao(usuario.id, { ip: req.ip, userAgent: req.get("user-agent") });

    res.cookie(ambiente.sessao.nomeCookie, token, {
        ...sessoes.opcoesDoCookie(),
        maxAge: ambiente.sessao.horas * 60 * 60 * 1000
    });

    await registrarAuditoria(req, { acao: "login", recurso: "sessoes", resultado: "sucesso", usuario });

    const perfil = await usuarioModel.buscarMeuPerfil(usuario.id);
    res.json(comPermissoes(perfil));
}

// POST /usuarios/logout -> apaga a sessão no banco e o cookie no navegador
async function logout(req, res) {
    const token = req.cookies?.[ambiente.sessao.nomeCookie];
    if (token) await sessoes.encerrarSessao(token);
    res.clearCookie(ambiente.sessao.nomeCookie, sessoes.opcoesDoCookie());

    if (req.usuario) {
        await registrarAuditoria(req, { acao: "logout", recurso: "sessoes" });
    }

    res.json({ mensagem: "Sessão encerrada" });
}

// ---------------------------------------------------------------------------
// Conta do próprio usuário (qualquer perfil logado)
// ---------------------------------------------------------------------------

async function meuPerfil(req, res) {
    const perfil = await usuarioModel.buscarMeuPerfil(req.usuario.id);
    if (!perfil) throw new ErroHttp(401, "Faça login para continuar");
    res.json(comPermissoes(perfil));
}

async function atualizarMeuPerfil(req, res) {
    const perfil = await gravarComAuditoria(
        req,
        { acao: "editar_perfil", recurso: "usuarios", detalhes: { campos: camposAlterados(req.dados.body) } },
        (cliente) => usuarioModel.atualizarMeuPerfil(cliente, req.usuario.id, req.dados.body)
    );
    res.json(comPermissoes(perfil));
}

async function alterarMinhaSenha(req, res) {
    const { senha_atual: senhaAtual, nova_senha: novaSenha } = req.dados.body;

    const hashAtual = await usuarioModel.buscarHashDaSenha(req.usuario.id);
    if (!hashAtual || !(await bcrypt.compare(senhaAtual, hashAtual))) {
        await registrarAuditoria(req, { acao: "alterar_senha", recurso: "usuarios", recursoId: req.usuario.id, resultado: "falha" });
        throw new ErroHttp(400, "Senha atual incorreta");
    }

    const senhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);

    await comTransacao(async (cliente) => {
        await usuarioModel.atualizarUsuario(cliente, req.usuario.id, { senhaHash });
        // Outras sessões abertas (outros navegadores) são encerradas
        await sessoes.encerrarSessoesDoUsuario(req.usuario.id, { exceto: req.sessao.tokenHash, executor: cliente });
        await registrarAuditoria(req, { acao: "alterar_senha", recurso: "usuarios", recursoId: req.usuario.id, cliente });
    });

    res.json({ mensagem: "Senha alterada. As outras sessões abertas foram encerradas." });
}

async function encerrarOutrasSessoes(req, res) {
    const total = await sessoes.encerrarSessoesDoUsuario(req.usuario.id, { exceto: req.sessao.tokenHash });
    await registrarAuditoria(req, { acao: "encerrar_sessoes", recurso: "sessoes", recursoId: req.usuario.id, detalhes: { total } });
    res.json({ mensagem: `${total} sessão(ões) encerrada(s)`, total });
}

// ---------------------------------------------------------------------------
// Gestão de usuários (administrador)
// ---------------------------------------------------------------------------

async function listar(req, res) {
    res.json(await usuarioModel.listarUsuarios(req.dados.query));
}

// GET /usuarios/:id -> o próprio usuário ou quem tem "usuarios:ler" (SEC-05)
async function buscarPorId(req, res) {
    const id = req.dados.params.id;

    if (id !== req.usuario.id && !temPermissao(req.usuario.perfil, "usuarios:ler")) {
        await registrarAuditoria(req, { acao: "ler", recurso: "usuarios", recursoId: id, resultado: "negado" });
        throw new ErroHttp(403, "Seu perfil não tem permissão para esta ação");
    }

    const usuario = await usuarioModel.buscarUsuarioPorId(id);
    if (!usuario) throw naoEncontrado("Usuário não encontrado");
    res.json(usuario);
}

// POST /usuarios -> criação administrativa (permite escolher o perfil)
async function criar(req, res) {
    const { senha, ...dados } = req.dados.body;

    const usuario = await gravarComAuditoria(
        req,
        { acao: "criar", recurso: "usuarios", detalhes: (u) => ({ login: u.login, perfil: u.perfil, ativo: u.ativo }) },
        async (cliente) => {
            if (await usuarioModel.loginOuEmailEmUso(cliente, [dados.login, dados.email])) {
                throw conflito("Login ou e-mail já cadastrado");
            }
            const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
            return usuarioModel.criarUsuario(cliente, { ...dados, senhaHash });
        }
    );

    res.status(201).json(usuario);
}

// PUT /usuarios/:id -> dados, perfil, ativação (aprovação) e redefinição de senha
async function atualizar(req, res) {
    const id = req.dados.params.id;
    const { senha, ...campos } = req.dados.body;

    const usuario = await comTransacao(async (cliente) => {
        const alvo = await usuarioModel.bloquearUsuario(cliente, id);
        if (!alvo) return null;

        const mudaPerfil = campos.perfil !== undefined && campos.perfil !== alvo.perfil;
        const mudaAtivo = campos.ativo !== undefined && campos.ativo !== alvo.ativo;

        if (alvo.id === req.usuario.id && (mudaPerfil || campos.ativo === false)) {
            throw conflito("Você não pode alterar o próprio perfil nem desativar a própria conta");
        }

        const deixaDeSerAdmin = alvo.perfil === "administrador" && alvo.ativo &&
            ((mudaPerfil && campos.perfil !== "administrador") || campos.ativo === false);
        if (deixaDeSerAdmin && (await usuarioModel.contarAdministradoresAtivos(cliente, alvo.id)) === 0) {
            throw conflito("É preciso manter pelo menos um administrador ativo");
        }

        if ((campos.login || campos.email) && (await usuarioModel.loginOuEmailEmUso(cliente, [campos.login, campos.email], alvo.id))) {
            throw conflito("Login ou e-mail já cadastrado");
        }

        const senhaHash = senha ? await bcrypt.hash(senha, SALT_ROUNDS) : undefined;
        const atualizado = await usuarioModel.atualizarUsuario(cliente, id, { ...campos, senhaHash });

        // Desativação, troca de perfil ou nova senha derrubam as sessões abertas do usuário
        if (mudaPerfil || campos.ativo === false || senhaHash) {
            await sessoes.encerrarSessoesDoUsuario(id, { executor: cliente });
        }

        await registrarAuditoria(req, {
            acao: mudaAtivo && campos.ativo ? "aprovar" : "editar",
            recurso: "usuarios",
            recursoId: id,
            cliente,
            detalhes: {
                campos: camposAlterados(campos),
                senha_redefinida: Boolean(senhaHash),
                ...(mudaPerfil && { perfil: { de: alvo.perfil, para: campos.perfil } }),
                ...(mudaAtivo && { ativo: { de: alvo.ativo, para: campos.ativo } })
            }
        });

        return atualizado;
    });

    if (!usuario) throw naoEncontrado("Usuário não encontrado");
    res.json(usuario);
}

// DELETE /usuarios/:id -> exclusão lógica (o histórico de auditoria continua ligado)
async function deletar(req, res) {
    const id = req.dados.params.id;

    const usuario = await gravarComAuditoria(
        req,
        { acao: "excluir", recurso: "usuarios", detalhes: (u) => ({ login: u.login }) },
        async (cliente) => {
            const alvo = await usuarioModel.bloquearUsuario(cliente, id);
            if (!alvo) return null;

            if (alvo.id === req.usuario.id) {
                throw conflito("Você não pode excluir a própria conta");
            }
            if (alvo.perfil === "administrador" && alvo.ativo && (await usuarioModel.contarAdministradoresAtivos(cliente, alvo.id)) === 0) {
                throw conflito("É preciso manter pelo menos um administrador ativo");
            }

            await sessoes.encerrarSessoesDoUsuario(id, { executor: cliente });
            return usuarioModel.excluirUsuario(cliente, id);
        }
    );

    if (!usuario) throw naoEncontrado("Usuário não encontrado");
    res.json({ mensagem: "Usuário excluído com sucesso" });
}

module.exports = {
    cadastrar,
    login,
    logout,
    meuPerfil,
    atualizarMeuPerfil,
    alterarMinhaSenha,
    encerrarOutrasSessoes,
    listar,
    buscarPorId,
    criar,
    atualizar,
    deletar
};
