import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: nodemailer.Transporter;
  private sesClient?: SESv2Client;
  private resendClient?: Resend;
  private readonly provider: string;
  private templatesDir = path.join(
    process.cwd(),
    'src',
    'mail',
    'templates',
  );

  constructor(private readonly config: ConfigService) {
    this.provider = (this.config.get<string>('MAIL_PROVIDER') ?? 'smtp').toLowerCase();
    this.createTransporter();
  }

  private createTransporter(): void {
    if (this.provider === 'ses') {
      const region = this.config.get<string>('AWS_REGION') ?? this.config.get<string>('SES_REGION');
      if (!region) {
        throw new Error('AWS_REGION or SES_REGION is required when MAIL_PROVIDER=ses');
      }

      this.sesClient = new SESv2Client({
        region,
        credentials:
          this.config.get<string>('AWS_ACCESS_KEY_ID') && this.config.get<string>('AWS_SECRET_ACCESS_KEY')
            ? {
              accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID') as string,
              secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY') as string,
            }
            : undefined,
      });

      this.logger.log(`Mail transporter initialized with SES (${region})`);
      return;
    }

    if (this.provider === 'resend') {
      const apiKey = this.config.get<string>('RESEND_API_KEY');
      if (!apiKey) {
        throw new Error(
          'RESEND_API_KEY is required when MAIL_PROVIDER=resend. Replace re_xxxxxxxxx with your real API key.',
        );
      }

      this.resendClient = new Resend(apiKey);
      this.logger.log(`Mail transporter initialized with Resend`);
      return;
    }

    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    this.logger.log(`Mail transporter initialized with SMTP`);
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth:
        user && pass
          ? {
            user,
            pass,
          }
          : undefined,
    });
  }

  private async sendMail(params: { to: string; subject: string; html: string }) {
    const from = this.config.get<string>('EMAIL_FROM') ?? 'no-reply@aff.com';

    if (this.provider === 'ses') {
      if (!this.sesClient) {
        throw new Error('SES client is not initialized');
      }

      const sent = await this.sesClient.send(
        new SendEmailCommand({
          FromEmailAddress: from,
          Destination: {
            ToAddresses: [params.to],
          },
          Content: {
            Simple: {
              Subject: {
                Data: params.subject,
              },
              Body: {
                Html: {
                  Data: params.html,
                },
              },
            },
          },
        }),
      );

      return {
        messageId: sent.MessageId,
        raw: sent,
      };
    }

    if (this.provider === 'resend') {
      if (!this.resendClient) {
        throw new Error('Resend client is not initialized');
      }

      const sent = await this.resendClient.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      return {
        messageId: sent.data?.id,
        raw: sent,
      };
    }

    if (!this.transporter) {
      throw new Error('SMTP transporter is not initialized');
    }

    const sent = await this.transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    return {
      messageId: sent?.messageId,
      raw: sent,
    };
  }

  async sendTemplate(options: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, any>;
  }) {
    const templatePath = path.join(this.templatesDir, `${options.template}.hbs`);
    const source = fs.readFileSync(templatePath, 'utf8');
    const html = handlebars.compile(source)(options.context);

    try {
      const sent = await this.sendMail({
        to: options.to,
        subject: options.subject,
        html,
      });
      this.logger.debug(`Mail sent`, {
        to: options.to,
        subject: options.subject,
        messageId: sent?.messageId,
        provider: this.provider,
      });
      return sent;
    } catch (error: any) {
      this.logger.error('Mail send failed', error?.stack ?? error?.message ?? error);
      throw error;
    }
  }

  async sendTestEmail(to: string) {
    if (!to) {
      throw new Error('Recipient email is required');
    }

    try {
      const sent = await this.sendMail({
        to,
        subject: 'AFF test email',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Test Email</h2>
            <p>This is a test email from the AFF backend.</p>
            <p>If you received this, the configured mail transport is working.</p>
          </div>
        `,
      });

      this.logger.log(`Test mail sent`, {
        sent,
        to,
        messageId: sent?.messageId,
        provider: this.provider,
      });

      return {
        success: true,
        to,
        messageId: sent?.messageId,
        provider: this.provider,
        result: sent?.raw ?? sent,
      };
    } catch (error: any) {
      this.logger.error('Test mail send failed', error?.stack ?? error?.message ?? error);
      throw error;
    }
  }
}
