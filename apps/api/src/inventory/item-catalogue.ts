export type ItemKind = 'CONSUMABLE' | 'MATERIAL';

export type ItemDefinition = {
  code: string;
  name: string;
  kind: ItemKind;
  rarity: number;
  description: string;
  /** Consumíveis declaram o efeito; materiais ficam guardados para crafting futuro. */
  effect?: { energy: number };
};

/**
 * Catálogo original de itens do Shinobi Frontier. Códigos e textos são próprios
 * deste projeto; não reutilize nomes ou descrições de outras obras.
 */
export const ITEM_CATALOGUE: ItemDefinition[] = [
  {
    code: 'HERBAL_TONIC',
    name: 'Tônico de Ervas',
    kind: 'CONSUMABLE',
    rarity: 3,
    description: 'Mistura amarga das ervas da serra que devolve fôlego entre uma trilha e outra.',
    effect: { energy: 20 },
  },
  {
    code: 'EMBER_RATION',
    name: 'Ração de Brasa',
    kind: 'CONSUMABLE',
    rarity: 4,
    description: 'Pasta quente embrulhada em folhas secas; sustenta o corpo em vigílias longas.',
    effect: { energy: 35 },
  },
  {
    code: 'VEIL_SHARD',
    name: 'Estilhaço do Véu',
    kind: 'MATERIAL',
    rarity: 3,
    description: 'Fragmento opaco recolhido de patrulhas do Véu; esquenta quando há chakra por perto.',
  },
  {
    code: 'ASH_SIGIL',
    name: 'Selo de Cinzas',
    kind: 'MATERIAL',
    rarity: 4,
    description: 'Placa gravada com um símbolo antigo, ainda morna depois de anos enterrada.',
  },
  {
    code: 'RIVER_PEARL',
    name: 'Pérola do Rio',
    kind: 'MATERIAL',
    rarity: 4,
    description: 'Pedra lisa retirada do leito do rio; dizem que guarda a calma da correnteza.',
  },
  {
    code: 'STONE_CHARM',
    name: 'Amuleto de Seixo',
    kind: 'MATERIAL',
    rarity: 5,
    description: 'Três seixos amarrados por um fio trançado, usados por vigias da montanha.',
  },
];

export function findItem(code: string): ItemDefinition | undefined {
  return ITEM_CATALOGUE.find((item) => item.code === code);
}
