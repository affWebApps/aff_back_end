import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReviews(targetType: string, targetId: string) {
    return this.prisma.review.findMany({
      where: { target_id: targetId, target_type: targetType },
      select: {
        id: true,
        rating: true,
        comment: true,
        reviewer_id: true,
        target_id: true,
        target_type: true,
        reviewer: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    });
  }

  async createReview(reviewerId: string, dto: CreateReviewDto) {
    return this.prisma.review.create({
      data: {
        reviewer_id: reviewerId,
        target_id: dto.targetId,
        target_type: dto.targetType,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  async deleteReview(reviewId: string, reviewerId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.reviewer_id !== reviewerId) {
      throw new UnauthorizedException('You can only delete your own review');
    }
    await this.prisma.review.delete({ where: { id: reviewId } });
    return { status: 'deleted' };
  }
}
