export type NinjaRole = 'VANGUARD' | 'STRIKER' | 'SUPPORT' | 'CONTROL';

export type NinjaDefinition = {
  code: string;
  name: string;
  role: NinjaRole;
  rarity: number;
  description: string;
  recruitCost: number;
  requiredLevel: number;
};

export const MAX_FORMATION_SIZE = 4;

/**
 * Catálogo original do Shinobi Frontier. Personagens, nomes e textos são
 * próprios deste projeto: não reproduza material protegido de outras obras.
 * Raridade vai de 3 a 5 e define custo e nível mínimo de recrutamento.
 */
export const NINJA_CATALOGUE: NinjaDefinition[] = [
  {
    code: 'STONE_WARDEN',
    name: 'Guardião de Seixos',
    role: 'VANGUARD',
    rarity: 3,
    description: 'Ergue muralhas de terra para absorver o primeiro impacto do confronto.',
    recruitCost: 150,
    requiredLevel: 1,
  },
  {
    code: 'IRON_TORTOISE',
    name: 'Tartaruga de Ferro',
    role: 'VANGUARD',
    rarity: 4,
    description: 'Carapaça forjada na serra; protege quem caminha atrás de si.',
    recruitCost: 400,
    requiredLevel: 3,
  },
  {
    code: 'ROOT_SENTINEL',
    name: 'Sentinela das Raízes',
    role: 'VANGUARD',
    rarity: 5,
    description: 'Enraíza o próprio corpo e transforma o chão em escudo vivo.',
    recruitCost: 900,
    requiredLevel: 5,
  },
  {
    code: 'MIST_LANCER',
    name: 'Lanceiro da Névoa',
    role: 'STRIKER',
    rarity: 3,
    description: 'Ataca entre camadas de neblina e recua antes do contra-ataque.',
    recruitCost: 150,
    requiredLevel: 1,
  },
  {
    code: 'EMBER_HERON',
    name: 'Garça de Brasa',
    role: 'STRIKER',
    rarity: 4,
    description: 'Concentra calor na ponta da lâmina e abre brechas na guarda.',
    recruitCost: 400,
    requiredLevel: 3,
  },
  {
    code: 'DAWN_BLADE',
    name: 'Lâmina da Aurora',
    role: 'STRIKER',
    rarity: 5,
    description: 'Corta em arco luminoso quando o sol rompe a serra.',
    recruitCost: 900,
    requiredLevel: 5,
  },
  {
    code: 'SALT_MENDER',
    name: 'Curandeira do Sal',
    role: 'SUPPORT',
    rarity: 3,
    description: 'Prepara emplastros salinos que fecham feridas a tempo do próximo turno.',
    recruitCost: 150,
    requiredLevel: 1,
  },
  {
    code: 'LANTERN_KEEPER',
    name: 'Guardiã da Lanterna',
    role: 'SUPPORT',
    rarity: 4,
    description: 'Mantém a chama acesa e devolve chakra a quem tropeça no caminho.',
    recruitCost: 400,
    requiredLevel: 3,
  },
  {
    code: 'RAIN_CHORISTER',
    name: 'Coral da Chuva',
    role: 'SUPPORT',
    rarity: 5,
    description: 'Canta baixo durante a tempestade e recompõe a equipe inteira.',
    recruitCost: 900,
    requiredLevel: 5,
  },
  {
    code: 'VEIL_BINDER',
    name: 'Amarrador do Véu',
    role: 'CONTROL',
    rarity: 3,
    description: 'Prende os pés do adversário em fios de sombra improvisados.',
    recruitCost: 150,
    requiredLevel: 1,
  },
  {
    code: 'PAPER_SIGNALER',
    name: 'Sinaleira de Papel',
    role: 'CONTROL',
    rarity: 4,
    description: 'Marca alvos com selos de papel que amplificam técnicas da equipe.',
    recruitCost: 400,
    requiredLevel: 3,
  },
  {
    code: 'TEMPLE_STAFF',
    name: 'Cajado do Templo',
    role: 'CONTROL',
    rarity: 5,
    description: 'Desenha círculos no ar e desvia o fluxo de chakra inimigo.',
    recruitCost: 900,
    requiredLevel: 5,
  },
];

export function findNinja(code: string): NinjaDefinition | undefined {
  return NINJA_CATALOGUE.find((ninja) => ninja.code === code);
}
