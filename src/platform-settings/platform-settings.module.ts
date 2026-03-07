import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformSettingsController } from './platform-settings.controller';

@Module({
  imports: [PrismaModule],
  providers: [PlatformSettingsService],
  controllers: [PlatformSettingsController],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
