import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ProjectFileDto {
  @ApiProperty({ example: 'https://cdn.aff.com/projects/file1.pdf' })
  @IsString()
  fileUrl: string;

  @ApiProperty({ example: 'pdf', required: false })
  @IsOptional()
  @IsString()
  fileType?: string;
}
