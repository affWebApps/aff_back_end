import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'messages', version: '1' })
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('chats')
  @ApiOperation({ summary: 'List all chats for the current user' })
  getUserChats(@Req() req: { user: { id: string } }) {
    return this.messagesService.getUserChats(req.user.id);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a message (creates chat if needed)' })
  sendMessage(
    @Req() req: { user: { id: string } },
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(req.user.id, dto);
  }

  @Get(':chatId')
  @ApiOperation({ summary: 'Get message history for a chat' })
  getChatHistory(
    @Param('chatId') chatId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.messagesService.getChatHistory(chatId, req.user.id);
  }

  @Post(':chatId/read')
  @ApiOperation({ summary: 'Mark all messages in a chat as read' })
  markAsRead(
    @Param('chatId') chatId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.messagesService.markAsRead(chatId, req.user.id);
  }
}
