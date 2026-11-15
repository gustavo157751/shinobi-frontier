import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MAX_ENERGY, refreshEnergy } from '../character/energy';
import { buildBattleState, presentBattle } from '../combat/battle-state';
import { PrismaService } from '../prisma/prisma.service';
import { loadFormationBonus } from '../roster/team-bonus';
import { talentBonuses, mergeBonuses } from '../talents/talent-bonus';
import { findItem } from '../inventory/item-catalogue';
import { findMission, MISSION_CATALOGUE, MissionDefinition } from './mission-catalogue';

type MissionStatus = 'AVAILABLE' | 'ACTIVE' | 'COMPLETED';

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Quadro de missões do personagem. O estado vem de `CharacterMission`, mas
   * uma missão só aparece como ATIVA se existir o confronto correspondente:
   * assim, batalhas perdidas ou abandonadas voltam a ficar disponíveis.
   */
  async overview(userId: string) {
    const found = await this.prisma.character.findFirst({ where: { userId } });
    if (!found) throw new NotFoundException('Personagem não encontrado.');
    const character = await refreshEnergy(this.prisma, found);

    const [records, activeBattle] = await Promise.all([
      this.prisma.characterMission.findMany({ where: { characterId: character.id } }),
      this.prisma.combatBattle.findFirst({
        where: { characterId: character.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const stored = new Map(records.map((record) => [record.missionCode, record.status]));
    const activeMission = this.missionCodeOf(activeBattle?.state);

    return {
      level: character.level,
      energy: character.energy,
      maxEnergy: MAX_ENERGY,
      activeMission,
      missions: MISSION_CATALOGUE.map((mission) =>
        this.present(mission, character.level, character.energy, stored, activeMission),
      ),
    };
  }

  async accept(userId: string, missionCode: string) {
    const mission = findMission(missionCode);
    if (!mission) throw new BadRequestException('Missão desconhecida.');

    return this.prisma.$transaction(async (tx) => {
      const found = await tx.character.findFirst({ where: { userId } });
      if (!found) throw new NotFoundException('Personagem não encontrado.');
      const character = await refreshEnergy(tx, found);

      const active = await tx.combatBattle.findFirst({
        where: { characterId: character.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      if (active) {
        throw new ConflictException('Você já tem um confronto ativo. Termine-o antes de aceitar outra missão.');
      }

      const record = await tx.characterMission.findUnique({
        where: {
          characterId_missionCode: { characterId: character.id, missionCode: mission.code },
        },
      });
      if (record?.status === 'COMPLETED') {
        throw new ConflictException(`A missão ${mission.name} já foi concluída.`);
      }
      if (character.level < mission.requiredLevel) {
        throw new BadRequestException(
          `Você precisa do nível ${mission.requiredLevel} para aceitar ${mission.name}.`,
        );
      }
      if (character.energy < mission.energyCost) {
        throw new BadRequestException(
          `Faltam pontos de energia: ${mission.name} custa ${mission.energyCost} e você tem ${character.energy}.`,
        );
      }

      const formation = await loadFormationBonus(tx, character.id);
      const learnedTalents = await tx.characterTalent.findMany({ where: { characterId: character.id } });
      const team = mergeBonuses(formation, talentBonuses(learnedTalents.map((row) => row.talentCode)));
      const state = buildBattleState({
        character,
        team,
        encounter: mission.enemy,
        mission: { code: mission.code, name: mission.name },
        intro: mission.intro,
      });

      await tx.characterMission.upsert({
        where: {
          characterId_missionCode: { characterId: character.id, missionCode: mission.code },
        },
        update: { status: 'ACTIVE', progress: 0 },
        create: { characterId: character.id, missionCode: mission.code, status: 'ACTIVE' },
      });

      const updated = await tx.character.update({
        where: { id: character.id },
        data: {
          energy: character.energy - mission.energyCost,
          energyUpdatedAt: new Date(),
        },
      });

      const battle = await tx.combatBattle.create({
        data: {
          characterId: character.id,
          status: 'ACTIVE',
          state: state as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        mission: { code: mission.code, name: mission.name, energyCost: mission.energyCost },
        battle: presentBattle(battle),
        character: updated,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private present(
    mission: MissionDefinition,
    level: number,
    energy: number,
    stored: Map<string, string>,
    activeMission: string | null,
  ) {
    let status: MissionStatus = 'AVAILABLE';
    if (stored.get(mission.code) === 'COMPLETED') status = 'COMPLETED';
    else if (stored.get(mission.code) === 'ACTIVE' && activeMission === mission.code) status = 'ACTIVE';

    return {
      code: mission.code,
      name: mission.name,
      description: mission.description,
      requiredLevel: mission.requiredLevel,
      energyCost: mission.energyCost,
      status,
      locked: level < mission.requiredLevel,
      affordable: energy >= mission.energyCost,
      enemy: { name: mission.enemy.name, level: mission.enemy.level },
      rewards: {
        experience: mission.rewards.experience,
        gold: mission.rewards.gold,
        items: mission.rewards.items.map((item) => ({
          code: item.code,
          name: findItem(item.code)?.name ?? item.code,
          quantity: item.quantity,
        })),
      },
    };
  }

  private missionCodeOf(state: Prisma.JsonValue | undefined): string | null {
    if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
    const mission = (state as { mission?: { code?: unknown } }).mission;
    return typeof mission?.code === 'string' ? mission.code : null;
  }
}
