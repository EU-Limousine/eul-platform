import { ConflictException, NotFoundException } from '@nestjs/common';

/** Prisma error codes we turn into friendly HTTP errors. */
function prismaCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/** P2002 = unique constraint violated → 409 with our own message. */
export function rethrowUnique(error: unknown, code: string, message: string): never {
  if (prismaCode(error) === 'P2002') throw new ConflictException({ code, message });
  throw error;
}

/** P2025 = record to update not found → 404. */
export function rethrowNotFound(error: unknown, code: string, message: string): never {
  if (prismaCode(error) === 'P2025') throw new NotFoundException({ code, message });
  throw error;
}
