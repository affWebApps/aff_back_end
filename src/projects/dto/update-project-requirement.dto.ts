import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateProjectRequirementDto {
  @ApiProperty({
    example: { items: ['fabric', 'sketch'], notes: 'Need by next week' },
    required: false,
  })
  @IsOptional()
  content?: any;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  designerApproved?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  tailorApproved?: boolean;
}
