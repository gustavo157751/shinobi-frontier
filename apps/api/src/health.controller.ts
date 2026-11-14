import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Controller('health')
export class HealthController {
 constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

 @Get()
 async getHealth() {
  const redis = await this.redis.health();
  try {
   await this.prisma.$queryRaw`SELECT 1`;
   return {
    status: 'ok',
    database: 'connected',
    // Redis é auxiliar: indisponível degrada para memória local, não derruba o serviço.
    redis: redis.status,
    service: 'shinobi-frontier-api',
    timestamp: new Date().toISOString(),
   };
  } catch {
   throw new ServiceUnavailableException({ status: 'unavailable', database: 'disconnected', redis: redis.status });
  }
 }
}
