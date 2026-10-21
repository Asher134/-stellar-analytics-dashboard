import { describe, it, expect } from 'vitest';
import { CHART_METRIC_LABEL_KEYS, chartMetricLabelKey } from '../chartMetricLabels';
import en from '../../i18n/locales/en.json';

function lookup(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

describe('Chart metric label localization (#440)', () => {
  it('maps each metric to a chart.metrics.* key', () => {
    expect(chartMetricLabelKey('transactionCount')).toBe('chart.metrics.transactionCount');
    expect(chartMetricLabelKey('operationCount')).toBe('chart.metrics.operationCount');
    expect(chartMetricLabelKey('averageFee')).toBe('chart.metrics.averageFee');
    expect(chartMetricLabelKey('successRate')).toBe('chart.metrics.successRate');
  });

  it('resolves every metric key in the English locale', () => {
    for (const key of Object.values(CHART_METRIC_LABEL_KEYS)) {
      const value = lookup(en as Record<string, unknown>, key);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    }
  });
});
