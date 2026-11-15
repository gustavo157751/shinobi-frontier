/**
 * Progressão de personagem compartilhada entre treino, missões e recompensas.
 * O servidor é sempre a fonte da verdade: nenhum ganho de experiência é aceito
 * do cliente.
 */

export type CharacterProgression = {
  level: number;
  experience: number;
  strength: number;
  vitality: number;
  agility: number;
  intelligence: number;
};

/** Cada nível exige `level * 100` de experiência acumulada. */
export const EXPERIENCE_PER_LEVEL = 100;

export function applyExperience(stats: CharacterProgression, gained: number): CharacterProgression {
  const experience = stats.experience + gained;
  let level = stats.level;
  let strength = stats.strength;
  let vitality = stats.vitality;
  let agility = stats.agility;
  let intelligence = stats.intelligence;

  while (experience >= level * EXPERIENCE_PER_LEVEL) {
    level += 1;
    strength += 2;
    vitality += 2;
    agility += 1;
    intelligence += 1;
  }

  return { experience, level, strength, vitality, agility, intelligence };
}
