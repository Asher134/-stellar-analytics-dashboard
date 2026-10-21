/**
 * i18n keys for network comparison chart metric labels (#440).
 */

export type ChartMetricType =
  | 'transactionCount'
  | 'operationCount'
  | 'averageFee'
  | 'successRate';

export const CHART_METRIC_LABEL_KEYS: Record<ChartMetricType, string> = {
  transactionCount: 'chart.metrics.transactionCount',
  operationCount: 'chart.metrics.operationCount',
  averageFee: 'chart.metrics.averageFee',
  successRate: 'chart.metrics.successRate',
};

export function chartMetricLabelKey(metric: ChartMetricType): string {
  return CHART_METRIC_LABEL_KEYS[metric];
}
