import { Body, Controller, Get, Patch, Req, UseGuards, Param, HttpException, ParseBoolPipe, Query } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() request: Request) {
    const profile = await this.usersService.buildProfile(request.user);
    return profile;
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  @ApiOperation({ summary: 'List users (minimal fields)' })
  async listUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('sortBy') sortBy = 'created_at',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
    @Query('role') role?: string,
    @Query('isVerified') isVerified?: string,
    @Query('isActive') isActive?: string,
    @Query('authProvider') authProvider?: string,
  ) {
    return this.usersService.findAllMinimal(
      Number(page),
      Number(limit),
      sortBy,
      sortOrder,
      {
        role,
        isVerified: isVerified !== undefined ? isVerified === 'true' : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        authProvider,
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Req() request: Request, @Body() dto: UpdateUserDto) {
    const currentUser = request.user as { id: string };
    const updated = await this.usersService.updateUser(currentUser.id, dto);
    return this.usersService.buildProfile(updated);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get total user counts by role (admin)' })
  async getUserStats() {
    return this.usersService.getUserStats();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user (admin)' })
  async setActiveStatus(
    @Param('id') id: string,
    @Body('isActive', ParseBoolPipe) isActive: boolean,
  ) {
    return this.usersService.setActiveStatus(id, isActive);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
