import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { prismaOptions } from '../lib/prisma';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  constructor() {
    super(prismaOptions);
  }

  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      // simple ping
      const ping = await this.$queryRaw`SELECT 1`;
      this.logger.log('Connected to database')
    } catch (error) {
      this.logger.error('Database connection failed')
      throw error;
    }

  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
