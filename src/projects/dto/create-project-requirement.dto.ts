import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class CreateProjectRequirementDto {
  @ApiProperty({
    example: { items: ['fabric', 'sketch'], notes: 'Need by next week' },
    required: true,
  })
  @IsObject()
  content: any;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  designerApproved?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  tailorApproved?: boolean;
}
