import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VendureService } from './vendure.service';
import { VendureController } from './vendure.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [VendureService],
  controllers: [VendureController],
  exports: [VendureService],
})
export class VendureModule {}
