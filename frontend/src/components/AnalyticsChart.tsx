'use client';

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { formatChartAxisDate, formatChartTooltipDate } from '@/utils/formatChartDate';

interface DataPoint {
  timestamp: string | number | Date;
  value: number;
}

interface AnalyticsChartProps {
  data: DataPoint[];
  title: string;
}

/**
 * AnalyticsChart Component (#441)
 * Displays time-series data with localized X-axis and tooltip dates.
 */
export function AnalyticsChart({ data, title }: AnalyticsChartProps) {
  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-bold mb-4 text-gray-900">{title}</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(val) => formatChartAxisDate(val)} 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip 
              labelFormatter={(val) => formatChartTooltipDate(val)}
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '0.375rem', borderColor: '#e5e7eb' }}
            />
            <Area type="monotone" dataKey="value" stroke="#4f46e5" fill="#e0e7ff" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}