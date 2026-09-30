const bcrypt = require("bcrypt");
const usuarioModel = require("../models/usuarioModel");

const SALT_ROUNDS = 10;

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

async function criar(req, res) {
    try {
        const { login, senha, perfil } = req.body;

        if (!login || !senha) {
            return res.status(400).json({ erro: "Login e senha são obrigatórios" });
        }

        const usuarioExistente = await usuarioModel.buscarUsuarioPorLogin(login);
        if (usuarioExistente) {
            return res.status(409).json({ erro: "Login já cadastrado" });
        }

        const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

        const novoUsuario = await usuarioModel.criarUsuario({
            login,
            senhaHash,
            perfil: perfil || "operador"
        });

        res.status(201).json(novoUsuario);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao criar usuário" });
    }
}

async function atualizar(req, res) {
    try {
        const { login, perfil } = req.body;

        const usuarioAtualizado = await usuarioModel.atualizarUsuario(
            req.params.id,
            { login, perfil }
        );

        if (!usuarioAtualizado) {
            return res.status(404).json({ erro: "Usuário não encontrado" });
        }

        res.json(usuarioAtualizado);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao atualizar usuário" });
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

async function login(req, res) {
    try {
        const { login: loginRecebido, senha } = req.body;

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
    atualizar,
    deletar,
    login
};
