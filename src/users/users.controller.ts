import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('auth0'))
  @Get('me')
  getProfile(@Req() request: Request) {
    return this.usersService.buildProfile(request.user);
  }
}
