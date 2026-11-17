import { statsFor } from '../data/characters.js';
import { statusMeta } from '../data/statuses.js';
import { formationColumn } from './formation.js';

/**
 * Simula uma cadeia de formações sem alterar a batalha nem consumir RNG.
 * A ordem replica o motor: velocidade descendente, membros disponíveis uma vez
 * por rodada e profundidade máxima de três perseguições.
 */
export function simulateCombo(members = [], sourceId, starter = {}) {
  const source = members.find((member) => member.id === sourceId);
  const starterHits = Math.max(1, Number(starter.hits) || 1);
  const triggerType = starter.effect?.type ?? null;
  const sequence = [];
  const used = new Set(source ? [source.id] : []);

  const speedOf = (member) => {
    const stats = statsFor(member.character, member.level ?? 1);
    return stats.spd + (member.character.id === 'minato' ? 0.5 : 0);
  };

  function pursue(effectType, originId, depth = 1) {
    if (depth > 3 || !statusMeta(effectType).combo) return;
    const candidates = members
      .filter((member) => {
        const pursuit = member.character?.pursuit;
        return member.id !== originId && !used.has(member.id) && pursuit?.triggers?.includes(effectType);
      })
      .sort((a, b) => {
        const speed = speedOf(b) - speedOf(a);
        if (speed !== 0) return speed;
        const lane = formationColumn(b.position) - formationColumn(a.position);
        return lane !== 0 ? lane : a.position - b.position;
      });

    for (const member of candidates) {
      const pursuit = member.character.pursuit;
      used.add(member.id);
      sequence.push({
        id: member.id,
        name: member.character.name,
        ability: pursuit.name,
        hits: Math.max(1, Number(pursuit.hits) || 1),
        triggerType: effectType,
        depth,
      });
      if (pursuit.effect?.type && statusMeta(pursuit.effect.type).combo) {
        pursue(pursuit.effect.type, member.id, depth + 1);
      }
    }
  }

  if (source && triggerType) pursue(triggerType, source.id);
  const pursuitHits = sequence.reduce((total, step) => total + step.hits, 0);
  return {
    sourceName: source?.character?.name ?? 'Ninja selecionado',
    starterName: starter.name ?? 'Ação inicial',
    starterHits,
    triggerType,
    triggerLabel: triggerType ? statusMeta(triggerType).label : null,
    sequence,
    pursuitHits,
    totalHits: starterHits + pursuitHits,
  };
}
