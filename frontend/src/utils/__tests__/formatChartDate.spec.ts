import { formatChartAxisDate, formatChartTooltipDate } from '../formatChartDate';

describe('Chart Date Localization Utilities (#441)', () => {
  const testDate = new Date('2026-08-26T12:30:00Z');

  it('should correctly format axis dates in en-US locale', () => {
    const formatted = formatChartAxisDate(testDate, 'en-US');
    expect(formatted).toContain('Aug 26');
  });

  it('should correctly format tooltip dates with time and year', () => {
    const formatted = formatChartTooltipDate(testDate, 'en-US');
    expect(formatted).toContain('Aug 26, 2026');
  });

  it('should return empty string for invalid date inputs', () => {
    expect(formatChartAxisDate('invalid-date')).toBe('');
    expect(formatChartAxisDate(new Date(NaN))).toBe('');
  });
});