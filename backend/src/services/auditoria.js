// Trilha de auditoria (SEC-17): usuário, ação, recurso, horário, resultado e IP.
// Cada registro vai para a tabela "auditoria" e também para o log estruturado
// (stdout, visível nos logs da Vercel). Senhas, hashes e tokens nunca são gravados.
const pool = require("../database/connection");

const CHAVES_SENSIVEIS = /senha|password|hash|token|secret|cookie/i;

function limparDetalhes(valor) {
    if (Array.isArray(valor)) return valor.map(limparDetalhes);
    if (valor && typeof valor === "object") {
        return Object.fromEntries(
            Object.entries(valor)
                .filter(([chave]) => !CHAVES_SENSIVEIS.test(chave))
                .map(([chave, item]) => [chave, limparDetalhes(item)])
        );
    }
    return valor;
}

// Com "cliente" (transação aberta), o registro faz parte da mesma transação: se a
// auditoria falhar, a alteração também é desfeita. Sem cliente (ex.: login), uma
// falha na auditoria só é logada, para não derrubar a requisição.
async function registrarAuditoria(req, { acao, recurso, recursoId, resultado = "sucesso", detalhes, cliente, usuario }) {
    const autor = usuario || req?.usuario || null;
    const registro = {
        usuario_id: autor?.id ?? null,
        usuario_login: autor?.login ?? null,
        perfil: autor?.perfil ?? null,
        acao,
        recurso,
        recurso_id: recursoId === undefined || recursoId === null ? null : String(recursoId),
        resultado,
        ip: req?.ip ? String(req.ip).slice(0, 64) : null,
        detalhes: detalhes ? limparDetalhes(detalhes) : null
    };

    console.info(JSON.stringify({ tipo: "auditoria", data: new Date().toISOString(), ...registro }));

    try {
        await (cliente || pool).query(
            `INSERT INTO auditoria (usuario_id, usuario_login, perfil, acao, recurso, recurso_id, resultado, ip, detalhes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [registro.usuario_id, registro.usuario_login, registro.perfil, registro.acao, registro.recurso,
             registro.recurso_id, registro.resultado, registro.ip, registro.detalhes]
        );
    } catch (erro) {
        if (cliente) throw erro;
        console.error(JSON.stringify({ tipo: "erro_auditoria", mensagem: erro.message }));
    }
}

// Lista só os nomes dos campos alterados (os valores podem ter dado pessoal)
function camposAlterados(campos) {
    return Object.keys(campos).filter((chave) => campos[chave] !== undefined && !CHAVES_SENSIVEIS.test(chave));
}

// Executa uma gravação e registra a auditoria na mesma transação. Se a operação
// devolver null (registro não encontrado), nada é auditado.
async function gravarComAuditoria(req, { acao, recurso, detalhes }, operacao) {
    const { comTransacao } = require("../utils/transacao");
    return comTransacao(async (cliente) => {
        const resultado = await operacao(cliente);
        if (resultado) {
            await registrarAuditoria(req, {
                acao,
                recurso,
                recursoId: resultado.id,
                cliente,
                detalhes: typeof detalhes === "function" ? detalhes(resultado) : detalhes
            });
        }
        return resultado;
    });
}

module.exports = { registrarAuditoria, gravarComAuditoria, camposAlterados, limparDetalhes };
