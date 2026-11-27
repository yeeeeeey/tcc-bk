// Executado no final do "npm run build". Na Vercel, aplica o schema no banco
// automaticamente a cada deploy de PRODUÇÃO, então ninguém precisa rodar
// "npm run db:schema" à mão depois de atualizar o código.
//
// - Só roda quando VERCEL_ENV=production (deploys de preview não mexem no banco).
// - Se a migração falhar, o build falha e a Vercel mantém a versão anterior no ar.
// - Fora da Vercel (build local), não faz nada.
require("../config/ambiente");

async function migrarNoDeploy() {
    const ambienteVercel = process.env.VERCEL_ENV;

    if (ambienteVercel !== "production") {
        console.log(`[migração] pulada: ${ambienteVercel ? `deploy de ${ambienteVercel}` : "build fora da Vercel"}.`);
        return;
    }

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL não está disponível no build de produção. Em Vercel > Settings > Environment Variables, marque a variável para o ambiente Production.");
    }

    const { aplicarSchema } = require("./aplicarSchema");
    console.log("[migração] aplicando database/schema.sql no banco de produção...");
    await aplicarSchema();
    console.log("[migração] concluída.");
}

migrarNoDeploy().catch((erro) => {
    console.error(`[migração] FALHOU: ${erro.message}`);
    process.exitCode = 1;
});
