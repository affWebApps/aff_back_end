import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { STATUS_OPTIONS } from './create-project.dto';
import { ProjectFileDto } from './project-file.dto';

export class UpdateProjectDto {
  @ApiProperty({ example: 'Updated title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 200, required: false })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiProperty({ example: '2 weeks', required: false, description: 'Human-readable estimate for delivery' })
  @IsOptional()
  @IsString()
  estimatedTime?: string;

  @ApiProperty({ example: 'IN_PROGRESS', enum: STATUS_OPTIONS, required: false })
  @IsOptional()
  @IsIn(STATUS_OPTIONS as unknown as string[])
  status?: string;

  @ApiProperty({
    type: [ProjectFileDto],
    required: false,
    description: 'If provided, replaces existing files',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectFileDto)
  files?: ProjectFileDto[];
}
