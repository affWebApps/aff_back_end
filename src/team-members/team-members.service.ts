import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

@Injectable()
export class TeamMembersService {
  constructor(private readonly prisma: PrismaService) { }

  findAll(activeOnly = false) {
    return this.prisma.teamMember.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: [{ display_order: 'asc' }, { created_at: 'asc' }],
    });
  }

  async findOne(id: string) {
    const member = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!member) throw new NotFoundException(`Team member not found`);
    return member;
  }

  async create(dto: CreateTeamMemberDto) {
    try {
      return await this.prisma.teamMember.create({
        data: {
          name: dto.name,
          role: dto.role,
          bio: dto.bio,
          photo_url: dto.photoUrl,
          display_order: dto.displayOrder ?? 0,
          is_active: dto.isActive ?? true,
        },
      });
    } catch (error) {
      if ((error as any)?.code === 'P2002') {
        throw new ConflictException(`A team member named "${dto.name}" already exists`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateTeamMemberDto) {
    let member = await this.prisma.teamMember.findUnique({ where: { id } });

    if (!member && dto.name) {
      member = await this.prisma.teamMember.findFirst({ where: { name: dto.name } });
    }

    if (!member) throw new NotFoundException(`Team member not found`);

    return this.prisma.teamMember.update({
      where: { id: member.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.photoUrl !== undefined && { photo_url: dto.photoUrl }),
        ...(dto.displayOrder !== undefined && { display_order: dto.displayOrder }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.teamMember.delete({ where: { id } });
  }
}
