import { UnprocessableEntityException, ValidationError, ValidationPipe } from '@nestjs/common';

function collect(errors: ValidationError[], parent = '', out: Record<string, string[]> = {}) {
  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints) out[path] = Object.values(error.constraints);
    if (error.children?.length) collect(error.children, path, out);
  }
  return out;
}

/** Global pipe: whitelist DTO fields, reject unknown ones, 422 with fieldErrors. */
export const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) =>
    new UnprocessableEntityException({
      code: 'VALIDATION_FAILED',
      message: 'Some fields are invalid.',
      fieldErrors: collect(errors),
    }),
});
