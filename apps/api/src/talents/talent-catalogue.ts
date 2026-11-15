export type TalentEffect = {
  strength?: number;
  vitality?: number;
  agility?: number;
  intelligence?: number;
};

export type TalentDefinition = {
  code: string;
  name: string;
  path: string;
  tier: number;
  requiredLevel: number;
  cost: number;
  /** Grupo de escolha mútua: só um talento do grupo pode ser aprendido. */
  group?: string;
  prerequisites: string[];
  description: string;
  effect: TalentEffect;
};

/**
 * Árvores de talento originais do Shinobi Frontier. Cada caminho tem três
 * degraus lineares e um degrau de especialização com duas escolhas mútuas:
 * o shinobi define sua identidade ao chegar ao topo. O catálogo é a fonte da
 * verdade; o servidor valida nível, pontos e pré-requisitos.
 */
export const TALENT_CATALOGUE: TalentDefinition[] = [
  // SHADOW_BLADE
  { code: 'SB_EDGE_1', name: 'Fio Afiado', path: 'SHADOW_BLADE', tier: 1, requiredLevel: 3, cost: 1, prerequisites: [], description: 'A lâmina corta mais fundo em cada golpe.', effect: { strength: 2, agility: 1 } },
  { code: 'SB_EDGE_2', name: 'Passo Sombrio', path: 'SHADOW_BLADE', tier: 2, requiredLevel: 5, cost: 1, prerequisites: ['SB_EDGE_1'], description: 'Movimento silencioso que amplia a iniciativa.', effect: { agility: 3, strength: 1 } },
  { code: 'SB_CAPSTONE_A', name: 'Lâmina Fantasma', path: 'SHADOW_BLADE', tier: 3, requiredLevel: 8, cost: 1, group: 'SB_CAP', prerequisites: ['SB_EDGE_2'], description: 'Golpes que atravessam a guarda inimiga.', effect: { strength: 4, agility: 2 } },
  { code: 'SB_CAPSTONE_B', name: 'Sombra Viva', path: 'SHADOW_BLADE', tier: 3, requiredLevel: 8, cost: 1, group: 'SB_CAP', prerequisites: ['SB_EDGE_2'], description: 'A sombra luta ao seu lado e reforça a vitalidade.', effect: { vitality: 4, agility: 2 } },

  // FLAME_EYE
  { code: 'FE_EMBER_1', name: 'Brasa Interna', path: 'FLAME_EYE', tier: 1, requiredLevel: 3, cost: 1, prerequisites: [], description: 'O calor interno fortalece a mente.', effect: { intelligence: 2, vitality: 1 } },
  { code: 'FE_EMBER_2', name: 'Olhar Ardente', path: 'FLAME_EYE', tier: 2, requiredLevel: 5, cost: 1, prerequisites: ['FE_EMBER_1'], description: 'Técnicas queimam mais forte e duram mais.', effect: { intelligence: 3, strength: 1 } },
  { code: 'FE_CAPSTONE_A', name: 'Fênix Renascida', path: 'FLAME_EYE', tier: 3, requiredLevel: 8, cost: 1, group: 'FE_CAP', prerequisites: ['FE_EMBER_2'], description: 'Renova a vitalidade quando a chama está baixa.', effect: { vitality: 5, intelligence: 2 } },
  { code: 'FE_CAPSTONE_B', name: 'Inferno Focado', path: 'FLAME_EYE', tier: 3, requiredLevel: 8, cost: 1, group: 'FE_CAP', prerequisites: ['FE_EMBER_2'], description: 'Técnicas concentram todo o poder em um único golpe.', effect: { intelligence: 5, strength: 2 } },

  // WIND_DANCER
  { code: 'WD_GUST_1', name: 'Rajada Leve', path: 'WIND_DANCER', tier: 1, requiredLevel: 3, cost: 1, prerequisites: [], description: 'O vento carrega o corpo com mais leveza.', effect: { agility: 2, vitality: 1 } },
  { code: 'WD_GUST_2', name: 'Dança do Vento', path: 'WIND_DANCER', tier: 2, requiredLevel: 5, cost: 1, prerequisites: ['WD_GUST_1'], description: 'Esquiva e contra-ataque em movimento contínuo.', effect: { agility: 3, strength: 1 } },
  { code: 'WD_CAPSTONE_A', name: 'Tempestade Cortante', path: 'WIND_DANCER', tier: 3, requiredLevel: 8, cost: 1, group: 'WD_CAP', prerequisites: ['WD_GUST_2'], description: 'Golpes de vento atingem vários alvos.', effect: { agility: 4, strength: 3 } },
  { code: 'WD_CAPSTONE_B', name: 'Brisa Curativa', path: 'WIND_DANCER', tier: 3, requiredLevel: 8, cost: 1, group: 'WD_CAP', prerequisites: ['WD_GUST_2'], description: 'A brisa restaura chakra e vitalidade.', effect: { vitality: 4, intelligence: 3 } },

  // WATER_CLAW
  { code: 'WC_TIDE_1', name: 'Maré Crescente', path: 'WATER_CLAW', tier: 1, requiredLevel: 3, cost: 1, prerequisites: [], description: 'A força da maré sustenta o corpo.', effect: { vitality: 2, strength: 1 } },
  { code: 'WC_TIDE_2', name: 'Garra da Correnteza', path: 'WATER_CLAW', tier: 2, requiredLevel: 5, cost: 1, prerequisites: ['WC_TIDE_1'], description: 'Golpes arrastam e enfraquecem o oponente.', effect: { strength: 3, agility: 1 } },
  { code: 'WC_CAPSTONE_A', name: 'Abismo Profundo', path: 'WATER_CLAW', tier: 3, requiredLevel: 8, cost: 1, group: 'WC_CAP', prerequisites: ['WC_TIDE_2'], description: 'Puxa o inimigo para as profundezas.', effect: { strength: 4, vitality: 3 } },
  { code: 'WC_CAPSTONE_B', name: 'Cura das Águas', path: 'WATER_CLAW', tier: 3, requiredLevel: 8, cost: 1, group: 'WC_CAP', prerequisites: ['WC_TIDE_2'], description: 'A água cura feridas e restaura chakra.', effect: { vitality: 5, intelligence: 2 } },

  // STONE_FIST
  { code: 'SF_ROCK_1', name: 'Punho Rochoso', path: 'STONE_FIST', tier: 1, requiredLevel: 3, cost: 1, prerequisites: [], description: 'A pedra fortalece cada golpe.', effect: { strength: 2, vitality: 1 } },
  { code: 'SF_ROCK_2', name: 'Muralha Viva', path: 'STONE_FIST', tier: 2, requiredLevel: 5, cost: 1, prerequisites: ['SF_ROCK_1'], description: 'O corpo vira muralha contra o dano.', effect: { vitality: 3, strength: 1 } },
  { code: 'SF_CAPSTONE_A', name: 'Terremoto', path: 'STONE_FIST', tier: 3, requiredLevel: 8, cost: 1, group: 'SF_CAP', prerequisites: ['SF_ROCK_2'], description: 'O chão treme e atinge todos ao redor.', effect: { strength: 5, vitality: 2 } },
  { code: 'SF_CAPSTONE_B', name: 'Coração de Granito', path: 'STONE_FIST', tier: 3, requiredLevel: 8, cost: 1, group: 'SF_CAP', prerequisites: ['SF_ROCK_2'], description: 'Vitalidade inabalável em combate prolongado.', effect: { vitality: 6, strength: 1 } },
];

export function findTalent(code: string): TalentDefinition | undefined {
  return TALENT_CATALOGUE.find((talent) => talent.code === code);
}

export function talentsForPath(path: string): TalentDefinition[] {
  return TALENT_CATALOGUE.filter((talent) => talent.path === path);
}
