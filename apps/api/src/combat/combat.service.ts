import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CombatAction = 'strike' | 'technique' | 'guard';
type BattleLog = { turn: number; text: string; side: 'player' | 'enemy' | 'system' };
type BattleState = {
  enemy: { code: string; name: string; level: number; hp: number; maxHp: number };
  player: { hp: number; maxHp: number; chakra: number; maxChakra: number };
  turn: number;
  logs: BattleLog[];
};

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
    return { battle: battle ? this.present(battle) : null };
  }

  async start(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const character = await tx.character.findFirst({ where: { userId } });
      if (!character) throw new NotFoundException('Personagem não encontrado.');

      const active = await tx.combatBattle.findFirst({
        where: { characterId: character.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      if (active) return { battle: this.present(active), character };
      if (character.energy < 10) throw new BadRequestException('Você precisa de 10 pontos de energia para iniciar um confronto.');

      const maxHp = character.vitality * 12;
      const maxChakra = 40 + character.intelligence * 8;
      const state: BattleState = {
        enemy: { code: 'VEIL_SCOUT', name: 'Batedor do Véu', level: character.level, hp: 90 + character.level * 22, maxHp: 90 + character.level * 22 },
        player: { hp: maxHp, maxHp, chakra: maxChakra, maxChakra },
        turn: 1,
        logs: [{ turn: 1, text: 'Um Batedor do Véu bloqueia a trilha da serra.', side: 'system' }],
      };
      const updatedCharacter = await tx.character.update({ where: { id: character.id }, data: { energy: { decrement: 10 } } });
      const battle = await tx.combatBattle.create({
        data: { characterId: character.id, status: 'ACTIVE', state: state as unknown as Prisma.InputJsonValue },
      });
      return { battle: this.present(battle), character: updatedCharacter };
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
      const turn = state.turn;
      let actionText: string;
      if (action === 'technique') {
        if (state.player.chakra < 25) throw new BadRequestException('Você precisa de 25 pontos de chakra para usar a técnica.');
        state.player.chakra -= 25;
        const damage = 22 + character.intelligence * 2 + character.level * 3;
        state.enemy.hp = Math.max(0, state.enemy.hp - damage);
        actionText = 'Você libera uma técnica original e causa ' + damage + ' de dano.';
      } else if (action === 'guard') {
        state.player.chakra = Math.min(state.player.maxChakra, state.player.chakra + 12);
        actionText = 'Você firma a guarda e recupera 12 pontos de chakra.';
      } else {
        const damage = 12 + character.strength * 2 + character.level * 2;
        state.enemy.hp = Math.max(0, state.enemy.hp - damage);
        state.player.chakra = Math.min(state.player.maxChakra, state.player.chakra + 5);
        actionText = 'Seu golpe certeiro causa ' + damage + ' de dano.';
      }
      state.logs.push({ turn, text: actionText, side: 'player' });

      let status = 'ACTIVE';
      let reward: { experience: number; gold: number } | null = null;
      let updatedCharacter = character;
      if (state.enemy.hp <= 0) {
        status = 'VICTORY';
        reward = { experience: 70 + character.level * 20, gold: 25 + character.level * 8 };
        let level = character.level;
        const experience = character.experience + reward.experience;
        let strength = character.strength;
        let vitality = character.vitality;
        let agility = character.agility;
        let intelligence = character.intelligence;
        while (experience >= level * 100) {
          level += 1;
          strength += 2;
          vitality += 2;
          agility += 1;
          intelligence += 1;
        }
        state.logs.push({ turn, text: 'Vitória! Você recebeu ' + reward.experience + ' de experiência e ' + reward.gold + ' ryō.', side: 'system' });
        updatedCharacter = await tx.character.update({
          where: { id: character.id },
          data: { experience, gold: { increment: reward.gold }, level, strength, vitality, agility, intelligence },
        });
      } else {
        const incoming = 8 + state.enemy.level * 3 + Math.floor(turn / 2);
        const damage = action === 'guard' ? Math.max(1, Math.floor(incoming * 0.4)) : incoming;
        state.player.hp = Math.max(0, state.player.hp - damage);
        state.logs.push({ turn, text: state.enemy.name + ' contra-ataca e causa ' + damage + ' de dano.', side: 'enemy' });
        state.turn += 1;
        if (state.player.hp <= 0) {
          status = 'DEFEAT';
          state.logs.push({ turn, text: 'Você recua para se recuperar. O confronto terminou.', side: 'system' });
        }
      }

      state.logs = state.logs.slice(-12);
      const saved = await tx.combatBattle.update({
        where: { id: battle.id },
        data: { status, state: state as unknown as Prisma.InputJsonValue },
      });
      return { battle: this.present(saved), character: updatedCharacter, reward };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private present(battle: { id: string; status: string; state: Prisma.JsonValue; createdAt: Date; updatedAt: Date }) {
    return { id: battle.id, status: battle.status, state: battle.state, createdAt: battle.createdAt, updatedAt: battle.updatedAt };
  }
}
