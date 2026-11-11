import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CombatController } from './combat.controller';
import { CombatService } from './combat.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CombatController],
  providers: [CombatService, JwtAuthGuard],
})
export class CombatModule {}
