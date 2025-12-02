import { Body, Controller, Delete, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Request } from 'express';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get(':targetType/:targetId')
  @ApiOperation({ summary: 'Get reviews for a target (user/project/product)' })
  async getReviews(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ) {
    return this.reviewsService.getReviews(targetType, targetId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a review (user or project)' })
  async createReview(@Req() req: Request, @Body() dto: CreateReviewDto) {
    const reviewer = req.user as { id: string };
    return this.reviewsService.createReview(reviewer.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a review by id (only author can delete)' })
  async deleteReview(@Req() req: Request, @Param('id') id: string) {
    const reviewer = req.user as { id: string };
    return this.reviewsService.deleteReview(id, reviewer.id);
  }
}
