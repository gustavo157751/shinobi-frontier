# TODO — Konoha Shinobi Legends

## 1. Criação de protagonista e formação
- [x] Tela inicial de criação: nome, gênero (Masculino/Feminino) e estilo de luta (Taijutsu, Ninjutsu, Genjutsu).
- [x] Estilo escolhido altera atributos (vida, ataque, defesa, velocidade, chakra, crítico) e o conjunto de jutsus do protagonista.
- [x] Protagonista original é salvo e permanece obrigatório na formação.
- [x] Menu de equipe permite montar formação com até 4 ninjas clássicos além do protagonista, trocar posições com setas e remover integrantes.
- [x] Ninjas clássicos (Naruto, Sasuke, Sakura, Kakashi e mais 12) possuem atributos, jutsus, elemento e perseguições próprios.
- [x] Sinergia por função (Vanguarda, Atacante, Suporte, Controle) e posição (duas primeiras vagas na frente) concede bônus de vida, chakra, ataques e combos, técnicas, redução de dano e chakra extra ao Guardar; valores são exibidos na tela da equipe e aplicados no combate.

## 6. Integração analisada do repositório GitHub
- [x] Analisar a arquitetura React/NestJS/Prisma do repositório fornecido e preservar a arquitetura vanilla/localStorage do protótipo, sem importar backend, banco, dependências ou lockfiles incompatíveis.
- [x] Adaptar a ideia de bônus por função e posição para o elenco, as cinco vagas e o motor de combate deste projeto, com implementação local independente e limites de balanceamento.
- [x] Cobrir posições inválidas, bônus por função/linha, limites, estilos de protagonista, modificadores reais de dano/defesa/Guarda e dano fixo com testes unitários; documentar commit e referências consultadas.

## 2. Combate por turnos com chakra, velocidade e combos em cadeia
- [x] Rodadas com ordem de ação definida pela velocidade dos personagens, com iniciativa visível na ficha.
- [x] Ataque básico gera chakra; jutsus consomem chakra conforme custo próprio (e Guardar recupera chakra).
- [x] Efeitos de estado: Flutuação, Derrubar (Knockdown), Atordoamento, Queimadura, Redução de defesa, Lentidão, Barreira e Cura.
- [x] Ao acertar Flutuação/Derrubar, integrantes compatíveis da equipe disparam combo automático em cadeia, com contador visível e banner.
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

## 5. Persistência e código comentado
- [x] Progresso (nível, EXP, recursos, ninjas desbloqueados, formação e missões concluídas) salvo em localStorage e restaurado ao recarregar.
- [x] Recursos regeneram com o tempo, inclusive considerando o intervalo offline.
- [x] Opção de apagar progresso e recomeçar a criação de personagem nas configurações.
- [x] Código organizado em arquivos separados (dados, núcleo, UI e estilos) com comentários indicando onde ajustar vida, dano, velocidade e custo de chakra.
