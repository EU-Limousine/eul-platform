import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { NotificationChannel, NotificationStatus } from '@eul/db';
import { PrismaService } from '../prisma.service';
import { QUEUE_EMAIL, type EmailJob } from '../queues';
import { EmailSender } from './email-sender';

/** Sends one email per job and records the outcome in notification_logs. */
@Processor(QUEUE_EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly sender: EmailSender,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    const { to, subject, text, html, template, bookingId } = job.data;
    try {
      await this.sender.send({ to, subject, text, html });
      await this.record(job.data, NotificationStatus.SENT);
    } catch (error) {
      const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (isLastAttempt) await this.record(job.data, NotificationStatus.FAILED, error);
      // Never log the address or content (personal data); job ID is enough to trace.
      this.logger.warn(`Email job ${job.id} (${template}, booking ${bookingId ?? '-'}) failed`);
      throw error;
    }
  }

  private async record(data: EmailJob, status: NotificationStatus, error?: unknown): Promise<void> {
    await this.prisma.db.notificationLog.create({
      data: {
        channel: NotificationChannel.EMAIL,
        recipient: data.to,
        template: data.template,
        status,
        error: error instanceof Error ? error.message.slice(0, 500) : undefined,
        bookingId: data.bookingId,
        sentAt: status === NotificationStatus.SENT ? new Date() : undefined,
      },
    });
  }
}
