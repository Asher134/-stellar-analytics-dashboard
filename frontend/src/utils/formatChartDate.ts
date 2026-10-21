/**
 * Localizes chart dates based on user locale, granularity, and timezone.
 * Issues #441 (locale) and #439 (stable timezone handling).
 */

export type ChartTimezone = 'UTC' | 'local' | string;

function resolveTimeZone(timezone: ChartTimezone = 'UTC'): string | undefined {
  if (timezone === 'UTC') return 'UTC';
  if (timezone === 'local') return undefined; // Intl uses runtime local zone
  return timezone;
}

export function formatChartDate(
  dateInput: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  locale: string = 'en-US',
  timezone: ChartTimezone = 'UTC'
): string {
  try {
    const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    const timeZone = resolveTimeZone(timezone);
    return new Intl.DateTimeFormat(locale, {
      ...options,
      ...(timeZone ? { timeZone } : {}),
    }).format(dateObj);
  } catch (e) {
    console.error('Failed to format chart date', e);
    return '';
  }
}

export function formatChartAxisDate(
  dateInput: Date | string | number,
  locale: string = 'en-US',
  timezone: ChartTimezone = 'UTC'
): string {
  return formatChartDate(dateInput, { month: 'short', day: 'numeric' }, locale, timezone);
}

export function formatChartTooltipDate(
  dateInput: Date | string | number,
  locale: string = 'en-US',
  timezone: ChartTimezone = 'UTC'
): string {
  return formatChartDate(
    dateInput,
    { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    locale,
    timezone
  );
}

/** Stable chart tick/tooltip time — defaults to UTC (#439). */
export function formatChartTime(
  dateInput: Date | string | number,
  locale: string = 'en-US',
  timezone: ChartTimezone = 'UTC'
): string {
  return formatChartDate(
    dateInput,
    { hour: '2-digit', minute: '2-digit', hour12: false },
    locale,
    timezone
  );
}
