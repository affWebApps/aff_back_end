import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

@Injectable()
export class PortfoliosService {
  constructor(private readonly prisma: PrismaService) { }

  async listByUser(userId: string) {
    return this.prisma.portfolio.findMany({
      where: { user_id: userId },
      include: { Image: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async getByIdForUser(userId: string, portfolioId: string) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, user_id: userId },
      include: { Image: true },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');
    return portfolio;
  }

  async createForUser(userId: string, dto: CreatePortfolioDto) {
    const images = this.normalizeImages(dto.images);

    return this.prisma.portfolio.create({
      data: {
        user_id: userId,
        title: dto.title,
        description: dto.description,
        Image: images.length
          ? {
            createMany: {
              data: images.map((img) => ({
                image_url: img.imageUrl,
                is_primary: img.isPrimary ?? false,
              })),
            },
          }
          : undefined,
      },
      include: { Image: true },
    });
  }

  async updateForUser(userId: string, portfolioId: string, dto: UpdatePortfolioDto | CreatePortfolioDto) {
    const existing = await this.prisma.portfolio.findFirst({ where: { id: portfolioId, user_id: userId } });
    if (!existing) {
      throw new NotFoundException('Portfolio not found');
    }

    const images = this.normalizeImages(dto.images);

    return this.prisma.portfolio.update({
      where: { id: existing.id },
      data: {
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        Image: images.length
          ? {
            deleteMany: { portfolio_id: existing.id },
            createMany: {
              data: images.map((img) => ({
                image_url: img.imageUrl,
                is_primary: img.isPrimary ?? false,
              })),
            },
          }
          : undefined,
      },
      include: { Image: true },
    });
  }

  private normalizeImages(
    images: { imageUrl: string; isPrimary?: boolean }[] | undefined,
  ) {
    if (!images || images.length === 0) {
      return [];
    }
    const anyPrimary = images.some((img) => img.isPrimary);
    if (!anyPrimary) {
      images[0].isPrimary = true;
    }
    return images;
  }

  async deletePortfolioForUser(userId: string, portfolioId: string) {
    const existing = await this.prisma.portfolio.findFirst({ where: { id: portfolioId, user_id: userId } });
    if (!existing) {
      throw new NotFoundException('Portfolio not found');
    }
    await this.prisma.portfolioImage.deleteMany({ where: { portfolio_id: existing.id } });
    await this.prisma.portfolio.delete({ where: { id: existing.id } });
    return { status: 'deleted' };
  }
}
