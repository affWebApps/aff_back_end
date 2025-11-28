import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class OAuthCodeDto {
  @ApiProperty({ example: 'short-lived-oauth-code' })
  @IsString()
  code: string;
}
