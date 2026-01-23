import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { BlogImageDto } from './blog-image.dto';

export const BLOG_STATUS = ['draft', 'scheduled', 'published'] as const;

export class CreateBlogDto {
  @ApiProperty({ example: 'New feature launch' })
  @IsString()
  title: string;

  @ApiProperty({ example: '<p>Rich HTML content...</p>', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ example: '2025-12-01T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiProperty({ example: 'draft', enum: BLOG_STATUS, required: false })
  @IsOptional()
  @IsIn(BLOG_STATUS as unknown as string[])
  status?: string;

  @ApiProperty({
    type: [BlogImageDto],
    required: false,
    description: 'Optional blog images; first will be primary if none marked',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogImageDto)
  images?: BlogImageDto[];
}
