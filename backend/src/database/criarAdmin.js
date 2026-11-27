// Cria (ou promove) um administrador direto no banco.
// Como POST /usuarios agora exige um administrador logado, o primeiro admin é
// criado por aqui, por quem tem acesso ao DATABASE_URL.
//
// Uso:
//   npm run admin:criar -- --login admin --nome "Administrador" [--email admin@empresa.com]
// A senha é pedida no terminal (sem aparecer na tela) ou lida de ADMIN_SENHA.
const readline = require("readline");
const bcrypt = require("bcryptjs");
const pool = require("./connection");
const { criarUsuario: esquemaUsuario, formatarErroDeValidacao } = require("../validacao/esquemas");

function argumento(nome) {
    const indice = process.argv.indexOf(`--${nome}`);
    return indice > -1 ? process.argv[indice + 1] : undefined;
}

function perguntarSenha(pergunta) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        rl._writeToOutput = (texto) => {
            if (texto.includes(pergunta)) rl.output.write(texto);
        };
        rl.question(pergunta, (resposta) => {
            rl.output.write("\n");
            rl.close();
            resolve(resposta);
        });
    });
}

async function criarAdmin() {
    try {
        const login = argumento("login") || process.env.ADMIN_LOGIN;
        const nome = argumento("nome") || process.env.ADMIN_NOME || "Administrador";
        const email = argumento("email") || process.env.ADMIN_EMAIL;

        if (!login) {
            throw new Error('Informe o login: npm run admin:criar -- --login admin --nome "Administrador"');
        }

        const senha = process.env.ADMIN_SENHA || (await perguntarSenha("Senha do administrador: "));

        const validacao = esquemaUsuario.safeParse({ login, senha, nome, email, perfil: "administrador" });
        if (!validacao.success) {
            throw new Error(formatarErroDeValidacao(validacao.error).erro);
        }

        const dados = validacao.data;
        const senhaHash = await bcrypt.hash(dados.senha, 10);

        const resultado = await pool.query(
            `INSERT INTO usuarios (login, senha, perfil, nome, email, ativo)
             VALUES ($1, $2, 'administrador', $3, $4, TRUE)
             ON CONFLICT (login) DO UPDATE
                SET senha = EXCLUDED.senha, perfil = 'administrador', ativo = TRUE,
                    excluido_em = NULL, atualizado_em = NOW()
             RETURNING id, login, (xmax <> 0) AS ja_existia`,
            [dados.login, senhaHash, dados.nome || null, dados.email || null]
        );

        const admin = resultado.rows[0];
        await pool.query(
            `INSERT INTO auditoria (acao, recurso, recurso_id, resultado, detalhes)
             VALUES ('criar_admin_cli', 'usuarios', $1, 'sucesso', $2)`,
            [String(admin.id), { login: admin.login, ja_existia: admin.ja_existia }]
        );

        console.log(admin.ja_existia
            ? `Usuário "${admin.login}" promovido a administrador e senha redefinida.`
            : `Administrador "${admin.login}" criado.`);
    } catch (erro) {
        console.error("Não foi possível criar o administrador:", erro.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

criarAdmin();
