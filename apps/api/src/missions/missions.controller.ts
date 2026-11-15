import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrustedFrontendGuard } from '../auth/trusted-frontend.guard';
import { AcceptMissionDto } from './missions.dto';
import { MissionsService } from './missions.service';

@Controller('missions')
@UseGuards(TrustedFrontendGuard, JwtAuthGuard)
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  @Get()
  overview(@Req() request: AuthenticatedRequest) {
    return this.missions.overview(request.user.sub);
  }

  @Post('accept')
  accept(@Req() request: AuthenticatedRequest, @Body() dto: AcceptMissionDto) {
    return this.missions.accept(request.user.sub, dto.missionCode);
  }
}
