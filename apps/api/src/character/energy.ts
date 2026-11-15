/**
 * Energia é o recurso que limita treinos e missões. Ela regenera de forma
 * preguiçosa (1 ponto por minuto) sempre que o personagem é lido, sem depender
 * de job ou cron: o intervalo é calculado a partir de `energyUpdatedAt`.
 */

export const MAX_ENERGY = 100;
export const ENERGY_REGEN_INTERVAL_MS = 60_000;

export type EnergyState = {
  energy: number;
  energyUpdatedAt: Date;
};

export type EnergyTick = {
  energy: number;
  energyUpdatedAt: Date;
  gained: number;
};

export function regenerateEnergy(
  energy: number,
  energyUpdatedAt: Date,
  now = new Date(),
): EnergyTick {
  const currentEnergy = Number.isFinite(energy) ? energy : MAX_ENERGY;
  const anchor = energyUpdatedAt instanceof Date ? energyUpdatedAt : new Date(energyUpdatedAt ?? now);

  if (currentEnergy >= MAX_ENERGY) {
    return { energy: currentEnergy, energyUpdatedAt: anchor, gained: 0 };
  }

  const elapsed = now.getTime() - anchor.getTime();
  if (elapsed < ENERGY_REGEN_INTERVAL_MS) {
    return { energy: currentEnergy, energyUpdatedAt: anchor, gained: 0 };
  }

  const gained = Math.floor(elapsed / ENERGY_REGEN_INTERVAL_MS);
  const next = Math.min(MAX_ENERGY, currentEnergy + gained);
  // Ao encher, o excedente é descartado; senão preserva a fração do minuto.
  const nextAnchor = next >= MAX_ENERGY
    ? now
    : new Date(anchor.getTime() + (next - currentEnergy) * ENERGY_REGEN_INTERVAL_MS);

  return { energy: next, energyUpdatedAt: nextAnchor, gained: next - currentEnergy };
}

type CharacterEnergyWriter<T> = {
  character: {
    update(args: {
      where: { id: string };
      data: { energy: number; energyUpdatedAt: Date };
    }): Promise<T>;
  };
};

/**
 * Aplica a regeneração pendente e devolve o personagem atualizado. Só escreve
 * no banco quando há ganho, para não transformar leitura em escrita à toa.
 */
export async function refreshEnergy<T extends EnergyState & { id: string }>(
  client: CharacterEnergyWriter<T>,
  character: T,
  now = new Date(),
): Promise<T> {
  const tick = regenerateEnergy(character.energy, character.energyUpdatedAt, now);
  if (tick.gained === 0) return character;
  return client.character.update({
    where: { id: character.id },
    data: { energy: tick.energy, energyUpdatedAt: tick.energyUpdatedAt },
  });
}
