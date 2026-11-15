import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TALENT_CATALOGUE, findTalent, talentsForPath } from './talent-catalogue';

@Injectable()
export class TalentsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string) {
    const character = await this.prisma.character.findFirst({ where: { userId } });
    if (!character) throw new NotFoundException('Personagem não encontrado.');

    const learned = await this.prisma.characterTalent.findMany({ where: { characterId: character.id } });
    const learnedCodes = new Set(learned.map((row) => row.talentCode));

    const earned = Math.max(0, character.level - 1);
    const spent = learned.length;
    const available = Math.max(0, earned - spent);

    const pathTalents = talentsForPath(character.path);
    return {
      path: character.path,
      level: character.level,
      earned,
      spent,
      available,
      learned: [...learnedCodes],
      talents: pathTalents.map((talent) => this.present(talent, character.level, learnedCodes)),
    };
  }

  async learn(userId: string, talentCode: string) {
    const talent = findTalent(talentCode);
    if (!talent) throw new BadRequestException('Talento desconhecido.');

    return this.prisma.$transaction(async (tx) => {
      const character = await tx.character.findFirst({ where: { userId } });
      if (!character) throw new NotFoundException('Personagem não encontrado.');
      if (character.path !== talent.path) {
        throw new BadRequestException('Este talento não pertence ao seu caminho.');
      }

      const learnedRows = await tx.characterTalent.findMany({ where: { characterId: character.id } });
      const learnedCodes = new Set(learnedRows.map((row) => row.talentCode));

      if (learnedCodes.has(talent.code)) {
        throw new BadRequestException('Você já aprendeu este talento.');
      }
      if (character.level < talent.requiredLevel) {
        throw new BadRequestException(`Você precisa do nível ${talent.requiredLevel} para aprender ${talent.name}.`);
      }
      for (const prerequisite of talent.prerequisites) {
        if (!learnedCodes.has(prerequisite)) {
          throw new BadRequestException(`Pré-requisito não atendido: ${prerequisite}.`);
        }
      }
      if (talent.group) {
        const conflict = learnedRows.find((row) => {
          const def = TALENT_CATALOGUE.find((t) => t.code === row.talentCode);
          return def?.group === talent.group;
        });
        if (conflict) {
          throw new BadRequestException('Você já escolheu a especialização deste degrau.');
        }
      }

      const earned = Math.max(0, character.level - 1);
      const spent = learnedRows.length;
      if (spent + talent.cost > earned) {
        throw new BadRequestException('Pontos de talento insuficientes.');
      }

      await tx.characterTalent.create({
        data: { characterId: character.id, talentCode: talent.code },
      });

      const updated = await tx.character.update({
        where: { id: character.id },
        data: {
          strength: { increment: talent.effect.strength ?? 0 },
          vitality: { increment: talent.effect.vitality ?? 0 },
          agility: { increment: talent.effect.agility ?? 0 },
          intelligence: { increment: talent.effect.intelligence ?? 0 },
        },
      });

      return {
        talent: { code: talent.code, name: talent.name },
        character: updated,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private present(talent: (typeof TALENT_CATALOGUE)[number], level: number, learned: Set<string>) {
    const available = level >= talent.requiredLevel
      && talent.prerequisites.every((code) => learned.has(code))
      && !learned.has(talent.code);
    return {
      code: talent.code,
      name: talent.name,
      tier: talent.tier,
      requiredLevel: talent.requiredLevel,
      cost: talent.cost,
      group: talent.group ?? null,
      description: talent.description,
      effect: talent.effect,
      learned: learned.has(talent.code),
      available,
      locked: level < talent.requiredLevel,
    };
  }
}
