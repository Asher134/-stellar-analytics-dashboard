import { describe, expect, it, vi } from 'vitest';
import {
  aggregateLedgersToMetrics,
  fetchHorizonNetworkMetrics,
} from '../fetchHorizonNetworkMetrics';

describe('fetchHorizonNetworkMetrics (#438)', () => {
  it('aggregates ledgers into hourly metric points', () => {
    const points = aggregateLedgersToMetrics(
      [
        {
          closed_at: '2026-08-26T12:10:00Z',
          successful_transaction_count: 8,
          failed_transaction_count: 2,
          operation_count: 20,
          base_fee_in_stroops: 100,
          paging_token: '1',
        },
        {
          closed_at: '2026-08-26T12:40:00Z',
          successful_transaction_count: 2,
          failed_transaction_count: 0,
          operation_count: 5,
          base_fee_in_stroops: 200,
          paging_token: '2',
        },
        {
          closed_at: '2026-08-26T11:50:00Z',
          successful_transaction_count: 1,
          failed_transaction_count: 0,
          operation_count: 1,
          base_fee_in_stroops: 100,
          paging_token: '3',
        },
      ],
      {
        startTime: '2026-08-26T11:00:00Z',
        endTime: '2026-08-26T13:00:00Z',
      }
    );

    expect(points).toHaveLength(2);
    expect(points[0].timestamp).toBe('2026-08-26T11:00:00.000Z');
    expect(points[0].transactionCount).toBe(1);
    expect(points[1].timestamp).toBe('2026-08-26T12:00:00.000Z');
    expect(points[1].transactionCount).toBe(12);
    expect(points[1].operationCount).toBe(25);
    expect(points[1].averageFee).toBe(150);
    expect(points[1].successRate).toBeCloseTo(83.333, 2);
  });

  it('pages Horizon until the start of the window', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _embedded: {
            records: [
              {
                closed_at: '2026-08-26T13:00:00Z',
                successful_transaction_count: 1,
                failed_transaction_count: 0,
                operation_count: 1,
                base_fee_in_stroops: 100,
                paging_token: 'a',
              },
            ],
          },
          _links: { next: { href: 'https://horizon-testnet.stellar.org/ledgers?cursor=a&order=desc' } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _embedded: {
            records: [
              {
                closed_at: '2026-08-26T10:00:00Z',
                successful_transaction_count: 3,
                failed_transaction_count: 1,
                operation_count: 4,
                base_fee_in_stroops: 100,
                paging_token: 'b',
              },
            ],
          },
          _links: { next: { href: 'https://horizon-testnet.stellar.org/ledgers?cursor=b&order=desc' } },
        }),
      });

    const points = await fetchHorizonNetworkMetrics(
      'testnet',
      {
        startTime: '2026-08-26T11:00:00Z',
        endTime: '2026-08-26T14:00:00Z',
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch, maxPages: 5 }
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(points).toHaveLength(1);
    expect(points[0].transactionCount).toBe(1);
  });
});
