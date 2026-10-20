'use client';

import React from 'react';

export type TimeRange = '24H' | '7D' | '30D' | '1Y';
export type MetricType = 'volume' | 'tvl';

interface ChartControlsProps {
  selectedRange: TimeRange;
  onSelectRange: (range: TimeRange) => void;
  metricType: MetricType;
  onToggleMetric: (metric: MetricType) => void;
}

/**
 * ChartControls Component (#442)
 * Provides accessibly labeled time range selectors and metric toggles.
 */
export function ChartControls({ selectedRange, onSelectRange, metricType, onToggleMetric }: ChartControlsProps) {
  const ranges: TimeRange[] = ['24H', '7D', '30D', '1Y'];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-4" role="region" aria-label="Chart controls and filters">
      {/* Time Range Selector */}
      <div role="group" aria-label="Select time range filter" className="flex space-x-1 bg-gray-100 p-1 rounded-md">
        {ranges.map((range) => {
          const isSelected = selectedRange === range;
          return (
            <button
              key={range}
              type="button"
              aria-pressed={isSelected}
              aria-label={`Show data for past ${range}`}
              onClick={() => onSelectRange(range)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                isSelected ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range}
            </button>
          );
        })}
      </div>

      {/* Metric Toggle Group */}
      <div role="group" aria-label="Select metric view" className="flex space-x-2">
        <button
          type="button"
          aria-pressed={metricType === 'volume'}
          aria-label="Toggle Volume metric view"
          onClick={() => onToggleMetric('volume')}
          className={`px-3 py-1 text-xs font-medium rounded border ${
            metricType === 'volume' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-700'
          }`}
        >
          Volume
        </button>
        <button
          type="button"
          aria-pressed={metricType === 'tvl'}
          aria-label="Toggle Total Value Locked metric view"
          onClick={() => onToggleMetric('tvl')}
          className={`px-3 py-1 text-xs font-medium rounded border ${
            metricType === 'tvl' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-700'
          }`}
        >
          TVL
        </button>
      </div>
    </div>
  );
}