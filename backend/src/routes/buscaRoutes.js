const express = require("express");
const router = express.Router();
const pool = require("../database/connection");
const { exigirPermissao } = require("../middlewares/autenticacao");
const { validar } = require("../middlewares/validacao");
const esquemas = require("../validacao/esquemas");
const { temPermissao } = require("../config/permissoes");
const { escaparLike } = require("../utils/consultas");

// Fontes da busca global. $1 = termo com curingas (ILIKE); $2 (só em entregas) = termo exato.
// Cada fonte só entra no resultado se o perfil puder ler aquele recurso.
const FONTES = [
    {
        recurso: "produtos",
        sql: `SELECT id, nome AS titulo, CONCAT_WS(' · ', codigo, categoria, quantidade || ' un.') AS detalhe
              FROM produtos
              WHERE excluido_em IS NULL AND (nome ILIKE $1 OR descricao ILIKE $1 OR codigo ILIKE $1 OR categoria ILIKE $1)
              ORDER BY nome LIMIT 5`
    },
    {
        recurso: "armazens",
        sql: `SELECT id, nome AS titulo, CONCAT_WS(' · ', localizacao, status) AS detalhe
              FROM armazens
              WHERE excluido_em IS NULL AND (nome ILIKE $1 OR localizacao ILIKE $1)
              ORDER BY nome LIMIT 5`
    },
    {
        recurso: "entregas",
        usaTermoExato: true,
        sql: `SELECT e.id, CONCAT('Entrega #', e.id, ' · ', p.nome) AS titulo, CONCAT_WS(' · ', e.destino, e.status) AS detalhe
              FROM entregas e JOIN produtos p ON p.id = e.produto_id
              WHERE e.excluido_em IS NULL AND (e.destino ILIKE $1 OR p.nome ILIKE $1 OR e.id::text = $2)
              ORDER BY e.id DESC LIMIT 5`
    },
    {
        recurso: "transportadoras",
        sql: `SELECT id, nome AS titulo, CONCAT_WS(' · ', cnpj, contato) AS detalhe
              FROM transportadoras
              WHERE excluido_em IS NULL AND (nome ILIKE $1 OR cnpj ILIKE $1)
              ORDER BY nome LIMIT 5`
    },
    {
        recurso: "veiculos",
        sql: `SELECT id, placa AS titulo, CONCAT_WS(' · ', modelo, status) AS detalhe
              FROM veiculos
              WHERE excluido_em IS NULL AND (placa ILIKE $1 OR modelo ILIKE $1)
              ORDER BY placa LIMIT 5`
    },
    {
        recurso: "usuarios",
        sql: `SELECT id, COALESCE(nome, login) AS titulo, CONCAT_WS(' · ', login, perfil) AS detalhe
              FROM usuarios
              WHERE excluido_em IS NULL AND (nome ILIKE $1 OR login ILIKE $1 OR email ILIKE $1)
              ORDER BY nome LIMIT 5`
    }
];

// GET /busca?q=termo -> até 5 resultados por tipo de registro
router.get("/", exigirPermissao("busca:ler"), validar({ query: esquemas.consultaBusca }), async (req, res) => {
    const termo = req.dados.query.q;
    const padrao = `%${escaparLike(termo)}%`;
    const permitidas = FONTES.filter((fonte) => temPermissao(req.usuario.perfil, `${fonte.recurso}:ler`));

    const respostas = await Promise.all(
        permitidas.map((fonte) => pool.query(fonte.sql, fonte.usaTermoExato ? [padrao, termo] : [padrao]))
    );

    const resultados = {};
    let total = 0;
    permitidas.forEach((fonte, i) => {
        resultados[fonte.recurso] = respostas[i].rows;
        total += respostas[i].rows.length;
    });

    res.json({ termo, total, resultados });
});

module.exports = router;
