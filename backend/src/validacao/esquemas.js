// Esquemas de validação compartilhados por todas as rotas (SEC-13 e SEC-14).
// Toda entrada passa por aqui antes de chegar no controller: dado inválido vira
// 400 com mensagem clara, nunca 500. Os objetos de corpo são "strict": campos
// desconhecidos (ex.: "perfil" no cadastro público) são recusados, não ignorados.
const { z } = require("zod");
const { PERFIS } = require("../config/permissoes");
const { STATUS_RASTREAMENTO } = require("../regras/statusEntrega");

z.config(z.locales.ptBR());

const MAX_INTEIRO = 2147483647;
const TAMANHO_MINIMO_SENHA = 8;
const STATUS_ARMAZEM = ["ativo", "inativo", "manutencao"];
const STATUS_VEICULO = ["disponivel", "em rota", "manutencao", "inativo"];
// Telas do frontend que podem ser escolhidas como página inicial
const TELAS_INICIAIS = ["dashboard", "produtos", "armazens", "estoque", "entregas", "rastreamento", "movimentacoes", "transportadoras", "veiculos", "alertas"];

// ---------------------------------------------------------------------------
// Tipos básicos
// ---------------------------------------------------------------------------

const texto = (maximo, minimo = 1) =>
    z.string({ error: "deve ser um texto" })
        .trim()
        .min(minimo, minimo === 1 ? "não pode ficar vazio" : `precisa ter pelo menos ${minimo} caracteres`)
        .max(maximo, `pode ter no máximo ${maximo} caracteres`);

const inteiro = (minimo, maximo = MAX_INTEIRO) =>
    z.number({ error: "deve ser um número" })
        .int("deve ser um número inteiro")
        .min(minimo, `deve ser maior ou igual a ${minimo}`)
        .max(maximo, `deve ser menor ou igual a ${maximo}`);

const decimal = (minimo, maximo, casas) =>
    z.number({ error: "deve ser um número" })
        .min(minimo, `deve ser maior ou igual a ${minimo}`)
        .max(maximo, `deve ser menor ou igual a ${maximo}`)
        .refine((valor) => Number(valor.toFixed(casas)) === valor, `aceita no máximo ${casas} casas decimais`);

const id = inteiro(1);

const email = z.string({ error: "deve ser um texto" })
    .trim()
    .toLowerCase()
    .max(150, "pode ter no máximo 150 caracteres")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "e-mail inválido");

const senha = z.string({ error: "deve ser um texto" })
    .min(TAMANHO_MINIMO_SENHA, `precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres`)
    // O bcrypt só considera os primeiros 72 bytes
    .refine((valor) => Buffer.byteLength(valor, "utf8") <= 72, "pode ter no máximo 72 bytes")
    .refine((valor) => /[A-Za-zÀ-ÿ]/.test(valor) && /\d/.test(valor), "precisa ter letras e números");

const data = z.string({ error: "deve ser uma data AAAA-MM-DD" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "deve estar no formato AAAA-MM-DD")
    .refine((valor) => {
        const [ano, mes, dia] = valor.split("-").map(Number);
        const d = new Date(Date.UTC(ano, mes - 1, dia));
        return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
    }, "data inexistente");

// CNPJ numérico ou alfanumérico (formato adotado pela Receita a partir de 2026):
// 12 caracteres [A-Z0-9] + 2 dígitos verificadores. Valor de cada caractere = código ASCII − 48.
function normalizarCnpj(valor) {
    return String(valor).toUpperCase().replace(/[.\-/\s]/g, "");
}

function cnpjValido(valor) {
    const cnpj = normalizarCnpj(valor);
    if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) return false;

    const digito = (base) => {
        const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const soma = [...base].reduce((total, caractere, i) => total + (caractere.charCodeAt(0) - 48) * pesos[i], 0);
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    const d1 = digito(cnpj.slice(0, 12));
    const d2 = digito(cnpj.slice(0, 12) + d1);
    return cnpj.endsWith(`${d1}${d2}`);
}

function formatarCnpj(valor) {
    const c = normalizarCnpj(valor);
    return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

const cnpj = z.string({ error: "deve ser um texto" })
    .trim()
    .refine(cnpjValido, "CNPJ inválido")
    .transform(formatarCnpj);

// Placa antiga (ABC1234) ou Mercosul (ABC1D23), gravada sem hífen e em maiúsculas
const placa = z.string({ error: "deve ser um texto" })
    .transform((valor) => valor.toUpperCase().replace(/[\s-]/g, ""))
    .refine((valor) => /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(valor), "placa inválida (use ABC1234 ou ABC1D23)");

const proibido = (mensagem) => z.never({ error: mensagem }).optional();

const naoVazio = (objeto) => objeto.refine((dados) => Object.keys(dados).length > 0, "Envie pelo menos um campo para atualizar");

// ---------------------------------------------------------------------------
// Parâmetros de rota e de consulta
// ---------------------------------------------------------------------------

const idDaUrl = z.string()
    .regex(/^\d{1,10}$/, "deve ser um número inteiro positivo")
    .transform(Number)
    .pipe(inteiro(1));

const parametrosId = z.object({ id: idDaUrl });
const parametrosEntrega = z.object({ entrega_id: idDaUrl });

const paginacao = {
    pagina: z.coerce.number({ error: "deve ser um número" }).int("deve ser inteiro").min(1, "deve ser maior ou igual a 1").max(100000).default(1),
    limite: z.coerce.number({ error: "deve ser um número" }).int("deve ser inteiro").min(1, "deve ser maior ou igual a 1").max(100, "deve ser no máximo 100").default(20),
    busca: z.string({ error: "deve ser um texto" }).trim().max(100, "pode ter no máximo 100 caracteres").optional()
        .transform((valor) => valor || undefined)
};

const consultaLista = z.object(paginacao);

const consultaUsuarios = z.object({
    ...paginacao,
    ativo: z.enum(["true", "false"], { error: "use true ou false" }).optional().transform((v) => (v === undefined ? undefined : v === "true"))
});

const idOpcionalDaQuery = z.coerce.number({ error: "deve ser um número" }).int().min(1).max(MAX_INTEIRO).optional();

const consultaEstoque = z.object({ ...paginacao, armazem_id: idOpcionalDaQuery, produto_id: idOpcionalDaQuery });

const consultaAuditoria = z.object({
    ...paginacao,
    recurso: z.string().trim().max(50).optional(),
    acao: z.string().trim().max(40).optional(),
    usuario_id: idOpcionalDaQuery
});

const consultaBusca = z.object({ q: texto(100, 2) });

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

const camposProduto = {
    nome: texto(150),
    descricao: texto(2000).optional(),
    preco: decimal(0, 99999999.99, 2),
    categoria: texto(100).optional(),
    codigo: texto(50).optional(),
    peso: decimal(0, 9999999.999, 3).optional()
};

const criarProduto = z.strictObject({
    ...camposProduto,
    // Estoque inicial: entra no armazém informado
    quantidade: inteiro(0).optional(),
    armazem_id: id.optional()
}).refine((d) => !(d.quantidade > 0) || d.armazem_id, {
    error: "informe o armazem_id onde a quantidade inicial será guardada",
    path: ["armazem_id"]
});

const atualizarProduto = naoVazio(z.strictObject({
    ...z.object(camposProduto).partial().shape,
    quantidade: proibido("a quantidade é a soma do estoque nos armazéns; registre uma movimentação em /movimentacoes")
}));

// ---------------------------------------------------------------------------
// Armazéns
// ---------------------------------------------------------------------------

const camposArmazem = {
    nome: texto(150),
    localizacao: texto(255),
    capacidade_maxima: inteiro(0).optional(),
    status: z.enum(STATUS_ARMAZEM, { error: `use ${STATUS_ARMAZEM.join(", ")}` }).optional()
};

const criarArmazem = z.strictObject(camposArmazem);
const atualizarArmazem = naoVazio(z.strictObject(camposArmazem).partial());

// ---------------------------------------------------------------------------
// Transportadoras e veículos
// ---------------------------------------------------------------------------

const camposTransportadora = { nome: texto(150), cnpj, contato: texto(100).optional() };
const criarTransportadora = z.strictObject(camposTransportadora);
const atualizarTransportadora = naoVazio(z.strictObject(camposTransportadora).partial());

const camposVeiculo = {
    placa,
    modelo: texto(100),
    capacidade_carga: decimal(0, 99999999.99, 2).optional(),
    status: z.enum(STATUS_VEICULO, { error: `use ${STATUS_VEICULO.join(", ")}` }).optional(),
    transportadora_id: id.nullable().optional()
};
const criarVeiculo = z.strictObject(camposVeiculo);
const atualizarVeiculo = naoVazio(z.strictObject(camposVeiculo).partial());

// ---------------------------------------------------------------------------
// Entregas, rastreamento e movimentações
// ---------------------------------------------------------------------------

const MENSAGEM_STATUS_ENTREGA = "o status da entrega muda somente por eventos de rastreamento (POST /rastreamento)";

const criarEntrega = z.strictObject({
    produto_id: id,
    quantidade: inteiro(1).default(1),
    destino: texto(255),
    data_prevista: data.optional(),
    // Armazém de onde sai a mercadoria. Sem ele, usa o armazém ativo com mais saldo.
    armazem_id: id.optional(),
    status: proibido(MENSAGEM_STATUS_ENTREGA)
});

const atualizarEntrega = naoVazio(z.strictObject({
    produto_id: id.optional(),
    quantidade: inteiro(1).optional(),
    destino: texto(255).optional(),
    data_prevista: data.optional(),
    armazem_id: id.optional(),
    status: proibido(MENSAGEM_STATUS_ENTREGA)
}));

const statusRastreamento = z.enum(STATUS_RASTREAMENTO, { error: `use ${STATUS_RASTREAMENTO.join(", ")}` });

const criarRastreamento = z.strictObject({
    entrega_id: id,
    localizacao_atual: texto(255),
    status: statusRastreamento.default("em transito")
});

const atualizarRastreamento = naoVazio(z.strictObject({
    localizacao_atual: texto(255).optional(),
    status: statusRastreamento.optional()
}));

const criarMovimentacao = z.strictObject({
    produto_id: id,
    quantidade: inteiro(1),
    // Sem armazém de origem = entrada externa (ex.: fornecedor).
    // Sem armazém de destino = saída externa (ex.: cliente).
    armazem_origem_id: id.optional(),
    armazem_destino_id: id.optional(),
    origem: texto(255).optional(),
    destino: texto(255).optional()
})
    .refine((d) => d.armazem_origem_id || d.armazem_destino_id, {
        error: "informe armazem_origem_id, armazem_destino_id ou os dois",
        path: ["armazem_origem_id"]
    })
    .refine((d) => !d.armazem_origem_id || d.armazem_origem_id !== d.armazem_destino_id, {
        error: "origem e destino precisam ser armazéns diferentes",
        path: ["armazem_destino_id"]
    });

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------

const login = z.string({ error: "deve ser um texto" })
    .trim()
    .toLowerCase()
    .min(3, "precisa ter pelo menos 3 caracteres")
    .max(150, "pode ter no máximo 150 caracteres")
    .regex(/^\S+$/, "não pode ter espaços");

const perfil = z.enum(PERFIS, { error: `use ${PERFIS.join(", ")}` });

const preferencias = z.strictObject({
    itens_por_pagina: z.union([z.literal(10), z.literal(20), z.literal(50)], { error: "use 10, 20 ou 50" }).optional(),
    tela_inicial: z.enum(TELAS_INICIAIS, { error: "tela inválida" }).optional()
});

// Cadastro público: o perfil nunca vem da requisição (sempre "operador", inativo)
const cadastroPublico = z.strictObject({
    nome: texto(150),
    email,
    senha,
    cnpj: cnpj.nullable().optional()
});

const criarUsuario = z.strictObject({
    login,
    senha,
    perfil: perfil.default("operador"),
    nome: texto(150).optional(),
    email: email.optional(),
    cnpj: cnpj.optional(),
    ativo: z.boolean({ error: "use true ou false" }).default(true)
});

const atualizarUsuario = naoVazio(z.strictObject({
    login: login.optional(),
    nome: texto(150).optional(),
    email: email.optional(),
    cnpj: cnpj.nullable().optional(),
    perfil: perfil.optional(),
    ativo: z.boolean({ error: "use true ou false" }).optional(),
    // Redefinição de senha feita pelo administrador
    senha: senha.optional()
}));

const entrarNoSistema = z.strictObject({
    login: z.string({ error: "deve ser um texto" }).trim().max(150).optional(),
    email: z.string({ error: "deve ser um texto" }).trim().max(150).optional(),
    senha: z.string({ error: "deve ser um texto" }).min(1, "não pode ficar vazia").max(200)
}).refine((d) => d.login || d.email, { error: "informe o login ou e-mail", path: ["login"] });

const atualizarMeuPerfil = naoVazio(z.strictObject({
    nome: texto(150).optional(),
    cnpj: cnpj.nullable().optional(),
    preferencias: preferencias.optional()
}));

const alterarMinhaSenha = z.strictObject({
    senha_atual: z.string({ error: "deve ser um texto" }).min(1, "não pode ficar vazia").max(200),
    nova_senha: senha
}).refine((d) => d.senha_atual !== d.nova_senha, { error: "a nova senha precisa ser diferente da atual", path: ["nova_senha"] });

// ---------------------------------------------------------------------------
// Formatação dos erros
// ---------------------------------------------------------------------------

function formatarErroDeValidacao(erro) {
    const detalhes = erro.issues.map((issue) => {
        if (issue.code === "unrecognized_keys") {
            return { campo: issue.keys.join(", "), mensagem: "campo não permitido" };
        }
        return { campo: issue.path.join("."), mensagem: issue.message };
    });

    const primeiro = detalhes[0];
    const resumo = primeiro.campo ? `${primeiro.campo}: ${primeiro.mensagem}` : primeiro.mensagem;
    return { erro: `Dados inválidos — ${resumo}`, detalhes };
}

module.exports = {
    TAMANHO_MINIMO_SENHA,
    TELAS_INICIAIS,
    cnpjValido,
    parametrosId,
    parametrosEntrega,
    consultaLista,
    consultaUsuarios,
    consultaEstoque,
    consultaAuditoria,
    consultaBusca,
    criarProduto,
    atualizarProduto,
    criarArmazem,
    atualizarArmazem,
    criarTransportadora,
    atualizarTransportadora,
    criarVeiculo,
    atualizarVeiculo,
    criarEntrega,
    atualizarEntrega,
    criarRastreamento,
    atualizarRastreamento,
    criarMovimentacao,
    cadastroPublico,
    criarUsuario,
    atualizarUsuario,
    entrarNoSistema,
    atualizarMeuPerfil,
    alterarMinhaSenha,
    formatarErroDeValidacao
};
