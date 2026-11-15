import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrustedFrontendGuard } from '../auth/trusted-frontend.guard';
import { UseItemDto } from './inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(TrustedFrontendGuard, JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  overview(@Req() request: AuthenticatedRequest) {
    return this.inventory.overview(request.user.sub);
  }

  @Post('use')
  use(@Req() request: AuthenticatedRequest, @Body() dto: UseItemDto) {
    return this.inventory.use(request.user.sub, dto.itemCode);
  }
}
