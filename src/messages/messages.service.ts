import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateChat(user1Id: string, user2Id: string) {
    // Normalise order so (A,B) and (B,A) always resolve to the same chat
    const [first, second] = [user1Id, user2Id].sort();

    let chat = await this.prisma.chat.findUnique({
      where: { user1_id_user2_id: { user1_id: first, user2_id: second } },
      include: { user1: { select: { id: true, first_name: true, last_name: true, avatar_url: true } },
                 user2: { select: { id: true, first_name: true, last_name: true, avatar_url: true } } },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: { user1_id: first, user2_id: second },
        include: { user1: { select: { id: true, first_name: true, last_name: true, avatar_url: true } },
                   user2: { select: { id: true, first_name: true, last_name: true, avatar_url: true } } },
      });
    }

    return chat;
  }

  async sendMessage(senderId: string, dto: SendMessageDto) {
    const receiver = await this.prisma.user.findUnique({ where: { id: dto.receiverId } });
    if (!receiver) throw new NotFoundException('Recipient not found');

    const chat = await this.getOrCreateChat(senderId, dto.receiverId);

    return this.prisma.message.create({
      data: {
        chat_id: chat.id,
        sender_id: senderId,
        receiver_id: dto.receiverId,
        content: dto.content,
      },
      include: {
        sender: { select: { id: true, first_name: true, last_name: true, avatar_url: true } },
      },
    });
  }

  async getChatHistory(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');

    if (chat.user1_id !== userId && chat.user2_id !== userId) {
      throw new ForbiddenException('You are not a participant of this chat');
    }

    return this.prisma.message.findMany({
      where: { chat_id: chatId },
      orderBy: { created_at: 'asc' },
      include: {
        sender: { select: { id: true, first_name: true, last_name: true, avatar_url: true } },
      },
    });
  }

  async getUserChats(userId: string) {
    return this.prisma.chat.findMany({
      where: { OR: [{ user1_id: userId }, { user2_id: userId }] },
      orderBy: { created_at: 'desc' },
      include: {
        user1: { select: { id: true, first_name: true, last_name: true, avatar_url: true } },
        user2: { select: { id: true, first_name: true, last_name: true, avatar_url: true } },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
  }

  async markAsRead(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.user1_id !== userId && chat.user2_id !== userId) {
      throw new ForbiddenException('You are not a participant of this chat');
    }

    return this.prisma.message.updateMany({
      where: { chat_id: chatId, receiver_id: userId, read: false },
      data: { read: true },
    });
  }
}
