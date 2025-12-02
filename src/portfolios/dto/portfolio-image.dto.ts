import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class PortfolioImageDto {
  @ApiProperty({ example: 'https://cdn.aff.com/portfolio/image.png' })
  @IsString()
  imageUrl: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
