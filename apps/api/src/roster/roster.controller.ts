import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrustedFrontendGuard } from '../auth/trusted-frontend.guard';
import { FormationDto, RecruitDto } from './roster.dto';
import { RosterService } from './roster.service';

@Controller('roster')
@UseGuards(TrustedFrontendGuard, JwtAuthGuard)
export class RosterController {
  constructor(private readonly roster: RosterService) {}

  @Get()
  overview(@Req() request: AuthenticatedRequest) {
    return this.roster.overview(request.user.sub);
  }

  @Get('catalog')
  catalog(@Req() request: AuthenticatedRequest) {
    return this.roster.catalog(request.user.sub);
  }

  @Post('recruit')
  recruit(@Req() request: AuthenticatedRequest, @Body() dto: RecruitDto) {
    return this.roster.recruit(request.user.sub, dto.ninjaCode);
  }

  @Put('formation')
  formation(@Req() request: AuthenticatedRequest, @Body() dto: FormationDto) {
    return this.roster.setFormation(request.user.sub, dto.slots);
  }
}
