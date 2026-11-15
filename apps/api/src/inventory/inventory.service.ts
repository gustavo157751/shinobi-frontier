import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MAX_ENERGY, refreshEnergy } from '../character/energy';
import { PrismaService } from '../prisma/prisma.service';
import { findItem, ITEM_CATALOGUE, ItemDefinition } from './item-catalogue';

const CATALOGUE_ORDER = new Map(ITEM_CATALOGUE.map((item, index) => [item.code, index]));

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string) {
    const found = await this.prisma.character.findFirst({ where: { userId } });
    if (!found) throw new NotFoundException('Personagem não encontrado.');
    const character = await refreshEnergy(this.prisma, found);

    const rows = await this.prisma.characterItem.findMany({
      where: { characterId: character.id },
    });

    const items = rows
      .filter((row) => row.quantity > 0)
      .map((row) => ({ row, definition: findItem(row.itemCode) }))
      .filter((entry): entry is { row: (typeof rows)[number]; definition: ItemDefinition } => Boolean(entry.definition))
      .sort((a, b) => (CATALOGUE_ORDER.get(a.row.itemCode) ?? 99) - (CATALOGUE_ORDER.get(b.row.itemCode) ?? 99))
      .map(({ row, definition }) => ({
        ...this.present(definition),
        quantity: row.quantity,
      }));

    return { energy: character.energy, maxEnergy: MAX_ENERGY, items };
  }

  async use(userId: string, itemCode: string) {
    const definition = findItem(itemCode);
    if (!definition) throw new BadRequestException('Item desconhecido.');

    return this.prisma.$transaction(async (tx) => {
      const found = await tx.character.findFirst({ where: { userId } });
      if (!found) throw new NotFoundException('Personagem não encontrado.');
      const character = await refreshEnergy(tx, found);

      const row = await tx.characterItem.findUnique({
        where: { characterId_itemCode: { characterId: character.id, itemCode } },
      });
      if (!row || row.quantity < 1) {
        throw new BadRequestException(`Você não possui ${definition.name}.`);
      }
      if (!definition.effect?.energy) {
        throw new BadRequestException(`${definition.name} é um material e não pode ser consumido.`);
      }
      if (character.energy >= MAX_ENERGY) {
        throw new BadRequestException('Sua energia já está cheia; guarde o item para depois.');
      }

      const restored = Math.min(MAX_ENERGY, character.energy + definition.effect.energy) - character.energy;
      const updated = await tx.character.update({
        where: { id: character.id },
        data: { energy: character.energy + restored, energyUpdatedAt: new Date() },
      });

      if (row.quantity === 1) {
        await tx.characterItem.delete({ where: { id: row.id } });
      } else {
        await tx.characterItem.update({ where: { id: row.id }, data: { quantity: { decrement: 1 } } });
      }

      return {
        item: { code: definition.code, name: definition.name, remaining: Math.max(0, row.quantity - 1) },
        restored,
        character: updated,
      };
    });
  }

  private present(definition: ItemDefinition) {
    return {
      code: definition.code,
      name: definition.name,
      kind: definition.kind,
      rarity: definition.rarity,
      description: definition.description,
      usable: Boolean(definition.effect?.energy),
      effect: definition.effect ?? null,
    };
  }
}
