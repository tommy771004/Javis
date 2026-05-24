export interface SecuritySignalSnapshot {
  isDocker: boolean;
  isWsl: boolean;
  trueSandboxApplied: boolean;
  defenderActive: boolean;
  firewallActive: boolean;
  isRoot: boolean;
  isPrivilegedPathProtected: boolean;
  memoryHardened: boolean;
  cveCount: number;
}

export interface StrictSandboxSnapshot {
  isDocker: boolean;
  isWsl: boolean;
  trueSandboxApplied: boolean;
  memoryHardened: boolean;
  isRoot: boolean;
  isPrivilegedPathProtected: boolean;
}

export type FtsScoreKind = 'sqlite-bm25' | 'fallback-bm25';

export function summarizeSecuritySignals(snapshot: SecuritySignalSnapshot): string {
  const positiveSignals = [
    snapshot.isDocker,
    snapshot.isWsl,
    snapshot.trueSandboxApplied,
    snapshot.defenderActive,
    snapshot.firewallActive,
    !snapshot.isRoot,
    snapshot.isPrivilegedPathProtected,
    snapshot.memoryHardened,
  ].filter(Boolean).length;

  const cautions = [
    snapshot.cveCount > 0,
    !snapshot.memoryHardened,
    snapshot.isRoot,
    !snapshot.isPrivilegedPathProtected,
    !snapshot.defenderActive,
    !snapshot.firewallActive,
  ].filter(Boolean).length;

  return `Signals ${positiveSignals} positive / ${cautions} caution (CVEs: ${snapshot.cveCount})`;
}

export function resolveStrictSandboxRequirement(snapshot: StrictSandboxSnapshot): boolean {
  const hasStrongContainment =
    snapshot.isDocker ||
    snapshot.isWsl ||
    snapshot.trueSandboxApplied ||
    snapshot.memoryHardened;

  if (snapshot.isRoot && !snapshot.isPrivilegedPathProtected) {
    return true;
  }

  return !hasStrongContainment;
}

export function formatFtsScoreLabel(score: number, scoreKind: FtsScoreKind): string {
  const roundedScore = Number.isFinite(score)
    ? Math.sign(score) * (Math.round(Math.abs(score) * 100) / 100)
    : 0;
  const normalized = roundedScore.toFixed(2);
  return scoreKind === 'sqlite-bm25'
    ? `BM25 ${normalized}`
    : `Fallback BM25 ${normalized}`;
}

export function calculateHeapHeadroomPercent(heapUsed: number, heapSizeLimit: number): number {
  if (!Number.isFinite(heapUsed) || !Number.isFinite(heapSizeLimit) || heapSizeLimit <= 0) {
    return 0;
  }

  const remainingRatio = 1 - (heapUsed / heapSizeLimit);
  return Math.max(0, Math.min(100, Math.round(remainingRatio * 100)));
}
