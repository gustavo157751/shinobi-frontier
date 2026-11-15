export type MissionReward = {
  experience: number;
  gold: number;
  items: Array<{ code: string; quantity: number }>;
};

export type MissionEnemy = {
  code: string;
  name: string;
  level: number;
  maxHp: number;
  attack: number;
};

export type MissionDefinition = {
  code: string;
  name: string;
  description: string;
  requiredLevel: number;
  energyCost: number;
  intro: string;
  enemy: MissionEnemy;
  rewards: MissionReward;
};

/**
 * Missões originais do Shinobi Frontier. Cada missão é um confronto próprio:
 * o inimigo, a energia gasta e as recompensas são definidos aqui e validados no
 * servidor. Avançar de nível abre as missões seguintes da trilha.
 */
export const MISSION_CATALOGUE: MissionDefinition[] = [
  {
    code: 'TRAIL_OF_ASHES',
    name: 'Rastro de Cinzas',
    description: 'Siga as marcas deixadas na trilha e descubra quem atravessou a serra antes de você.',
    requiredLevel: 1,
    energyCost: 12,
    intro: 'A missão Rastro de Cinzas começa: um Cão de Cinzas rosna na trilha.',
    enemy: { code: 'ASH_HOUND', name: 'Cão de Cinzas', level: 1, maxHp: 140, attack: 9 },
    rewards: {
      experience: 90,
      gold: 40,
      items: [{ code: 'HERBAL_TONIC', quantity: 1 }],
    },
  },
  {
    code: 'WHISPERING_REEDS',
    name: 'Juncos Sussurrantes',
    description: 'A margem do rio repete um som que não vem do vento. Investigue sem ser notado.',
    requiredLevel: 2,
    energyCost: 14,
    intro: 'A missão Juncos Sussurrantes começa: uma Sombra dos Juncos se ergue entre as folhas.',
    enemy: { code: 'REED_SHADE', name: 'Sombra dos Juncos', level: 2, maxHp: 180, attack: 11 },
    rewards: {
      experience: 150,
      gold: 65,
      items: [{ code: 'EMBER_RATION', quantity: 1 }],
    },
  },
  {
    code: 'BROKEN_BRIDGE',
    name: 'Ponte Partida',
    description: 'A travessia caiu e o caminho ficou exposto. Proteja quem ainda precisa passar.',
    requiredLevel: 3,
    energyCost: 16,
    intro: 'A missão Ponte Partida começa: o Prateado da Ponte bloqueia a passagem.',
    enemy: { code: 'BRIDGE_SILVER', name: 'Prateado da Ponte', level: 3, maxHp: 230, attack: 13 },
    rewards: {
      experience: 210,
      gold: 90,
      items: [{ code: 'RIVER_PEARL', quantity: 1 }],
    },
  },
  {
    code: 'STONE_ECHO',
    name: 'Eco de Pedra',
    description: 'Um chamado se repete dentro da montanha. Responda com cuidado: nem todo eco é amigo.',
    requiredLevel: 4,
    energyCost: 18,
    intro: 'A missão Eco de Pedra começa: um Vigia de Eco desperta das fendas.',
    enemy: { code: 'ECHO_WARDEN', name: 'Vigia de Eco', level: 4, maxHp: 280, attack: 15 },
    rewards: {
      experience: 280,
      gold: 115,
      items: [{ code: 'STONE_CHARM', quantity: 1 }],
    },
  },
  {
    code: 'VEIL_WATCH',
    name: 'Vigília do Véu',
    description: 'Uma patrulha do Véu mantém posição no alto da serra. Descubra o que ela observa.',
    requiredLevel: 5,
    energyCost: 20,
    intro: 'A missão Vigília do Véu começa: a Vigia do Véu já esperava por você.',
    enemy: { code: 'VEIL_WATCHER', name: 'Vigia do Véu', level: 5, maxHp: 340, attack: 17 },
    rewards: {
      experience: 360,
      gold: 150,
      items: [{ code: 'VEIL_SHARD', quantity: 2 }],
    },
  },
  {
    code: 'NIGHT_CROSSING',
    name: 'Travessia Noturna',
    description: 'A última passagem para o vale fecha ao anoitecer. Atravesse antes que a sombra feche.',
    requiredLevel: 7,
    energyCost: 24,
    intro: 'A missão Travessia Noturna começa: o Ceifador da Travessia aguarda no escuro.',
    enemy: { code: 'CROSSING_REAPER', name: 'Ceifador da Travessia', level: 7, maxHp: 430, attack: 21 },
    rewards: {
      experience: 470,
      gold: 200,
      items: [
        { code: 'ASH_SIGIL', quantity: 1 },
        { code: 'EMBER_RATION', quantity: 1 },
      ],
    },
  },
];

export function findMission(code: string): MissionDefinition | undefined {
  return MISSION_CATALOGUE.find((mission) => mission.code === code);
}
