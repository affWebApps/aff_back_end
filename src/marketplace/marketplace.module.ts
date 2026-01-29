import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { VendureAuthService } from './vendure-auth.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [MarketplaceService, VendureAuthService],
  controllers: [MarketplaceController],
})
export class MarketplaceModule {}
