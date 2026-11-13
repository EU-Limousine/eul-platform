import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** The request ID set by nestjs-pino (from `x-request-id` or a new UUID). */
export const RequestId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request & { id?: string }>();
  return String(req.id ?? '');
});
