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
Monorepo, schema inicial para contas/personagens/ninjas/equipe/missões, registro/login JWT com hash bcrypt, endpoint de saúde, gateway Socket.IO autenticado e interface inicial de criação de conta/perfil.

## Próximas entregas
1. Criar personagem e selecionar caminho/classe com validação server-side.
2. Implementar combate por turnos determinístico e autoritativo.
3. Recrutamento, equipe, inventário, missões e recompensas persistentes.
4. Mundo compartilhado, presença, chat e matchmaking.
5. Arena PvP, guildas, eventos, economia, anti-cheat, observabilidade, backups, testes e deploy escalável.

Nunca confiar ao cliente cálculo de dano, resultado de combate, moedas ou recompensas. Troque os segredos locais antes de qualquer ambiente compartilhado; não publique `.env`. Personagens, arte, textos e código devem ser originais, sem copiar assets ou conteúdo protegido de terceiros.
