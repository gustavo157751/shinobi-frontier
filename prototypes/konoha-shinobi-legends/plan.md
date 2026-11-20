# Plano — hub da Vila inspirado em Naruto Online

## Objetivo e abordagem

Recompor somente a tela inicial **Vila** como um hub de exploração com hierarquia visual próxima à captura de referência: cenário central, HUD de jogador e recursos, atalhos de sistemas, mapa e lista de tarefas na lateral direita, feed de avisos no canto inferior esquerdo e navegação inferior. A implementação continua sendo o frontend estático existente em Vite, HTML/CSS/ESM sem framework, backend, novas dependências ou alterações ao formato de save.

A pesquisa pública e a captura original estão documentadas em `LAYOUT_RESEARCH_NOTES.md`. O jogo não reutiliza o screenshot, o logotipo do Naruto Online nem ilustrações/personagens oficiais. O pano de fundo usa uma paisagem original de fantasia ninja gerada para o protótipo, com o cenário existente da Vila como fallback; os componentes funcionais usam os dados e ações já existentes.

## Design

- **Movimento de design:** hub 2.5D de MMORPG anime, com perspectiva de cenário pintado e interface de jogo compacta inspirada na captura fornecida.
- **Princípios centrais:** o cenário estabelece o lugar; cada painel comunica uma tarefa ou sistema real; a informação importante continua legível sobre a arte; o mesmo fluxo de missão funciona com mouse, toque e teclado.
- **Filosofia de cor:** verdes e tons de terra no cenário criam leitura de vila viva; painéis translúcidos em carvão preservam contraste; ouro identifica nível/recompensa e vermelhão mantém o acento próprio do projeto.
- **Paradigma de layout:** campo de exploração em tela ampla com controles distribuídos pelas bordas, não uma grade central de cartões. HUD superior, mapa/tarefas à direita, recado discreto à esquerda e menu no rodapé. No mobile, o cenário continua como pano de fundo e os painéis fluem para blocos compactos sem sobreposição.
- **Elementos de assinatura:** medalhões de atalho com selo e aro dourado; mapa estilizado com marcador de rota; cartão de missão com fita de rank.
- **Interação:** botões e atalhos encaminham para as telas existentes (Missões, Equipe, Pergaminhos) ou chamam ações reais (Treinar/Meditar). O mapa é apresentado como orientação visual e não simula viagem funcional que o protótipo não possui. Foco, rótulos acessíveis e áreas de toque permanecem explícitos.
- **Animação:** entrada curta do hub e estados de hover/press; sem pulsações contínuas decorativas; respeitar `prefers-reduced-motion`.
- **Tipografia:** manter as famílias já configuradas: Shojumaru para selos pontuais, Barlow Condensed para cabeçalhos/etiquetas e Inter para leitura corrida.
- **Essência de marca:** painel de comando de Konoha para quem quer montar uma equipe e avançar por missões táticas; personalidade: estratégica, calorosa e aventureira.
- **Voz da marca:** objetiva e encorajadora. Exemplos: “Uma nova missão aguarda no portão leste.” e “Ajuste a equipe antes de partir.”
- **Wordmark e logo:** preservar o selo “忍” e a marca Konoha Shinobi Legends já existentes; não reproduzir o logo do Naruto Online.
- **Cor de marca:** vermelhão `#e0492b`, usado como acento sobre o cenário sem competir com o verde da vila.

## Estrutura e responsabilidades

- `src/ui/screens/village.js`: compor o hub a partir do save atual, mostrar o próximo objetivo, a equipe e o estado de recursos; conectar atalhos a rotas e ações existentes e abrir a missão selecionada pelo painel.
- `src/ui/shell.js`: ativar uma classe de layout exclusiva quando a rota Vila está ativa; preservar o comportamento das outras telas e do combate.
- `src/styles/layout.css`: HUD superior e navegação no rodapé no modo hub; as regras ficam escopadas à vila para não alterar equipe, missões, criação ou batalha.
- `src/styles/screens.css`: cenário full-bleed, atalhos, minimapa, painel de missão, feed, estados de foco e regras responsivas do hub.
- `/manus-storage/async-images/8sAj9m1uEtTpvSz0XDkQws/image-1.webp`: cenário pintado original de fantasia ninja, sem textos nem interface, usando a imagem enviada apenas como referência de composição/estilo; `/assets/village.webp` permanece como fallback.
- `LAYOUT_RESEARCH_NOTES.md`: fontes e decisões que preservam a distinção entre inspiração de interface e cópia de assets.

Não haverá API, login ou migração de save. A aplicação permanece de página única em `/`; `public/manus-routes.json` continua declarando somente essa rota.

## Extensão — tela de equipes baseada na referência enviada

A tela Equipe passa a usar uma composição original inspirada na captura do usuário e na organização de um construtor de formações: coluna esquerda com a equipe ativa e vagas, campo tático 3×3 no centro, coleção filtrável de personagens à direita e ficha contextual para o ninja selecionado. A forma visual aproveita o contraste azul-marinho/ciano da referência, mantendo os acentos vermelhão e ouro próprios do projeto. Não serão reutilizados o screenshot, os ícones, os sprites, o código ou a identidade visual proprietária do Naruto Online.

O núcleo atual de seleção, alocação, remoção, reposicionamento, estatísticas, sinergias e simulação de combos permanece como fonte de verdade. Os cartões ganham filtros por raridade/elemento/estado de invocação e pesquisa textual; seleção e alocação continuam possíveis por teclado e toque. O painel à esquerda representa a formação ativa já persistida pelo jogo; não cria presets falsos nem altera o formato do save. A organização adapta padrões descritos na orientação oficial de composição de times e no team builder independente, enquanto mantém as regras de cinco integrantes e grade 3×3 deste protótipo; fontes e limites estão em `TEAM_SCREEN_RESEARCH_NOTES.md`.

Foram gerados e conferidos visualmente retratos originais, individuais e sem interface/texto, para o protagonista e os 22 personagens clássicos já cadastrados. As imagens ficam no Managed Storage do projeto e são mapeadas por ID em `src/data/character-art.js`; aparecem nos cartões da coleção, formação e ficha do ninja. Nomes, IDs, atributos e técnicas continuam vindo de `src/data/characters.js` e `src/data/jutsus.js`. Caso uma imagem não carregue, o selo/kanji atual continua como fallback.

### Estrutura afetada

- `src/ui/screens/team.js`: compor as três regiões, busca/filtros e controles existentes, mantendo a API do motor de formação.
- `src/ui/components.js` e `src/data/character-art.js`: apresentar retratos com fallback seguro e mapear IDs para assets sem misturar arte aos dados de balanceamento.
- Assets de personagem no Managed Storage, referenciados por URLs `/manus-storage/async-images/...` preservadas no mapa de arte.
- `src/styles/screens.css`: skin da formação, cartões com arte, detalhe e reflow responsivo; `src/styles/layout.css` permanece inalterado fora dos estilos globais existentes.
- `TEAM_SCREEN_RESEARCH_NOTES.md`: fontes consultadas, síntese da composição e distinção entre referência visual e reprodução de assets/código.


## Extensão — aba Personagens e inventário

Adicionar a rota interna **Personagens** à navegação do jogo e, dentro dela, abas **Personagens** e **Ferramentas**, mantendo a SPA vanilla/Vite e o save local. A captura enviada orienta a hierarquia: lista de membros à esquerda, retrato e atributos reais do selecionado ao centro, e inventário categorizado à direita; a identidade Konoha, os retratos já aprovados e os componentes existentes substituem a marca/arte proprietárias da referência.

A tela permite selecionar protagonistas e ninjas já recrutados, consultar nível, elemento, estilo, HP, ataque, defesa, velocidade, chakra e crítico, e ver os equipamentos por slot. Um catálogo próprio de itens em `src/data/items.js` alimenta equipamentos, consumíveis, materiais e a contagem de pergaminhos existente. A quantidade de cada item e os equipamentos por personagem são persistidos em `localStorage`; a migração adiciona defaults a saves antigos sem apagar recursos, formação ou missão. Equipar/desquipar move a unidade entre mochila e slot e os atributos do equipamento são incluídos no snapshot real de combate. Consumíveis só decrementam a quantidade quando a restauração tem efeito e nunca ultrapassam os limites de recurso. Materiais permanecem informativos; pergaminhos encaminham à tela de invocação existente.

### Estrutura afetada

- `src/data/items.js`: catálogo comentado de itens, categorias, slots, efeitos, bônus e inventário inicial.
- `src/core/state.js`: normalização/migração de mochila e equipamentos, ações de equipar/desquipar/usar e incorporação dos bônus ao snapshot de combate.
- `src/ui/screens/characters.js`: seleção de integrantes, ficha de atributos, equipamentos, filtros, inventário, detalhes e navegação interna.
- `src/main.js` e `src/ui/shell.js`: registro da rota e da entrada Personagens no menu principal.
- `src/styles/screens.css`: painel azul-marinho/ciano inspirado pela captura, com a linguagem visual existente do jogo e reflow para desktop, tablet e mobile.
- `tests/items.test.js`: regressão de migração, ações de inventário e estatísticas de equipamento.

Não entram backend, dependências novas, arquivos de referência oficiais ou substituição das regras da formação 3×3; o manifesto do site continua declarando apenas a página SPA `/`.
