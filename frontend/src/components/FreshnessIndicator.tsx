'use client';

import React, { useState, useEffect } from 'react';

interface FreshnessIndicatorProps {
  lastUpdated: Date;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/**
 * FreshnessIndicator Component (#444)
 * Displays relative time since last data fetch and updates on a 1-second timer.
 */
export function FreshnessIndicator({ lastUpdated, onRefresh, refreshing = false }: FreshnessIndicatorProps) {
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  useEffect(() => {
    const calculateSeconds = () => {
      const diff = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
      setSecondsAgo(Math.max(0, diff));
    };

    calculateSeconds();
    const interval = setInterval(calculateSeconds, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const formatRelativeTime = (secs: number) => {
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="flex items-center space-x-3 text-xs text-gray-500 bg-white px-3 py-1.5 rounded-md border shadow-sm">
      <span className="flex items-center space-x-1.5">
        <span className={`h-2 w-2 rounded-full ${refreshing ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
        <span>Updated {formatRelativeTime(secondsAgo)}</span>
      </span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 transition-colors"
          title="Refresh data now"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      )}
    </div>
  );
}