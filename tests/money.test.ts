import { describe, expect, it } from 'vitest';

import { computeLoanQuote, computeSimpleInterestPaise, roundHalfUp } from '../src/utils/money';

describe('loan money helpers', () => {
  it('rounds half up', () => {
    expect(roundHalfUp(1.4)).toBe(1);
    expect(roundHalfUp(1.5)).toBe(2);
  });

  it('matches assignment example for 1L / 365 days / 12%', () => {
    const principalPaise = 10_000_000;
    const interestPaise = computeSimpleInterestPaise(principalPaise, 365);
    expect(interestPaise).toBe(1_200_000);

    const quote = computeLoanQuote(principalPaise, 365);
    expect(quote.totalRepaymentPaise).toBe(11_200_000);
    expect(quote.interestRateAnnual).toBe(12);
  });
});
