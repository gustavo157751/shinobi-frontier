import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { RealtimeModule } from './realtime/realtime.module';
import { CombatModule } from './combat/combat.module';
@Module({
 imports: [
  ConfigModule.forRoot({
   isGlobal: true,
   envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
  }),
  PrismaModule,
  AuthModule,
  RealtimeModule,
  CombatModule,
 ],
 controllers: [HealthController],
})
export class AppModule {}
