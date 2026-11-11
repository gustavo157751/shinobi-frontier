# Shinobi Frontier — fundação técnica

Primeira fundação executável de um MMORPG de navegador com identidade original. Não é ainda um MMORPG completo nem está pronto para produção.

## Stack
- Web: React + TypeScript + Vite
- API: NestJS + Prisma
- Persistência: PostgreSQL
- Tempo real: Socket.IO; Redis provisionado para presença, cache e filas
- Infra local: Docker Compose

## Requisitos
Node.js 20+, npm 10+ e Docker.

## Rodar localmente
1. Copie `.env.example` para `.env`.
2. `docker compose up -d`
3. `npm install`
4. `npm run prisma:generate --workspace @shinobi/api`
5. `npm run prisma:migrate --workspace @shinobi/api`
6. Terminal 1: `npm run dev:api`
7. Terminal 2: `npm run dev:web`
8. Acesse http://localhost:5173 (API: http://localhost:3000/api/health).

## Incluído
Monorepo, schema inicial para contas/personagens/ninjas/equipe/missões, registro/login JWT com hash bcrypt, endpoint de saúde e gateway Socket.IO autenticado. A primeira fatia jogável inclui um confronto PvE original por turnos: o servidor valida ações, calcula dano e recompensas e persiste o estado do combate e a progressão do personagem no PostgreSQL. A interface oferece golpe, técnica e defesa, com barras de vitalidade/chakra e relato do confronto.

Rotas autenticadas do combate (enviar `Authorization: Bearer <token>`):
- `GET /api/combat/current` — consulta o confronto ativo.
- `POST /api/combat/start` — inicia o treino e consome 10 pontos de energia.
- `POST /api/combat/action` — envia `{ "action": "strike" | "technique" | "guard" }`.

## Próximas entregas
1. Recrutamento, equipe, inventário e missões com recompensas persistentes.
2. Expandir técnicas, inimigos e encontros com balanceamento e conteúdo original.
3. Mundo compartilhado, presença, chat e matchmaking.
4. Arena PvP, guildas, eventos, economia, anti-cheat, observabilidade, backups, testes e deploy escalável.

Nunca confiar ao cliente cálculo de dano, resultado de combate, moedas ou recompensas. Troque os segredos locais antes de qualquer ambiente compartilhado; não publique `.env`. Personagens, arte, textos e código devem ser originais, sem copiar assets ou conteúdo protegido de terceiros.
