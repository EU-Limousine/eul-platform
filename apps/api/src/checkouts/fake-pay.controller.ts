import { Controller, Get, Inject, NotFoundException, Param, Post, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../auth/decorators';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment-provider';
import { FakePaymentProvider } from '../payments/providers/fake.provider';
import { CheckoutsService } from './checkouts.service';

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * DEV ONLY: stands in for the payment provider's hosted page while D-01 is open.
 * Exists only when PAYMENT_PROVIDER=fake (refused in production).
 */
@ApiExcludeController()
@Public()
@Controller('fake-pay')
export class FakePayController {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly checkouts: CheckoutsService,
  ) {}

  private fake(): FakePaymentProvider {
    if (!(this.provider instanceof FakePaymentProvider)) throw new NotFoundException();
    return this.provider;
  }

  @Get(':paymentId')
  page(@Param('paymentId') paymentId: string, @Res() res: Response): void {
    const payment = this.fake().describe(paymentId);
    if (!payment) {
      res.status(404).send('Payment not found (the API restarted? Start a new checkout).');
      return;
    }
    const amount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: payment.amount.currency }).format(
      payment.amount.amountMinor / 100,
    );
    const id = encodeURIComponent(paymentId);
    res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Test payment</title></head>
<body style="font-family:system-ui,sans-serif;max-width:420px;margin:48px auto;padding:0 16px">
<p style="background:#fdf1dc;padding:8px 12px;border-radius:6px"><strong>TEST PAYMENT</strong> — no real money. Development only.</p>
<h1 style="font-size:22px">${escape(payment.description)}</h1>
<p style="font-size:28px;margin:8px 0 24px">${escape(amount)}</p>
<form method="post" action="/fake-pay/${id}/pay"><button style="width:100%;padding:12px;font-size:16px;margin-bottom:8px">Pay</button></form>
<form method="post" action="/fake-pay/${id}/fail"><button style="width:100%;padding:12px;font-size:16px">Fail payment</button></form>
</body></html>`);
  }

  @Post(':paymentId/pay')
  pay(@Param('paymentId') paymentId: string, @Res() res: Response): Promise<void> {
    return this.finish(paymentId, 'PAID', res);
  }

  @Post(':paymentId/fail')
  fail(@Param('paymentId') paymentId: string, @Res() res: Response): Promise<void> {
    return this.finish(paymentId, 'FAILED', res);
  }

  /** Sends the signed webhook through the real webhook handler, then returns to the website. */
  private async finish(paymentId: string, outcome: 'PAID' | 'FAILED', res: Response): Promise<void> {
    const hook = this.fake().complete(paymentId, outcome);
    if (!hook) {
      res.status(404).send('Payment not found.');
      return;
    }
    await this.checkouts.handleWebhook('fake', hook.rawBody, hook.headers);
    res.redirect(303, hook.returnUrl);
  }
}
