import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { RealtimeModule } from './realtime/realtime.module';
import { CombatModule } from './combat/combat.module';
import { RosterModule } from './roster/roster.module';
import { TalentsModule } from './talents/talents.module';
@Module({
 imports: [
  ConfigModule.forRoot({
   isGlobal: true,
   envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
  }),
  PrismaModule,
  RedisModule,
  AuthModule,
  RealtimeModule,
  RosterModule,
  CombatModule,
  TalentsModule,
 ],
 controllers: [HealthController],
})
export class AppModule {}
