import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectWorkspaceSearchMatches,
  isWorkspaceDocSearchPathAllowed,
} from '../src/services/workspaceDocs';

test('isWorkspaceDocSearchPathAllowed excludes generated or sensitive workspace paths', () => {
  assert.equal(isWorkspaceDocSearchPathAllowed('src/components/HermesDashboard.tsx'), true);
  assert.equal(isWorkspaceDocSearchPathAllowed('docs/hermes-spec.md'), true);
  assert.equal(isWorkspaceDocSearchPathAllowed('node_modules/react/index.js'), false);
  assert.equal(isWorkspaceDocSearchPathAllowed('.env'), false);
  assert.equal(isWorkspaceDocSearchPathAllowed('task_reports/report.md'), false);
});

test('collectWorkspaceSearchMatches ranks real workspace files and builds excerpts around the query', () => {
  const matches = collectWorkspaceSearchMatches(
    [
      {
        filePath: 'src/components/HermesDashboard.tsx',
        content: 'Docs panel calls serverDB queryFTS for workspace code explanations, workspace task summaries, and file hints.',
      },
      {
        filePath: 'docs/hermes-spec.md',
        content: 'Hermes spec describes the monitoring panel and workspace documentation viewer.',
      },
      {
        filePath: 'src/components/SysMonitor.tsx',
        content: 'This file does not mention the search keyword at all.',
      },
    ],
    'workspace',
    5,
  );

  assert.equal(matches.length, 2);
  assert.equal(matches[0].filePath, 'src/components/HermesDashboard.tsx');
  assert.match(matches[0].excerpt, /workspace/i);
  assert.equal(matches[0].source, 'workspace-file');
});
