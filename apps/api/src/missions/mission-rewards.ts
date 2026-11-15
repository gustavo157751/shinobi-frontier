import { Prisma } from '@prisma/client';
import { applyExperience, CharacterProgression } from '../character/progression';
import { findItem } from '../inventory/item-catalogue';
import { findMission, MissionDefinition } from './mission-catalogue';

export type MissionCharacter = CharacterProgression & { id: string; gold: number };

export type MissionCompletion = {
  mission: MissionDefinition;
  character: MissionCharacter;
  rewards: {
    experience: number;
    gold: number;
    items: Array<{ code: string; name: string; quantity: number }>;
  };
};

/**
 * Concede a recompensa da missão exatamente uma vez. Se a missão já estava
 * concluída (requisição repetida, batalha antiga reaberta), devolve `null` e
 * nada é creditado.
 */
export async function completeMission(
  tx: Prisma.TransactionClient,
  character: MissionCharacter,
  missionCode: string,
): Promise<MissionCompletion | null> {
  const mission = findMission(missionCode);
  if (!mission) return null;

  const record = await tx.characterMission.findUnique({
    where: { characterId_missionCode: { characterId: character.id, missionCode } },
  });
  if (!record || record.status === 'COMPLETED') return null;

  const progression = applyExperience(character, mission.rewards.experience);
  const updated = await tx.character.update({
    where: { id: character.id },
    data: {
      experience: progression.experience,
      level: progression.level,
      strength: progression.strength,
      vitality: progression.vitality,
      agility: progression.agility,
      intelligence: progression.intelligence,
      gold: { increment: mission.rewards.gold },
    },
  });

  const items: Array<{ code: string; name: string; quantity: number }> = [];
  for (const reward of mission.rewards.items) {
    await tx.characterItem.upsert({
      where: { characterId_itemCode: { characterId: character.id, itemCode: reward.code } },
      update: { quantity: { increment: reward.quantity } },
      create: { characterId: character.id, itemCode: reward.code, quantity: reward.quantity },
    });
    items.push({
      code: reward.code,
      name: findItem(reward.code)?.name ?? reward.code,
      quantity: reward.quantity,
    });
  }

  await tx.characterMission.update({
    where: { id: record.id },
    data: { status: 'COMPLETED', progress: 100 },
  });

  return {
    mission,
    character: updated,
    rewards: { experience: mission.rewards.experience, gold: mission.rewards.gold, items },
  };
}

/** Derrota devolve a missão ao quadro para nova tentativa, sem recompensa. */
export async function failMission(
  tx: Prisma.TransactionClient,
  characterId: string,
  missionCode: string,
): Promise<boolean> {
  const record = await tx.characterMission.findUnique({
    where: { characterId_missionCode: { characterId, missionCode } },
  });
  if (!record || record.status !== 'ACTIVE') return false;

  await tx.characterMission.update({
    where: { id: record.id },
    data: { status: 'AVAILABLE', progress: 0 },
  });
  return true;
}

/** Texto único para o relato do confronto, reaproveitado em log e interface. */
export function describeRewards(completion: MissionCompletion): string {
  const { experience, gold, items } = completion.rewards;
  const extra = items.length > 0
    ? ` Itens: ${items.map((item) => `${item.name} x${item.quantity}`).join(', ')}.`
    : '';
  return `Missão ${completion.mission.name} concluída! ${experience} de experiência, ${gold} ryō.${extra}`;
}
