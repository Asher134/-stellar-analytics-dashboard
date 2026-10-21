/**
 * Fetch real network metrics from Stellar Horizon for comparison charts (#438).
 * Replaces simulated/random testnet data with live ledger aggregates.
 */

export type HorizonNetwork = 'mainnet' | 'testnet';

export interface HorizonMetricPoint {
  timestamp: string;
  transactionCount: number;
  operationCount: number;
  averageFee: number;
  successRate: number;
}

const HORIZON_URLS: Record<HorizonNetwork, string> = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
};

interface HorizonLedger {
  closed_at: string;
  successful_transaction_count: number;
  failed_transaction_count: number;
  operation_count: number;
  base_fee_in_stroops: number;
  paging_token: string;
}

interface HorizonLedgersResponse {
  _embedded?: { records?: HorizonLedger[] };
  _links?: { next?: { href?: string } };
}

function hourBucketIso(closedAt: string): string {
  const d = new Date(closedAt);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

/**
 * Aggregate Horizon ledger records into hourly metric points.
 * Exported for unit tests.
 */
export function aggregateLedgersToMetrics(
  ledgers: HorizonLedger[],
  timeRange: { startTime: string; endTime: string }
): HorizonMetricPoint[] {
  const startMs = new Date(timeRange.startTime).getTime();
  const endMs = new Date(timeRange.endTime).getTime();
  const buckets = new Map<
    string,
    { txs: number; ops: number; feeSum: number; feeSamples: number; ok: number; fail: number }
  >();

  for (const ledger of ledgers) {
    const closedMs = new Date(ledger.closed_at).getTime();
    if (Number.isNaN(closedMs) || closedMs < startMs || closedMs > endMs) continue;

    const key = hourBucketIso(ledger.closed_at);
    const bucket = buckets.get(key) ?? {
      txs: 0,
      ops: 0,
      feeSum: 0,
      feeSamples: 0,
      ok: 0,
      fail: 0,
    };

    const ok = Number(ledger.successful_transaction_count) || 0;
    const fail = Number(ledger.failed_transaction_count) || 0;
    bucket.txs += ok + fail;
    bucket.ops += Number(ledger.operation_count) || 0;
    bucket.ok += ok;
    bucket.fail += fail;
    bucket.feeSum += Number(ledger.base_fee_in_stroops) || 0;
    bucket.feeSamples += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([timestamp, b]) => {
      const total = b.ok + b.fail;
      return {
        timestamp,
        transactionCount: b.txs,
        operationCount: b.ops,
        averageFee: b.feeSamples > 0 ? b.feeSum / b.feeSamples : 0,
        successRate: total > 0 ? (b.ok / total) * 100 : 100,
      };
    });
}

/**
 * Page Horizon `/ledgers` until the window is covered or `maxPages` is hit.
 */
export async function fetchHorizonNetworkMetrics(
  network: HorizonNetwork,
  timeRange: { startTime: string; endTime: string },
  options?: { maxPages?: number; fetchImpl?: typeof fetch }
): Promise<HorizonMetricPoint[]> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const maxPages = options?.maxPages ?? 10;
  const startMs = new Date(timeRange.startTime).getTime();
  const base = HORIZON_URLS[network];

  const collected: HorizonLedger[] = [];
  let url: string | null = `${base}/ledgers?order=desc&limit=200`;

  for (let page = 0; page < maxPages && url; page++) {
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(`Horizon ${network} request failed: ${response.status}`);
    }

    const body = (await response.json()) as HorizonLedgersResponse;
    const records = body._embedded?.records ?? [];
    if (records.length === 0) break;

    collected.push(...records);

    const oldest = records[records.length - 1];
    const oldestMs = new Date(oldest.closed_at).getTime();
    if (!Number.isNaN(oldestMs) && oldestMs < startMs) break;

    url = body._links?.next?.href ?? null;
  }

  return aggregateLedgersToMetrics(collected, timeRange);
}
