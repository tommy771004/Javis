# Hermes Dashboard Monitoring And Shortcuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time SQLite health widget, radial task progress controls, global keyboard shortcuts, and server-side critical monitoring alerts that flow through the existing SSE channel into the Hermes dashboard.

**Architecture:** Extend the existing Express SSE stream so it can carry both sync pulses and structured alert events, expose a dedicated database-health endpoint sourced from the FTS SQLite database plus persisted vacuum metadata, and keep frontend behavior thin by pushing reusable shortcut and radial-progress math into small utility modules. The dashboard will consume the new endpoint for health metrics, listen to the existing SSE stream for alert updates, and swap the current linear-only task interaction for a radial drag control while preserving optimistic task updates.

**Tech Stack:** React 19, TypeScript, Express, better-sqlite3, node:test, existing SSE/event-stream plumbing.

---

### Task 1: Establish the reusable contracts and failing tests

**Files:**
- Create: `D:\Project\github\Javis\tests\hermesMonitoring.test.ts`
- Create: `D:\Project\github\Javis\tests\hermesDashboardInteractions.test.ts`
- Modify: `D:\Project\github\Javis\package.json`

- [ ] **Step 1: Write the failing monitoring test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDatabaseHealthSnapshot,
  collectCriticalMonitoringAlerts,
} from '../src/services/hermesMonitoring';

test('buildDatabaseHealthSnapshot reports file size, connection state, and persisted vacuum metadata', () => {
  const snapshot = buildDatabaseHealthSnapshot({
    databasePath: 'jarvis_fts.sqlite',
    fileSizeBytes: 4096,
    connectionOk: true,
    integrity: 'ok',
    lastVacuumAt: 1716500000000,
    pageCount: 12,
    pageSize: 1024,
    activeAlertCount: 0,
  });

  assert.equal(snapshot.connectionStatus, 'connected');
  assert.equal(snapshot.fileSizeBytes, 4096);
  assert.equal(snapshot.fileSizeLabel, '4.0 KB');
  assert.equal(snapshot.lastVacuumAt, 1716500000000);
  assert.equal(snapshot.integrityStatus, 'ok');
});

test('collectCriticalMonitoringAlerts emits database and MCP alerts only for critical failures', () => {
  const alerts = collectCriticalMonitoringAlerts({
    database: {
      databasePath: 'jarvis_fts.sqlite',
      fileSizeBytes: 8192,
      fileSizeLabel: '8.0 KB',
      connectionStatus: 'degraded',
      integrityStatus: 'corrupt',
      lastVacuumAt: null,
      lastVacuumLabel: 'Never',
      pageCount: 4,
      pageSize: 2048,
      activeAlertCount: 0,
    },
    mcpStatuses: [
      { name: 'sqlite', status: 'connected' },
      { name: 'filesystem', status: 'error' },
    ],
    now: 1716500100000,
  });

  assert.equal(alerts.length, 2);
  assert.deepEqual(alerts.map(alert => alert.scope), ['database', 'mcp']);
});
```

- [ ] **Step 2: Write the failing shortcut and radial interaction test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampTaskProgress,
  resolveGlobalShortcutAction,
  resolveRadialProgressFromPoint,
} from '../src/services/hermesDashboardInteractions';

test('resolveGlobalShortcutAction maps Ctrl+Enter and Ctrl+F without hijacking unrelated keys', () => {
  assert.equal(resolveGlobalShortcutAction({ key: 'Enter', ctrlKey: true, metaKey: false }), 'open-settings');
  assert.equal(resolveGlobalShortcutAction({ key: 'f', ctrlKey: true, metaKey: false }), 'focus-command-input');
  assert.equal(resolveGlobalShortcutAction({ key: 'p', ctrlKey: true, metaKey: false }), null);
});

test('resolveRadialProgressFromPoint converts drag coordinates into stepped completion percentages', () => {
  const progress = resolveRadialProgressFromPoint({
    centerX: 50,
    centerY: 50,
    clientX: 50,
    clientY: 0,
    step: 5,
  });

  assert.equal(progress, 0);
  assert.equal(clampTaskProgress(103), 100);
  assert.equal(clampTaskProgress(-2), 0);
});
```

- [ ] **Step 3: Add a runnable test command**

```json
"scripts": {
  "test": "node --import tsx --test",
  "dev": "tsx server.ts",
  "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs"
}
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test`
Expected: `ERR_MODULE_NOT_FOUND` or failing assertions for `src/services/hermesMonitoring` and `src/services/hermesDashboardInteractions`

### Task 2: Build the server-side monitoring and database health services

**Files:**
- Create: `D:\Project\github\Javis\src\services\hermesMonitoring.ts`
- Modify: `D:\Project\github\Javis\serverDb.ts`
- Modify: `D:\Project\github\Javis\server.ts`

- [ ] **Step 1: Implement the shared monitoring types and helpers**

```ts
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

export interface MonitoringAlert {
  id: string;
  scope: 'database' | 'mcp';
  severity: 'critical';
  title: string;
  message: string;
  timestamp: number;
}
```

- [ ] **Step 2: Expose SQLite diagnostics from `serverDb.ts`**

```ts
getSqliteHealth() {
  const dbPath = path.join(process.cwd(), 'jarvis_fts.sqlite');
  const pageCount = Number(this.ftsDb.prepare('PRAGMA page_count').pluck().get() || 0);
  const pageSize = Number(this.ftsDb.prepare('PRAGMA page_size').pluck().get() || 0);
  const integrityRaw = String(this.ftsDb.prepare('PRAGMA integrity_check').pluck().get() || 'unknown');

  return {
    databasePath: dbPath,
    fileSizeBytes: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0,
    connectionOk: true,
    integrity: integrityRaw === 'ok' ? 'ok' : 'corrupt',
    lastVacuumAt: this.getSettings().lastSqliteVacuumAt || null,
    pageCount,
    pageSize,
  };
}
```

- [ ] **Step 3: Add a lightweight vacuum recorder path**

```ts
recordSqliteVacuum(timestamp = Date.now()) {
  this.ftsDb.exec('VACUUM');
  this.updateSettings({ lastSqliteVacuumAt: timestamp });
}
```

- [ ] **Step 4: Wire the monitoring service and the new endpoint in `server.ts`**

```ts
app.get('/api/system/database-health', (_req, res) => {
  const raw = serverDB.getSqliteHealth();
  res.json(buildDatabaseHealthSnapshot({
    ...raw,
    activeAlertCount: activeMonitoringAlerts.length,
  }));
});
```

- [ ] **Step 5: Run tests to verify the new helpers pass**

Run: `npm test -- tests/hermesMonitoring.test.ts`
Expected: `PASS`

### Task 3: Extend SSE and add the background critical-monitor loop

**Files:**
- Modify: `D:\Project\github\Javis\server.ts`

- [ ] **Step 1: Add a shared SSE broadcast helper**

```ts
const broadcastUiEvent = (payload: unknown) => {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  uiSseClients.forEach(client => {
    try {
      client.write(message);
    } catch {}
  });
};
```

- [ ] **Step 2: Keep sync pulses, but also emit alert events**

```ts
serverDB.onDataChanged(() => {
  broadcastUiEvent({ type: 'SYNC_PULSE', timestamp: Date.now() });
});
```

- [ ] **Step 3: Add the periodic monitoring loop**

```ts
setInterval(() => {
  const database = buildDatabaseHealthSnapshot({
    ...serverDB.getSqliteHealth(),
    activeAlertCount: activeMonitoringAlerts.length,
  });

  const mcpStatuses = Array.from(activeMcpServers.entries()).map(([name, inst]) => ({
    name,
    status: inst.status,
  }));

  const nextAlerts = collectCriticalMonitoringAlerts({
    database,
    mcpStatuses,
    now: Date.now(),
  });

  if (JSON.stringify(nextAlerts) !== JSON.stringify(activeMonitoringAlerts)) {
    activeMonitoringAlerts = nextAlerts;
    broadcastUiEvent({ type: 'MONITORING_ALERTS', alerts: activeMonitoringAlerts, database });
  }
}, 15000);
```

- [ ] **Step 4: Run the focused monitoring tests again**

Run: `npm test -- tests/hermesMonitoring.test.ts`
Expected: `PASS`

### Task 4: Build the dashboard widget and radial task controls

**Files:**
- Create: `D:\Project\github\Javis\src\components\DashboardWidget.tsx`
- Create: `D:\Project\github\Javis\src\components\TaskProgressRadial.tsx`
- Create: `D:\Project\github\Javis\src\services\hermesDashboardInteractions.ts`
- Modify: `D:\Project\github\Javis\src\services\apiClient.ts`
- Modify: `D:\Project\github\Javis\src\components\HermesDashboard.tsx`

- [ ] **Step 1: Implement the interaction helpers used by the radial control**

```ts
export function clampTaskProgress(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function resolveGlobalShortcutAction(input: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
}): 'open-settings' | 'focus-command-input' | null {
  if (!(input.ctrlKey || input.metaKey)) return null;
  if (input.key === 'Enter') return 'open-settings';
  if (input.key.toLowerCase() === 'f') return 'focus-command-input';
  return null;
}
```

- [ ] **Step 2: Build `TaskProgressRadial.tsx` around those helpers**

```tsx
<svg viewBox="0 0 120 120" onPointerDown={beginDrag}>
  <circle cx="60" cy="60" r="44" />
  <path d={progressArcPath} />
  <text x="60" y="64">{progress}%</text>
</svg>
```

- [ ] **Step 3: Build `DashboardWidget.tsx` for database health and alert state**

```tsx
<div className="border border-emerald-900/40 bg-emerald-950/10 p-3">
  <div>{health.connectionStatus}</div>
  <div>{health.fileSizeLabel}</div>
  <div>{health.lastVacuumLabel}</div>
  <div>{alerts.length} critical alerts</div>
</div>
```

- [ ] **Step 4: Replace the linear-only task editing area in `HermesDashboard.tsx`**

```tsx
<TaskProgressRadial
  progress={task.progress || 0}
  disabled={task.status === 'Completed'}
  onChange={async (nextProgress) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, progress: nextProgress, status: nextProgress === 100 ? 'Completed' : 'Pending' } : t));
    await apiClient.updateTask(task.id, { progress: nextProgress });
  }}
/>;
```

- [ ] **Step 5: Hook `HermesDashboard.tsx` to the new endpoint and alert SSE payload**

```ts
const [databaseHealth, setDatabaseHealth] = useState<DatabaseHealthSnapshot | null>(null);
const [monitoringAlerts, setMonitoringAlerts] = useState<MonitoringAlert[]>([]);
```

- [ ] **Step 6: Run the interaction tests**

Run: `npm test -- tests/hermesDashboardInteractions.test.ts`
Expected: `PASS`

### Task 5: Add global keyboard shortcuts in `App.tsx`

**Files:**
- Modify: `D:\Project\github\Javis\src\App.tsx`
- Modify: `D:\Project\github\Javis\src\components\CommandInput.tsx`

- [ ] **Step 1: Forward or expose the command textarea ref**

```tsx
export const CommandInput = React.forwardRef<HTMLTextAreaElement, CommandInputProps>(function CommandInput(...) {
  return <textarea ref={mergedRef} id="chat-input" ... />;
});
```

- [ ] **Step 2: Add the App-level shortcut listener**

```ts
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    const action = resolveGlobalShortcutAction(event);
    if (!action) return;
    event.preventDefault();
    if (action === 'open-settings') setIsSettingsOpen(true);
    if (action === 'focus-command-input') commandInputRef.current?.focus();
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

- [ ] **Step 3: Run the interaction tests again**

Run: `npm test -- tests/hermesDashboardInteractions.test.ts`
Expected: `PASS`

### Task 6: Final verification

**Files:**
- Modify: `D:\Project\github\Javis\src\App.tsx`
- Modify: `D:\Project\github\Javis\src\components\CommandInput.tsx`
- Modify: `D:\Project\github\Javis\src\components\DashboardWidget.tsx`
- Modify: `D:\Project\github\Javis\src\components\HermesDashboard.tsx`
- Modify: `D:\Project\github\Javis\src\components\TaskProgressRadial.tsx`
- Modify: `D:\Project\github\Javis\src\services\apiClient.ts`
- Modify: `D:\Project\github\Javis\src\services\hermesDashboardInteractions.ts`
- Modify: `D:\Project\github\Javis\src\services\hermesMonitoring.ts`
- Modify: `D:\Project\github\Javis\server.ts`
- Modify: `D:\Project\github\Javis\serverDb.ts`
- Modify: `D:\Project\github\Javis\package.json`
- Modify: `D:\Project\github\Javis\tests\hermesDashboardInteractions.test.ts`
- Modify: `D:\Project\github\Javis\tests\hermesMonitoring.test.ts`

- [ ] **Step 1: Run the focused tests**

Run: `npm test -- tests/hermesMonitoring.test.ts tests/hermesDashboardInteractions.test.ts`
Expected: `PASS`

- [ ] **Step 2: Run static verification**

Run: `npm run lint`
Expected: `0 errors`

- [ ] **Step 3: Run production verification**

Run: `npm run build`
Expected: successful Vite build and server bundle output in `dist/`

- [ ] **Step 4: Review remaining risk**

Expected: any unverified browser-only drag feel or visual polish is called out explicitly if it cannot be exercised in this session.
