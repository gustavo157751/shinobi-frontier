# Shinobi Frontier — fundação técnica

Primeira fundação executável de um MMORPG de navegador com identidade original. Não é ainda um MMORPG completo nem está pronto para produção.

## Stack
- Web: React + TypeScript + Vite
- API: NestJS + Prisma
- Persistência: PostgreSQL
- Tempo real: Socket.IO no namespace `/game`, com presença do mundo compartilhada por Redis; Redis também provisionado para cache e filas (opcional em desenvolvimento)
- Infra local: Docker Compose

## Requisitos
Node.js 22+, npm 10+ e Docker.

## Rodar localmente
1. Copie `.env.example` para `.env` e substitua `JWT_SECRET` por um segredo aleatório com ao menos 32 caracteres.
2. `docker compose up -d`
3. `npm ci`
4. `npm run prisma:generate --workspace @shinobi/api`
5. `npm run prisma:migrate:deploy --workspace @shinobi/api`
6. Terminal 1: `npm run dev:api`
7. Terminal 2: `npm run dev:web`
8. Acesse http://localhost:5173. A API usa `http://localhost:3000/api`; `/api/health` confirma também a conexão com PostgreSQL e informa o estado do Redis.

Os comandos Prisma leem `DATABASE_URL` do ambiente ou do `.env` na raiz. Em desenvolvimento local, se essa variável não estiver definida, usam a URL local do `.env.example` e avisam que o PostgreSQL do Docker Compose precisa estar ativo. `npm run dev:api` gera o Prisma Client e aplica as migrações versionadas antes de iniciar o NestJS. `prisma:migrate` é para criar migrações durante desenvolvimento; `prisma:migrate:deploy` aplica migrações existentes e exige URL explícita em produção.

## Incluído
Monorepo, schema inicial para contas/personagens/ninjas/equipe/missões, registro/login JWT com hash bcrypt, endpoint de saúde e gateway Socket.IO autenticado. A primeira fatia jogável inclui um confronto PvE original por turnos: o servidor valida ações, calcula dano e recompensas e persiste o estado do combate e a progressão do personagem no PostgreSQL. A interface oferece golpe, técnica e defesa, com barras de vitalidade/chakra e relato do confronto.

O cabeçalho do jogo mostra quantos shinobis estão online em tempo real. O namespace `/game` autentica cada conexão pelo cookie `sf_session` e publica `world:presence` com `{ online, store, updatedAt }` sempre que alguém entra ou sai. Abas duplicadas do mesmo jogador contam uma única vez e o contador só diminui quando a última aba é fechada. Também há `world:ping` (resposta `world:pong`) para medir latência e `world:presence` como mensagem para pedir um retrato atualizado.

A presença usa Redis (`sf:presence:online`) quando `REDIS_URL` está configurada e alcançável, permitindo contagem compartilhada entre instâncias da API. Sem Redis, a contagem fica em memória local e o jogo continua funcionando: `/api/health` retorna `redis: "disabled"` ou `"unavailable"`, mas não falha por causa disso. Se o Redis cair no meio de uma sessão, a contagem degrada para memória em vez de derrubar o jogador.

Rotas autenticadas do combate (sessão pelo cookie `sf_session`):
- `GET /api/combat/current` — consulta o confronto ativo.
- `POST /api/combat/start` — inicia o treino e consome 10 pontos de energia.
- `POST /api/combat/action` — envia `{ "action": "strike" | "technique" | "guard" }`.

## Equipe e formação

O quartel permite recrutar shinobis e montar um esquadrão de até quatro posições: 1 e 2 formam a linha de frente, 3 e 4 a retaguarda. Cada papel contribui de forma diferente — vanguarda aumenta a vitalidade e reduz o dano recebido, atacante soma dano (mais forte na retaguarda), suporte amplia chakra e recuperação na defesa, e controle reforça técnicas. O poder e os bônus são calculados no servidor por uma função pura compartilhada com a interface, então o número exibido e o aplicado em combate são sempre os mesmos.

Ao iniciar um confronto, o bônus da formação é congelado no estado da batalha: mudar o esquadrão no meio da luta não altera o confronto em andamento. Confrontos antigos sem esse campo continuam válidos e apenas não recebem bônus. Recrutamento custa ryō e exige nível mínimo; a validação de saldo, posse e posições é sempre do servidor.

Rotas autenticadas do quartel:
- `GET /api/roster` — formação atual, poder, bônus, elenco recrutado e catálogo disponível.
- `GET /api/roster/catalog` — catálogo completo com custo, nível exigido e situação de cada ninja.
- `POST /api/roster/recruit` — envia `{ "ninjaCode": "STONE_WARDEN" }`.
- `PUT /api/roster/formation` — envia `{ "slots": [{ "ninjaCode": "STONE_WARDEN", "position": 1 }] }`.

O catálogo é original deste projeto e vive em `apps/api/src/roster/ninja-catalogue.ts`: ao iniciar, a API sincroniza a tabela `Ninja` com essas definições versionadas, sem migração de schema adicional.

As rotas de jogo autenticadas usam um cookie de sessão `HttpOnly`; o navegador envia esse cookie automaticamente. O frontend não persiste JWT nem personagem em `localStorage`. `GET /api/auth/me` restaura a sessão e carrega o personagem do banco; `POST /api/auth/logout` encerra a sessão no navegador.

## Configuração e execução hospedada

O GitHub versiona o código e executa verificações no Actions; ele não hospeda a API nem o PostgreSQL. Para usar o jogo fora do computador local, hospede o frontend, a API NestJS e um banco PostgreSQL separadamente e configure:

- `DATABASE_URL`: conexão PostgreSQL da API e das migrações.
- `JWT_SECRET`: segredo aleatório com pelo menos 32 caracteres. Em `NODE_ENV=production`, a API falha ao iniciar se estiver ausente ou curto.
- `WEB_ORIGIN`: origem exata do site React, incluindo protocolo e domínio; a API permite credenciais apenas dessa origem.
- `VITE_API_URL`: URL base pública da API com `/api` no final. É incorporada ao build do frontend, não é um segredo. Se frontend e API compartilham domínio/reverse proxy, pode ser `/api`.
- `AUTH_COOKIE_SAME_SITE`: `lax` por padrão. Para frontend e API em sites diferentes, use `none` com HTTPS; nesse modo o cookie é sempre `Secure`. Hospedar frontend e API sob o mesmo site reduz problemas de bloqueio de cookies de terceiros.
- `API_PORT`: porta de escuta do processo NestJS.
- `REDIS_URL`: conexão Redis usada para presença compartilhada, cache e filas. Opcional: sem ela a API usa memória local e continua aceitando jogadores.

Em produção, aplique as migrações com `npm run prisma:migrate:deploy --workspace @shinobi/api`, gere o frontend com `npm run build` e inicie a API compilada com `npm run start:prod --workspace @shinobi/api`. Configure o serviço de hospedagem para iniciar novamente o processo quando ele terminar e monitore `/api/health`, que retorna indisponível se o PostgreSQL não responder.

O CI agora sobe PostgreSQL e Redis efêmeros, aplica a migração inicial e executa testes HTTP cobrindo registro, login, sessão por cookie, acesso protegido ao combate e logout, além de um teste de Socket.IO que valida a presença autenticada e a recusa de conexões sem cookie. Os testes também cobrem recrutamento, validação de formação e o bônus congelado no combate. Bancos de produção já criados com `db push` precisam de baseline antes de usar a migração inicial.

## Próximas entregas
1. Inventário e missões com recompensas persistentes, usando a formação já ativa no combate.
2. Expandir técnicas, inimigos e encontros com balanceamento e conteúdo original.
3. Chat do mundo, canais de sala e matchmaking sobre a presença já publicada em `/game`.
4. Arena PvP, guildas, eventos, economia, anti-cheat, observabilidade, backups, testes e deploy escalável.

Nunca confiar ao cliente cálculo de dano, resultado de combate, moedas ou recompensas. Troque os segredos locais antes de qualquer ambiente compartilhado; não publique `.env`. Personagens, arte, textos e código devem ser originais, sem copiar assets ou conteúdo protegido de terceiros.

## Contas e dados
- O e-mail é o identificador de login, normalizado com espaços removidos e letras minúsculas; o nome do personagem continua sendo um dado de jogo independente.
- Senhas são armazenadas somente como hash bcrypt. As respostas de autenticação retornam apenas os campos públicos da conta, nunca o e-mail ou hash.
- `SUSPENDED` e `DELETED` impedem autenticação. A remoção de conta deve ser lógica (`status = DELETED`, `deletedAt` preenchido) para preservar relações de jogo e auditoria; não há endpoint de suspensão/exclusão nesta fatia.
- A verificação de e-mail fica pendente (`emailVerifiedAt = null`) até existir um fluxo de envio e confirmação. Eventos `REGISTERED` e `LOGIN_SUCCEEDED` formam uma trilha mínima sem armazenar credenciais.
- A migração `20261111000000_initial_accounts_gameplay` cria o schema completo em um banco vazio. Se um ambiente já tiver tabelas criadas por `db push`, faça o baseline da migração antes de aplicar; não execute essa migração inicial diretamente sobre tabelas existentes.
