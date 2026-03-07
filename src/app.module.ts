import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';
import { UploadsModule } from './uploads/uploads.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ProjectsModule } from './projects/projects.module';
import { BlogsModule } from './blogs/blogs.module';
import { AdminModule } from './admin/admin.module';
import { VendureModule } from './vendure/vendure.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { MedusaModule } from './medusa/medusa.module';
import { PlatformSettingsModule } from './platform-settings/platform-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    StorageModule,
    UploadsModule,
    PortfoliosModule,
    ReviewsModule,
    ProjectsModule,
    AdminModule,
    BlogsModule,
    MarketplaceModule,
    MedusaModule,
    VendureModule,
    PlatformSettingsModule,
    UsersModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
