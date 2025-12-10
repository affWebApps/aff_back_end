import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private templatesDir = path.join(
    process.cwd(),
    'src',
    'mail',
    'templates',
  );

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: this.config.get<string>('SMTP_HOST'),
      port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
      secure: true,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
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

    console.log(this.config.get<string>('SMTP_HOST'), this.config.get<string>('SMTP_USER'), this.config.get<string>('SMTP_PASS'),)
    try {
      const sent = await this.transporter.sendMail({
        from: this.config.get<string>('EMAIL_FROM') ?? 'no-reply@aff.com',
        to: options.to,
        subject: options.subject,
        html,
      });
    } catch (error) {
      console.log(error)
    }

  }
}