import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrustedFrontendGuard } from '../auth/trusted-frontend.guard';
import { LearnTalentDto } from './talents.dto';
import { TalentsService } from './talents.service';

@Controller('talents')
@UseGuards(TrustedFrontendGuard, JwtAuthGuard)
export class TalentsController {
  constructor(private readonly talents: TalentsService) {}

  @Get()
  overview(@Req() request: AuthenticatedRequest) {
    return this.talents.overview(request.user.sub);
  }

  @Post('learn')
  learn(@Req() request: AuthenticatedRequest, @Body() dto: LearnTalentDto) {
    return this.talents.learn(request.user.sub, dto.talentCode);
  }
}
