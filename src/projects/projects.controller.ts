import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';
import { CreateProjectRequirementDto } from './dto/create-project-requirement.dto';
import { UpdateProjectRequirementDto } from './dto/update-project-requirement.dto';
import { CreateBidDto } from './dto/create-bid.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) { }

  @Get('stats')
  @ApiOperation({ summary: 'Get project counts by status' })
  async getStats() {
    return this.projectsService.getStats();
  }

  @UseGuards(AdminGuard)
  @Patch(':id/block')
  @ApiOperation({ summary: 'Block a project (admin)' })
  async blockProject(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string } },
    @Body('reason') reason: string,
  ) {
    if (!reason?.trim()) throw new BadRequestException('Block reason is required');
    return this.projectsService.blockProject(id, req.user.id, reason);
  }

  @UseGuards(AdminGuard)
  @Patch(':id/unblock')
  @ApiOperation({ summary: 'Unblock a project (admin)' })
  async unblockProject(@Param('id') id: string) {
    return this.projectsService.unblockProject(id);
  }

  @Get()
  @ApiOperation({ summary: 'List all projects with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['created_at', 'budget', 'title', 'updated_at'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'status', required: false, enum: ProjectStatus })
  @ApiQuery({ name: 'designerId', required: false, type: String })
  @ApiQuery({ name: 'isBlocked', required: false, type: Boolean })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('status') status?: ProjectStatus,
    @Query('designerId') designerId?: string,
    @Query('isBlocked') isBlocked?: string,
  ) {
    return this.projectsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      sortBy,
      sortOrder,
      {
        status,
        designerId,
        ...(isBlocked !== undefined && { isBlocked: isBlocked === 'true' }),
      },
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a project (one owner)' })
  async create(@Req() req: Request, @Body() dto: CreateProjectDto) {
    const user = req.user as { id: string };
    return this.projectsService.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by id with files and reviews' })
  async findOne(@Param('id') id: string) {
    return this.projectsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project (owner only)' })
  async update(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: UpdateProjectDto,
  ) {
    const user = req.user as { id: string };
    return this.projectsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project (owner only)' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.projectsService.delete(id, user.id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close project (set status to COMPLETED or CLOSED)' })
  async close(
    @Param('id') id: string,
    @Req() req: Request,
    @Body('status') status: ProjectStatus,
  ) {
    const user = req.user as { id: string };
    return this.projectsService.close(id, user.id, status);
  }

  @Delete(':id/files/:fileId')
  @ApiOperation({ summary: 'Delete a project file (owner only)' })
  async deleteFile(
    @Param('id') projectId: string,
    @Param('fileId') fileId: string,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.projectsService.deleteFile(projectId, fileId, user.id);
  }

  @Get(':id/requirements')
  @ApiOperation({ summary: 'List requirements for a project' })
  async listRequirements(@Param('id') projectId: string) {
    return this.projectsService.listRequirements(projectId);
  }

  @Post(':id/requirements')
  @ApiOperation({ summary: 'Create a requirement (owner only)' })
  async createRequirement(
    @Param('id') projectId: string,
    @Req() req: Request,
    @Body() dto: CreateProjectRequirementDto,
  ) {
    const user = req.user as { id: string };
    return this.projectsService.createRequirement(projectId, user.id, dto);
  }

  @Post(':id/bids')
  @ApiOperation({ summary: 'Create a bid for a project (tailor)' })
  async createBid(
    @Param('id') projectId: string,
    @Req() req: Request,
    @Body() dto: CreateBidDto,
  ) {
    const user = req.user as { id: string };
    return this.projectsService.createBid(projectId, user.id, dto);
  }

  @Get(':id/bids')
  @ApiOperation({ summary: 'List bids for a project' })
  async listBids(@Param('id') projectId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.projectsService.listBids(projectId, user.id);
  }

  @Patch(':id/requirements/:reqId')
  @ApiOperation({ summary: 'Update a requirement (owner only, only while OPEN)' })
  async updateRequirement(
    @Param('id') projectId: string,
    @Param('reqId') reqId: string,
    @Req() req: Request,
    @Body() dto: UpdateProjectRequirementDto,
  ) {
    const user = req.user as { id: string };
    return this.projectsService.updateRequirement(projectId, reqId, user.id, dto);
  }

  @Delete(':id/requirements/:reqId')
  @ApiOperation({ summary: 'Delete a requirement (owner only)' })
  async deleteRequirement(
    @Param('id') projectId: string,
    @Param('reqId') reqId: string,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.projectsService.deleteRequirement(projectId, reqId, user.id);
  }

  @Post(':id/requirements/:reqId/approve')
  @ApiOperation({ summary: 'Approve a requirement (designer approves designer_approved, others mark tailor_approved)' })
  async approveRequirement(
    @Param('id') projectId: string,
    @Param('reqId') reqId: string,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.projectsService.approveRequirement(projectId, reqId, user.id);
  }
}
