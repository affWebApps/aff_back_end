import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AdminBlogsModule } from './blogs/admin-blogs.module';

// Aggregate admin-only modules in one place for easy imports
@Module({
  imports: [UsersModule, AdminBlogsModule],
})
export class AdminModule {}
