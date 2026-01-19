import { Controller, Get, Post, Patch, Body, UseGuards, Req, Delete, Param } from '@nestjs/common';
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
  @ApiOperation({ summary: 'List current user portfolios' })
  async getPortfolio(@Req() req: Request) {
    return this.portfoliosService.listByUser((req.user as any).id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new portfolio for current user' })
  async create(@Req() req: Request, @Body() dto: CreatePortfolioDto) {
    return this.portfoliosService.createForUser((req.user as any).id, dto);
  }

  @Patch(':portfolioId')
  @ApiOperation({ summary: 'Update a portfolio for current user' })
  async update(
    @Param('portfolioId') portfolioId: string,
    @Req() req: Request,
    @Body() dto: UpdatePortfolioDto,
  ) {
    return this.portfoliosService.updateForUser((req.user as any).id, portfolioId, dto);
  }

  @Delete(':portfolioId')
  @ApiOperation({ summary: 'Delete a portfolio for current user' })
  async delete(@Param('portfolioId') portfolioId: string, @Req() req: Request) {
    return this.portfoliosService.deleteForUser((req.user as any).id, portfolioId);
  }
}
