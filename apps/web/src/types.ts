export type Character = {
  id: string;
  name: string;
  level: number;
  experience: number;
  energy: number;
  path: string;
  gold: number;
  strength: number;
  vitality: number;
  agility: number;
  intelligence: number;
};

export type BattleLog = { turn: number; text: string; side: 'player' | 'enemy' | 'system' };

export type BattleState = {
  enemy: { code: string; name: string; level: number; hp: number; maxHp: number; attack?: number };
  player: { hp: number; maxHp: number; chakra: number; maxChakra: number };
  turn: number;
  logs: BattleLog[];
  mission?: { code: string; name: string };
};

export type Battle = { id: string; status: 'ACTIVE' | 'VICTORY' | 'DEFEAT'; state: BattleState };

export type CombatReward = {
  experience: number;
  gold: number;
  items?: Array<{ code: string; name: string; quantity: number }>;
};
