import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { PASSWORD_MESSAGE, PASSWORD_REGEX } from './password-rules';

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentSecret@123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewSecret@123' })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
