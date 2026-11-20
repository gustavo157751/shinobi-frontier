/**
 * Catálogo da mochila e dos equipamentos do protótipo.
 * Ajuste quantidade inicial, bônus e efeito neste arquivo; o save guarda só IDs e quantidades.
 */
export const EQUIPMENT_SLOTS = [
  { id: 'weapon', label: 'Arma', symbol: '刀' },
  { id: 'armor', label: 'Proteção', symbol: '鎧' },
  { id: 'charm', label: 'Amuleto', symbol: '勾' },
];

export const INVENTORY_CATEGORIES = [
  { id: 'all', label: 'Tudo' },
  { id: 'equipment', label: 'Equipamentos' },
  { id: 'consumable', label: 'Consumíveis' },
  { id: 'material', label: 'Materiais' },
  { id: 'scrolls', label: 'Pergaminhos' },
];

export const ITEM_CATALOG = {
  training_kunai: {
    id: 'training_kunai',
    name: 'Kunai de Treino',
    category: 'equipment',
    slot: 'weapon',
    symbol: '刃',
    rarity: 'comum',
    color: '#efb254',
    bonus: { atk: 8, crit: 0.01 },
    description: 'Uma lâmina leve para aprimorar ataques básicos e precisão.',
  },
  leaf_vest: {
    id: 'leaf_vest',
    name: 'Colete de Campo',
    category: 'equipment',
    slot: 'armor',
    symbol: '鎧',
    rarity: 'comum',
    color: '#71c9a4',
    bonus: { hp: 100, def: 6 },
    description: 'Proteção de missão que reforça a resistência do portador.',
  },
  chakra_charm: {
    id: 'chakra_charm',
    name: 'Amuleto de Chakra',
    category: 'equipment',
    slot: 'charm',
    symbol: '勾',
    rarity: 'raro',
    color: '#72c7f2',
    bonus: { chakraMax: 10, crit: 0.02 },
    description: 'Um selo equilibrado que amplia o reservatório de chakra e o foco.',
  },
  chakra_tonic: {
    id: 'chakra_tonic',
    name: 'Tônico de Chakra',
    category: 'consumable',
    symbol: '薬',
    rarity: 'comum',
    color: '#65c8e7',
    effect: { resource: 'chakra', amount: 18 },
    description: 'Restaura até 18 pontos de chakra do jogador, respeitando o limite atual.',
  },
  field_ration: {
    id: 'field_ration',
    name: 'Ração de Campo',
    category: 'consumable',
    symbol: '兵',
    rarity: 'comum',
    color: '#e6ba67',
    effect: { resource: 'stamina', amount: 3 },
    description: 'Recupera até 3 pontos de stamina antes de uma nova missão.',
  },
  blank_tag: {
    id: 'blank_tag',
    name: 'Papel de Selo',
    category: 'material',
    symbol: '符',
    rarity: 'comum',
    color: '#c6a77a',
    description: 'Material de suporte guardado para futuros projetos da vila.',
  },
};

/** Mochila inicial concedida a novos saves e acrescentada por migração a saves antigos. */
export const STARTING_INVENTORY = Object.freeze({
  training_kunai: 1,
  leaf_vest: 1,
  chakra_charm: 1,
  chakra_tonic: 3,
  field_ration: 2,
  blank_tag: 5,
});
