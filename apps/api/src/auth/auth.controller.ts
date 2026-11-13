import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService, type IssuedTokens } from './auth.service';
import { CurrentUser, Public, type AuthUser } from './decorators';
import { LoginDto, MeDto, TokenResponseDto } from './dto/auth.dto';

const REFRESH_COOKIE = 'eul_rt';

function setRefreshCookie(res: Response, tokens: IssuedTokens): void {
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: true, // browsers treat http://localhost as secure, so this works locally too
    sameSite: 'lax',
    path: '/auth',
    expires: tokens.refreshExpiresAt,
  });
}

function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: TokenResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const tokens = await this.auth.login(dto.email, dto.password, dto.app, req.get('user-agent'));
    setRefreshCookie(res, tokens);
    return tokens.body;
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: TokenResponseDto })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<TokenResponseDto> {
    const tokens = await this.auth.refresh(readRefreshCookie(req), req.get('user-agent'));
    setRefreshCookie(res, tokens);
    return tokens.body;
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ type: MeDto })
  me(@CurrentUser() user: AuthUser): Promise<MeDto> {
    return this.auth.me(user.id);
  }
}
