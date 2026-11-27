// Sessões guardadas no servidor (SEC-10). O navegador recebe só um token aleatório
// em cookie HttpOnly/Secure/SameSite; o banco guarda o hash SHA-256 dele. Assim o
// JavaScript da página não lê o token, o logout apaga a sessão de verdade e a
// expiração é conferida em toda requisição.
const crypto = require("crypto");
const pool = require("../database/connection");
const ambiente = require("../config/ambiente");

function hashDoToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function opcoesDoCookie() {
    return {
        httpOnly: true,
        secure: ambiente.sessao.cookieSeguro,
        sameSite: "strict",
        path: "/"
    };
}

async function criarSessao(usuarioId, { ip, userAgent } = {}) {
    const token = crypto.randomBytes(32).toString("base64url");

    // Limpeza oportunista das sessões vencidas
    await pool.query("DELETE FROM sessoes WHERE expira_em < NOW()");

    const resultado = await pool.query(
        `INSERT INTO sessoes (token_hash, usuario_id, expira_em, ip, user_agent)
         VALUES ($1, $2, NOW() + make_interval(hours => $3), $4, $5)
         RETURNING expira_em`,
        [hashDoToken(token), usuarioId, ambiente.sessao.horas, ip || null, (userAgent || "").slice(0, 255) || null]
    );

    return { token, expiraEm: resultado.rows[0].expira_em };
}

// Devolve o usuário dono da sessão, ou null se o token não existe, expirou ou a
// conta foi desativada. O perfil vem do banco a cada requisição: mudar o perfil
// de alguém vale imediatamente.
async function buscarSessao(token) {
    if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;

    const resultado = await pool.query(
        `SELECT u.id, u.login, u.nome, u.email, u.perfil, s.token_hash, s.expira_em
         FROM sessoes s
         JOIN usuarios u ON u.id = s.usuario_id
         WHERE s.token_hash = $1
           AND s.expira_em > NOW()
           AND u.ativo
           AND u.excluido_em IS NULL`,
        [hashDoToken(token)]
    );

    const linha = resultado.rows[0];
    if (!linha) return null;

    const { token_hash: tokenHash, expira_em: expiraEm, ...usuario } = linha;
    return { usuario, tokenHash, expiraEm };
}

async function encerrarSessao(token) {
    if (typeof token !== "string") return;
    await pool.query("DELETE FROM sessoes WHERE token_hash = $1", [hashDoToken(token)]);
}

// Encerra todas as sessões de um usuário, opcionalmente mantendo uma (a atual)
async function encerrarSessoesDoUsuario(usuarioId, { exceto, executor = pool } = {}) {
    const resultado = await executor.query(
        "DELETE FROM sessoes WHERE usuario_id = $1 AND ($2::text IS NULL OR token_hash <> $2)",
        [usuarioId, exceto || null]
    );
    return resultado.rowCount;
}

module.exports = {
    opcoesDoCookie,
    criarSessao,
    buscarSessao,
    encerrarSessao,
    encerrarSessoesDoUsuario
};
