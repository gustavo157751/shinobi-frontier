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
