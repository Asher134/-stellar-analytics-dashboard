'use client';

import React from 'react';
import { FreshnessIndicator } from './FreshnessIndicator';

interface DashboardHeaderProps {
  title: string;
  lastUpdated: Date;
  onRefresh: () => void;
  refreshing: boolean;
}

export function DashboardHeader({ title, lastUpdated, onRefresh, refreshing }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">Real-time telemetry and analytics overview for Stellar network.</p>
      </div>
      <FreshnessIndicator lastUpdated={lastUpdated} onRefresh={onRefresh} refreshing={refreshing} />
    </div>
  );
}