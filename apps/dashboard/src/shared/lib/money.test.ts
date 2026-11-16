import { describe, expect, it } from 'vitest';
import { minorToInput, parseMoney } from './money';

describe('parseMoney', () => {
  it('reads whole and decimal amounts as minor units', () => {
    expect(parseMoney('120')).toBe(12_000);
    expect(parseMoney('120.5')).toBe(12_050);
    expect(parseMoney('120.05')).toBe(12_005);
    expect(parseMoney(' 0.01 ')).toBe(1);
  });

  it('accepts a comma as the decimal mark', () => {
    expect(parseMoney('120,50')).toBe(12_050);
  });

  it('has no floating-point errors', () => {
    expect(parseMoney('0.29')).toBe(29); // 0.29 * 100 = 28.999999… with floats
    expect(parseMoney('1.15')).toBe(115);
  });

  it('rejects bad input', () => {
    for (const bad of ['', 'abc', '-5', '1.234', '1,200.50', '12345678']) expect(parseMoney(bad)).toBeNull();
  });
});

describe('minorToInput', () => {
  it('formats minor units for an input', () => {
    expect(minorToInput(12_050)).toBe('120.50');
    expect(minorToInput(5)).toBe('0.05');
    expect(minorToInput(0)).toBe('0.00');
  });
});
