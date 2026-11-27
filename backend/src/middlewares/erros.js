const { ErroHttp } = require("../utils/erros");

// Mensagens para violações de restrições conhecidas do banco
const MENSAGENS_DE_RESTRICAO = {
    usuarios_login_key: "Login já cadastrado",
    usuarios_login_minusculo_idx: "Login já cadastrado",
    usuarios_email_key: "E-mail já cadastrado",
    usuarios_email_minusculo_idx: "E-mail já cadastrado",
    transportadoras_cnpj_key: "CNPJ já cadastrado",
    veiculos_placa_key: "Placa já cadastrada",
    produtos_codigo_key: "Código de produto já cadastrado",
    estoque_quantidade_chk: "Estoque insuficiente",
    produtos_quantidade_chk: "Estoque insuficiente"
};

// Converte erros do Postgres em respostas 4xx. Só o que é realmente inesperado vira 500.
function respostaDeErroDoBanco(erro) {
    const conhecida = MENSAGENS_DE_RESTRICAO[erro.constraint];

    switch (erro.code) {
        case "23505": // unique_violation
            return { status: 409, erro: conhecida || "Registro duplicado" };
        case "23503": // foreign_key_violation
            return String(erro.message).startsWith("update or delete")
                ? { status: 409, erro: "O registro possui histórico vinculado e não pode ser excluído" }
                : { status: 400, erro: "Um dos registros informados não existe" };
        case "23514": // check_violation
            return { status: conhecida ? 409 : 400, erro: conhecida || "Valor fora das regras de negócio" };
        case "23502": // not_null_violation
            return { status: 400, erro: "Campo obrigatório não informado" };
        case "22001": // string_data_right_truncation
            return { status: 400, erro: "Texto maior que o permitido" };
        case "22003": // numeric_value_out_of_range
            return { status: 400, erro: "Número fora do intervalo permitido" };
        case "22P02": // invalid_text_representation
        case "22007": // invalid_datetime_format
        case "22008": // datetime_field_overflow
            return { status: 400, erro: "Formato de dado inválido" };
        case "40001": // serialization_failure
        case "40P01": // deadlock_detected
            return { status: 409, erro: "Conflito com outra operação simultânea; tente novamente" };
        default:
            return null;
    }
}

function rotaNaoEncontrada(req, res) {
    res.status(404).json({ erro: "Rota não encontrada" });
}

// Tratador central. O log interno tem método, rota, código e pilha, mas nunca o
// corpo da requisição (pode conter senha) nem o "detail" do Postgres (pode conter
// dados pessoais).
// eslint-disable-next-line no-unused-vars
function tratarErros(erro, req, res, next) {
    if (res.headersSent) {
        return next(erro);
    }

    if (erro instanceof ErroHttp) {
        return res.status(erro.status).json({ erro: erro.message, ...erro.extras });
    }

    if (erro.type === "entity.parse.failed") {
        return res.status(400).json({ erro: "JSON inválido no corpo da requisição" });
    }

    if (erro.type === "entity.too.large") {
        return res.status(413).json({ erro: "Corpo da requisição muito grande" });
    }

    const doBanco = respostaDeErroDoBanco(erro);
    if (doBanco) {
        return res.status(doBanco.status).json({ erro: doBanco.erro });
    }

    console.error(JSON.stringify({
        tipo: "erro",
        data: new Date().toISOString(),
        metodo: req.method,
        rota: req.originalUrl.split("?")[0],
        usuario_id: req.usuario?.id ?? null,
        codigo: erro.code,
        mensagem: erro.message,
        pilha: erro.stack
    }));

    res.status(500).json({ erro: "Erro interno do servidor" });
}

module.exports = { rotaNaoEncontrada, tratarErros };
