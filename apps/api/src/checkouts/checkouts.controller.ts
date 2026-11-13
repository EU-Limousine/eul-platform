import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators';
import { TurnstileGuard } from '../common/turnstile.guard';
import { CheckoutsService } from './checkouts.service';
import { CheckoutCreatedDto, CheckoutStatusDto, CreateCheckoutDto } from './dto/checkouts.dto';

function headerMap(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') out[key.toLowerCase()] = value;
  }
  return out;
}

@ApiTags('public')
@Controller()
export class CheckoutsController {
  constructor(private readonly checkouts: CheckoutsService) {}

  /** Website step 4: start payment. Send a new random Idempotency-Key per booking attempt. */
  @Post('public/checkouts')
  @Public()
  @UseGuards(TurnstileGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: '8–100 chars: letters, digits, - or _' })
  @ApiHeader({ name: 'x-turnstile-token', required: false })
  @ApiOkResponse({ type: CheckoutCreatedDto })
  create(@Body() dto: CreateCheckoutDto, @Headers('idempotency-key') key: string | undefined): Promise<CheckoutCreatedDto> {
    return this.checkouts.create(dto, key ?? '');
  }

  /** Return page polls this until bookingReference is set (status PAID). */
  @Get('public/checkouts/:id')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOkResponse({ type: CheckoutStatusDto })
  status(@Param('id', ParseUUIDPipe) id: string): Promise<CheckoutStatusDto> {
    return this.checkouts.status(id);
  }

  /** Payment provider calls this. Signature is verified on the raw body. */
  @Post('webhooks/payments/:provider')
  @Public()
  @SkipThrottle()
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async webhook(@Param('provider') provider: string, @Req() req: RawBodyRequest<Request>): Promise<{ received: true }> {
    await this.checkouts.handleWebhook(provider, req.rawBody, headerMap(req));
    return { received: true };
  }
}
