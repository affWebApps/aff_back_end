import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BidStatus, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, STATUS_OPTIONS } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateProjectRequirementDto } from './dto/create-project-requirement.dto';
import { UpdateProjectRequirementDto } from './dto/update-project-requirement.dto';
import { CreateBidDto } from './dto/create-bid.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(designerId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        title: dto.title,
        description: dto.description,
        budget: dto.budget ? dto.budget : undefined,
        estimated_time: dto.estimatedTime,
        status: (dto.status as ProjectStatus) ?? ProjectStatus.OPEN,
        designer: { connect: { id: designerId } },
        design: dto.designId ? { connect: { id: dto.designId } } : undefined,
        files: dto.files && dto.files.length
          ? {
            createMany: {
              data: dto.files.map((f) => ({
                file_url: f.fileUrl,
                file_type: f.fileType,
                uploaded_by: designerId,
              })),
            },
          }
          : undefined,
      },
      include: {
        files: true,
      },
    });
  }

  async findById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        files: true,
        requirements: true
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const reviews = await this.prisma.review.findMany({
      where: { target_project_id: id, target_type: 'project' },
    });
    return { ...project, reviews };
  }

  async update(id: string, designerId: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.designer_id !== designerId) {
      throw new UnauthorizedException('Only the owner can update this project');
    }
    if (dto.status && !STATUS_OPTIONS.includes(dto.status as any)) {
      throw new NotFoundException('Invalid status');
    }
    return this.prisma.project.update({
      where: { id },
      data: {
        title: dto.title ?? project.title,
        description: dto.description ?? project.description,
        budget: dto.budget ?? project.budget,
        estimated_time: dto.estimatedTime ?? project.estimated_time,
        status: (dto.status as ProjectStatus) ?? project.status,
        files:
          dto.files && dto.files.length
            ? {
              createMany: {
                data: dto.files.map((f) => ({
                  file_url: f.fileUrl,
                  file_type: f.fileType,
                  uploaded_by: designerId,
                })),
              },
            }
            : undefined,
      },
      include: { files: true },
    });
  }

  async deleteFile(projectId: string, fileId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.designer_id !== userId) {
      throw new UnauthorizedException('Only the owner can delete files');
    }
    const file = await this.prisma.projectFile.findUnique({ where: { id: fileId } });
    if (!file || file.project_id !== projectId) {
      throw new NotFoundException('File not found');
    }
    await this.prisma.projectFile.delete({ where: { id: fileId } });
    return { status: 'deleted' };
  }

  async delete(id: string, designerId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.designer_id !== designerId) {
      throw new UnauthorizedException('Only the owner can delete this project');
    }
    // Remove related files then project
    await this.prisma.projectFile.deleteMany({ where: { project_id: id } });
    await this.prisma.project.delete({ where: { id } });
    return { status: 'deleted' };
  }

  async close(id: string, designerId: string, status: ProjectStatus) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.designer_id !== designerId) {
      throw new UnauthorizedException('Only the owner can close this project');
    }
    if (status !== ProjectStatus.COMPLETED && status !== ProjectStatus.CLOSED) {
      throw new NotFoundException('Invalid status');
    }
    return this.prisma.project.update({
      where: { id },
      data: { status },
      include: { files: true },
    });
  }

  async listRequirements(projectId: string) {
    return this.prisma.projectRequirement.findMany({
      where: { project_id: projectId },
    });
  }

  async createBid(projectId: string, tailorId: string, dto: CreateBidDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const existingBid = await this.prisma.bid.findFirst({
      where: { project_id: projectId, tailor_id: tailorId },
    });
    if (existingBid) {
      throw new UnauthorizedException('You have already submitted a bid for this project');
    }

    return this.prisma.bid.create({
      data: {
        project_id: projectId,
        tailor_id: tailorId,
        amount: dto.amount,
        duration: dto.duration,
        message: dto.message,
        status: BidStatus.PENDING,
      },
    });
  }

  async listBids(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.designer_id !== userId) {
      throw new UnauthorizedException('Only the project owner can view bids');
    }

    return this.prisma.bid.findMany({
      where: { project_id: projectId },
      include: {
        project: { select: { id: true, title: true, designer_id: true } },
      },
    });
  }

  async acceptBid(bidId: string, userId: string) {
    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      include: { project: true },
    });
    if (!bid) throw new NotFoundException('Bid not found');
    if (bid.project.designer_id !== userId) {
      throw new UnauthorizedException('Only the project designer can accept bids');
    }
    return this.prisma.bid.update({
      where: { id: bidId },
      data: { status: BidStatus.APPROVED },
    });
  }

  async decideBid(bidId: string, userId: string, decision: BidStatus) {
    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      include: { project: true },
    });
    if (!bid) throw new NotFoundException('Bid not found');
    if (bid.project.designer_id !== userId) {
      throw new UnauthorizedException('Only the project designer can decide on bids');
    }
    if (bid.status === BidStatus.APPROVED || bid.status === BidStatus.REJECTED) {
      throw new UnauthorizedException('Bid decision is already final');
    }
    if (decision !== BidStatus.APPROVED && decision !== BidStatus.REJECTED) {
      throw new UnauthorizedException('Invalid decision');
    }
    return this.prisma.bid.update({
      where: { id: bidId },
      data: { status: decision },
    });
  }

  async deleteBid(bidId: string, userId: string) {
    const bid = await this.prisma.bid.findUnique({ where: { id: bidId } });
    if (!bid) throw new NotFoundException('Bid not found');
    if (bid.tailor_id !== userId) {
      throw new UnauthorizedException('You can only delete your own bid');
    }
    await this.prisma.bid.delete({ where: { id: bidId } });
    return { status: 'deleted' };
  }

  async getBidById(bidId: string, userId: string) {
    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      include: {
        project: { select: { id: true, title: true, designer_id: true } },
      },
    });
    if (!bid) throw new NotFoundException('Bid not found');

    const isOwner = bid.tailor_id === userId;
    const isProjectDesigner = bid.project.designer_id === userId;

    if (!isOwner && !isProjectDesigner) {
      throw new UnauthorizedException('You are not allowed to view this bid');
    }

    return bid;
  }

  async createRequirement(projectId: string, userId: string, dto: CreateProjectRequirementDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.designer_id !== userId) {
      throw new UnauthorizedException('Only the owner can create requirements');
    }
    if (project.status !== ProjectStatus.OPEN) {
      throw new UnauthorizedException('Project requirements can only be added while status is OPEN');
    }
    return this.prisma.projectRequirement.create({
      data: {
        project_id: projectId,
        content: dto.content,
        designer_approved: dto.designerApproved ?? false,
        tailor_approved: dto.tailorApproved ?? false,
      },
    });
  }

  async updateRequirement(
    projectId: string,
    requirementId: string,
    userId: string,
    dto: UpdateProjectRequirementDto,
  ) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.designer_id !== userId) {
      throw new UnauthorizedException('Only the owner can update requirements');
    }
    if (project.status !== ProjectStatus.OPEN) {
      throw new UnauthorizedException('Project requirements can only be updated while status is OPEN');
    }
    const requirement = await this.prisma.projectRequirement.findUnique({ where: { id: requirementId } });
    if (!requirement || requirement.project_id !== projectId) {
      throw new NotFoundException('Requirement not found');
    }
    return this.prisma.projectRequirement.update({
      where: { id: requirementId },
      data: {
        content: dto.content ?? requirement.content,
        designer_approved: dto.designerApproved ?? requirement.designer_approved,
        tailor_approved: dto.tailorApproved ?? requirement.tailor_approved,
      },
    });
  }

  async deleteRequirement(projectId: string, requirementId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.designer_id !== userId) {
      throw new UnauthorizedException('Only the owner can delete requirements');
    }
    const requirement = await this.prisma.projectRequirement.findUnique({ where: { id: requirementId } });
    if (!requirement || requirement.project_id !== projectId) {
      throw new NotFoundException('Requirement not found');
    }
    await this.prisma.projectRequirement.delete({ where: { id: requirementId } });
    return { status: 'deleted' };
  }

  async approveRequirement(projectId: string, requirementId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const requirement = await this.prisma.projectRequirement.findUnique({ where: { id: requirementId } });
    if (!requirement || requirement.project_id !== projectId) {
      throw new NotFoundException('Requirement not found');
    }

    // Determine assigned tailor via accepted bid
    const acceptedBid = await this.prisma.bid.findFirst({
      where: { project_id: projectId, status: 'APPROVED' },
    });

    const isDesigner = project.designer_id === userId;
    const isTailor = acceptedBid?.tailor_id === userId;

    if (!isDesigner && !isTailor) {
      throw new UnauthorizedException('Only the designer or assigned tailor can approve');
    }

    const updateData = isDesigner
      ? { designer_approved: true }
      : { tailor_approved: true };

    return this.prisma.projectRequirement.update({
      where: { id: requirementId },
      data: updateData,
    });
  }
}
