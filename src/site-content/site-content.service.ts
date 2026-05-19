import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteContentDto } from './dto/create-site-content.dto';
import { UpdateSiteContentDto } from './dto/update-site-content.dto';

@Injectable()
export class SiteContentService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(activeOnly = false) {
    return this.prisma.siteContent.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: { key: 'asc' },
    });
  }

  async findByKey(key: string) {
    const content = await this.prisma.siteContent.findUnique({ where: { key } });
    if (!content) throw new NotFoundException(`Site content "${key}" not found`);
    return content;
  }

  create(dto: CreateSiteContentDto) {
    return this.prisma.siteContent.create({
      data: {
        key: dto.key,
        title: dto.title,
        body: dto.body,
        image_url: dto.imageUrl,
        is_active: dto.isActive ?? true,
      },
    });
  }

  async update(key: string, dto: UpdateSiteContentDto) {
    await this.findByKey(key);
    return this.prisma.siteContent.update({
      where: { key },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.imageUrl !== undefined && { image_url: dto.imageUrl }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
      },
    });
  }

  async delete(key: string) {
    await this.findByKey(key);
    return this.prisma.siteContent.delete({ where: { key } });
  }
}
