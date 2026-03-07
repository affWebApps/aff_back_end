import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlatformSettingDto } from './dto/create-platform-setting.dto';
import { UpdatePlatformSettingDto } from './dto/update-platform-setting.dto';

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  list(activeOnly = false) {
    return this.prisma.platformSetting.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: { created_at: 'desc' },
    });
  }

  getByKey(key: string) {
    return this.prisma.platformSetting.findUnique({ where: { key } });
  }

  create(dto: CreatePlatformSettingDto, updatedBy?: string) {
    return this.prisma.platformSetting.create({
      data: {
        key: dto.key,
        value: dto.value,
        value_type: dto.value_type,
        description: dto.description,
        category: dto.category,
        is_active: dto.is_active ?? true,
        updated_by: updatedBy,
      },
    });
  }

  update(id: string, dto: UpdatePlatformSettingDto, updatedBy?: string) {
    return this.prisma.platformSetting.update({
      where: { id },
      data: {
        value: dto.value,
        value_type: dto.value_type,
        description: dto.description,
        category: dto.category,
        is_active: dto.is_active,
        updated_by: updatedBy,
      },
    });
  }

  delete(id: string) {
    return this.prisma.platformSetting.delete({ where: { id } });
  }
}
