import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';

export class CreateSiteContentDto {
  @ApiProperty({ example: 'about_us' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'About Us' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'We are a fashion marketplace...' })
  @IsString()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
