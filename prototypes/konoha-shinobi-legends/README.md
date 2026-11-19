# Konoha Shinobi Legends

Protótipo jogável de RPG de turnos e gerenciamento de equipe shinobi, inspirado na experiência de
Naruto Online. Roda 100% no navegador (HTML5, CSS3 e JavaScript puro, sem framework e sem backend),
com progresso salvo no `localStorage`.

## Como jogar

1. **Crie o protagonista**: nome, gênero e estilo de luta (Taijutsu, Ninjutsu ou Genjutsu). O estilo
   define vida, ataque, velocidade, chakra e os dois jutsus iniciais.
2. **Monte a formação**: posicione você + até 4 ninjas clássicos numa grade 3×3, escolha a linha de frente e reposicione integrantes. Sinergias por função e coluna alteram bônus; a tela também simula encadeamentos de ataque básico e jutsu.
3. **Escolha uma missão** de Rank D a Rank S. Cada tentativa custa stamina; ataques automáticos priorizam a linha de frente, mas você pode escolher alvos manualmente.
4. **Vença o combate por turnos**: a ordem é definida pela velocidade; o ataque básico gera chakra e
   os jutsus consomem. Sempre que um alvo recebe **Flutuação** ou **Derrubar**, os aliados com
   perseguição compatível atacam em cadeia automaticamente.
5. **Invista as recompensas**: Ryos, EXP e pergaminhos. Pergaminhos invocam novos ninjas; duplicatas
   viram Ryos e EXP.

## Hub de exploração da Vila

A tela da Vila foi reorganizada como um hub panorâmico: perfil e recursos no topo, atalhos para os
sistemas existentes, paisagem original ao centro, mapa ilustrativo e próxima missão à direita,
comunicado e equipe no canto inferior e navegação no rodapé. O cartão prioritário abre o briefing
real da missão. Em telas a partir de 320 px, os cinco atalhos se refluem sem rolagem horizontal; a
coluna de mapa e missão pode rolar verticalmente, mantendo os controles inferiores acessíveis.

Durante a luta, jutsus têm projéteis e impactos coloridos pelo elemento; ataques em área disparam
contra cada alvo, enquanto cura, suporte e Guarda criam auras protetoras. Pursuits exibem o avanço
do ninja e impactos em cadeia sincronizados com o combo. As animações respeitam `prefers-reduced-motion`.

O elenco recrutável contém 22 ninjas. Esta expansão acrescenta Neji, Choji, Temari, Kankuro, Zabuza
e Haku, cada um com dois jutsus e uma perseguição que usa os gatilhos e efeitos de status já presentes
no combate.

## Como rodar

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # gera dist/ para publicar como site estático
pnpm test     # testes unitários de elenco, pursuits, formação, convocação, combos, combate e VFX
```

## Onde alterar o balanceamento

| O que mudar | Arquivo | Campo |
| --- | --- | --- |
| Vida, ataque, defesa, velocidade, chakra e crítico | `src/data/characters.js` | `base` e `growth` de cada personagem |
| Custo de chakra e poder dos jutsus | `src/data/jutsus.js` | `cost`, `power`, `hits`, `effect` |
| Fórmula de dano, crítico e variância | `src/data/characters.js` | `DAMAGE_TUNING` |
| Ataque básico por estilo (dano e chakra gerado) | `src/data/characters.js` | `BASIC_ATTACKS` |
| Efeitos de estado (duração, dano de queimadura) | `src/data/statuses.js` | `STATUS_META` |
| Perseguições (gatilhos de combo e multiplicador) | `src/data/characters.js` | `pursuit` de cada ninja |
| Efeitos visuais elementais, projéteis e impactos | `src/ui/battle-vfx.js` e `src/styles/battle.css` | temas, formas e duração das animações |
| Sinergia por função/posição e linhas da grade | `src/core/formation.js` | `ROLE_BY_ID` e fórmulas em `formationBonuses()` |
| Simulação de cadeia e total de acertos | `src/core/combo-simulator.js` | Regras de perseguição e ordenação |
| Missões, inimigos, custo de stamina e recompensas | `src/data/missions.js` | `MISSIONS` |
| Preços e chances dos pergaminhos | `src/data/scrolls.js` | `SCROLLS`, `DUPLICATE_REWARD` |
| Curva de nível, regeneração e custos da vila | `src/core/state.js` | `expToNext`, `*_REGEN_SECONDS`, `TRAIN_COST` |

Todo o estado do jogo fica em `game.state` e pode ser inspecionado no console via `window.konoha`.

## Estrutura

```
index.html               documento base
src/main.js              roteador entre as telas
src/core/state.js        estado, salvamento, progressão e recompensas
src/core/combat.js       motor de turnos, efeitos, IA e combos em cadeia
src/core/formation.js    papéis, colunas táticas e bônus de sinergia
src/core/combo-simulator.js simulação sem RNG de perseguições e total de acertos
src/core/audio.js        efeitos sonoros sintetizados (WebAudio)
src/ui/battle-vfx.js     projéteis, auras, impactos e animações de pursuit
src/core/utils.js        funções auxiliares
src/data/characters.js   elenco, atributos, elementos e perseguições
src/data/character-art.js mapa de retratos por personagem
src/data/jutsus.js       catálogo de técnicas
src/data/statuses.js     efeitos de estado
src/data/missions.js     campanha de Rank D a S
src/data/scrolls.js      pergaminhos, preços e pools de invocação
src/ui/shell.js          barra superior, menu, modais e toasts
src/ui/components.js     fichas, avatares e barras reutilizáveis
src/ui/screens/          criação, vila, missões, equipe, pergaminhos e batalha
src/styles/              base, layout, telas e combate
tests/                   testes de retratos, elenco/pursuit, formação, migração, convocação, combos, combate e VFX
```

## Integração com Shinobi Frontier

Foi analisado o repositório público [gustavo157751/shinobi-frontier](https://github.com/gustavo157751/shinobi-frontier). A ideia de sinergias por papel e posição foi reimplementada para o elenco e o combate deste jogo. Backend, banco de dados, lockfiles e telas React não foram copiados porque pertencem a uma arquitetura diferente e o repositório analisado não informa uma licença. Consulte [GITHUB_INTEGRATION_NOTES.md](./GITHUB_INTEGRATION_NOTES.md) para escopo e referências consultadas.

## Salvamento

A chave é `konoha-shinobi-legends.save.v1`. O botão de configurações (⚙) permite apagar o progresso.
Recursos (chakra e stamina) regeneram com o tempo, inclusive considerando o intervalo offline.

Projeto de fã, sem afiliação com os detentores da franquia. Personagens citados pertencem aos seus
respectivos autores; arte e código são originais.

## Referências de mecânicas

A formação 3×3 e a apresentação separada de combos por ataque/técnica foram inspiradas na ferramenta pública do [KonohaHub](https://konohahub.net/formation). A progressão e a ênfase em sinergia, perseguição, posicionamento e temporização foram conferidas na documentação pública do [Naruto Online](https://naruto.narutowebgame.com/en/strategy/tutorial/how_to_level_up_and_get_stronger_in_naruto_online) e em guias públicos da comunidade. As regras, fórmulas, elenco e interface deste protótipo foram implementados para o jogo local; não foram copiados assets ou sistemas fechados. Notas e links: [MECHANICS_REFERENCE_NOTES.md](./MECHANICS_REFERENCE_NOTES.md).


## Formação e coleção de ninjas

A tela **Equipe** foi redesenhada em três regiões: elenco escalado à esquerda, tabuleiro tático 3×3 no centro e coleção pesquisável à direita, com filtros por disponibilidade, raridade e elemento. A equipe continua sendo o save local atual (protagonista obrigatório e até quatro aliados); remoção, alocação, reposicionamento, sinergias e simulador de combos preservam as regras já existentes.

Os cartões, posições ocupadas e ficha do personagem mostram retratos originais associados por ID em `src/data/character-art.js`. O selo/kanji permanece como fallback caso o carregamento da imagem falhe. Busca e filtros funcionam por toque e teclado, e a composição se reorganiza em telas estreitas sem rolagem horizontal. A referência visual e as fontes consultadas estão documentadas em `TEAM_SCREEN_RESEARCH_NOTES.md`.
