import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CombatActionDto } from './combat.dto';
import { CombatService } from './combat.service';
import { AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard';

@Controller('combat')
@UseGuards(JwtAuthGuard)
export class CombatController {
  constructor(private readonly combat: CombatService) {}

  @Get('current')
  current(@Req() request: AuthenticatedRequest) {
    return this.combat.current(request.user.sub);
  }

  @Post('start')
  start(@Req() request: AuthenticatedRequest) {
    return this.combat.start(request.user.sub);
  }

  @Post('action')
  act(@Req() request: AuthenticatedRequest, @Body() dto: CombatActionDto) {
    return this.combat.act(request.user.sub, dto.action);
  }
}
