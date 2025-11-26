import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return null;
    }

    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  async login(user: { id: string; email: string }) {
    if (!user) {
      throw new UnauthorizedException();
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new UnauthorizedException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const createdUser = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    return this.login(createdUser);
  }

  async handleOAuthLogin(
    provider: 'facebook',
    data: {
      email: string;
      firstName?: string;
      lastName?: string;
      providerId: string;
    },
  ) {
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      return existingUser;
    }

    const generatedPassword = await bcrypt.hash(
      `${provider}-${data.providerId}-${Date.now()}`,
      10,
    );

    return this.usersService.create({
      email: data.email,
      passwordHash: generatedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
    });
  }
}
