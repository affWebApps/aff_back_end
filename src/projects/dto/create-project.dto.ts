import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsIn, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectFileDto } from './project-file.dto';

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'] as const;

export class CreateProjectDto {
  @ApiProperty({ example: 'New summer dress', required: true })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Looking for a tailor to produce this design', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 150.5, required: false })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiProperty({ example: '3 months', required: false, description: 'Human-readable estimate for delivery' })
  @IsOptional()
  @IsString()
  estimatedTime?: string;

  @ApiProperty({ example: 'OPEN', enum: STATUS_OPTIONS, required: false })
  @IsOptional()
  @IsIn(STATUS_OPTIONS as unknown as string[])
  status?: string;

  @ApiProperty({ example: 'uuid-of-design', required: false })
  @IsOptional()
  @IsString()
  designId?: string;

  @ApiProperty({
    type: [ProjectFileDto],
    required: false,
    description: 'Optional files to attach to the project on creation',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectFileDto)
  files?: ProjectFileDto[];
}

export { STATUS_OPTIONS };
