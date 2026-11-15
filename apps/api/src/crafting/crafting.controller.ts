import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrustedFrontendGuard } from '../auth/trusted-frontend.guard';
import { CraftDto } from './crafting.dto';
import { CraftingService } from './crafting.service';

@Controller('crafting')
@UseGuards(TrustedFrontendGuard, JwtAuthGuard)
export class CraftingController {
  constructor(private readonly crafting: CraftingService) {}

  @Get()
  overview(@Req() request: AuthenticatedRequest) {
    return this.crafting.overview(request.user.sub);
  }

  @Post('craft')
  craft(@Req() request: AuthenticatedRequest, @Body() dto: CraftDto) {
    return this.crafting.craft(request.user.sub, dto.recipeCode);
  }
}
