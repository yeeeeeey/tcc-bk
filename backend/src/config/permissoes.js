// Política de acesso por perfil (RBAC), em um único lugar (SEC-02).
// Cada rota declara a permissão que exige; o middleware exigirPermissao consulta
// esta tabela. Ocultar botões no frontend é só conveniência: quem decide é o backend.

const LEITURA_OPERACIONAL = [
    "dashboard:ler",
    "busca:ler",
    "produtos:ler",
    "armazens:ler",
    "estoque:ler",
    "entregas:ler",
    "rastreamento:ler",
    "movimentacoes:ler",
    "transportadoras:ler",
    "veiculos:ler"
];

// Operador: consulta a operação e registra os eventos do dia a dia
const OPERADOR = [
    ...LEITURA_OPERACIONAL,
    "rastreamento:criar",
    "movimentacoes:criar"
];

// Gerente logístico: mantém os cadastros operacionais
const GERENTE_LOGISTICO = [
    ...OPERADOR,
    ...["produtos", "armazens", "entregas", "transportadoras", "veiculos"].flatMap((recurso) => [
        `${recurso}:criar`,
        `${recurso}:editar`,
        `${recurso}:excluir`
    ])
];

// Administrador: tudo, inclusive usuários, correções retroativas e auditoria
const ADMINISTRADOR = [
    ...GERENTE_LOGISTICO,
    "usuarios:ler",
    "usuarios:criar",
    "usuarios:editar",
    "usuarios:excluir",
    "rastreamento:corrigir",
    "movimentacoes:estornar",
    "auditoria:ler",
    "perfis:ler"
];

const PERMISSOES_POR_PERFIL = {
    operador: new Set(OPERADOR),
    gerente_logistico: new Set(GERENTE_LOGISTICO),
    administrador: new Set(ADMINISTRADOR)
};

const PERFIS = Object.keys(PERMISSOES_POR_PERFIL);

const NOMES_PERFIL = {
    administrador: "Administrador",
    gerente_logistico: "Gerente logístico",
    operador: "Operador"
};

function temPermissao(perfil, permissao) {
    return PERMISSOES_POR_PERFIL[perfil]?.has(permissao) ?? false;
}

function listarPermissoes(perfil) {
    return [...(PERMISSOES_POR_PERFIL[perfil] || [])];
}

module.exports = { PERFIS, NOMES_PERFIL, temPermissao, listarPermissoes };
