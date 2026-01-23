import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VendureService } from './vendure.service';

@ApiTags('Vendure')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'vendure', version: '1' })
export class VendureController {
  constructor(private readonly vendureService: VendureService) {}

  @Get('provision')
  @ApiOperation({ summary: 'Ensure Vendure customer/vendor IDs exist for current user' })
  async provision(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.vendureService.ensureVendureIdentities(user.id);
  }
}
