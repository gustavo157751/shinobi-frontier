# Integração analisada: Shinobi Frontier

- Repositório-fonte: https://github.com/gustavo157751/shinobi-frontier
- Branch analisada: `main`
- Commit analisado: `9dd6feb30992e8f30e60040643465b8511d53495`
- Leitura somente-análise do checkout temporário `/tmp/shinobi-frontier`.

## Decisão de integração

O repo fonte é um monorepo React/TypeScript + NestJS/Prisma + PostgreSQL, enquanto este protótipo é Vite/JavaScript puro, client-side e persistido em localStorage. Não foram copiados o backend, esquema Prisma, manifestos/lockfiles, telas React ou catálogos externos: isso exigiria nova arquitetura, hospedagem, migração de dados e revisão da licença (não foi encontrado arquivo de licença no clone).

Foi integrada no protótipo uma implementação nova e independente da ideia de bônus de equipe por função e posicionamento de combate, adaptada ao elenco local e à formação de cinco unidades: posições da frente/retaguarda, funções (vanguarda, atacante, suporte e controle), bônus de atributos, exibição na equipe e aplicação durante o combate. A implementação local e testes ficam em `src/core/formation.js` e `tests/formation.test.js`.

## Referências consultadas

- `apps/api/src/roster/formation.ts`: classifica linha de frente/retaguarda e calcula bônus puros por função.
- `apps/api/src/roster/ninja-catalogue.ts`: enumeração das funções VANGUARD/STRIKER/SUPPORT/CONTROL.
- `apps/api/test/formation.test.cjs`: exemplos de invariantes de formação, posicionamento e limites de redução.
- `README.md`, `apps/api/src/missions/*`, `character/energy.ts` e `apps/api/prisma/schema.prisma`: arquitetura, missões, regeneração e persistência remota.

A lógica aqui foi reescrita para os dados, raridades, regras de chakra e motor de combate deste projeto; não é uma cópia literal da implementação de TypeScript. O repo analisado não contém arquivo de licença identificado; confirme autorização/licença antes de redistribuir trechos do repo externo.