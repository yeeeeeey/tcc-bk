const { formatarErroDeValidacao } = require("../validacao/esquemas");

// Valida params, query e body com os esquemas do zod. O resultado limpo (com
// conversões e valores padrão) fica em req.dados.params / .query / .body.
// No Express 5 req.query é somente leitura, por isso o resultado vai em req.dados.
function validar(esquemas) {
    return (req, res, next) => {
        req.dados = req.dados || {};

        for (const parte of ["params", "query", "body"]) {
            const esquema = esquemas[parte];
            if (!esquema) continue;

            const resultado = esquema.safeParse(req[parte] ?? {});
            if (!resultado.success) {
                return res.status(400).json(formatarErroDeValidacao(resultado.error));
            }
            req.dados[parte] = resultado.data;
        }

        next();
    };
}

module.exports = { validar };
