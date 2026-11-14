import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

export type RedisStatus = 'connected' | 'disabled' | 'unavailable';

const MAX_CONNECT_ATTEMPTS = 3;

/**
 * Conexão Redis opcional. Redis é infraestrutura auxiliar (presença, cache e
 * filas): se `REDIS_URL` não estiver definida ou o servidor estiver fora do ar,
 * a API continua funcionando com os recursos locais em memória.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private status: RedisStatus = 'disabled';
  private lastError: string | null = null;

  async onModuleInit() {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      this.status = 'disabled';
      this.logger.log('REDIS_URL não definida; recursos compartilhados usam memória local.');
      return;
    }

    const client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: (attempt) => (attempt > MAX_CONNECT_ATTEMPTS ? null : attempt * 250),
    });
    client.on('error', (error: Error) => {
      this.lastError = error.message;
    });
    client.on('end', () => {
      if (this.status === 'connected') this.status = 'unavailable';
    });
    this.client = client;

    try {
      await client.connect();
      await client.ping();
      this.status = 'connected';
      this.logger.log('Conexão Redis estabelecida.');
    } catch (error) {
      this.status = 'unavailable';
      this.lastError = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Redis indisponível (${this.lastError}); seguindo com memória local.`);
    }
  }

  async onModuleDestroy() {
    if (!this.client) return;
    this.client.removeAllListeners();
    this.client.disconnect();
    this.client = null;
    this.status = 'disabled';
  }

  isAvailable(): boolean {
    return this.status === 'connected' && this.client !== null;
  }

  getStatus(): RedisStatus {
    return this.status;
  }

  /**
   * Executa uma operação apenas quando o Redis está disponível. Falhas de rede
   * degradam a conexão em vez de derrubar a requisição que a originou.
   */
  async withClient<T>(operation: (client: Redis) => Promise<T>): Promise<T | null> {
    if (!this.client || this.status !== 'connected') return null;
    try {
      return await operation(this.client);
    } catch (error) {
      this.status = 'unavailable';
      this.lastError = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao operar no Redis (${this.lastError}); degradando para memória local.`);
      return null;
    }
  }

  async health(): Promise<{ status: RedisStatus; error?: string }> {
    if (!this.client || this.status === 'disabled') return { status: 'disabled' };
    const pong = await this.withClient((client) => client.ping());
    if (pong === 'PONG') return { status: 'connected' };
    return { status: 'unavailable', ...(this.lastError ? { error: this.lastError } : {}) };
  }
}
