import { MAX_FORMATION_SIZE, NinjaRole } from './ninja-catalogue';

export type FormationMember = {
  code: string;
  role: NinjaRole;
  rarity: number;
  level: number;
  stars: number;
  position: number | null;
};

export type FormationBonus = {
  power: number;
  maxHp: number;
  maxChakra: number;
  damageBonus: number;
  techniqueBonus: number;
  guardChakra: number;
  damageReduction: number;
};

export const EMPTY_FORMATION: FormationBonus = {
  power: 0,
  maxHp: 0,
  maxChakra: 0,
  damageBonus: 0,
  techniqueBonus: 0,
  guardChakra: 0,
  damageReduction: 0,
};

/** Posições 1 e 2 formam a linha de frente; 3 e 4, a retaguarda. */
export function isFrontLine(position: number | null): boolean {
  return position !== null && position >= 1 && position <= 2;
}

export function memberPower(member: { rarity: number; level: number; stars: number }): number {
  return Math.round(member.rarity * 22 + (member.level - 1) * 6 + (member.stars - 1) * 14);
}

/**
 * Calcula o bônus do esquadrão a partir dos ninjas posicionados. Função pura,
 * usada tanto pelo combate quanto pela interface, para que servidor e cliente
 * mostrem exatamente o mesmo número.
 */
export function formationBonuses(members: FormationMember[]): FormationBonus {
  const bonus: FormationBonus = { ...EMPTY_FORMATION };
  const placed = members.filter(
    (member) =>
      member.position !== null &&
      Number.isInteger(member.position) &&
      member.position >= 1 &&
      member.position <= MAX_FORMATION_SIZE,
  );

  for (const member of placed) {
    const front = isFrontLine(member.position);
    bonus.power += memberPower(member);

    switch (member.role) {
      case 'VANGUARD':
        bonus.maxHp += 24 * member.rarity + 4 * member.level;
        if (front) bonus.damageReduction += 0.03 * member.rarity;
        break;
      case 'STRIKER':
        bonus.damageBonus += 2 * member.rarity + member.level;
        // Atacante na retaguarda tem espaço para carregar o golpe.
        if (!front) bonus.damageBonus += 2 * member.rarity;
        break;
      case 'SUPPORT':
        bonus.maxChakra += 5 * member.rarity;
        bonus.guardChakra += 3 + 2 * member.rarity;
        if (!front) bonus.guardChakra += 3;
        break;
      case 'CONTROL':
        bonus.techniqueBonus += 3 * member.rarity + member.level;
        if (front) bonus.damageReduction += 0.015 * member.rarity;
        break;
    }
  }

  bonus.damageReduction = Math.min(0.4, Math.round(bonus.damageReduction * 1000) / 1000);
  return bonus;
}
