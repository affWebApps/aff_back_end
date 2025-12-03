import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BidStatus } from '@prisma/client';

class BidDecisionDto {
  @ApiProperty({ enum: [BidStatus.APPROVED, BidStatus.REJECTED] })
  @IsEnum(BidStatus)
  decision: BidStatus;
}

@ApiTags('Bids')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'bids', version: '1' })
export class BidsController {
  constructor(private readonly projectsService: ProjectsService) { }

  @Get(':bidId')
  @ApiOperation({ summary: 'Get a bid by id (project designer or bid owner)' })
  async getBid(@Param('bidId') bidId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.projectsService.getBidById(bidId, user.id);
  }

  @Patch(':bidId/decision')
  @ApiOperation({ summary: 'Decide on a bid (designer only) with APPROVED or REJECTED' })
  async decideBid(
    @Param('bidId') bidId: string,
    @Body() dto: BidDecisionDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.projectsService.decideBid(bidId, user.id, dto.decision);
  }

  @Delete(':bidId')
  @ApiOperation({ summary: 'Delete a bid (creator only)' })
  async deleteBid(@Param('bidId') bidId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.projectsService.deleteBid(bidId, user.id);
  }
}
