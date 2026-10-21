/**
 * NetworkComparisonChart (issue #243, #438)
 *
 * Displays side-by-side trend comparison charts for mainnet and testnet performance.
 * Metrics are loaded from live Horizon endpoints (no simulated testnet series).
 */
import { ExportControls } from './ExportControls';
import { ChartSkeleton } from './Skeleton';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { chartMetricLabelKey, type ChartMetricType } from '../utils/chartMetricLabels';

type MetricPoint = HorizonMetricPoint;

type MetricType = ChartMetricType;
type TimeRange = '24h' | '7d' | '30d';

interface NetworkData {
  network: 'mainnet' | 'testnet';
  metrics: MetricPoint[];
}

function formatTime(iso: string, locale: string = 'en-US'): string {
  return formatChartTime(iso, locale, 'UTC');
}

function formatDate(iso: string, locale: string = 'en-US'): string {
  return formatChartAxisDate(iso, locale, 'UTC');
}

function getTimeRangeHours(range: TimeRange): number {
  switch (range) {
    case '24h': return 24;
    case '7d': return 7 * 24;
    case '30d': return 30 * 24;
    default: return 24;
  }
}

function getMetricValue(point: MetricPoint, metric: MetricType): number {
  switch (metric) {
    case 'transactionCount': return point.transactionCount;
    case 'operationCount': return point.operationCount;
    case 'averageFee': return point.averageFee;
    case 'successRate': return point.successRate;
  }
}

export function NetworkComparisonChart() {
  const { t, i18n } = useTranslation();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('transactionCount');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const metricLabel = t(chartMetricLabelKey(selectedMetric));

  const hours = getTimeRangeHours(timeRange);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      const now = new Date();
      const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
      const endTime = now.toISOString();
      const range = { startTime, endTime };

      try {
        // Issue #438 – real Horizon data for both networks (no simulated testnet series).
        const [mainnet, testnet] = await Promise.all([
          fetchHorizonNetworkMetrics('mainnet', range),
          fetchHorizonNetworkMetrics('testnet', range),
        ]);
        if (cancelled) return;
        setMainnetMetrics(mainnet);
        setTestnetMetrics(testnet);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, [hours, refreshTick]);

  const refetch = () => setRefreshTick((n) => n + 1);

  const currentMetrics = mainnetMetrics;

  const networks: NetworkData[] = [
    { network: 'mainnet', metrics: mainnetMetrics },
    { network: 'testnet', metrics: testnetMetrics },
  ];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && currentMetrics.length === 0) {
    return (
      <section className="card" aria-busy="true" aria-label="Loading network comparison chart">
        <h3
          style={{
            margin: '0 0 12px',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-secondary)',
          }}
        >
          {t('chart.networkComparison')}
        </h3>
        <ChartSkeleton height="200px" />
      </section>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error && currentMetrics.length === 0) {
    return (
      <section className="card" role="alert">
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-secondary)',
          }}
        >
          {t('chart.networkComparison')}
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--color-error)' }}>
          {error.message}
        </p>
        <button
          onClick={() => refetch()}
          style={{
            background: 'var(--color-input-disabled)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('app.retry')}
        </button>
      </section>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (currentMetrics.length === 0) {
    return (
      <section className="card">
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-secondary)',
          }}
        >
          {t('chart.networkComparison')}
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
          {t('chart.noData')}
        </p>
      </section>
    );
  }

  // Calculate max value for scaling
  const allValues = networks.flatMap(n => n.metrics.map(m => getMetricValue(m, selectedMetric)));
  const maxValue = Math.max(...allValues, 1);

  // Colors for each network
  const networkColors: Record<'mainnet' | 'testnet', string> = {
    mainnet: 'var(--color-primary)',
    testnet: 'var(--color-warning)',
  };

  return (
    <section className="card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-secondary)',
          }}
        >
          {t('chart.networkComparison')}
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Metric selector */}
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-input-bg)',
              color: 'var(--color-text-primary)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value="transactionCount">{t(chartMetricLabelKey('transactionCount'))}</option>
            <option value="operationCount">{t(chartMetricLabelKey('operationCount'))}</option>
            <option value="averageFee">{t(chartMetricLabelKey('averageFee'))}</option>
            <option value="successRate">{t(chartMetricLabelKey('successRate'))}</option>
          </select>

          {/* Time range selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-input-bg)',
              color: 'var(--color-text-primary)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
          </select>

          {/* Export controls */}
          <ExportControls 
            data={networks.flatMap(n => n.metrics.map(m => ({ ...m, network: n.network })))} 
            baseFilename={`network-comparison-${selectedMetric}-${timeRange}`} 
            disabled={loading} 
          />

          {/* Refresh button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {loading && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                ↻ {t('chart.updating')}
              </span>
            )}
            <button
              onClick={() => refetch()}
              disabled={loading}
              aria-label={t('chart.refreshChart')}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '4px 8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
              }}
            >
              ↻
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '12px' }}>
        {networks.map(({ network }) => (
          <div key={network} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                background: networkColors[network],
              }}
            />
            <span style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
              {network}
            </span>
          </div>
        ))}
      </div>

      {/* Comparison chart */}
      <div
        role="img"
        aria-label={t('chart.metrics.ariaLabel', { metric: metricLabel })}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          height: '200px',
        }}
      >
        {networks.map(({ network, metrics }) => {
          const networkMax = Math.max(...metrics.map(m => getMetricValue(m, selectedMetric)), 1);
          
          return (
            <div key={network} style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '2px',
                  height: '80px',
                  padding: '0 4px',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                {metrics.map((m, i) => {
                  const value = getMetricValue(m, selectedMetric);
                  const heightPct = (value / maxValue) * 100;
                  return (
                    <div
                      key={i}
                      title={`${network}: ${formatTime(m.timestamp, i18n.language)} - ${value.toLocaleString(i18n.language)}`}
                      style={{
                        flex: 1,
                        height: `${Math.max(heightPct, 2)}%`,
                        background: networkColors[network],
                        borderRadius: '2px 2px 0 0',
                        transition: 'height 0.3s ease',
                        minWidth: '2px',
                        opacity: 0.8,
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>
                {network} - Total: {metrics.reduce((sum, m) => sum + getMetricValue(m, selectedMetric), 0).toLocaleString(i18n.language)}
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
          {formatDate(currentMetrics[0]?.timestamp, i18n.language)}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
          {formatDate(currentMetrics[currentMetrics.length - 1]?.timestamp, i18n.language)}
        </span>
      </div>

      <p style={{ margin: '8px 0 0', fontSize: '10px', color: 'var(--color-text-disabled)' }}>
        {currentMetrics.length} data points per network · {t('chart.autoRefresh')}
      </p>
    </section>
  );
}
