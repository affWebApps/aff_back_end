import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBidDto {
  @ApiProperty({ example: 150.5 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: '7 days', required: false })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiProperty({ example: 'I can deliver with premium stitching', required: false })
  @IsOptional()
  @IsString()
  message?: string;
}
