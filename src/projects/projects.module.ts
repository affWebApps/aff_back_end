import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { BidsController } from './bids.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ProjectsService],
  controllers: [ProjectsController, BidsController],
})
export class ProjectsModule {}
