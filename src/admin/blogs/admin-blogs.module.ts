import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BlogsService } from '../../blogs/blogs.service';
import { AdminBlogsController } from './admin-blogs.controller';

@Module({
  imports: [PrismaModule],
  providers: [BlogsService],
  controllers: [AdminBlogsController],
})
export class AdminBlogsModule {}
