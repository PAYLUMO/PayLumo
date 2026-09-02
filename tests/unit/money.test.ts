import { describe, it, expect } from 'vitest';
import { parseFrNumber, roundCents, formatPercent } from '@shared/lib/money';

const NBSP = String.fromCharCode(0x00a0);
const NNBSP = String.fromCharCode(0x202f);

describe('parseFrNumber', () => {
  it.each([
    ['1 234,56', 1234.56],
    [`1${NBSP}234,56`, 1234.56],
    [`1${NNBSP}234,56`, 1234.56],
    ['1234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['2 000', 2000],
    ['6,90 %', 6.9],
    ['151,67 h', 151.67],
    [`3${NBSP}488,46 €`, 3488.46],
    ['-161,54', -161.54],
    ['161,54-', -161.54],
    ['(12,30)', -12.3],
    ['0,024', 0.024],
  ])('« %s » → %d', (input, expected) => {
    expect(parseFrNumber(input)).toBeCloseTo(expected, 2);
  });

  it('renvoie null pour du texte sans nombre', () => {
    expect(parseFrNumber('Salaire de base')).toBeNull();
    expect(parseFrNumber('')).toBeNull();
    expect(parseFrNumber(undefined)).toBeNull();
  });
});

describe('roundCents', () => {
  it('arrondit au centime', () => {
    expect(roundCents(240.7049999)).toBe(240.7);
    expect(roundCents(0.125)).toBe(0.13);
  });
});

describe('formatPercent', () => {
  it('formate un taux', () => {
    expect(formatPercent(6.9).replace(/\s/g, ' ')).toBe('6,90 %');
    expect(formatPercent(0.024).replace(/\s/g, ' ')).toBe('0,024 %');
  });
});
