import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() request: Request) {
    return this.usersService.buildProfile(request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(@Req() request: Request, @Body() dto: UpdateUserDto) {
    const currentUser = request.user as { id: string };
    const updated = await this.usersService.updateUser(currentUser.id, dto);
    return this.usersService.buildProfile(updated);
  }
}
