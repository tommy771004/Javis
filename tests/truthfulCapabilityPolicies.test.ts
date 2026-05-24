import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAutomationCapabilities,
  resolveEngineCapability,
  resolveRebootProbeDelayMs,
} from '../src/services/truthfulCapabilityPolicies';

test('resolveEngineCapability does not claim quantum engines without a real provider', () => {
  const capability = resolveEngineCapability('stark-quantum', {});

  assert.equal(capability.available, false);
  assert.equal(capability.simulated, false);
  assert.match(capability.reason, /not connected/i);
});

test('resolveEngineCapability reports concrete local engines without simulation language', () => {
  const capability = resolveEngineCapability('powershell', {});

  assert.equal(capability.available, true);
  assert.equal(capability.simulated, false);
  assert.equal(capability.engine, 'powershell');
});

test('buildAutomationCapabilities names the missing cron and inbound listener surfaces', () => {
  const capabilities = buildAutomationCapabilities();

  assert.equal(capabilities.manualRoutineExecution, true);
  assert.equal(capabilities.outboundWebhooks, true);
  assert.equal(capabilities.cronScheduler, false);
  assert.equal(capabilities.inboundWebhookListener, false);
});

test('resolveRebootProbeDelayMs clamps probe cadence as polling, not animation duration', () => {
  assert.equal(resolveRebootProbeDelayMs(10), 250);
  assert.equal(resolveRebootProbeDelayMs(750), 750);
  assert.equal(resolveRebootProbeDelayMs(5000), 2000);
});
