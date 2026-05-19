import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsUrl, Min } from 'class-validator';

export class CreateTeamMemberDto {
  @ApiProperty({ example: 'Amara Okafor' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Lead Designer' })
  @IsString()
  role: string;

  @ApiPropertyOptional({ example: 'Amara has 10 years of experience...' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiPropertyOptional({ default: 0, description: 'Lower numbers appear first' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
