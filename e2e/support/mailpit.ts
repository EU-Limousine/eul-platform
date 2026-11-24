import { expect, test, type APIRequestContext } from '@playwright/test';
import { IS_LOCAL, TARGET, URLS } from './env';

interface MailpitMessage {
  Subject: string;
  To: { Address: string }[];
}

/** Waits (up to 20 s) for an email whose subject contains all the given parts. */
export async function expectEmail(request: APIRequestContext, ...subjectParts: string[]): Promise<void> {
  if (!IS_LOCAL) {
    // No Mailpit on staging: emails really go out. The step is recorded in the report instead.
    test.info().annotations.push({ type: 'email not checked', description: `${TARGET}: ${subjectParts.join(' + ')}` });
    return;
  }
  await expect
    .poll(
      async () => {
        const res = await request.get(`${URLS.mailpit}/api/v1/messages?limit=100`);
        const { messages } = (await res.json()) as { messages: MailpitMessage[] };
        return messages.some((m) => subjectParts.every((p) => m.Subject.toLowerCase().includes(p.toLowerCase())));
      },
      { timeout: 20_000, message: `email with subject containing: ${subjectParts.join(' + ')}` },
    )
    .toBe(true);
}
