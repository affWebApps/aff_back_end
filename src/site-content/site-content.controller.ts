import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SiteContentService } from './site-content.service';
import { CreateSiteContentDto } from './dto/create-site-content.dto';
import { UpdateSiteContentDto } from './dto/update-site-content.dto';

@ApiTags('Site Content')
@Controller({ path: 'site-content', version: '1' })
export class SiteContentController {
  constructor(private readonly siteContentService: SiteContentService) {}

  @Get()
  @ApiOperation({ summary: 'List all site content sections' })
  findAll(@Query('active') active?: string) {
    return this.siteContentService.findAll(active === 'true' || active === '1');
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a site content section by key (e.g. about_us)' })
  findByKey(@Param('key') key: string) {
    return this.siteContentService.findByKey(key);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a site content section (admin)' })
  create(@Body() dto: CreateSiteContentDto) {
    return this.siteContentService.create(dto);
  }

  @Patch(':key')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a site content section by key (admin)' })
  update(@Param('key') key: string, @Body() dto: UpdateSiteContentDto) {
    return this.siteContentService.update(key, dto);
  }

  @Delete(':key')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a site content section by key (admin)' })
  delete(@Param('key') key: string) {
    return this.siteContentService.delete(key);
  }
}
