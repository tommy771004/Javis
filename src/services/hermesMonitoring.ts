export interface RawDatabaseHealthInput {
  databasePath: string;
  fileSizeBytes: number;
  connectionOk: boolean;
  integrity: 'ok' | 'corrupt' | 'unknown';
  lastVacuumAt: number | null;
  pageCount: number;
  pageSize: number;
  activeAlertCount: number;
}

export interface DatabaseHealthSnapshot {
  databasePath: string;
  fileSizeBytes: number;
  fileSizeLabel: string;
  connectionStatus: 'connected' | 'degraded';
  integrityStatus: 'ok' | 'corrupt' | 'unknown';
  lastVacuumAt: number | null;
  lastVacuumLabel: string;
  pageCount: number;
  pageSize: number;
  activeAlertCount: number;
}

export interface MonitoringMcpStatus {
  name: string;
  status: 'connecting' | 'connected' | 'error' | 'disconnected' | string;
}

export interface MonitoringAlert {
  id: string;
  scope: 'database' | 'mcp';
  severity: 'critical';
  title: string;
  message: string;
  timestamp: number;
}

export interface CriticalMonitoringInput {
  database: DatabaseHealthSnapshot;
  mcpStatuses: MonitoringMcpStatus[];
  now: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function formatTimestamp(timestamp: number | null): string {
  if (!timestamp) {
    return 'Never';
  }

  return new Date(timestamp).toISOString();
}

export function buildDatabaseHealthSnapshot(input: RawDatabaseHealthInput): DatabaseHealthSnapshot {
  return {
    databasePath: input.databasePath,
    fileSizeBytes: input.fileSizeBytes,
    fileSizeLabel: formatBytes(input.fileSizeBytes),
    connectionStatus: input.connectionOk ? 'connected' : 'degraded',
    integrityStatus: input.integrity,
    lastVacuumAt: input.lastVacuumAt,
    lastVacuumLabel: formatTimestamp(input.lastVacuumAt),
    pageCount: input.pageCount,
    pageSize: input.pageSize,
    activeAlertCount: input.activeAlertCount,
  };
}

export function collectCriticalMonitoringAlerts(input: CriticalMonitoringInput): MonitoringAlert[] {
  const alerts: MonitoringAlert[] = [];

  if (input.database.connectionStatus !== 'connected' || input.database.integrityStatus === 'corrupt') {
    alerts.push({
      id: `database-${input.database.connectionStatus}-${input.database.integrityStatus}`,
      scope: 'database',
      severity: 'critical',
      title: 'SQLite Health Critical',
      message:
        input.database.integrityStatus === 'corrupt'
          ? `Integrity check failed for ${input.database.databasePath}.`
          : `SQLite connection degraded for ${input.database.databasePath}.`,
      timestamp: input.now,
    });
  }

  input.mcpStatuses
    .filter(status => status.status === 'error' || status.status === 'disconnected')
    .forEach(status => {
      alerts.push({
        id: `mcp-${status.name}-${status.status}`,
        scope: 'mcp',
        severity: 'critical',
        title: 'MCP Process Critical',
        message: `MCP process '${status.name}' is ${status.status}.`,
        timestamp: input.now,
      });
    });

  return alerts;
}
