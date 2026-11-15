import { formationBonuses, FormationBonus, FormationMember } from './formation';
import { NinjaRole } from './ninja-catalogue';

type RosterQuery = {
  characterNinja: {
    findMany(args: {
      where: { characterId: string };
      include: { ninja: true };
    }): Promise<
      Array<{
        position: number | null;
        level: number;
        stars: number;
        ninja: { code: string; role: string; rarity: number };
      }>
    >;
  };
};

/**
 * Lê a formação posicionada do personagem e devolve o bônus do esquadrão.
 * Compartilhado pelo treino e pelas missões para que os dois usem exatamente a
 * mesma regra.
 */
export async function loadFormationBonus(
  client: RosterQuery,
  characterId: string,
): Promise<FormationBonus> {
  const roster = await client.characterNinja.findMany({
    where: { characterId },
    include: { ninja: true },
  });

  return formationBonuses(
    roster.map(
      (entry): FormationMember => ({
        code: entry.ninja.code,
        role: entry.ninja.role as NinjaRole,
        rarity: entry.ninja.rarity,
        level: entry.level,
        stars: entry.stars,
        position: entry.position,
      }),
    ),
  );
}
