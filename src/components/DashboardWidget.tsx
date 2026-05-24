import React from 'react';
import type { DatabaseHealthSnapshot, MonitoringAlert } from '../services/apiClient';

interface DashboardWidgetProps {
  health: DatabaseHealthSnapshot | null;
  alerts: MonitoringAlert[];
  isLoading?: boolean;
}

export function DashboardWidget({ health, alerts, isLoading = false }: DashboardWidgetProps) {
  const criticalCount = alerts.length;

  return (
    <div className="border border-emerald-900/40 bg-emerald-950/10 px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-900/30 pb-2">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.28em] text-emerald-500">SQLite Health Monitor</div>
          <div className="mt-1 text-[8px] uppercase tracking-[0.18em] text-emerald-700">
            {health?.databasePath || 'Awaiting database telemetry'}
          </div>
        </div>
        <div className={`px-2 py-1 text-[8px] font-bold uppercase tracking-[0.2em] border ${
          criticalCount > 0
            ? 'border-red-500/40 bg-red-950/20 text-red-300'
            : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
        }`}>
          {criticalCount > 0 ? `${criticalCount} critical alert${criticalCount === 1 ? '' : 's'}` : 'Nominal'}
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        <div className="border border-emerald-900/25 bg-black/20 px-2 py-2">
          <div className="text-[7px] uppercase tracking-[0.2em] text-emerald-700">Connection</div>
          <div className={`mt-1 text-[10px] font-bold uppercase ${
            health?.connectionStatus === 'connected' ? 'text-emerald-300' : 'text-red-300'
          }`}>
            {isLoading ? 'Loading' : health?.connectionStatus || 'unknown'}
          </div>
        </div>

        <div className="border border-emerald-900/25 bg-black/20 px-2 py-2">
          <div className="text-[7px] uppercase tracking-[0.2em] text-emerald-700">File Size</div>
          <div className="mt-1 text-[10px] font-bold text-emerald-300">
            {isLoading ? 'Loading' : health?.fileSizeLabel || '0 B'}
          </div>
        </div>

        <div className="border border-emerald-900/25 bg-black/20 px-2 py-2">
          <div className="text-[7px] uppercase tracking-[0.2em] text-emerald-700">Last Vacuum</div>
          <div className="mt-1 text-[10px] font-bold text-emerald-300">
            {isLoading ? 'Loading' : health?.lastVacuumLabel || 'Never'}
          </div>
        </div>

        <div className="border border-emerald-900/25 bg-black/20 px-2 py-2">
          <div className="text-[7px] uppercase tracking-[0.2em] text-emerald-700">Pages</div>
          <div className="mt-1 text-[10px] font-bold text-emerald-300">
            {isLoading ? 'Loading' : `${health?.pageCount || 0} x ${health?.pageSize || 0}`}
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="mt-2 space-y-1">
          {alerts.slice(0, 3).map((alert) => (
            <div key={alert.id} className="border border-red-500/30 bg-red-950/20 px-2 py-1.5 text-[8px] text-red-200">
              <span className="font-bold uppercase tracking-[0.18em] text-red-300">{alert.title}</span>
              <span className="ml-2 text-red-200/90">{alert.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
