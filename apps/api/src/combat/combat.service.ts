import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { refreshEnergy } from '../character/energy';
import { applyExperience } from '../character/progression';
import { completeMission, describeRewards, failMission, MissionCharacter } from '../missions/mission-rewards';
import { PrismaService } from '../prisma/prisma.service';
import { loadFormationBonus } from '../roster/team-bonus';
import { talentBonuses, mergeBonuses } from '../talents/talent-bonus';
import { BattleState, buildBattleState, NO_TEAM, presentBattle } from './battle-state';

type CombatAction = 'strike' | 'technique' | 'guard';

type CombatReward = {
  experience: number;
  gold: number;
  items: Array<{ code: string; name: string; quantity: number }>;
};

export { describeTeam } from './battle-state';

@Injectable()
export class CombatService {
  constructor(private readonly prisma: PrismaService) {}

  async current(userId: string) {
    const character = await this.prisma.character.findFirst({ where: { userId }, select: { id: true } });
    if (!character) throw new NotFoundException('Personagem não encontrado.');
    const battle = await this.prisma.combatBattle.findFirst({
      where: { characterId: character.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    return { battle: battle ? presentBattle(battle) : null };
  }

  async start(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.character.findFirst({ where: { userId } });
      if (!found) throw new NotFoundException('Personagem não encontrado.');

      const active = await tx.combatBattle.findFirst({
        where: { characterId: found.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      if (active) return { battle: presentBattle(active), character: found };

      const character = await refreshEnergy(tx, found);
      if (character.energy < 10) throw new BadRequestException('Você precisa de 10 pontos de energia para iniciar um confronto.');

      const formation = await loadFormationBonus(tx, character.id);
      const learnedTalents = await tx.characterTalent.findMany({ where: { characterId: character.id } });
      const team = mergeBonuses(formation, talentBonuses(learnedTalents.map((row) => row.talentCode)));
      const state = buildBattleState({
        character,
        team,
        encounter: {
          code: 'VEIL_SCOUT',
          name: 'Batedor do Véu',
          level: character.level,
          maxHp: 90 + character.level * 22,
          attack: 8 + character.level * 3,
        },
        intro: 'Um Batedor do Véu bloqueia a trilha da serra.',
      });

      const updatedCharacter = await tx.character.update({
        where: { id: character.id },
        data: { energy: { decrement: 10 }, energyUpdatedAt: new Date() },
      });
      const battle = await tx.combatBattle.create({
        data: { characterId: character.id, status: 'ACTIVE', state: state as unknown as Prisma.InputJsonValue },
      });
      return { battle: presentBattle(battle), character: updatedCharacter };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async act(userId: string, action: CombatAction) {
    return this.prisma.$transaction(async (tx) => {
      const character = await tx.character.findFirst({ where: { userId } });
      if (!character) throw new NotFoundException('Personagem não encontrado.');
      const battle = await tx.combatBattle.findFirst({
        where: { characterId: character.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      if (!battle) throw new NotFoundException('Não há confronto ativo.');

      const state = battle.state as unknown as BattleState;
      // Confrontos antigos não têm `team`: o bônus fica zerado em vez de quebrar.
      const team = state.team ?? NO_TEAM;
      const turn = state.turn;
      let actionText: string;
      if (action === 'technique') {
        if (state.player.chakra < 25) throw new BadRequestException('Você precisa de 25 pontos de chakra para usar a técnica.');
        state.player.chakra -= 25;
        const damage = 22 + character.intelligence * 2 + character.level * 3 + team.techniqueBonus;
        state.enemy.hp = Math.max(0, state.enemy.hp - damage);
        actionText = 'Você libera uma técnica original e causa ' + damage + ' de dano.';
      } else if (action === 'guard') {
        const recovered = 12 + team.guardChakra;
        state.player.chakra = Math.min(state.player.maxChakra, state.player.chakra + recovered);
        actionText = 'Você firma a guarda e recupera ' + recovered + ' pontos de chakra.';
      } else {
        const damage = 12 + character.strength * 2 + character.level * 2 + team.damageBonus;
        state.enemy.hp = Math.max(0, state.enemy.hp - damage);
        state.player.chakra = Math.min(state.player.maxChakra, state.player.chakra + 5);
        actionText = 'Seu golpe certeiro causa ' + damage + ' de dano.';
      }
      state.logs.push({ turn, text: actionText, side: 'player' });

      let status = 'ACTIVE';
      let reward: CombatReward | null = null;
      let updatedCharacter: typeof character | MissionCharacter = character;
      if (state.enemy.hp <= 0) {
        status = 'VICTORY';
        if (state.mission) {
          // Missão: a recompensa vem do catálogo, nunca do treino padrão.
          const completion = await completeMission(tx, character, state.mission.code);
          if (completion) {
            reward = completion.rewards;
            updatedCharacter = completion.character;
            state.logs.push({ turn, text: describeRewards(completion), side: 'system' });
          } else {
            state.logs.push({
              turn,
              text: 'Esta missão já havia sido concluída; nenhuma recompensa adicional foi creditada.',
              side: 'system',
            });
          }
        } else {
          const training = { experience: 70 + character.level * 20, gold: 25 + character.level * 8 };
          const progression = applyExperience(character, training.experience);
          reward = { ...training, items: [] };
          state.logs.push({
            turn,
            text: 'Vitória! Você recebeu ' + training.experience + ' de experiência e ' + training.gold + ' ryō.',
            side: 'system',
          });
          updatedCharacter = await tx.character.update({
            where: { id: character.id },
            data: { ...progression, gold: { increment: training.gold } },
          });
        }
      } else {
        const incoming = (state.enemy.attack ?? 8 + state.enemy.level * 3) + Math.floor(turn / 2);
        const mitigated = Math.max(1, Math.round(incoming * (1 - team.damageReduction)));
        const damage = action === 'guard' ? Math.max(1, Math.floor(mitigated * 0.4)) : mitigated;
        state.player.hp = Math.max(0, state.player.hp - damage);
        state.logs.push({ turn, text: state.enemy.name + ' contra-ataca e causa ' + damage + ' de dano.', side: 'enemy' });
        state.turn += 1;
        if (state.player.hp <= 0) {
          status = 'DEFEAT';
          if (state.mission) {
            await failMission(tx, character.id, state.mission.code);
            state.logs.push({
              turn,
              text: 'Você recua. A missão continua disponível para uma nova tentativa.',
              side: 'system',
            });
          } else {
            state.logs.push({ turn, text: 'Você recua para se recuperar. O confronto terminou.', side: 'system' });
          }
        }
      }

      state.logs = state.logs.slice(-12);
      const saved = await tx.combatBattle.update({
        where: { id: battle.id },
        data: { status, state: state as unknown as Prisma.InputJsonValue },
      });
      return { battle: presentBattle(saved), character: updatedCharacter, reward };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
