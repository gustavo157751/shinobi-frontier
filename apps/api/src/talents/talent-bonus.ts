import { EMPTY_FORMATION, FormationBonus } from '../roster/formation';
import { TALENT_CATALOGUE, findTalent } from './talent-catalogue';

/**
 * Soma os bônus de combate dos talentos aprendidos. O resultado tem a mesma
 * forma do bônus de formação, então pode ser somado a ele antes de congelar o
 * estado da batalha.
 */
export function talentBonuses(learnedCodes: string[]): FormationBonus {
  const bonus: FormationBonus = { ...EMPTY_FORMATION };
  for (const code of learnedCodes) {
    const talent = findTalent(code);
    if (!talent) continue;
    const effect = talent.effect;
    bonus.maxHp += effect.maxHp ?? 0;
    bonus.maxChakra += effect.maxChakra ?? 0;
    bonus.damageBonus += effect.damageBonus ?? 0;
    bonus.techniqueBonus += effect.techniqueBonus ?? 0;
    bonus.guardChakra += effect.guardChakra ?? 0;
    bonus.damageReduction += effect.damageReduction ?? 0;
  }
  // Mantém a redução de dano no mesmo teto da formação (40%).
  if (bonus.damageReduction > 0.4) bonus.damageReduction = 0.4;
  return bonus;
}

export function mergeBonuses(a: FormationBonus, b: FormationBonus): FormationBonus {
  return {
    power: a.power + b.power,
    maxHp: a.maxHp + b.maxHp,
    maxChakra: a.maxChakra + b.maxChakra,
    damageBonus: a.damageBonus + b.damageBonus,
    techniqueBonus: a.techniqueBonus + b.techniqueBonus,
    guardChakra: a.guardChakra + b.guardChakra,
    damageReduction: Math.min(0.4, a.damageReduction + b.damageReduction),
  };
}

export function loadTalentBonusCodes(rows: Array<{ talentCode: string }>): string[] {
  return rows.map((row) => row.talentCode);
}

export { TALENT_CATALOGUE };
