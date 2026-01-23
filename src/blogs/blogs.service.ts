import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogDto, BLOG_STATUS } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@Injectable()
export class BlogsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeImages(images: { imageUrl: string; isPrimary?: boolean }[] | undefined) {
    if (!images || images.length === 0) return [];
    const hasPrimary = images.some((img) => img.isPrimary);
    if (!hasPrimary) {
      images[0].isPrimary = true;
    }
    return images;
  }

  async create(dto: CreateBlogDto, adminId?: string) {
    const images = this.normalizeImages(dto.images);
    return this.prisma.blog.create({
      data: {
        title: dto.title,
        content: dto.content,
        scheduled_for: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        status: dto.status ?? 'draft',
        images: images.length
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
      include: { images: true },
    });
  }

  async findAll() {
    return this.prisma.blog.findMany({
      orderBy: { created_at: 'desc' },
      include: { images: true },
    });
  }

  async findAllPublished() {
    return this.prisma.blog.findMany({
      where: { status: 'published' },
      orderBy: { created_at: 'desc' },
      include: { images: true },
    });
  }

  async findOne(id: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    return blog;
  }

  async findOnePublished(id: string) {
    const blog = await this.prisma.blog.findFirst({
      where: { id, status: 'published' },
      include: { images: true },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    return blog;
  }

  async update(id: string, dto: UpdateBlogDto) {
    const existing = await this.prisma.blog.findUnique({ where: { id }, include: { images: true } });
    if (!existing) throw new NotFoundException('Blog not found');

    if (dto.status && !BLOG_STATUS.includes(dto.status as any)) {
      throw new UnauthorizedException('Invalid status');
    }

    const images = this.normalizeImages(dto.images);

    return this.prisma.blog.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        content: dto.content ?? existing.content,
        scheduled_for: dto.scheduledFor ? new Date(dto.scheduledFor) : existing.scheduled_for,
        status: dto.status ?? existing.status,
        images:
          images.length > 0
            ? {
                deleteMany: { blog_id: existing.id },
                createMany: {
                  data: images.map((img) => ({
                    image_url: img.imageUrl,
                    is_primary: img.isPrimary ?? false,
                  })),
                },
              }
            : undefined,
      },
      include: { images: true },
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.blog.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Blog not found');
    await this.prisma.blogImage.deleteMany({ where: { blog_id: id } });
    await this.prisma.blog.delete({ where: { id } });
    return { status: 'deleted' };
  }
}
