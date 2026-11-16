# Pesquisa de referência — hub da Vila

Pesquisa consultada em 15/11/2026 para orientar a reorganização da tela principal de **Konoha Shinobi Legends**.

## Fontes e achados

- **Captura fornecida pelo usuário no chat — Naruto Online, tela de exploração da vila.** Referência visual para a composição: perfil e recursos no alto; atalhos de sistemas sobre o cenário; caminho/área de jogo ao centro; minimapa e tarefas à direita; feed de mensagens no canto inferior esquerdo; navegação fixa na base. Esta imagem orienta somente a hierarquia e a disposição, não será embutida no jogo.
- **Naruto Online, “How to Play Naruto Online: A Beginner’s Guide”**: [guia oficial](https://naruto.narutowebgame.com/en/strategy/tutorial/how_to_play_naruto_online_a_beginners_guide). O guia destaca a escolha do ninja principal e a construção de uma equipe, missões principais e secundárias como trilha de progressão, recrutamento, papéis complementares e atividades de recursos. Isso sustenta atalhos para missões, equipe e pergaminhos junto de um objetivo prioritário.
- **Naruto Online, “How to Level Up and Get Stronger in Naruto Online?”**: [guia oficial](https://naruto.narutowebgame.com/en/strategy/tutorial/how_to_level_up_and_get_stronger_in_naruto_online). O artigo recomenda missões principais e secundárias, atividades e recrutamento/treino como caminhos para crescer; no protótipo, isso será representado por tarefas destacadas e atalhos somente para sistemas que já existem.
- **Moshimushi, “[Naruto Online] Chase Mission Locations”**: [guia comunitário](https://moshimushi.net/2018/07/01/naruto-online-chase-missions-location/). A nota do artigo diz que o mapa-múndi fica entre os ícones do canto superior direito e é usado para viajar. É uma referência comunitária de 2018, usada apenas como corroborador da função visual mapa + deslocamento.
- **Página oficial “Newcomers”**: [catálogo de guias](https://naruto.narutowebgame.com/en/strategy/tutorial). Confirma a organização oficial do conteúdo em guias de personagem, equipe, progressão e modos; não fornece uma especificação técnica do HUD do cliente.

## Aplicação no protótipo

A nova tela da Vila usa a captura anexada como mapa de composição, mas mantém a identidade própria do protótipo. O cenário é arte original pintada, sem interface/texto dentro do bitmap e sem personagens, logotipos ou recursos oficiais copiados; o asset original é carregado pelo caminho de armazenamento do projeto, com `/assets/village.webp` como fallback. O HUD usa os dados existentes; missão, equipe, pergaminhos, treino e navegação continuam conectados às rotas/ações reais, e o cartão prioritário abre o briefing correto. Em telas de 320 px ou mais, os atalhos cabem sem rolagem horizontal; em telas pequenas, a coluna de mapa e missão pode rolar verticalmente e a navegação inferior continua alcançável.
