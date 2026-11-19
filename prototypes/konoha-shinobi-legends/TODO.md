# TODO — Konoha Shinobi Legends

## 1. Criação de protagonista e formação
- [x] Tela inicial de criação: nome, gênero (Masculino/Feminino) e estilo de luta (Taijutsu, Ninjutsu, Genjutsu).
- [x] Estilo escolhido altera atributos (vida, ataque, defesa, velocidade, chakra, crítico) e o conjunto de jutsus do protagonista.
- [x] Protagonista original é salvo e permanece obrigatório na formação.
- [x] Menu de equipe permite montar formação com até 4 ninjas clássicos além do protagonista, trocar posições na grade 3×3 e remover integrantes.
- [x] Ninjas clássicos (Naruto, Sasuke, Sakura, Kakashi e mais 18) possuem atributos, jutsus, elemento e perseguições próprios.
- [x] Sinergia por função (Vanguarda, Atacante, Suporte, Controle) e coluna tática (retaguarda, meio, frente) concede bônus de vida, chakra, ataques, técnicas, redução de dano e chakra extra ao Guardar; valores são exibidos na tela da equipe e aplicados no combate.

## 2. Combate por turnos com chakra, velocidade e combos em cadeia
- [x] Rodadas com ordem de ação definida pela velocidade dos personagens, com iniciativa visível na ficha e desempate por posição.
- [x] Ataque básico gera chakra; jutsus consomem chakra conforme custo próprio (e Guardar recupera chakra).
- [x] Efeitos de estado: Flutuação, Derrubar (Knockdown), Atordoamento, Queimadura, Redução de defesa, Lentidão, Barreira e Cura.
- [x] Ao acertar Flutuação/Derrubar, integrantes compatíveis da equipe disparam combo automático em cadeia, na ordem de velocidade e sem repetir integrante na rodada, com contador visível e banner.
- [x] Ataques automáticos e IA priorizam a linha frontal; o jogador pode selecionar manualmente outro alvo e ataques em área atingem a área indicada pela técnica.
- [x] Atordoamento aplicado antes da vez do alvo interrompe sua ação.
- [x] Inimigos controlados por IA escolhem ataque básico, jutsu, cura de aliados feridos ou guarda.
- [x] Vitória/derrota/recuo encerram a batalha e devolvem recompensas ou permitem nova tentativa.

## 3. Vila, missões PvE e progressão
- [x] Início na Vila da Folha com painel de missões de Rank D a Rank S (22 missões).
- [x] Missões exigem nível mínimo e custam stamina; mostram inimigos, recompensas e diálogo de briefing.
- [x] Recompensas entregues em Ryos, EXP e pergaminhos; nível sobe e libera novas missões.
- [x] Derrota e recuo não entregam recompensa e preservam o progresso anterior.

## 4. Interface e recursos
- [x] Barra superior com Chakra, Stamina, Ryos e Ouro, atualizada em tempo real com regeneração.
- [x] Menu de equipe, inventário de pergaminhos e área central de combate/diálogo.
- [x] Invocação de novos ninjas consumindo pergaminhos, com pool por raridade e revelação animada; duplicatas viram Ryos e EXP.
- [x] Loja para comprar pergaminhos com Ryos e Ouro; treino pago em Ryos e meditação com intervalo de 5 minutos.
- [x] Grade de equipe 3×3 responsiva, ficha do ninja selecionado, sinergias por função/posição e simulador de combo por Ataque e por Técnica com sequência e total de acertos.

## 5. Persistência e código comentado
- [x] Progresso (nível, EXP, recursos, ninjas desbloqueados, formação e missões concluídas) salvo em localStorage e restaurado ao recarregar.
- [x] Saves anteriores sem mapa de posição são migrados para uma disposição 3×3 válida, sem perder personagens nem recursos.
- [x] Ninjas recém-invocados são alocados automaticamente em uma célula livre e permanecem visíveis, únicos e salvos após recarregar.
- [x] Recursos regeneram com o tempo, inclusive considerando o intervalo offline.
- [x] Opção de apagar progresso e recomeçar a criação de personagem nas configurações.
- [x] Código organizado em arquivos separados (dados, núcleo, UI e estilos) com comentários indicando onde ajustar vida, dano, velocidade e custo de chakra.
- [x] Testes unitários cobrem fórmulas, limites, migração, troca de posição, modificadores reais de dano e simulação de combo.

## 6. Integração analisada do repositório GitHub
- [x] Analisar a arquitetura React/NestJS/Prisma do repositório fornecido e preservar a arquitetura vanilla/localStorage do protótipo, sem importar backend, banco, dependências ou lockfiles incompatíveis.
- [x] Adaptar a ideia de bônus por função e posição para o elenco, as cinco vagas e o motor de combate deste projeto, com implementação local independente e limites de balanceamento.
- [x] Cobrir posições inválidas, bônus por função/linha, limites, estilos de protagonista, modificadores reais de dano/defesa/Guarda e dano fixo com testes unitários; documentar commit e referências consultadas.

## 7. Referências de mecânicas de jogo
- [x] Consultar as páginas públicas do Naruto Online e do construtor de formação do KonohaHub e usar apenas os conceitos necessários de grade, combinação de ataques/técnicas, perseguições, posicionamento e progressão.
- [x] Implementar regras, fórmulas, interface e elenco próprios no protótipo; não copiar código, assets ou sistemas fechados das referências.
- [x] Registrar links e limites da adaptação em `MECHANICS_REFERENCE_NOTES.md`.

## 8. Expansão do elenco clássico
- [x] Adicionar seis personagens clássicos ainda ausentes do elenco recrutável: Neji Hyuga, Choji Akimichi, Temari, Kankuro, Zabuza Momochi e Haku.
- [x] Cada novo personagem possui atributos, raridade, elemento, dois jutsus e uma técnica de perseguição com nome, gatilhos e efeitos válidos para o motor atual de combos.
- [x] Integrar os personagens ao catálogo de invocação, à coleção/equipe e aos papéis de formação, sem IDs duplicados nem referências de jutsu ausentes.
- [x] Cobrir catálogo, referências dos jutsus, gatilhos de pursuit e compatibilidade com a cadeia automática/simulador por testes; registrar fontes canônicas consultadas.

## 9. Efeitos visuais e animações de combate
- [x] Jutsus recebem efeitos visuais legíveis por elemento e tipo de alvo; técnicas de área afetam visualmente cada inimigo, enquanto suporte e guarda mostram energia ao redor dos aliados.
- [x] Perseguições mostram o ninja que dispara, o deslocamento até o alvo e impactos encadeados sincronizados com o contador de combo, sem cobrir os controles ou os indicadores de vida/chakra.
- [x] Acertos e estados aplicados recebem feedback visual; efeitos temporários são removidos após a animação, a interface continua funcional em telas pequenas e `prefers-reduced-motion` reduz ou desativa movimento.

## 10. Hub da Vila inspirado no layout de referência
- [x] Pesquise o layout do Naruto Online e use a imagem de referência anexada pelo usuário para orientar a composição visual, sem embutir a captura dentro do jogo.
- [x] Reorganize a tela inicial da Vila como hub de exploração: HUD de jogador e recursos no topo; atalhos dos sistemas já existentes; cenário amplo ao centro; mapa e lista/briefing da próxima missão à direita; feed de avisos à esquerda; navegação principal na base.
- [x] Mantenha os dados do HUD sincronizados com o save atual e conecte cada botão a uma tela/ação existente; o briefing mostrado no painel abre a missão correta, e elementos puramente decorativos são identificados como tal.
- [x] Reflow para telas pequenas sem rolagem horizontal nem sobreposição de controles; a navegação inferior e os painéis continuam legíveis, operáveis por toque e teclado, e respeitam `prefers-reduced-motion`.
- [x] Use cenário original ou assets já presentes; não copie a captura, logotipo, personagens desenhados ou arquivos oficiais do Naruto Online.


- [x] Pesquisar a organização da tela de formação do Naruto Online e usar as imagens de referência anexadas para orientar a composição, sem embutir capturas ou copiar código, logos, ícones, sprites ou outros assets oficiais.
- [x] Reorganizar a tela Equipe em regiões claras: equipe ativa e vagas à esquerda, tabuleiro tático 3×3 no centro e coleção de personagens com busca/filtros à direita; manter à vista os integrantes escalados e a ficha do personagem selecionado.
- [x] Preservar o protagonista obrigatório, o limite atual de até quatro ninjas clássicos além dele, as regras de seleção, alocação, remoção e reposicionamento, os bônus de sinergia e o simulador de combo; a mudança visual não deve alterar o save existente nem o motor de combate.
- [x] Criar e conferir visualmente retratos originais individuais para o protagonista e os 22 personagens clássicos do elenco, e exibi-los na coleção, na formação e na ficha; manter os selos/kanji atuais como fallback se uma imagem não carregar.
- [x] Manter a tela responsiva, sem overflow horizontal, com controles operáveis por toque e teclado, foco visível e respeito a `prefers-reduced-motion`.
- [x] Registrar as fontes consultadas e os limites da adaptação em `TEAM_SCREEN_RESEARCH_NOTES.md`.
