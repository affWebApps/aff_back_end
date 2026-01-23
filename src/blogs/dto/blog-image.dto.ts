import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class BlogImageDto {
  @ApiProperty({ example: 'https://cdn.aff.com/blogs/cover.png' })
  @IsString()
  imageUrl: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
