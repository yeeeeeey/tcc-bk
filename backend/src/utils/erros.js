// Erro com status HTTP: lançado em qualquer camada e convertido em resposta JSON
// pelo tratador central (middlewares/erros.js).
class ErroHttp extends Error {
    constructor(status, mensagem, extras = {}) {
        super(mensagem);
        this.status = status;
        this.extras = extras;
    }
}

const requisicaoInvalida = (mensagem) => new ErroHttp(400, mensagem);
const naoEncontrado = (mensagem) => new ErroHttp(404, mensagem);
const conflito = (mensagem) => new ErroHttp(409, mensagem);

module.exports = { ErroHttp, requisicaoInvalida, naoEncontrado, conflito };
