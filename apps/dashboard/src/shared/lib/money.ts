/**
 * Money inputs: the user types major units ("120" or "120.50"), the API stores integer
 * minor units (12050). String maths only — no floating-point rounding errors.
 */
export function parseMoney(input: string): number | null {
  let s = input.trim().replace(/\s/g, '');
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.'); // "120,50" → "120.50"
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const [whole = '0', fraction = ''] = s.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** 12050 → "120.50" (for putting a stored amount into an input). */
export function minorToInput(minor: number): string {
  const whole = Math.trunc(minor / 100);
  const cents = String(Math.abs(minor % 100)).padStart(2, '0');
  return `${whole}.${cents}`;
}
