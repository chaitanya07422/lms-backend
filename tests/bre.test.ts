import { describe, expect, it } from 'vitest';

import { ageInYearsKolkata, evaluateBre } from '../src/bre/evaluateBre';

describe('evaluateBre', () => {
  const valid = {
    dateOfBirth: new Date('1995-06-15T00:00:00.000Z'),
    monthlySalaryPaise: 2_500_000,
    pan: 'ABCDE1234F',
    employmentMode: 'Salaried' as const,
  };

  it('passes when all rules succeed', () => {
    const result = evaluateBre(valid, new Date('2026-10-09T00:00:00.000Z'));
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('fails age outside 23-50', () => {
    const result = evaluateBre(
      { ...valid, dateOfBirth: new Date('2010-01-01T00:00:00.000Z') },
      new Date('2026-10-09T00:00:00.000Z'),
    );
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.rule === 'BRE-AGE')).toBe(true);
  });

  it('fails salary below 25000', () => {
    const result = evaluateBre({ ...valid, monthlySalaryPaise: 2_499_999 });
    expect(result.failures.some((f) => f.rule === 'BRE-SALARY')).toBe(true);
  });

  it('fails invalid PAN', () => {
    const result = evaluateBre({ ...valid, pan: 'INVALID' });
    expect(result.failures.some((f) => f.rule === 'BRE-PAN')).toBe(true);
  });

  it('fails unemployed', () => {
    const result = evaluateBre({ ...valid, employmentMode: 'Unemployed' });
    expect(result.failures.some((f) => f.rule === 'BRE-EMPLOYMENT')).toBe(true);
  });
});

describe('ageInYearsKolkata', () => {
  it('computes completed years', () => {
    const age = ageInYearsKolkata(
      new Date('1995-06-15T00:00:00.000Z'),
      new Date('2026-06-15T00:00:00.000Z'),
    );
    expect(age).toBe(31);
  });
});
