import { RedisService } from '../redis/redis.service';

export const PRESENCE_KEY = 'sf:presence:online';

/**
 * Armazenamento da presença de jogadores. O conjunto guarda ids de usuário
 * únicos: várias abas do mesmo jogador contam como um único shinobi online.
 */
export interface PresenceStore {
  add(userId: string): Promise<void>;
  remove(userId: string): Promise<void>;
  count(): Promise<number>;
}

export class MemoryPresenceStore implements PresenceStore {
  private readonly users = new Set<string>();

  async add(userId: string): Promise<void> {
    this.users.add(userId);
  }

  async remove(userId: string): Promise<void> {
    this.users.delete(userId);
  }

  async count(): Promise<number> {
    return this.users.size;
  }
}

/**
 * Fonte compartilhada entre instâncias da API. Se o Redis cair durante a
 * operação, a escrita é ignorada e a contagem degrada para `0` em vez de
 * lançar erro — presença nunca deve impedir o jogador de entrar no mundo.
 */
export class RedisPresenceStore implements PresenceStore {
  constructor(
    private readonly redis: RedisService,
    private readonly key: string = PRESENCE_KEY,
  ) {}

  async add(userId: string): Promise<void> {
    await this.redis.withClient((client) => client.sadd(this.key, userId));
  }

  async remove(userId: string): Promise<void> {
    await this.redis.withClient((client) => client.srem(this.key, userId));
  }

  async count(): Promise<number> {
    const total = await this.redis.withClient((client) => client.scard(this.key));
    return total ?? 0;
  }
}
