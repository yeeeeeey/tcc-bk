const app = require("./app");

const PORT = process.env.PORT || 3000;

// Na Vercel o app é importado como função; só abre a porta quando roda com "node server.js"
if (require.main === module) {
    // No Express 5 o callback também recebe o erro (ex.: porta já em uso)
    app.listen(PORT, (erro) => {
        if (erro) {
            console.error(`Não foi possível abrir a porta ${PORT}: ${erro.message}`);
            process.exit(1);
        }
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

module.exports = app;
