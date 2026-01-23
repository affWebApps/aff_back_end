import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlogsService } from './blogs.service';

@ApiTags('Blogs')
@Controller({ path: 'blogs', version: '1' })
export class PublicBlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Get()
  @ApiOperation({ summary: 'List published blogs' })
  list() {
    return this.blogsService.findAllPublished();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a published blog by id' })
  get(@Param('id') id: string) {
    return this.blogsService.findOnePublished(id);
  }
}
