import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FormationBonus, FormationMember, formationBonuses } from './formation';
import { MAX_FORMATION_SIZE, NINJA_CATALOGUE, NinjaDefinition, NinjaRole, findNinja } from './ninja-catalogue';
import { FormationSlotDto } from './roster.dto';

type RosterRow = {
  id: string;
  level: number;
  stars: number;
  position: number | null;
  ninja: { code: string; name: string; role: string; rarity: number; description: string };
};

@Injectable()
export class RosterService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureCatalogue();
  }

  /**
   * Mantém a tabela `Ninja` sincronizada com o catálogo versionado no código.
   * O catálogo é a fonte da verdade; o banco só guarda as referências usadas
   * pelas posses dos personagens.
   */
  async ensureCatalogue() {
    for (const ninja of NINJA_CATALOGUE) {
      await this.prisma.ninja.upsert({
        where: { code: ninja.code },
        update: {
          name: ninja.name,
          role: ninja.role,
          rarity: ninja.rarity,
          description: ninja.description,
        },
        create: {
          code: ninja.code,
          name: ninja.name,
          role: ninja.role,
          rarity: ninja.rarity,
          description: ninja.description,
        },
      });
    }
  }

  async catalog(userId: string) {
    const character = await this.prisma.character.findFirst({
      where: { userId },
      include: { roster: { include: { ninja: true } } },
    });
    if (!character) throw new NotFoundException('Personagem não encontrado.');

    const owned = new Set(character.roster.map((entry) => entry.ninja.code));
    const assigned = new Map(
      character.roster
        .filter((entry) => entry.position !== null)
        .map((entry) => [entry.ninja.code, entry.position as number]),
    );

    return {
      level: character.level,
      gold: character.gold,
      ninjas: NINJA_CATALOGUE.map((ninja) => this.presentDefinition(ninja, character.level, character.gold, owned, assigned)),
    };
  }

  async overview(userId: string) {
    const character = await this.prisma.character.findFirst({
      where: { userId },
      include: { roster: { include: { ninja: true }, orderBy: { position: 'asc' } } },
    });
    if (!character) throw new NotFoundException('Personagem não encontrado.');

    const members = character.roster.map((entry) => this.toMember(entry));
    const bonus = formationBonuses(members);
    const owned = new Set(character.roster.map((entry) => entry.ninja.code));
    const rowsByCode = new Map(character.roster.map((entry) => [entry.ninja.code, entry]));

    const slots: Array<{
      position: number;
      line: 'front' | 'back';
      ninja: null | {
        code: string;
        name: string;
        role: string;
        rarity: number;
        level: number;
        stars: number;
      };
    }> = [];
    for (let position = 1; position <= MAX_FORMATION_SIZE; position += 1) {
      const occupant = character.roster.find((entry) => entry.position === position);
      slots.push({
        position,
        line: position <= 2 ? 'front' : 'back',
        ninja: occupant
          ? {
              code: occupant.ninja.code,
              name: occupant.ninja.name,
              role: occupant.ninja.role,
              rarity: occupant.ninja.rarity,
              level: occupant.level,
              stars: occupant.stars,
            }
          : null,
      });
    }

    return {
      level: character.level,
      gold: character.gold,
      power: bonus.power,
      bonus,
      slots,
      roster: members.map((member) => ({
        ...member,
        name: rowsByCode.get(member.code)?.ninja.name ?? member.code,
        description: rowsByCode.get(member.code)?.ninja.description ?? '',
        power: Math.round(member.rarity * 22 + (member.level - 1) * 6 + (member.stars - 1) * 14),
      })),
      catalog: NINJA_CATALOGUE.filter((ninja) => !owned.has(ninja.code)).map((ninja) =>
        this.presentDefinition(ninja, character.level, character.gold, owned, new Map()),
      ),
    };
  }

  async recruit(userId: string, ninjaCode: string) {
    const definition = findNinja(ninjaCode);
    if (!definition) throw new BadRequestException('Ninja desconhecido.');

    return this.prisma.$transaction(async (tx) => {
      const character = await tx.character.findFirst({ where: { userId } });
      if (!character) throw new NotFoundException('Personagem não encontrado.');
      if (character.level < definition.requiredLevel) {
        throw new BadRequestException(
          `Você precisa do nível ${definition.requiredLevel} para recrutar ${definition.name}.`,
        );
      }
      if (character.gold < definition.recruitCost) {
        throw new BadRequestException(
          `Faltam ryō: ${definition.name} custa ${definition.recruitCost} e você tem ${character.gold}.`,
        );
      }

      const ninja = await tx.ninja.findUnique({ where: { code: definition.code } });
      if (!ninja) throw new BadRequestException('Catálogo de ninjas indisponível. Tente novamente.');

      const alreadyOwned = await tx.characterNinja.findFirst({
        where: { characterId: character.id, ninjaId: ninja.id },
      });
      if (alreadyOwned) throw new ConflictException(`${definition.name} já faz parte da sua equipe.`);

      const updated = await tx.character.update({
        where: { id: character.id },
        data: { gold: { decrement: definition.recruitCost } },
      });
      await tx.characterNinja.create({
        data: { characterId: character.id, ninjaId: ninja.id },
      });

      return {
        character: updated,
        ninja: { ...definition, owned: true, position: null },
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async setFormation(userId: string, slots: FormationSlotDto[]) {
    this.validateSlots(slots);

    await this.prisma.$transaction(async (tx) => {
      const character = await tx.character.findFirst({
        where: { userId },
        include: { roster: { include: { ninja: true } } },
      });
      if (!character) throw new NotFoundException('Personagem não encontrado.');

      const byCode = new Map(character.roster.map((entry) => [entry.ninja.code, entry.id]));
      for (const slot of slots) {
        if (!byCode.has(slot.ninjaCode)) {
          throw new BadRequestException(`Você ainda não recrutou ${slot.ninjaCode}.`);
        }
      }

      await tx.characterNinja.updateMany({
        where: { characterId: character.id, position: { not: null } },
        data: { position: null },
      });
      for (const slot of slots) {
        await tx.characterNinja.update({
          where: { id: byCode.get(slot.ninjaCode) as string },
          data: { position: slot.position },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return this.overview(userId);
  }

  /** Bônus do esquadrão usado pelo combate; não altera nada. */
  async battleBonus(characterId: string): Promise<FormationBonus> {
    const roster = await this.prisma.characterNinja.findMany({
      where: { characterId },
      include: { ninja: true },
    });
    return formationBonuses(roster.map((entry) => this.toMember(entry)));
  }

  private validateSlots(slots: FormationSlotDto[]) {
    if (slots.length > MAX_FORMATION_SIZE) {
      throw new BadRequestException(`A formação aceita no máximo ${MAX_FORMATION_SIZE} ninjas.`);
    }
    const positions = new Set<number>();
    const codes = new Set<string>();
    for (const slot of slots) {
      if (!Number.isInteger(slot.position) || slot.position < 1 || slot.position > MAX_FORMATION_SIZE) {
        throw new BadRequestException(`Posição inválida: use de 1 a ${MAX_FORMATION_SIZE}.`);
      }
      if (positions.has(slot.position)) {
        throw new BadRequestException(`A posição ${slot.position} está duplicada.`);
      }
      if (codes.has(slot.ninjaCode)) {
        throw new BadRequestException(`${slot.ninjaCode} aparece duas vezes na formação.`);
      }
      positions.add(slot.position);
      codes.add(slot.ninjaCode);
    }
  }

  private toMember(entry: RosterRow): FormationMember {
    return {
      code: entry.ninja.code,
      role: entry.ninja.role as NinjaRole,
      rarity: entry.ninja.rarity,
      level: entry.level,
      stars: entry.stars,
      position: entry.position,
    };
  }

  private presentDefinition(
    ninja: NinjaDefinition,
    level: number,
    gold: number,
    owned: Set<string>,
    assigned: Map<string, number>,
  ) {
    return {
      code: ninja.code,
      name: ninja.name,
      role: ninja.role,
      rarity: ninja.rarity,
      description: ninja.description,
      recruitCost: ninja.recruitCost,
      requiredLevel: ninja.requiredLevel,
      owned: owned.has(ninja.code),
      position: assigned.get(ninja.code) ?? null,
      locked: level < ninja.requiredLevel,
      affordable: gold >= ninja.recruitCost,
    };
  }
}
