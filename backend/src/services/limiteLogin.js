// Limite de tentativas de login (SEC-11), com contadores no banco para valer
// entre instâncias serverless. Três chaves por tentativa:
//   conta_ip  (mesma conta + mesmo IP)  -> bloqueia cedo quem erra a senha repetidamente
//   ip        (qualquer conta, mesmo IP) -> barra varredura de várias contas
//   conta     (mesma conta, qualquer IP) -> barra ataque distribuído, com limite alto
// O bloqueio é temporário e progressivo (dobra a cada nova falha, até um teto),
// e um login certo zera o contador daquela conta naquele IP. Assim um atacante em
// outro IP não tranca o usuário legítimo com poucas tentativas.
const crypto = require("crypto");
const pool = require("../database/connection");
const { login: config } = require("../config/ambiente");

function resumo(texto) {
    return crypto.createHash("sha256").update(texto).digest("hex").slice(0, 32);
}

function chavesDaTentativa(login, ip) {
    const conta = resumo(String(login).trim().toLowerCase());
    const origem = String(ip || "desconhecido");
    return [
        { chave: `conta_ip:${conta}:${resumo(origem)}`, limite: config.limiteContaIp },
        { chave: `ip:${resumo(origem)}`, limite: config.limiteIp },
        { chave: `conta:${conta}`, limite: config.limiteConta }
    ];
}

// Retorna quantos segundos faltam para liberar (0 = liberado)
async function segundosDeBloqueio(login, ip) {
    const chaves = chavesDaTentativa(login, ip).map((c) => c.chave);
    const resultado = await pool.query(
        `SELECT COALESCE(MAX(CEIL(EXTRACT(EPOCH FROM (bloqueado_ate - NOW())))), 0)::int AS segundos
         FROM tentativas_login
         WHERE chave = ANY($1) AND bloqueado_ate > NOW()`,
        [chaves]
    );
    return resultado.rows[0].segundos;
}

async function registrarFalha(login, ip) {
    const chaves = chavesDaTentativa(login, ip);

    // Contadores mais antigos que a janela recomeçam do zero
    const resultado = await pool.query(
        `INSERT INTO tentativas_login (chave, falhas, atualizado_em)
         SELECT chave, 1, NOW() FROM unnest($1::text[]) AS chave
         ON CONFLICT (chave) DO UPDATE SET
             falhas = CASE
                 WHEN tentativas_login.atualizado_em < NOW() - make_interval(mins => $2)
                      AND (tentativas_login.bloqueado_ate IS NULL OR tentativas_login.bloqueado_ate < NOW())
                 THEN 1
                 ELSE tentativas_login.falhas + 1
             END,
             atualizado_em = NOW()
         RETURNING chave, falhas`,
        [chaves.map((c) => c.chave), config.janelaMinutos]
    );

    for (const { chave, falhas } of resultado.rows) {
        const { limite } = chaves.find((c) => c.chave === chave);
        if (falhas >= limite) {
            const excedente = Math.min(falhas - limite, 10);
            const segundos = Math.min(config.bloqueioInicialSegundos * 2 ** excedente, config.bloqueioMaximoSegundos);
            await pool.query(
                "UPDATE tentativas_login SET bloqueado_ate = NOW() + make_interval(secs => $2) WHERE chave = $1",
                [chave, segundos]
            );
        }
    }
}

async function registrarSucesso(login, ip) {
    const [contaIp] = chavesDaTentativa(login, ip);
    await pool.query("DELETE FROM tentativas_login WHERE chave = $1", [contaIp.chave]);
    // Limpeza oportunista de contadores antigos
    await pool.query(
        "DELETE FROM tentativas_login WHERE atualizado_em < NOW() - INTERVAL '1 day' AND (bloqueado_ate IS NULL OR bloqueado_ate < NOW())"
    );
}

module.exports = { segundosDeBloqueio, registrarFalha, registrarSucesso };
