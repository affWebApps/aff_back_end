import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 'user', description: 'Target type: user or project' })
  @IsString()
  targetType: string;

  @ApiProperty({ example: 'uuid-of-target' })
  @IsString()
  targetId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Great experience', required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}
