const express = require("express");
const pool = require("../database/connection");
const { exigirPermissao } = require("../middlewares/autenticacao");
const { validar } = require("../middlewares/validacao");
const esquemas = require("../validacao/esquemas");
const { PERFIS, NOMES_PERFIL, listarPermissoes } = require("../config/permissoes");
const { consultarPaginado } = require("../utils/consultas");

// GET /perfis -> matriz de permissões de cada perfil (somente leitura)
const perfis = express.Router();
perfis.get("/", exigirPermissao("perfis:ler"), (req, res) => {
    res.json({
        perfis: PERFIS.map((perfil) => ({ perfil, nome: NOMES_PERFIL[perfil], permissoes: listarPermissoes(perfil) }))
    });
});

// GET /auditoria -> trilha de auditoria paginada, mais recente primeiro
const auditoria = express.Router();
auditoria.get("/", exigirPermissao("auditoria:ler"), validar({ query: esquemas.consultaAuditoria }), async (req, res) => {
    const { pagina, limite, busca, recurso, acao, usuario_id: usuarioId } = req.dados.query;
    const params = [];
    const condicoes = [];

    if (recurso) {
        params.push(recurso);
        condicoes.push(`recurso = $${params.length}`);
    }
    if (acao) {
        params.push(acao);
        condicoes.push(`acao = $${params.length}`);
    }
    if (usuarioId) {
        params.push(usuarioId);
        condicoes.push(`usuario_id = $${params.length}`);
    }
    if (busca) {
        params.push(`%${busca.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
        condicoes.push(`(usuario_login ILIKE $${params.length} OR recurso ILIKE $${params.length} OR acao ILIKE $${params.length} OR recurso_id ILIKE $${params.length})`);
    }

    res.json(await consultarPaginado({
        select: "id, criado_em, usuario_id, usuario_login, perfil, acao, recurso, recurso_id, resultado, ip, detalhes",
        from: "auditoria",
        condicoes,
        params,
        ordem: "id DESC",
        pagina,
        limite,
        executor: pool
    }));
});

module.exports = { perfis, auditoria };
