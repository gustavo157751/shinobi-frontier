export type RecipeInput = { itemCode: string; quantity: number };

export type RecipeDefinition = {
  code: string;
  name: string;
  description: string;
  requiredLevel: number;
  /** Custo em ryō; 0 significa apenas materiais. */
  goldCost: number;
  inputs: RecipeInput[];
  output: { itemCode: string; quantity: number };
};

/**
 * Receitas originais da oficina do Shinobi Frontier. Cada receita consome
 * materiais do inventário e produz um consumível mais potente. O catálogo é a
 * fonte da verdade; o servidor valida nível, saldo e estoque.
 */
export const RECIPE_CATALOGUE: RecipeDefinition[] = [
  {
    code: 'VEIL_ELIXIR',
    name: 'Elixir do Véu',
    description: 'Destila dois estilhaços do Véu num tônico de fôlego generoso.',
    requiredLevel: 2,
    goldCost: 15,
    inputs: [{ itemCode: 'VEIL_SHARD', quantity: 2 }],
    output: { itemCode: 'VEIL_ELIXIR', quantity: 1 },
  },
  {
    code: 'ASH_PHIAL',
    name: 'Frasco de Cinzas',
    description: 'Sela cinzas em vidro para liberar calor reanimador.',
    requiredLevel: 3,
    goldCost: 20,
    inputs: [{ itemCode: 'ASH_SIGIL', quantity: 2 }],
    output: { itemCode: 'ASH_PHIAL', quantity: 1 },
  },
  {
    code: 'RIVER_DRAUGHT',
    name: 'Gole do Rio',
    description: 'Colhe a correnteza em cantil de pedra para um gole restaurador.',
    requiredLevel: 3,
    goldCost: 20,
    inputs: [{ itemCode: 'RIVER_PEARL', quantity: 2 }],
    output: { itemCode: 'RIVER_DRAUGHT', quantity: 1 },
  },
  {
    code: 'STONE_BREW',
    name: 'Infusão de Seixo',
    description: 'Infunde três seixos em ervas para o fôlego mais duradouro.',
    requiredLevel: 5,
    goldCost: 35,
    inputs: [{ itemCode: 'STONE_CHARM', quantity: 3 }],
    output: { itemCode: 'STONE_BREW', quantity: 1 },
  },
];

export function findRecipe(code: string): RecipeDefinition | undefined {
  return RECIPE_CATALOGUE.find((recipe) => recipe.code === code);
}
