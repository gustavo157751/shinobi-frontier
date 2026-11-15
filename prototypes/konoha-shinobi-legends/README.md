# Konoha Shinobi Legends

Protótipo jogável de RPG de turnos e gerenciamento de equipe shinobi, inspirado na experiência de
Naruto Online. Roda 100% no navegador (HTML5, CSS3 e JavaScript puro, sem framework e sem backend),
com progresso salvo no `localStorage`.

## Como jogar

1. **Crie o protagonista**: nome, gênero e estilo de luta (Taijutsu, Ninjutsu ou Genjutsu). O estilo
   define vida, ataque, velocidade, chakra e os dois jutsus iniciais.
2. **Monte a formação**: você + até 4 ninjas clássicos (Naruto, Sasuke, Sakura, Kakashi e outros). As duas primeiras posições são a linha de frente; funções de Vanguarda, Atacante, Suporte e Controle geram sinergias que ajustam vida, defesa, dano e chakra.
3. **Escolha uma missão** de Rank D a Rank S. Cada tentativa custa stamina.
4. **Vença o combate por turnos**: a ordem é definida pela velocidade; o ataque básico gera chakra e
   os jutsus consomem. Sempre que um alvo recebe **Flutuação** ou **Derrubar**, os aliados com
   perseguição compatível atacam em cadeia automaticamente.
5. **Invista as recompensas**: Ryos, EXP e pergaminhos. Pergaminhos invocam novos ninjas; duplicatas
   viram Ryos e EXP.

## Como rodar

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # gera dist/ para publicar como site estático
pnpm test     # testes unitários das regras de formação
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
src/core/formation.js    papéis, posicionamento e bônus de sinergia da equipe
src/core/audio.js        efeitos sonoros sintetizados (WebAudio)
src/core/utils.js        funções auxiliares
src/data/characters.js   elenco, atributos, elementos e perseguições
src/data/jutsus.js       catálogo de técnicas
src/data/statuses.js     efeitos de estado
src/data/missions.js     campanha de Rank D a S
src/data/scrolls.js      pergaminhos, preços e pools de invocação
src/ui/shell.js          barra superior, menu, modais e toasts
src/ui/components.js     fichas, avatares e barras reutilizáveis
src/ui/screens/          criação, vila, missões, equipe, pergaminhos e batalha
src/styles/              base, layout, telas e combate
tests/                   testes unitários das regras de formação
```

## Integração com Shinobi Frontier

Foi analisado o repositório público [gustavo157751/shinobi-frontier](https://github.com/gustavo157751/shinobi-frontier). A ideia de sinergias por papel e posição foi reimplementada para o elenco e o combate deste jogo. Backend, banco de dados, lockfiles e telas React não foram copiados porque pertencem a uma arquitetura diferente e o repositório analisado não informa uma licença. Consulte [GITHUB_INTEGRATION_NOTES.md](./GITHUB_INTEGRATION_NOTES.md) para escopo e referências consultadas.

## Salvamento

A chave é `konoha-shinobi-legends.save.v1`. O botão de configurações (⚙) permite apagar o progresso.
Recursos (chakra e stamina) regeneram com o tempo, inclusive considerando o intervalo offline.

Projeto de fã, sem afiliação com os detentores da franquia. Personagens citados pertencem aos seus
respectivos autores; arte e código são originais.
