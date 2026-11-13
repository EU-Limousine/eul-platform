import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { TURNSTILE_TEST_SECRET, type Env } from '../config/env';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const BOT_CHECK_FAILED = { code: 'BOT_CHECK_FAILED', message: 'Please complete the security check and try again.' };

/**
 * Cloudflare Turnstile check for public endpoints. The website sends the widget token
 * in the `x-turnstile-token` header. With Cloudflare's test secret (dev) every request passes.
 */
@Injectable()
export class TurnstileGuard implements CanActivate {
  private readonly logger = new Logger(TurnstileGuard.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const secret = this.config.get('TURNSTILE_SECRET', { infer: true });
    if (secret === TURNSTILE_TEST_SECRET) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token = req.get('x-turnstile-token');
    if (!token) throw new ForbiddenException(BOT_CHECK_FAILED);

    try {
      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token, remoteip: req.ip ?? '' }),
        signal: AbortSignal.timeout(5_000),
      });
      const body = (await res.json()) as { success?: boolean };
      if (body.success) return true;
    } catch (error) {
      this.logger.warn(`Turnstile verification failed to run: ${String(error)}`);
    }
    throw new ForbiddenException(BOT_CHECK_FAILED);
  }
}
