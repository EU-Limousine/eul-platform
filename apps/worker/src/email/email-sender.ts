import { Injectable } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * The only way the platform sends email (SMTP). Provider is decision D-20:
 * switching provider = changing SMTP_* env values, nothing else.
 */
@Injectable()
export class EmailSender {
  private readonly from = process.env.MAIL_FROM ?? 'EU Limousine <bookings@eulimousine.com>';
  private readonly transport: Transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  async send(input: { to: string; subject: string; text: string; html?: string }): Promise<void> {
    await this.transport.sendMail({ from: this.from, ...input });
  }
}
