import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) { }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return null;
    }

    if (!user.is_verified) {
      this.logger.warn('Login blocked: user not verified', {
        email: user.email,
        userId: user.id,
      });
      throw new UnauthorizedException('Email not verified');
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
    const token = await this.createVerificationToken(createdUser.id);
    await this.sendVerificationEmail(createdUser.email, token, dto.firstName);

    return { status: 'verification_email_sent' };
  }

  async handleOAuthLogin(
    provider: 'facebook' | 'google',
    data: {
      email: string;
      firstName?: string;
      lastName?: string;
      providerId: string;
      avatarUrl?: string
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
      authProvider: provider === 'google' ? 'GOOGLE' : 'FACEBOOK',
      isVerified: true,
      avatarUrl: data.avatarUrl
    });
  }

  private async createVerificationToken(userId: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
    await this.prisma.verificationToken.create({
      data: {
        user_id: userId,
        token,
        expires_at: expires,
      },
    });
    return token;
  }

  private async sendVerificationEmail(
    email: string,
    token: string,
    firstName?: string,
  ) {
    const verifyUrl = `${this.configService.get<string>('FRONTEND_VERIFY_URL') ?? 'http://localhost:3000/verify'}?token=${token}`;
    try {
      this.logger.debug('Sending verification email', {
        email,
        template: 'verify-email',
      });
      await this.mailService.sendTemplate({
        to: email,
        subject: 'Verify your email',
        template: 'verify-email',
        context: {
          verifyUrl,
          firstName: firstName ?? 'there',
        },
      });
      this.logger.debug('Verification email sent', {
        email,
        template: 'verify-email',
      });
    } catch (error) {
      this.logger.error('Failed to send verification email', error?.stack, {
        email,
        template: 'verify-email',
      });
      throw new BadRequestException('Failed to send verification email');
    }
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.verificationToken.findFirst({
      where: { token },
    });
    if (!record) {
      throw new BadRequestException('Invalid token');
    }
    if (record.used_at) {
      throw new BadRequestException('Token already used');
    }
    if (record.expires_at < new Date()) {
      throw new BadRequestException('Token expired');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.user_id },
        data: { is_verified: true },
      }),
      this.prisma.verificationToken.update({
        where: { token },
        data: { used_at: new Date() },
      }),
    ]);

    const user = await this.usersService.findById(record.user_id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return this.login(user);
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.is_verified) {
      throw new BadRequestException('User already verified');
    }
    const token = await this.createVerificationToken(user.id);

    await this.sendVerificationEmail(user.email, token, user.first_name ?? undefined);
    return { status: 'sent' };
  }
}
