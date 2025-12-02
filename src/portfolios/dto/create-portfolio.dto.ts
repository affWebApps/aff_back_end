import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested, ArrayMaxSize, ArrayMinSize, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { PortfolioImageDto } from './portfolio-image.dto';

export class CreatePortfolioDto {
  @ApiProperty({ example: 'Summer Collection' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'A showcase of my summer designs' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: [PortfolioImageDto],
    required: false,
    description: 'Images to attach; first will be primary if none marked',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioImageDto)
  images?: PortfolioImageDto[];
}
