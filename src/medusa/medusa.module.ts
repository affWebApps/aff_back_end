import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MedusaService } from './medusa.service';
import { MedusaController } from './medusa.controller';

@Module({
  imports: [HttpModule, ConfigModule, PrismaModule],
  providers: [MedusaService],
  controllers: [MedusaController],
  exports: [MedusaService],
})
export class MedusaModule {}
