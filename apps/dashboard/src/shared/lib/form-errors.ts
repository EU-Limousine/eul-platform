import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@eul/api-client';

/**
 * API error → form. 422 field errors go onto their fields (returns null);
 * anything else returns one message for the form's alert box.
 */
export function applyApiErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fallback: string): string | null {
  if (error instanceof ApiError) {
    const fields = error.body.fieldErrors;
    if (error.status === 422 && fields && Object.keys(fields).length) {
      for (const [field, messages] of Object.entries(fields)) {
        setError(field as Path<T>, { type: 'server', message: messages[0] ?? error.body.message });
      }
      return null;
    }
    return error.body.message || fallback;
  }
  return fallback;
}
