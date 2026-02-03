import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { VendureAuthService } from './vendure-auth.service';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [MarketplaceService, VendureAuthService],
  controllers: [MarketplaceController],
})
export class MarketplaceModule {}
