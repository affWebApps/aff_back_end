import { Injectable } from '@nestjs/common';
import type { AuthProvider, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(input: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    authProvider?: AuthProvider;
    isVerified?: boolean;
    avatarUrl?: string
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        password_hash: input.passwordHash,
        first_name: input.firstName,
        last_name: input.lastName,
        role: 'designer',
        auth_provider: input.authProvider ?? 'EMAIL',
        is_verified: input.isVerified ?? false,
        avatar_url: input.avatarUrl
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        display_name: true,
        avatar_url: true,
        role: true,
        is_active: true,
        is_verified: true,
        created_at: true,
        updated_at: true,
        reviews_received: true,
      },
    }) as unknown as User | null;
  }

  async findAllMinimal(): Promise<Partial<User>[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        first_name: true,
        last_name: true,
        is_verified: true,
        auth_provider: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateUser(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      displayName?: string;
      phoneNumber?: string;
      bio?: string;
      avatarUrl?: string;
      country?: string;
      city?: string;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        display_name: data.displayName,
        phone_number: data.phoneNumber,
        bio: data.bio,
        avatar_url: data.avatarUrl,
        country: data.country,
        city: data.city,
      },
    });
  }

  buildProfile(user: Partial<User> | null | undefined) {
    if (!user) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...safeUser } = user as User;
    return safeUser;
  }
}
