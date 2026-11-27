# Correções do relatório de falhas — Bankai

Este documento liga cada achado do *Relatório de falhas e vulnerabilidades — Bankai*
(verificação de 04/11/2026) ao que foi alterado no código e ao teste que comprova a
correção. Os testes ficam em `backend/test/` e rodam com `npm test`.

**Legenda:** ✅ corrigido e coberto por teste automatizado · ☑️ corrigido, verificado manualmente ·
⚠️ depende de ação fora do código (ver [Ações pendentes](#ações-pendentes-fora-do-código))

## A. Vulnerabilidades de segurança

| Item | Status | O que mudou | Onde | Teste |
|---|---|---|---|---|
| **SEC-01** Autenticação ausente | ✅ | Toda rota exige sessão válida; as públicas são uma lista explícita (`/`, `/health`, cadastro, login, logout). Sem sessão → **401**. | `app.js`, `middlewares/autenticacao.js` | `autenticacao.test.js` |
| **SEC-02** RBAC insuficiente | ✅ | Matriz única de permissões por perfil; cada rota declara a permissão exigida. Sem permissão → **403**, registrado na auditoria. O perfil é lido do banco a cada requisição. | `config/permissoes.js`, todas as `routes/` | `autorizacao.test.js` |
| **SEC-03** Criação/alteração de usuários | ✅ | `POST/PUT/DELETE /usuarios` só para administrador. Cadastro público **recusa** o campo `perfil`, cria sempre *operador* e **inativo** (precisa de aprovação). Administrador não remove o próprio acesso nem o último admin. O 500 relatado vinha de e-mail com mais de 100 caracteres (coluna `login` menor que `email`) e de tipos não validados; os dois casos foram corrigidos. | `usuarioControllers.js`, `schema.sql` | `usuarios.test.js` |
| **SEC-04** Dados pessoais na listagem | ✅ | Listagem só para admin, paginada, sem CNPJ, preferências ou senha. | `usuarioModel.js` | `autorizacao.test.js` |
| **SEC-05** IDOR em `/usuarios/:id` | ✅ | Só o próprio usuário ou quem tem `usuarios:ler`; demais → **403** auditado. | `usuarioControllers.buscarPorId` | `autorizacao.test.js` |
| **SEC-06/07/08/09** Veículos, armazéns, produtos e rastreamento sem login | ✅ | Cobertos por SEC-01/02. Não existe catálogo público no front, então produtos foram tratados como inventário interno. Rastreamento público por código externo **não** foi criado, porque não há esse requisito hoje. | `app.js` | `autenticacao.test.js` |
| **SEC-10** Sessão só no frontend | ✅ | Sessão no servidor (tabela `sessoes`, só o hash SHA-256 do token) em cookie `HttpOnly`, `SameSite=Strict` e `Secure` em produção. Expira em 8 h; logout apaga a sessão; desativar conta, trocar senha ou perfil derruba as sessões. O front não usa mais `localStorage`. | `services/sessoes.js`, `App.jsx`, `api.js` | `autenticacao.test.js` |
| **SEC-11** Rate limiting no login | ✅ | Contadores no banco (valem entre instâncias serverless) por conta+IP (5), IP (20) e conta (50) em 15 min; bloqueio progressivo de 1 a 15 min com `Retry-After`. Um login certo zera o contador. Mensagem genérica e tempo de resposta igual para login inexistente. Também há limite geral (300 req/min/IP) e de cadastros (10/h/IP). | `services/limiteLogin.js`, `app.js` | `limiteLogin.test.js` |
| **SEC-12** TLS do PostgreSQL | ☑️ | `rejectUnauthorized: true`; aceita CA própria em `DATABASE_CA_CERT`. Os parâmetros SSL da URL (que no `pg` têm precedência sobre a opção `ssl`) são removidos, para ninguém desligar a verificação só trocando a URL. | `database/connection.js` | — |
| **SEC-13** Validação inconsistente | ✅ | Esquemas zod compartilhados para toda entrada (corpo, query e parâmetros). Campos desconhecidos são recusados. Entrada inválida → **400** com o campo e o motivo. Erros do banco viram 400/409. O log interno não grava o corpo da requisição nem o `detail` do Postgres. Senha com a mesma regra no cadastro público e no administrativo (8+ caracteres, letras e números, até 72 bytes). | `validacao/esquemas.js`, `middlewares/erros.js` | `usuarios.test.js`, `seguranca.test.js` |
| **SEC-14** Valores de negócio | ✅ | Faixas e casas decimais validadas na API e 16 restrições `CHECK` no banco (preço, quantidades, capacidades, status). CNPJ com dígito verificador (inclusive alfanumérico) e placa antiga/Mercosul. A capacidade do armazém não pode ficar abaixo da ocupação. | `esquemas.js`, `schema.sql` | `logistica.test.js` |
| **SEC-15** CORS permissivo | ✅ | Lista explícita com credenciais; em produção, sem `FRONTEND_URL`, nenhuma origem externa. Em desenvolvimento o Vite faz proxy de `/api` (mesma origem). | `config/ambiente.js` | `seguranca.test.js` |
| **SEC-16** Cabeçalhos HTTP | ✅ | API: Helmet (sem `X-Powered-By`, CSP `default-src 'none'`, `nosniff`, HSTS em produção) + `Cache-Control: no-store`. Site: CSP, HSTS, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy` no `vercel.json`. | `app.js`, `vercel.json` | `seguranca.test.js` |
| **SEC-17** Trilha de auditoria | ✅ | Tabela `auditoria` (usuário, perfil, ação, recurso, id, resultado, IP, data e detalhes sem segredos) + log estruturado. Cada alteração é gravada **na mesma transação** da auditoria. Também ficam registrados logins, falhas, bloqueios e acessos negados. Tela *Administração > Auditoria*. | `services/auditoria.js` | `seguranca.test.js`, `usuarios.test.js` |
| **SEC-18** Exclusão em cascata | ✅ | Chaves estrangeiras com histórico passaram de `CASCADE` para `RESTRICT`. A API faz exclusão lógica (`excluido_em`) e recusa excluir produto com estoque ou entregas abertas, armazém com saldo e transportadora com veículos. | `schema.sql`, models | `logistica.test.js` |
| **SEC-19** Criptografia dos dados | ⚠️ | Senhas com bcrypt (já existia), TLS verificado com o banco (SEC-12), HSTS no site e segredos só em variáveis de ambiente (`.env.example` documentado). Criptografia em repouso depende do provedor. | — | — |
| **SEC-20** Rastreamento sem transação | ✅ | Evento e status da entrega em `BEGIN/COMMIT/ROLLBACK` com o mesmo cliente e a linha da entrega bloqueada. | `rastreamentoControllers.criar`, `utils/transacao.js` | `logistica.test.js` (falha simulada entre as duas operações) |
| **SEC-21** Edição/exclusão desalinham status | ✅ | O histórico de rastreamento é a fonte da verdade, e `entregas.status` só muda por eventos. A correção retroativa é só para admin, só no evento mais recente, valida a transição, recalcula o status e audita antes/depois. A exclusão de evento é lógica. | `rastreamentoControllers.corrigirEvento` | `logistica.test.js` |
| **SEC-22** Entrega sem conferir estoque | ✅ | A entrega reserva o estoque do armazém (informado ou o de maior saldo) na mesma transação; sem saldo → **409** e nada gravado. Cancelar ou excluir devolve a reserva. Testado com 5 pedidos simultâneos. | `services/estoque.js`, `entregaControllers.js` | `logistica.test.js` |
| **SEC-23** Movimentações sem saldo | ✅ | Movimentação tem `quantidade` e armazéns de origem/destino; débito e crédito são atômicos, com bloqueio de linha e checagem de capacidade. `produtos.quantidade` virou a soma dos saldos, mantida por gatilho no banco. Não há edição: o estorno (admin) inverte o efeito. O estoque antigo é migrado para o armazém principal. | `movimentacaoControllers.js`, `schema.sql` | `logistica.test.js` |
| **SEC-24** Transições de status | ✅ | Máquina de estados explícita (pendente → processando/em trânsito → entregue; cancelado a partir de qualquer não final), validada no backend e no banco. | `regras/statusEntrega.js` | `logistica.test.js` |

## Falhas funcionais e de usabilidade

| Problema | Status | Correção |
|---|---|---|
| Link de termos de uso não funciona | ☑️ | O link abre os termos em um modal (sem perder o que foi digitado), com “Li e aceito”. Também disponível em `/termos` e no rodapé. Os links `#` do rodapé passaram a apontar para as seções reais. |
| Seta de voltar fecha toda a aplicação | ☑️ | Cada tela tem URL própria (`/login`, `/cadastro`, `/app/produtos`...) via History API; a Vercel devolve o `index.html` para essas rotas. |
| Conexão com Google/Apple não implementada | ☑️ | Botões removidos do login e do cadastro. OAuth exigiria credenciais de desenvolvedor que o projeto não tem; dá para reintroduzir depois, se virar requisito. |
| Operador sem tela de perfil | ☑️ | *Conta > Meu perfil*: dados, CNPJ, preferências (itens por página e tela inicial), troca de senha e encerramento das outras sessões. |
| Campo de busca não funciona | ☑️ | Busca do topo ligada a `GET /busca?q=` (2 a 100 caracteres, `%` e `_` tratados como texto, resultados filtrados pelo perfil). Cada lista também tem filtro e paginação. |

Os fluxos acima foram percorridos em navegador automatizado (Playwright): voltar do
navegador, termos, cadastro → aprovação → login, busca, operador sem acesso
administrativo, perfil e logout.

## Critérios de reteste do relatório

| Cenário | Resultado obtido |
|---|---|
| Visitante consulta dados internos | 401 |
| Operador tenta função administrativa | 403 (e registro `negado` na auditoria) |
| Usuário consulta registro privado de outro | 403 |
| Entrada inválida em cadastro | 400 com campo e motivo, sem 500 |
| Administrador executa ação permitida | Sucesso com registro de auditoria |
| Login com repetidas falhas | 429 temporário e progressivo; outra conta no mesmo IP continua entrando |

## Ações pendentes (fora do código)

1. **Rotacionar a credencial do banco exposta anteriormente** (item “Imediato” do plano).
   Não há credencial real no histórico *deste* repositório, mas o relatório indica exposição
   anterior (ZIP analisado ou repositório antigo). Gere uma nova senha na Neon e atualize a
   `DATABASE_URL` na Vercel e nos `.env` locais.
2. **Aplicar o schema no banco da Neon:** `npm run db:schema`. É idempotente e migra os dados
   existentes. Contas que já existiam continuam ativas.
3. **Criar o primeiro administrador:** `npm run admin:criar -- --login admin`. O `POST /usuarios`
   sem login, usado antes, agora é recusado.
4. **SEC-19:** confirmar na documentação da Neon a criptografia em repouso e ativar/testar a
   restauração (*point-in-time restore*) como rotina de backup.
5. Se o site e a API ficarem em domínios diferentes, definir `FRONTEND_URL` na Vercel.

## Limitações conhecidas

- O bloqueio por conta (50 falhas em 15 min, vindas de qualquer IP) permite que um atacante
  atrase o login de uma conta específica por até 15 minutos. É uma troca consciente para
  barrar ataque distribuído; o limite por conta+IP protege o usuário legítimo no caso comum.
- O limite geral de requisições é em memória: na Vercel vale por instância. O limite de
  login, que é o crítico, fica no banco.
- Não foram feitos testes de carga nem pentest após as correções; vale um reteste da equipe
  que produziu o relatório.
