import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Global, Injectable, Module } from '@nestjs/common';
import type { Queue } from 'bullmq';

/** Same name and payload as apps/worker/src/queues.ts — keep in sync. */
export const QUEUE_EMAIL = 'email';

export interface EmailJob {
  to: string;
  subject: string;
  text: string;
  html?: string;
  template: string;
  bookingId?: string;
}

/**
 * Emails are never sent from the API request. They are queued after the database
 * transaction commits; the worker sends them and writes notification_logs.
 */
@Injectable()
export class EmailQueue {
  constructor(@InjectQueue(QUEUE_EMAIL) private readonly queue: Queue<EmailJob>) {}

  /** jobId makes a resend of the same message (e.g. a webhook retry) a no-op. */
  async add(job: EmailJob, jobId: string): Promise<void> {
    await this.queue.add(job.template, job, {
      jobId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }
}

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_EMAIL })],
  providers: [EmailQueue],
  exports: [EmailQueue],
})
export class NotificationsModule {}
