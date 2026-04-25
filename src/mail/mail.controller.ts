import { Body, Controller, HttpCode, HttpException, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MailService } from './mail.service';

@ApiTags('Mail')
@Controller({ path: 'mail', version: '1' })
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('test')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a test email using the configured mail provider' })
  async sendTestEmail(@Req() req: any, @Body() body: { to?: string }) {
    const to = body?.to ?? req.user?.email;

    if (!to) {
      throw new HttpException({ status: 400, message: 'Recipient email is required' }, 400);
    }

    try {
      return await this.mailService.sendTestEmail(to);
    } catch (err: any) {
      const message = err?.message || 'Failed to send test email';
      throw new HttpException({ status: 502, message }, 502);
    }
  }
}
