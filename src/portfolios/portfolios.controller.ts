import { Controller, Get, Post, Patch, Body, UseGuards, Req, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { PortfoliosService } from './portfolios.service';

@ApiTags('Portfolio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'portfolio', version: '1' })
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) { }

  @Get()
  @ApiOperation({ summary: 'Get current user portfolio (one per user)' })
  async getPortfolio(@Req() req: Request) {
    return this.portfoliosService.findByUser((req.user as any).id);
  }

  @Post()
  @ApiOperation({ summary: 'Create or overwrite current user portfolio (one per user)' })
  async createOrOverwrite(@Req() req: Request, @Body() dto: CreatePortfolioDto) {
    return this.portfoliosService.upsertForUser((req.user as any).id, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete current user portfolio' })
  async delete(@Req() req: Request) {
    return this.portfoliosService.deleteForUser((req.user as any).id);
  }
}
