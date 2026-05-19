import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, HttpException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PlatformSettingsService } from './platform-settings.service';
import { CreatePlatformSettingDto } from './dto/create-platform-setting.dto';
import { UpdatePlatformSettingDto } from './dto/update-platform-setting.dto';

@ApiTags('Platform Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'platform-settings', version: '1' })
export class PlatformSettingsController {
  constructor(private readonly platformSettingsService: PlatformSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'List platform settings' })
  async list(@Query('active') active?: string) {
    const activeOnly = active === 'true' || active === '1';
    return this.platformSettingsService.list(activeOnly);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get platform setting by key' })
  async getByKey(@Param('key') key: string) {
    const setting = await this.platformSettingsService.getByKey(key);
    if (!setting) {
      throw new HttpException({ status: 404, message: 'Platform setting not found' }, 404);
    }
    return setting;
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create platform setting' })
  async create(@Body() dto: CreatePlatformSettingDto, @Req() req: any) {
    return this.platformSettingsService.create(dto, req.user?.id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update platform setting' })
  async update(@Param('id') id: string, @Body() dto: UpdatePlatformSettingDto, @Req() req: any) {
    return this.platformSettingsService.update(id, dto, req.user?.id);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete platform setting' })
  async delete(@Param('id') id: string) {
    return this.platformSettingsService.delete(id);
  }
}
