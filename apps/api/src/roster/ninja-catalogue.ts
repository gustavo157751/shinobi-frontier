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
 * CatÃ¡logo original do Shinobi Frontier. Personagens, nomes e textos sÃ£o
 * prÃ³prios deste projeto: nÃ£o reproduza material protegido de outras obras.
 * Raridade vai de 3 a 5 e define custo e nÃ­vel mÃ­nimo de recrutamento.
 */
export const NINJA_CATALOGUE: NinjaDefinition[] = [
  {
    code: 'STONE_WARDEN',
    name: 'GuardiÃ£o de Seixos',
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
    description: 'CarapaÃ§a forjada na serra; protege quem caminha atrÃ¡s de si.',
    recruitCost: 400,
    requiredLevel: 3,
  },
  {
    code: 'ROOT_SENTINEL',
    name: 'Sentinela das RaÃ­zes',
    role: 'VANGUARD',
    rarity: 5,
    description: 'EnraÃ­za o prÃ³prio corpo e transforma o chÃ£o em escudo vivo.',
    recruitCost: 900,
    requiredLevel: 5,
  },
  {
    code: 'MIST_LANCER',
    name: 'Lanceiro da NÃ©voa',
    role: 'STRIKER',
    rarity: 3,
    description: 'Ataca entre camadas de neblina e recua antes do contra-ataque.',
    recruitCost: 150,
    requiredLevel: 1,
  },
  {
    code: 'EMBER_HERON',
    name: 'GarÃ§a de Brasa',
    role: 'STRIKER',
    rarity: 4,
    description: 'Concentra calor na ponta da lÃ¢mina e abre brechas na guarda.',
    recruitCost: 400,
    requiredLevel: 3,
  },
  {
    code: 'DAWN_BLADE',
    name: 'LÃ¢mina da Aurora',
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
    description: 'Prepara emplastros salinos que fecham feridas a tempo do prÃ³ximo turno.',
    recruitCost: 150,
    requiredLevel: 1,
  },
  {
    code: 'LANTERN_KEEPER',
    name: 'GuardiÃ£ da Lanterna',
    role: 'SUPPORT',
    rarity: 4,
    description: 'MantÃ©m a chama acesa e devolve chakra a quem tropeÃ§a no caminho.',
    recruitCost: 400,
    requiredLevel: 3,
  },
  {
    code: 'RAIN_CHORISTER',
    name: 'Coral da Chuva',
    role: 'SUPPORT',
    rarity: 5,
    description: 'Canta baixo durante a tempestade e recompÃµe a equipe inteira.',
    recruitCost: 900,
    requiredLevel: 5,
  },
  {
    code: 'VEIL_BINDER',
    name: 'Amarrador do VÃ©u',
    role: 'CONTROL',
    rarity: 3,
    description: 'Prende os pÃ©s do adversÃ¡rio em fios de sombra improvisados.',
    recruitCost: 150,
    requiredLevel: 1,
  },
  {
    code: 'PAPER_SIGNALER',
    name: 'Sinaleira de Papel',
    role: 'CONTROL',
    rarity: 4,
    description: 'Marca alvos com selos de papel que amplificam tÃ©cnicas da equipe.',
    recruitCost: 400,
    requiredLevel: 3,
  },
  {
    code: 'TEMPLE_STAFF',
    name: 'Cajado do Templo',
    role: 'CONTROL',
    rarity: 5,
    description: 'Desenha cÃ­rculos no ar e desvia o fluxo de chakra inimigo.',
    recruitCost: 900,
    requiredLevel: 5,
  },
  {
    code: 'MOSSBACK',
    name: 'Casco de Musgo',
    role: 'VANGUARD',
    rarity: 3,
    description: 'Carapaça coberta de musgo que absorve impactos e regenera lentamente.',
    recruitCost: 150,
    requiredLevel: 1,
  },
  {
    code: 'RIDGE_BREAKER',
    name: 'Quebra-Cristas',
    role: 'VANGUARD',
    rarity: 4,
    description: 'Quebra rochas da crista e abre caminho para o esquadrão avançar.',
    recruitCost: 400,
    requiredLevel: 3,
  },
  {
    code: 'CINDER_STEP',
    name: 'Passo de Brasa',
    role: 'STRIKER',
    rarity: 4,
    description: 'Avança em passos de brasa e fere com lâminas quentes e velozes.',
    recruitCost: 400,
    requiredLevel: 3,
  },
  {
    code: 'NIGHT_THORN',
    name: 'Espinho Noturno',
    role: 'STRIKER',
    rarity: 5,
    description: 'Ataca das sombras com espinhos silenciosos e precisos.',
    recruitCost: 900,
    requiredLevel: 5,
  },
  {
    code: 'SPRING_WEAVER',
    name: 'Tecelã da Fonte',
    role: 'SUPPORT',
    rarity: 4,
    description: 'Tece fios de água que restauram chakra e vitalidade da equipe.',
    recruitCost: 400,
    requiredLevel: 3,
  },
  {
    code: 'DAWN_KEEPER',
    name: 'Guardiã da Alvorada',
    role: 'SUPPORT',
    rarity: 5,
    description: 'Mantém a luz acesa e inspira a equipe nos momentos críticos.',
    recruitCost: 900,
    requiredLevel: 5,
  },
  {
    code: 'ASH_BINDER',
    name: 'Amarrador de Cinzas',
    role: 'CONTROL',
    rarity: 4,
    description: 'Prende inimigos em laços de cinza e reduz sua mobilidade.',
    recruitCost: 400,
    requiredLevel: 3,
  },
  {
    code: 'RIVER_ORACLE',
    name: 'Oráculo do Rio',
    role: 'CONTROL',
    rarity: 5,
    description: 'Lê a correnteza e desvia ataques antes que cheguem ao esquadrão.',
    recruitCost: 900,
    requiredLevel: 5,
  },
];
export function findNinja(code: string): NinjaDefinition | undefined {
  return NINJA_CATALOGUE.find((ninja) => ninja.code === code);
}
