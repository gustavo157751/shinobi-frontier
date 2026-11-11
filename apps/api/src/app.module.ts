import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { RealtimeModule } from './realtime/realtime.module';
@Module({ imports:[ConfigModule.forRoot({isGlobal:true}),PrismaModule,AuthModule,RealtimeModule],controllers:[HealthController] })
export class AppModule {}
