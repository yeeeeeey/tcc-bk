const ambiente = require("../config/ambiente");
const sessoes = require("../services/sessoes");
const { temPermissao } = require("../config/permissoes");
const { registrarAuditoria } = require("../services/auditoria");

// Lê o cookie de sessão (se houver) e preenche req.usuario. Não bloqueia nada:
// quem bloqueia são exigirAutenticacao e exigirPermissao.
async function identificarUsuario(req, res, next) {
    const token = req.cookies?.[ambiente.sessao.nomeCookie];
    if (token) {
        const sessao = await sessoes.buscarSessao(token);
        if (sessao) {
            req.usuario = sessao.usuario;
            req.sessao = { tokenHash: sessao.tokenHash, expiraEm: sessao.expiraEm };
        } else {
            // Cookie vencido ou inválido: remove do navegador
            res.clearCookie(ambiente.sessao.nomeCookie, sessoes.opcoesDoCookie());
        }
    }
    next();
}

// 401 para quem não está logado (SEC-01)
function exigirAutenticacao(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({ erro: "Faça login para continuar" });
    }
    next();
}

// 403 para quem está logado mas o perfil não tem a permissão (SEC-02)
function exigirPermissao(...permissoes) {
    return async (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ erro: "Faça login para continuar" });
        }

        const negada = permissoes.find((permissao) => !temPermissao(req.usuario.perfil, permissao));
        if (negada) {
            const [recurso, acao] = negada.split(":");
            await registrarAuditoria(req, {
                acao,
                recurso,
                recursoId: req.params?.id,
                resultado: "negado",
                detalhes: { metodo: req.method, rota: req.baseUrl + req.path }
            });
            return res.status(403).json({ erro: "Seu perfil não tem permissão para esta ação" });
        }
        next();
    };
}

module.exports = { identificarUsuario, exigirAutenticacao, exigirPermissao };
