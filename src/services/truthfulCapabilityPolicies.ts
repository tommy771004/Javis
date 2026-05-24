export interface EngineCapability {
  engine: string;
  available: boolean;
  simulated: boolean;
  reason?: string;
}

export function resolveEngineCapability(
  engine: string,
  env: Record<string, string | undefined> = {}
): EngineCapability {
  if (engine === 'azure-quantum' || engine === 'stark-quantum') {
    const hasProvider = Boolean(env.AZURE_QUANTUM_WORKSPACE || env.AZURE_QUANTUM_SUBSCRIPTION_ID);
    return {
      engine,
      available: hasProvider,
      simulated: false,
      reason: hasProvider
        ? 'Azure Quantum environment variables are present; provider verification is still required before execution.'
        : 'Quantum execution is not connected to a real provider in this workspace.',
    };
  }

  if (engine === 'powershell' || engine === 'copilot' || engine === 'github-cli') {
    return {
      engine,
      available: true,
      simulated: false,
    };
  }

  return {
    engine,
    available: false,
    simulated: false,
    reason: 'Unknown execution engine.',
  };
}

export function buildAutomationCapabilities() {
  return {
    manualRoutineExecution: true,
    outboundWebhooks: true,
    targetedWebhookMarkers: true,
    cronScheduler: false,
    inboundWebhookListener: false,
    notes: [
      'Routines can be manually executed or resolved from connected MCP prompt servers.',
      'Webhooks are outbound delivery targets only.',
      'No cron scheduler or inbound webhook listener is currently running in this process.',
    ],
  };
}

export function resolveRebootProbeDelayMs(requestedMs?: number): number {
  const value = Number.isFinite(requestedMs) ? Number(requestedMs) : 750;
  return Math.max(250, Math.min(2000, value));
}
