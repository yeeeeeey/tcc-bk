const pool = require("../database/connection");
const { consultarPaginado, filtroBusca, montarAtualizacao } = require("../utils/consultas");

// Nunca devolvem a coluna senha. A listagem traz só o necessário para a gestão
// de acessos (SEC-04): sem CNPJ e sem preferências.
const CAMPOS_LISTA = "id, login, nome, email, perfil, ativo, criado_em";
const CAMPOS_DETALHE = "id, login, nome, email, cnpj, perfil, ativo, criado_em, atualizado_em";
const CAMPOS_PROPRIOS = "id, login, nome, email, cnpj, perfil, preferencias, criado_em";

async function listarUsuarios({ pagina, limite, busca, ativo }) {
    const params = [];
    const condicoes = ["excluido_em IS NULL", filtroBusca(["nome", "login", "email"], busca, params)];
    if (ativo !== undefined) {
        params.push(ativo);
        condicoes.push(`ativo = $${params.length}`);
    }
    return consultarPaginado({
        select: CAMPOS_LISTA,
        from: "usuarios",
        condicoes,
        params,
        // Contas aguardando aprovação aparecem primeiro
        ordem: "ativo, id",
        pagina,
        limite
    });
}

async function buscarUsuarioPorId(id, executor = pool) {
    const resultado = await executor.query(
        `SELECT ${CAMPOS_DETALHE} FROM usuarios WHERE id = $1 AND excluido_em IS NULL`,
        [id]
    );
    return resultado.rows[0];
}

async function buscarMeuPerfil(id, executor = pool) {
    const resultado = await executor.query(
        `SELECT ${CAMPOS_PROPRIOS} FROM usuarios WHERE id = $1 AND excluido_em IS NULL`,
        [id]
    );
    return resultado.rows[0];
}

// Usado no login: aceita tanto o login quanto o e-mail, sem diferenciar
// maiúsculas. Se houver ambiguidade, o login exato tem prioridade.
async function buscarUsuarioParaLogin(login) {
    const resultado = await pool.query(
        `SELECT id, login, nome, email, perfil, ativo, senha
         FROM usuarios
         WHERE excluido_em IS NULL AND (LOWER(login) = LOWER($1) OR LOWER(email) = LOWER($1))
         ORDER BY (LOWER(login) = LOWER($1)) DESC, id
         LIMIT 1`,
        [login]
    );
    return resultado.rows[0];
}

async function buscarHashDaSenha(id) {
    const resultado = await pool.query("SELECT senha FROM usuarios WHERE id = $1 AND excluido_em IS NULL", [id]);
    return resultado.rows[0]?.senha;
}

// Confere se algum valor já é usado como login OU e-mail por outra conta
// (inclusive excluídas, porque as restrições UNIQUE continuam valendo para elas)
async function loginOuEmailEmUso(executor, valores, excetoId = null) {
    const lista = valores.filter(Boolean).map((valor) => valor.toLowerCase());
    if (lista.length === 0) return false;
    const resultado = await executor.query(
        `SELECT 1 FROM usuarios
         WHERE (LOWER(login) = ANY($1) OR LOWER(email) = ANY($1))
           AND ($2::int IS NULL OR id <> $2)
         LIMIT 1`,
        [lista, excetoId]
    );
    return resultado.rowCount > 0;
}

async function criarUsuario(executor, { login, senhaHash, perfil, nome, email, cnpj, ativo }) {
    const resultado = await executor.query(
        `INSERT INTO usuarios (login, senha, perfil, nome, email, cnpj, ativo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${CAMPOS_DETALHE}`,
        [login, senhaHash, perfil, nome || null, email || null, cnpj || null, ativo]
    );
    return resultado.rows[0];
}

async function bloquearUsuario(cliente, id) {
    const resultado = await cliente.query(
        "SELECT id, login, perfil, ativo FROM usuarios WHERE id = $1 AND excluido_em IS NULL FOR UPDATE",
        [id]
    );
    return resultado.rows[0];
}

// Campos não enviados continuam com o valor atual
async function atualizarUsuario(cliente, id, campos) {
    const dados = { ...campos, senha: campos.senhaHash };
    const { sets, params } = montarAtualizacao(dados, ["login", "nome", "email", "cnpj", "perfil", "ativo", "senha"]);
    sets.push("atualizado_em = NOW()");
    params.push(id);
    const resultado = await cliente.query(
        `UPDATE usuarios SET ${sets.join(", ")} WHERE id = $${params.length} AND excluido_em IS NULL
         RETURNING ${CAMPOS_DETALHE}`,
        params
    );
    return resultado.rows[0];
}

async function atualizarMeuPerfil(cliente, id, { nome, cnpj, preferencias }) {
    const { sets, params } = montarAtualizacao({ nome, cnpj }, ["nome", "cnpj"]);
    if (preferencias) {
        // Mescla com as preferências já salvas
        params.push(JSON.stringify(preferencias));
        sets.push(`preferencias = preferencias || $${params.length}::jsonb`);
    }
    sets.push("atualizado_em = NOW()");
    params.push(id);
    const resultado = await cliente.query(
        `UPDATE usuarios SET ${sets.join(", ")} WHERE id = $${params.length} AND excluido_em IS NULL
         RETURNING ${CAMPOS_PROPRIOS}`,
        params
    );
    return resultado.rows[0];
}

async function contarAdministradoresAtivos(cliente, excetoId) {
    const resultado = await cliente.query(
        `SELECT COUNT(*)::int AS total FROM usuarios
         WHERE perfil = 'administrador' AND ativo AND excluido_em IS NULL AND id <> $1`,
        [excetoId]
    );
    return resultado.rows[0].total;
}

async function excluirUsuario(cliente, id) {
    const resultado = await cliente.query(
        `UPDATE usuarios SET excluido_em = NOW(), ativo = FALSE, atualizado_em = NOW()
         WHERE id = $1 AND excluido_em IS NULL
         RETURNING id, login`,
        [id]
    );
    return resultado.rows[0];
}

module.exports = {
    listarUsuarios,
    buscarUsuarioPorId,
    buscarMeuPerfil,
    buscarUsuarioParaLogin,
    buscarHashDaSenha,
    loginOuEmailEmUso,
    criarUsuario,
    bloquearUsuario,
    atualizarUsuario,
    atualizarMeuPerfil,
    contarAdministradoresAtivos,
    excluirUsuario
};
