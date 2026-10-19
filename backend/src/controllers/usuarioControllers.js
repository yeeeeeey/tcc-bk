// bcryptjs é JavaScript puro (o bcrypt nativo costuma falhar na Vercel) e lê os mesmos hashes
const bcrypt = require("bcryptjs");
const usuarioModel = require("../models/usuarioModel");

const SALT_ROUNDS = 10;
const SENHA_MINIMA_CADASTRO = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERFIS_VALIDOS = ["administrador", "gerente_logistico", "operador"];
const MENSAGEM_PERFIL_INVALIDO = "Perfil inválido. Use administrador, gerente_logistico ou operador";

// Converte erros do Postgres em respostas que o front consegue mostrar
function responderErroDeBanco(res, erro, mensagemPadrao) {
    console.error(erro);

    // 23505 = violação de UNIQUE (login ou e-mail repetido)
    if (erro.code === "23505") {
        return res.status(409).json({ erro: "Login ou e-mail já cadastrado" });
    }

    // 23514 = violação de CHECK (perfil fora da lista permitida)
    if (erro.code === "23514") {
        return res.status(400).json({ erro: MENSAGEM_PERFIL_INVALIDO });
    }

    res.status(500).json({ erro: mensagemPadrao });
}

async function listar(req, res) {
    try {
        const usuarios = await usuarioModel.listarUsuarios();
        res.json(usuarios);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao listar usuários" });
    }
}

async function buscarPorId(req, res) {
    try {
        const usuario = await usuarioModel.buscarUsuarioPorId(req.params.id);

        if (!usuario) {
            return res.status(404).json({ erro: "Usuário não encontrado" });
        }

        res.json(usuario);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao buscar usuário" });
    }
}

// POST /usuarios -> criação administrativa (permite escolher o perfil)
async function criar(req, res) {
    try {
        const { login, senha, perfil, nome, email, cnpj } = req.body;

        if (!login || !senha) {
            return res.status(400).json({ erro: "Login e senha são obrigatórios" });
        }

        if (perfil && !PERFIS_VALIDOS.includes(perfil)) {
            return res.status(400).json({ erro: MENSAGEM_PERFIL_INVALIDO });
        }

        const usuarioExistente = await usuarioModel.buscarUsuarioPorLogin(login);
        if (usuarioExistente) {
            return res.status(409).json({ erro: "Login já cadastrado" });
        }

        const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

        const novoUsuario = await usuarioModel.criarUsuario({
            login,
            senhaHash,
            perfil: perfil || "operador",
            nome,
            email,
            cnpj
        });

        res.status(201).json(novoUsuario);
    } catch (erro) {
        responderErroDeBanco(res, erro, "Erro ao criar usuário");
    }
}

// POST /usuarios/cadastro -> formulário público do front.
// O e-mail vira o login e o perfil é sempre "operador".
async function cadastrar(req, res) {
    try {
        const { nome, email, senha, cnpj } = req.body;
        const emailLimpo = (email || "").trim().toLowerCase();

        if (!nome || !nome.trim()) {
            return res.status(400).json({ erro: "Nome é obrigatório" });
        }

        if (!EMAIL_REGEX.test(emailLimpo)) {
            return res.status(400).json({ erro: "E-mail inválido" });
        }

        if (!senha || senha.length < SENHA_MINIMA_CADASTRO) {
            return res.status(400).json({ erro: `A senha precisa ter pelo menos ${SENHA_MINIMA_CADASTRO} caracteres` });
        }

        if (cnpj && cnpj.replace(/\D/g, "").length !== 14) {
            return res.status(400).json({ erro: "CNPJ inválido" });
        }

        const usuarioExistente = await usuarioModel.buscarUsuarioPorLogin(emailLimpo);
        if (usuarioExistente) {
            return res.status(409).json({ erro: "E-mail já cadastrado" });
        }

        const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

        const novoUsuario = await usuarioModel.criarUsuario({
            login: emailLimpo,
            senhaHash,
            perfil: "operador",
            nome: nome.trim(),
            email: emailLimpo,
            cnpj
        });

        res.status(201).json(novoUsuario);
    } catch (erro) {
        responderErroDeBanco(res, erro, "Erro ao cadastrar usuário");
    }
}

async function atualizar(req, res) {
    try {
        const { login, perfil, nome, email, cnpj } = req.body;

        if (perfil && !PERFIS_VALIDOS.includes(perfil)) {
            return res.status(400).json({ erro: MENSAGEM_PERFIL_INVALIDO });
        }

        const usuarioAtualizado = await usuarioModel.atualizarUsuario(
            req.params.id,
            { login, perfil, nome, email, cnpj }
        );

        if (!usuarioAtualizado) {
            return res.status(404).json({ erro: "Usuário não encontrado" });
        }

        res.json(usuarioAtualizado);
    } catch (erro) {
        responderErroDeBanco(res, erro, "Erro ao atualizar usuário");
    }
}

async function deletar(req, res) {
    try {
        const usuarioDeletado = await usuarioModel.deletarUsuario(req.params.id);

        if (!usuarioDeletado) {
            return res.status(404).json({ erro: "Usuário não encontrado" });
        }

        res.json({ mensagem: "Usuário deletado com sucesso" });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao deletar usuário" });
    }
}

// Aceita { login, senha } ou { email, senha }
async function login(req, res) {
    try {
        const { senha } = req.body;
        const loginRecebido = (req.body.login || req.body.email || "").trim();

        if (!loginRecebido || !senha) {
            return res.status(400).json({ erro: "Login e senha são obrigatórios" });
        }

        const usuario = await usuarioModel.buscarUsuarioPorLogin(loginRecebido);

        if (!usuario) {
            return res.status(401).json({ erro: "Login ou senha inválidos" });
        }

        const senhaConfere = await bcrypt.compare(senha, usuario.senha);

        if (!senhaConfere) {
            return res.status(401).json({ erro: "Login ou senha inválidos" });
        }

        res.json({
            id: usuario.id,
            login: usuario.login,
            nome: usuario.nome,
            email: usuario.email,
            perfil: usuario.perfil
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao fazer login" });
    }
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    cadastrar,
    atualizar,
    deletar,
    login
};
