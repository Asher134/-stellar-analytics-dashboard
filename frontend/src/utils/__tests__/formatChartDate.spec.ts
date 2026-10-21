import { describe, expect, it } from 'vitest';
import {
  formatChartAxisDate,
  formatChartTime,
  formatChartTooltipDate,
} from '../formatChartDate';

describe('Chart Date Localization Utilities (#441 / #439)', () => {
  const testDate = new Date('2026-08-26T12:30:00Z');

  it('should correctly format axis dates in en-US locale', () => {
    const formatted = formatChartAxisDate(testDate, 'en-US', 'UTC');
    expect(formatted).toContain('Aug 26');
  });

  it('should correctly format tooltip dates with time and year', () => {
    const formatted = formatChartTooltipDate(testDate, 'en-US', 'UTC');
    expect(formatted).toContain('Aug 26, 2026');
  });

  it('should return empty string for invalid date inputs', () => {
    expect(formatChartAxisDate('invalid-date')).toBe('');
    expect(formatChartAxisDate(new Date(NaN))).toBe('');
  });

  it('formats chart times in UTC regardless of local timezone (#439)', () => {
    const formatted = formatChartTime(testDate, 'en-US', 'UTC');
    expect(formatted).toMatch(/12:30/);
  });

  it('formats the same instant differently for an explicit IANA zone (#439)', () => {
    const utc = formatChartTime(testDate, 'en-US', 'UTC');
    const tokyo = formatChartTime(testDate, 'en-US', 'Asia/Tokyo');
    expect(utc).toMatch(/12:30/);
    expect(tokyo).toMatch(/21:30/);
  });
});
