/**
 * statuses.js — Efeitos de estado usados no combate.
 *
 * Como adicionar um novo efeito:
 * 1. Crie uma entrada em STATUS_META com rótulo, kanji, cor e duração padrão.
 * 2. Aplique-o em um jutsu (src/data/jutsus.js) usando effect: { type: 'seuEfeito', ... }.
 * 3. Se ele deve abrir combo, adicione o tipo em triggers de alguma perseguição
 *    (campo `pursuit` em src/data/characters.js).
 */

export const STATUS_META = {
  float: {
    label: 'Flutuação',
    kanji: '浮',
    color: '#5fb6ff',
    turns: 1,
    combo: true,
    desc: 'Alvo suspenso no ar. Habilita perseguições aéreas da equipe.',
  },
  knockdown: {
    label: 'Derrubar',
    kanji: '倒',
    color: '#ff8a4c',
    turns: 1,
    combo: true,
    desc: 'Alvo derrubado no chão. Habilita perseguições terrestres da equipe.',
  },
  stun: {
    label: 'Atordoado',
    kanji: '昏',
    color: '#f5d76e',
    turns: 1,
    skipTurn: true,
    desc: 'O alvo perde a próxima ação.',
  },
  burn: {
    label: 'Queimadura',
    kanji: '燃',
    color: '#ff5a3c',
    turns: 2,
    dot: 0.06,
    desc: 'Perde vida no início do turno (6% da vida máxima por turno).',
  },
  defDown: {
    label: 'Defesa Quebrada',
    kanji: '破',
    color: '#c084fc',
    turns: 2,
    defMod: -0.3,
    desc: 'Reduz a defesa em 30%.',
  },
  slow: {
    label: 'Lentidão',
    kanji: '鈍',
    color: '#94a3b8',
    turns: 2,
    spdMod: -0.35,
    desc: 'Reduz a velocidade em 35%, atrasando o turno.',
  },
  shield: {
    label: 'Barreira',
    kanji: '盾',
    color: '#7ee0c0',
    turns: 2,
    desc: 'Absorve dano recebido até acabar.',
  },
};

/** Efeitos que disparam combo em cadeia. */
export const COMBO_STATUSES = Object.entries(STATUS_META)
  .filter(([, meta]) => meta.combo)
  .map(([type]) => type);

/** Ícone (kanji) do efeito, para as fichas de combate. */
export const statusMeta = (type) => STATUS_META[type] ?? { label: type, kanji: '?', color: '#94a3b8', turns: 1 };
