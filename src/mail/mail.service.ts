import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private templatesDir = path.join(
    process.cwd(),
    'src',
    'mail',
    'templates',
  );

  constructor(private readonly config: ConfigService) {
    this.transporter = this.createTransporter();
  }

  private createTransporter(): nodemailer.Transporter {
    const provider = (this.config.get<string>('MAIL_PROVIDER') ?? 'smtp').toLowerCase();

    if (provider === 'ses') {
      const region = this.config.get<string>('AWS_REGION') ?? this.config.get<string>('SES_REGION');
      if (!region) {
        throw new Error('AWS_REGION or SES_REGION is required when MAIL_PROVIDER=ses');
      }

      const sesClient = new SESv2Client({
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
      return nodemailer.createTransport({
        SES: {
          sesClient,
          SendEmailCommand,
        },
      });
    }

    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    this.logger.log(`Mail transporter initialized with SMTP`);
    return nodemailer.createTransport({
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
      const sent = await this.transporter.sendMail({
        from: this.config.get<string>('EMAIL_FROM') ?? 'no-reply@aff.com',
        to: options.to,
        subject: options.subject,
        html,
      });
      this.logger.debug(`Mail sent`, {
        to: options.to,
        subject: options.subject,
        messageId: sent?.messageId,
        provider: this.config.get<string>('MAIL_PROVIDER') ?? 'smtp',
      });
      return sent;
    } catch (error: any) {
      this.logger.error('Mail send failed', error?.stack ?? error?.message ?? error);
      throw error;
    }
  }
}
