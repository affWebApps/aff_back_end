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
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { OAuthCodeDto } from './dto/oauth-code.dto';
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
      avatarUrl?: string;
    },
  ) {
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      const updates: Record<string, any> = {};
      if (!existingUser.first_name && data.firstName) {
        updates.first_name = data.firstName;
      }
      if (!existingUser.last_name && data.lastName) {
        updates.last_name = data.lastName;
      }
      if ((!existingUser.avatar_url || existingUser.avatar_url === '') && data.avatarUrl) {
        updates.avatar_url = data.avatarUrl;
      }
      if (Object.keys(updates).length > 0) {
        return this.usersService.updateUser(existingUser.id, {
          firstName: updates.first_name,
          lastName: updates.last_name,
          avatarUrl: updates.avatar_url,
        });
      }
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

  createOAuthCode(user: { id: string; email: string }, provider: string) {
    return this.jwtService.sign(
      { sub: user.id, email: user.email, provider },
      { expiresIn: '5m' },
    );
  }

  async exchangeOAuthCode(code: string) {
    try {
      const payload = this.jwtService.verify(code);
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new BadRequestException('Invalid code');
      }
      return this.login({ id: user.id, email: user.email });
    } catch (error) {
      this.logger.warn('OAuth code exchange failed', { message: error?.message });
      throw new BadRequestException('Invalid or expired code');
    }
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

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return { status: 'No user found with that Email' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
    await this.prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        token,
        expires_at: expires,
      },
    });

    try {
      await this.mailService.sendTemplate({
        to: user.email,
        subject: 'Reset your password',
        template: 'reset-password',
        context: {
          resetUrl: `${this.configService.get<string>('FRONTEND_RESET_URL') ?? 'http://localhost:3000/reset-password'}?token=${token}`,
        },
      });
    } catch (error) {
      this.logger.error('Failed to send reset email', error?.stack, {
        email: user.email,
        template: 'reset-password',
      });
    }

    return { status: 'ok' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (!record || record.used_at || record.expires_at < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    const user = await this.usersService.findById(record.user_id);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { password_hash: passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { token: dto.token },
        data: { used_at: new Date() },
      }),
    ]);

    return { status: 'password_reset' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.auth_provider.toLowerCase() !== 'email') {
      throw new BadRequestException('Password login not enabled for this account');
    }

    const currentMatches = await bcrypt.compare(
      dto.currentPassword,
      user.password_hash,
    );
    if (!currentMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password_hash: newHash },
    });

    return { status: 'password_changed' };
  }
}
