/**
 * Localizes chart dates based on user locale and time granularity. (#441)
 */
export function formatChartDate(
  dateInput: Date | string | number,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  locale: string = 'en-US'
): string {
  try {
    const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch (e) {
    console.error('Failed to format chart date', e);
    return '';
  }
}

export function formatChartAxisDate(dateInput: Date | string | number, locale: string = 'en-US'): string {
  return formatChartDate(dateInput, { month: 'short', day: 'numeric' }, locale);
}

export function formatChartTooltipDate(dateInput: Date | string | number, locale: string = 'en-US'): string {
  return formatChartDate(dateInput, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }, locale);
}