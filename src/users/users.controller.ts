import { Body, Controller, Get, Patch, Req, UseGuards, Param } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() request: Request) {
    return this.usersService.buildProfile(request.user);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  async listUsers() {
    return this.usersService.findAllMinimal();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(@Req() request: Request, @Body() dto: UpdateUserDto) {
    const currentUser = request.user as { id: string };
    const updated = await this.usersService.updateUser(currentUser.id, dto);
    return this.usersService.buildProfile(updated);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
