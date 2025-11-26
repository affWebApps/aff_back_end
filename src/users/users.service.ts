import { Injectable } from '@nestjs/common';
import type { User } from '../../prisma/app/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(input: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        password_hash: input.passwordHash,
        first_name: input.firstName,
        last_name: input.lastName,
        role: 'designer',
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
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
