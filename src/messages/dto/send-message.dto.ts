import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'ID of the recipient user' })
  @IsUUID()
  receiverId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  content: string;
}
