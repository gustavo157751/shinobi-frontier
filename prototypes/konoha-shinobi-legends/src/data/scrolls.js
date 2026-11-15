/**
 * scrolls.js — PERGAMINHOS DE INVOCAÇÃO
 * ====================================
 * Cada pergaminho sorteia um ninja do ROSTER conforme os pesos por raridade.
 * Duplicatas viram Ryos + EXP (ver summonIn state.js).
 *
 * Ajuste `costRyo`, `costGold` e os pesos para mudar a economia do jogo.
 */

export const SCROLLS = {
  comum: {
    id: 'comum',
    name: 'Pergaminho Comum',
    kanji: '巻',
    color: '#9aa7b8',
    costRyo: 900,
    costGold: 3,
    weights: { comum: 68, raro: 27, epico: 5 },
    desc: 'Sorteia um ninja com boa chance de raridade comum ou rara.',
  },
  prata: {
    id: 'prata',
    name: 'Pergaminho Prateado',
    kanji: '銀',
    color: '#4aa8ff',
    costRyo: 2600,
    costGold: 8,
    weights: { raro: 58, epico: 34, lendario: 8 },
    desc: 'Chance sólida de um ninja Épico e pequena chance de Lendário.',
  },
  ouro: {
    id: 'ouro',
    name: 'Pergaminho Dourado',
    kanji: '金',
    color: '#e9b949',
    costRyo: 6500,
    costGold: 25,
    weights: { epico: 70, lendario: 30 },
    desc: 'Somente ninjas Épicos e Lendários. O caminho dos grandes nomes.',
  },
};

/** Recompensa de consolação ao invocar um ninja que já pertence à sua equipe. */
export const DUPLICATE_REWARD = {
  comum: { ryo: 500, exp: 120 },
  raro: { ryo: 1200, exp: 260 },
  epico: { ryo: 2600, exp: 520 },
  lendario: { ryo: 5000, exp: 900 },
};

/** Ninjas iniciais gratuitos — a formação clássica do Time 7. */
export const STARTER_NINJAS = ['naruto', 'sasuke', 'sakura', 'kakashi'];

/** Pergaminhos ganhos na criação do personagem. */
export const STARTING_SCROLLS = { comum: 2, prata: 0, ouro: 0 };
