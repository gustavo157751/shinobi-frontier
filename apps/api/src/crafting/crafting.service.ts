import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MAX_ENERGY, refreshEnergy } from '../character/energy';
import { PrismaService } from '../prisma/prisma.service';
import { findItem, ITEM_CATALOGUE } from '../inventory/item-catalogue';
import { findRecipe, RECIPE_CATALOGUE, RecipeDefinition } from './recipe-catalogue';

@Injectable()
export class CraftingService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string) {
    const found = await this.prisma.character.findFirst({ where: { userId } });
    if (!found) throw new NotFoundException('Personagem não encontrado.');
    const character = await refreshEnergy(this.prisma, found);

    const rows = await this.prisma.characterItem.findMany({ where: { characterId: character.id } });
    const stock = new Map(rows.map((row) => [row.itemCode, row.quantity]));

    return {
      level: character.level,
      gold: character.gold,
      energy: character.energy,
      maxEnergy: MAX_ENERGY,
      recipes: RECIPE_CATALOGUE.map((recipe) => this.present(recipe, character, stock)),
    };
  }

  async craft(userId: string, recipeCode: string) {
    const recipe = findRecipe(recipeCode);
    if (!recipe) throw new BadRequestException('Receita desconhecida.');

    return this.prisma.$transaction(async (tx) => {
      const found = await tx.character.findFirst({ where: { userId } });
      if (!found) throw new NotFoundException('Personagem não encontrado.');
      const character = await refreshEnergy(tx, found);

      if (character.level < recipe.requiredLevel) {
        throw new BadRequestException(
          `Você precisa do nível ${recipe.requiredLevel} para forjar ${recipe.name}.`,
        );
      }
      if (character.gold < recipe.goldCost) {
        throw new BadRequestException(
          `Faltam ryō: ${recipe.name} custa ${recipe.goldCost} e você tem ${character.gold}.`,
        );
      }

      // Valida estoque antes de consumir qualquer coisa.
      const stockRows = await tx.characterItem.findMany({ where: { characterId: character.id } });
      const stock = new Map(stockRows.map((row) => [row.itemCode, row]));
      for (const input of recipe.inputs) {
        const row = stock.get(input.itemCode);
        if (!row || row.quantity < input.quantity) {
          const name = findItem(input.itemCode)?.name ?? input.itemCode;
          throw new BadRequestException(`Faltam ${name} para forjar ${recipe.name}.`);
        }
      }

      // Consome os materiais.
      for (const input of recipe.inputs) {
        const row = stock.get(input.itemCode)!;
        if (row.quantity === input.quantity) {
          await tx.characterItem.delete({ where: { id: row.id } });
        } else {
          await tx.characterItem.update({
            where: { id: row.id },
            data: { quantity: { decrement: input.quantity } },
          });
        }
      }

      // Credita o resultado.
      await tx.characterItem.upsert({
        where: {
          characterId_itemCode: { characterId: character.id, itemCode: recipe.output.itemCode },
        },
        update: { quantity: { increment: recipe.output.quantity } },
        create: {
          characterId: character.id,
          itemCode: recipe.output.itemCode,
          quantity: recipe.output.quantity,
        },
      });

      const updated = await tx.character.update({
        where: { id: character.id },
        data: { gold: { decrement: recipe.goldCost } },
      });

      const output = findItem(recipe.output.itemCode);
      return {
        recipe: { code: recipe.code, name: recipe.name },
        output: {
          code: recipe.output.itemCode,
          name: output?.name ?? recipe.output.itemCode,
          quantity: recipe.output.quantity,
        },
        character: updated,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private present(recipe: RecipeDefinition, character: { level: number; gold: number }, stock: Map<string, number>) {
    const affordable = recipe.inputs.every((input) => (stock.get(input.itemCode) ?? 0) >= input.quantity)
      && character.gold >= recipe.goldCost;
    return {
      code: recipe.code,
      name: recipe.name,
      description: recipe.description,
      requiredLevel: recipe.requiredLevel,
      goldCost: recipe.goldCost,
      locked: character.level < recipe.requiredLevel,
      affordable,
      inputs: recipe.inputs.map((input) => ({
        code: input.itemCode,
        name: findItem(input.itemCode)?.name ?? input.itemCode,
        quantity: input.quantity,
        owned: stock.get(input.itemCode) ?? 0,
      })),
      output: {
        code: recipe.output.itemCode,
        name: findItem(recipe.output.itemCode)?.name ?? recipe.output.itemCode,
        quantity: recipe.output.quantity,
      },
    };
  }
}
