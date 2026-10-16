// Função serverless da Vercel: toda requisição para /api/* chega aqui (veja vercel.json)
// e é atendida pelo mesmo app Express usado localmente.
module.exports = require("../backend/src/app");
