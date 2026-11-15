import { Prisma } from '@prisma/client';
import { FormationBonus } from '../roster/formation';

export type BattleLog = { turn: number; text: string; side: 'player' | 'enemy' | 'system' };

export type BattleTeam = {
  power: number;
  damageBonus: number;
  techniqueBonus: number;
  guardChakra: number;
  damageReduction: number;
};

export type BattleEncounter = {
  code: string;
  name: string;
  level: number;
  maxHp: number;
  /** Dano base do contra-ataque; missões podem ajustar por encontro. */
  attack: number;
};

export type BattleMission = { code: string; name: string };

export type BattleState = {
  enemy: BattleEncounter & { hp: number };
  player: { hp: number; maxHp: number; chakra: number; maxChakra: number };
  turn: number;
  logs: BattleLog[];
  /** Congelado no início do confronto: mudar a formação não altera a luta em curso. */
  team?: BattleTeam;
  /** Presente apenas em confrontos de missão; define a recompensa ao vencer. */
  mission?: BattleMission;
};

export const NO_TEAM: BattleTeam = {
  power: 0,
  damageBonus: 0,
  techniqueBonus: 0,
  guardChakra: 0,
  damageReduction: 0,
};

export function describeTeam(team: BattleTeam): string {
  if (team.power <= 0) return 'Você luta sozinho; recrute ninjas para somar poder.';
  return `Sua formação soma ${team.power} de poder e entra no confronto com você.`;
}

export function battleTeam(team: FormationBonus): BattleTeam {
  return {
    power: team.power,
    damageBonus: team.damageBonus,
    techniqueBonus: team.techniqueBonus,
    guardChakra: team.guardChakra,
    damageReduction: team.damageReduction,
  };
}

/** Monta o estado inicial de qualquer confronto (treino ou missão). */
export function buildBattleState(input: {
  character: { level: number; vitality: number; intelligence: number };
  team: FormationBonus;
  encounter: BattleEncounter;
  intro: string;
  mission?: BattleMission;
}): BattleState {
  const maxHp = input.character.vitality * 12 + input.team.maxHp;
  const maxChakra = 40 + input.character.intelligence * 8 + input.team.maxChakra;
  const state: BattleState = {
    enemy: {
      code: input.encounter.code,
      name: input.encounter.name,
      level: input.encounter.level,
      hp: input.encounter.maxHp,
      maxHp: input.encounter.maxHp,
      attack: input.encounter.attack,
    },
    player: { hp: maxHp, maxHp, chakra: maxChakra, maxChakra },
    turn: 1,
    logs: [
      { turn: 1, text: input.intro, side: 'system' },
      { turn: 1, text: describeTeam(input.team), side: 'system' },
    ],
    team: battleTeam(input.team),
  };
  if (input.mission) state.mission = input.mission;
  return state;
}

export function presentBattle(battle: {
  id: string;
  status: string;
  state: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: battle.id,
    status: battle.status,
    state: battle.state,
    createdAt: battle.createdAt,
    updatedAt: battle.updatedAt,
  };
}
