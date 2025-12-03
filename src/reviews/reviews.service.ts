import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReviews(targetType: string, targetId: string) {
    const where: Record<string, unknown> = {};
    if (targetType === 'user') {
      where.target_user_id = targetId;
    } else if (targetType === 'project') {
      where.target_project_id = targetId;
    } else if (targetType === 'product') {
      where.target_product_id = targetId;
    } else {
      throw new NotFoundException('Invalid target type');
    }
    where.target_type = targetType;

    return this.prisma.review.findMany({
      where,
      select: {
        id: true,
        rating: true,
        comment: true,
        reviewer_id: true,
        target_user_id: true,
        target_project_id: true,
        target_product_id: true,
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
    const data: any = {
      reviewer_id: reviewerId,
      target_type: dto.targetType,
      rating: dto.rating,
      comment: dto.comment,
    };

    if (dto.targetType === 'user') {
      data.target_user_id = dto.targetId;
    } else if (dto.targetType === 'project') {
      data.target_project_id = dto.targetId;
    } else if (dto.targetType === 'product') {
      data.target_product_id = dto.targetId;
    } else {
      throw new NotFoundException('Invalid target type');
    }

    return this.prisma.review.create({ data });
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
