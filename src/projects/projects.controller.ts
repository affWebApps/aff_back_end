import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';
import { CreateProjectRequirementDto } from './dto/create-project-requirement.dto';
import { UpdateProjectRequirementDto } from './dto/update-project-requirement.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) { }

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
