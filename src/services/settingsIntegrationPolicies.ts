export function formatCliPackageMap(packageMap: Record<string, string> | undefined): string {
  return JSON.stringify(packageMap ?? {}, null, 2);
}

export function parseCliPackageMapInput(raw: string): Record<string, string> {
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('CLI package map must be a JSON object with string to string entries.');
  }

  const entries = Object.entries(parsed) as Array<[string, unknown]>;
  for (const [key, value] of entries) {
    if (typeof key !== 'string' || typeof value !== 'string') {
      throw new Error('CLI package map must be a JSON object with string to string entries.');
    }
  }

  return entries.reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = value as string;
    return acc;
  }, {});
}

export function resolveSecurityAuditTransportLabel(streamPath: string): string {
  return `SSE ${streamPath}`;
}
