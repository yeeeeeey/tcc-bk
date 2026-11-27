const express = require("express");
const router = express.Router();
const pool = require("../database/connection");
const { exigirPermissao } = require("../middlewares/autenticacao");
const { validar } = require("../middlewares/validacao");
const esquemas = require("../validacao/esquemas");
const { gerarRelatorio } = require("../models/relatorioModel");
const { requisicaoInvalida } = require("../utils/erros");

const DIA_MS = 24 * 60 * 60 * 1000;

function somarDias(dataTexto, dias) {
    const data = new Date(Date.parse(`${dataTexto}T00:00:00Z`) + dias * DIA_MS);
    return data.toISOString().slice(0, 10);
}

// GET /relatorios?de=AAAA-MM-DD&ate=AAAA-MM-DD -> gerente logístico e administrador.
// Sem datas: últimos 30 dias até hoje (data do banco).
router.get("/", exigirPermissao("relatorios:ler"), validar({ query: esquemas.consultaRelatorio }), async (req, res) => {
    let { de, ate } = req.dados.query;

    if (!ate) {
        const hoje = await pool.query("SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS hoje");
        ate = de ? somarDias(de, 29) : hoje.rows[0].hoje;
    }
    if (!de) de = somarDias(ate, -29);

    if (de > ate) throw requisicaoInvalida("Dados inválidos — de: a data inicial não pode ser depois da final");

    res.json(await gerarRelatorio(de, ate));
});

module.exports = router;
