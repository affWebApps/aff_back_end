import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BlogsService } from './blogs.service';
import { PublicBlogsController } from './public-blogs.controller';

@Module({
  imports: [PrismaModule],
  providers: [BlogsService],
  controllers: [PublicBlogsController],
})
export class BlogsModule {}
