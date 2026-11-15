/**
 * Bônus originais de composição por função e posição tática.
 * Grade 3×3 em coordenadas por equipe: colunas 0/1/2 = retaguarda/meio/frente.
 * As posições táticas seguem a grade do KonohaHub; efeitos e percentuais são
 * regras próprias deste protótipo, não uma reprodução de dados do site.
 */

export const FORMATION_ROLES = {
  vanguard: { label: 'Vanguarda', kanji: '盾' },
  striker: { label: 'Atacante', kanji: '攻' },
  support: { label: 'Suporte', kanji: '癒' },
  control: { label: 'Controle', kanji: '幻' },
};

const ROLE_BY_ID = {
  naruto: 'striker',
  sasuke: 'striker',
  sakura: 'support',
  kakashi: 'control',
  tenten: 'striker',
  kiba: 'vanguard',
  shino: 'control',
  ino: 'support',
  hinata: 'vanguard',
  lee: 'striker',
  shikamaru: 'control',
  gaara: 'vanguard',
  jiraiya: 'striker',
  tsunade: 'support',
  itachi: 'control',
  minato: 'striker',
};

const RARITY_TIER = { comum: 1, raro: 2, epico: 3, lendario: 4 };

export function formationColumn(position) {
  return Number.isInteger(position) && position >= 0 && position <= 8 ? position % 3 : -1;
}

export function formationLane(position) {
  return ({ 0: 'Retaguarda', 1: 'Meio', 2: 'Frente' })[formationColumn(position)] ?? 'Sem posição';
}

export function roleFor(character) {
  if (character?.id === 'hero' || character?.isHero) {
    return ({ taijutsu: 'vanguard', ninjutsu: 'striker', genjutsu: 'control' })[character.style] ?? 'striker';
  }
  return ROLE_BY_ID[character?.id] ?? 'striker';
}

export function rarityTier(rarity) {
  return RARITY_TIER[rarity] ?? 1;
}

export function emptyFormationBonus() {
  return {
    hpPct: 0,
    chakraPct: 0,
    basicDamagePct: 0,
    techniqueDamagePct: 0,
    damageReduction: 0,
    guardChakra: 0,
  };
}

/** Calcula bônus puros a partir de integrantes e suas células de 0 a 8. */
export function formationBonuses(members = []) {
  const bonus = emptyFormationBonus();
  const placed = members.filter(
    (member) => Number.isInteger(member.position) && member.position >= 0 && member.position <= 8,
  );

  for (const member of placed) {
    const role = member.role ?? roleFor(member.character);
    const tier = rarityTier(member.character?.rarity ?? member.rarity);
    const level = Math.max(1, Number(member.level) || 1);
    const column = formationColumn(member.position);
    const front = column === 2;
    const rear = column === 0;

    if (role === 'vanguard') {
      bonus.hpPct += 0.012 * tier + 0.001 * (level - 1);
      if (front) bonus.damageReduction += 0.012 * tier;
    } else if (role === 'striker') {
      bonus.basicDamagePct += 0.018 * tier + 0.001 * (level - 1);
      if (rear) bonus.basicDamagePct += 0.01 * tier;
    } else if (role === 'support') {
      bonus.chakraPct += 0.015 * tier;
      bonus.guardChakra += 2 + tier + (rear ? 2 : 0);
    } else if (role === 'control') {
      bonus.techniqueDamagePct += 0.02 * tier + 0.001 * (level - 1);
      if (front) bonus.damageReduction += 0.008 * tier;
    }
  }

  bonus.hpPct = Math.min(0.15, bonus.hpPct);
  bonus.chakraPct = Math.min(0.12, bonus.chakraPct);
  bonus.basicDamagePct = Math.min(0.18, bonus.basicDamagePct);
  bonus.techniqueDamagePct = Math.min(0.18, bonus.techniqueDamagePct);
  bonus.damageReduction = Math.min(0.25, bonus.damageReduction);
  bonus.guardChakra = Math.min(18, bonus.guardChakra);
  return bonus;
}

/** Aplica bônus gerais ao snapshot de batalha sem alterar os dados-base. */
export function applyFormationBonus(unit, bonus) {
  const maxHp = Math.round(unit.maxHp * (1 + bonus.hpPct));
  const maxChakra = Math.round(unit.maxChakra * (1 + bonus.chakraPct));
  return {
    ...unit,
    maxHp,
    hp: maxHp,
    maxChakra,
    chakra: Math.round(maxChakra * 0.35),
    teamBonus: bonus,
  };
}
