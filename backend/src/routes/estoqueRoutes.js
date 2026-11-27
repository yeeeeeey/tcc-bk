const express = require("express");
const router = express.Router();
const { exigirPermissao } = require("../middlewares/autenticacao");
const { validar } = require("../middlewares/validacao");
const esquemas = require("../validacao/esquemas");
const { consultarPaginado, filtroBusca } = require("../utils/consultas");

// GET /estoque -> saldo de cada produto em cada armazém (somente leitura).
// Os saldos mudam apenas por movimentações e entregas.
router.get("/", exigirPermissao("estoque:ler"), validar({ query: esquemas.consultaEstoque }), async (req, res) => {
    const { pagina, limite, busca, armazem_id: armazemId, produto_id: produtoId } = req.dados.query;
    const params = [];
    const condicoes = ["p.excluido_em IS NULL", "a.excluido_em IS NULL"];

    if (armazemId) {
        params.push(armazemId);
        condicoes.push(`e.armazem_id = $${params.length}`);
    }
    if (produtoId) {
        params.push(produtoId);
        condicoes.push(`e.produto_id = $${params.length}`);
    }
    condicoes.push(filtroBusca(["p.nome", "p.codigo", "a.nome"], busca, params));

    res.json(await consultarPaginado({
        select: "e.id, e.produto_id, p.nome AS produto_nome, p.codigo AS produto_codigo, e.armazem_id, a.nome AS armazem_nome, e.quantidade_disponivel",
        from: "estoque e JOIN produtos p ON p.id = e.produto_id JOIN armazens a ON a.id = e.armazem_id",
        condicoes,
        params,
        ordem: "a.nome, p.nome",
        pagina,
        limite
    }));
});

module.exports = router;
