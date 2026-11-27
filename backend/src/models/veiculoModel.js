const pool = require("../database/connection");
const { consultarPaginado, filtroBusca, montarAtualizacao } = require("../utils/consultas");
const { requisicaoInvalida } = require("../utils/erros");

const COLUNAS = "v.id, v.placa, v.modelo, v.capacidade_carga, v.status, v.transportadora_id, t.nome AS transportadora_nome, v.criado_em";
const ORIGEM = "veiculos v LEFT JOIN transportadoras t ON t.id = v.transportadora_id";
const EDITAVEIS = ["placa", "modelo", "capacidade_carga", "status", "transportadora_id"];

async function garantirTransportadora(cliente, transportadoraId) {
    if (!transportadoraId) return;
    const resultado = await cliente.query(
        "SELECT id FROM transportadoras WHERE id = $1 AND excluido_em IS NULL FOR SHARE",
        [transportadoraId]
    );
    if (!resultado.rows[0]) {
        throw requisicaoInvalida("transportadora_id informado não existe");
    }
}

async function listarVeiculos({ pagina, limite, busca }) {
    const params = [];
    return consultarPaginado({
        select: COLUNAS,
        from: ORIGEM,
        condicoes: ["v.excluido_em IS NULL", filtroBusca(["v.placa", "v.modelo", "v.status", "t.nome"], busca, params)],
        params,
        ordem: "v.id",
        pagina,
        limite
    });
}

async function buscarVeiculoPorId(id, executor = pool) {
    const resultado = await executor.query(
        `SELECT ${COLUNAS} FROM ${ORIGEM} WHERE v.id = $1 AND v.excluido_em IS NULL`,
        [id]
    );
    return resultado.rows[0];
}

async function criarVeiculo(cliente, { placa, modelo, capacidade_carga, status, transportadora_id }) {
    await garantirTransportadora(cliente, transportadora_id);
    const resultado = await cliente.query(
        `INSERT INTO veiculos (placa, modelo, capacidade_carga, status, transportadora_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [placa, modelo, capacidade_carga ?? 0, status || "disponivel", transportadora_id ?? null]
    );
    return buscarVeiculoPorId(resultado.rows[0].id, cliente);
}

// Campos não enviados continuam com o valor atual; transportadora_id: null desvincula
async function atualizarVeiculo(cliente, id, campos) {
    await garantirTransportadora(cliente, campos.transportadora_id);
    const { sets, params } = montarAtualizacao(campos, EDITAVEIS);
    params.push(id);
    const resultado = await cliente.query(
        `UPDATE veiculos SET ${sets.join(", ")}
         WHERE id = $${params.length} AND excluido_em IS NULL
         RETURNING id`,
        params
    );
    return resultado.rows[0] ? buscarVeiculoPorId(id, cliente) : null;
}

async function excluirVeiculo(cliente, id) {
    const resultado = await cliente.query(
        "UPDATE veiculos SET excluido_em = NOW(), status = 'inativo' WHERE id = $1 AND excluido_em IS NULL RETURNING id, placa",
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    listarVeiculos,
    buscarVeiculoPorId,
    criarVeiculo,
    atualizarVeiculo,
    excluirVeiculo
};
