import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators';
import { TurnstileGuard } from '../common/turnstile.guard';
import { CreateQuoteDto, QuoteResponseDto } from './dto/quotes.dto';
import { QuotesService } from './quotes.service';

@ApiTags('public')
@Controller('public/quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Post()
  @Public()
  @HttpCode(200)
  @UseGuards(TurnstileGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiHeader({ name: 'x-turnstile-token', required: false, description: 'Cloudflare Turnstile token (not needed in dev)' })
  @ApiOkResponse({ type: QuoteResponseDto })
  create(@Body() dto: CreateQuoteDto): Promise<QuoteResponseDto> {
    return this.quotes.create(dto);
  }
}
