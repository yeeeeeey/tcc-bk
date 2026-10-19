const dashboardModel = require("../models/dashboardModel");

// GET /dashboard -> tudo que a tela inicial do front precisa em uma chamada
async function resumo(req, res) {
    try {
        const [totais, entregasPorStatus, estoquePorArmazem, entregaEmDestaque, entregasAtrasadas, estoqueBaixo] =
            await Promise.all([
                dashboardModel.buscarTotais(),
                dashboardModel.contarEntregasPorStatus(),
                dashboardModel.somarEstoquePorArmazem(),
                dashboardModel.buscarEntregaEmDestaque(),
                dashboardModel.listarEntregasAtrasadas(),
                dashboardModel.listarProdutosComEstoqueBaixo()
            ]);

        res.json({
            totais,
            entregas_por_status: entregasPorStatus,
            estoque_por_armazem: estoquePorArmazem,
            entrega_em_destaque: entregaEmDestaque,
            alertas: {
                entregas_atrasadas: entregasAtrasadas,
                estoque_baixo: estoqueBaixo
            }
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao carregar o dashboard" });
    }
}

module.exports = {
    resumo
};
