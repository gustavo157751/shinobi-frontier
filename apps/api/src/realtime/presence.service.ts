import { Injectable } from '@nestjs/common';
import { MemoryPresenceStore, PresenceStore, RedisPresenceStore } from './presence.store';
import { RedisService } from '../redis/redis.service';

export type PresenceSnapshot = {
  online: number;
  store: 'redis' | 'memory';
  updatedAt: string;
};

/**
 * Mantém a contagem de shinobis online. Cada conexão Socket.IO é registrada
 * individualmente para que abas duplicadas não inflem o contador e para que o
 * jogador só saia do mundo quando a última aba for fechada.
 *
 * A contagem é "melhor esforço": se o Redis ficar indisponível no meio da
 * sessão, a fonte passa a ser a memória local desta instância.
 */
@Injectable()
export class PresenceService {
  private readonly connections = new Map<string, Set<string>>();
  private readonly memoryStore = new MemoryPresenceStore();
  private readonly redisStore: RedisPresenceStore;

  constructor(private readonly redis: RedisService) {
    this.redisStore = new RedisPresenceStore(redis);
  }

  async join(userId: string, connectionId: string): Promise<PresenceSnapshot> {
    const sessions = this.connections.get(userId) ?? new Set<string>();
    const wasOffline = sessions.size === 0;
    sessions.add(connectionId);
    this.connections.set(userId, sessions);
    if (wasOffline) await this.activeStore().add(userId);
    return this.snapshot();
  }

  async leave(userId: string, connectionId: string): Promise<PresenceSnapshot> {
    const sessions = this.connections.get(userId);
    if (!sessions) return this.snapshot();
    sessions.delete(connectionId);
    if (sessions.size === 0) {
      this.connections.delete(userId);
      // Remove das duas fontes: a ativa pode ter mudado durante a sessão.
      await Promise.all([this.redisStore.remove(userId), this.memoryStore.remove(userId)]);
    }
    return this.snapshot();
  }

  async snapshot(): Promise<PresenceSnapshot> {
    return {
      online: await this.activeStore().count(),
      store: this.redis.isAvailable() ? 'redis' : 'memory',
      updatedAt: new Date().toISOString(),
    };
  }

  /** Jogadores online nesta instância, independente da fonte compartilhada. */
  localPlayers(): number {
    return this.connections.size;
  }

  private activeStore(): PresenceStore {
    return this.redis.isAvailable() ? this.redisStore : this.memoryStore;
  }
}
