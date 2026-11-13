import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider';
import { FakePaymentProvider } from './providers/fake.provider';

/** Picks the provider named in PAYMENT_PROVIDER. Real providers are added here once D-01 is decided. */
@Global()
@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): PaymentProvider => {
        const name = config.get('PAYMENT_PROVIDER', { infer: true });
        if (name === 'fake') {
          return new FakePaymentProvider(
            config.get('FAKE_PAYMENT_SECRET', { infer: true }),
            config.get('API_PUBLIC_URL', { infer: true }),
          );
        }
        // TODO(decision D-01): add the real provider adapter (CLAUDE.md §4.10 checklist).
        throw new Error(`Unknown PAYMENT_PROVIDER "${name}"`);
      },
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
