export interface WorkspaceDocumentRecord {
  filePath: string;
  content: string;
}

export interface WorkspaceSearchMatch {
  filePath: string;
  excerpt: string;
  score: number;
  line: number;
  source: 'workspace-file';
}

const BLOCKED_SEGMENTS = [
  'node_modules/',
  '.git/',
  'dist/',
  'task_reports/',
  '.omx/',
];

const BLOCKED_FILES = new Set([
  '.env',
  'database.enc',
  'jarvis_fts.sqlite',
  'package-lock.json',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.css',
  '.html',
]);

export function isWorkspaceDocSearchPathAllowed(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const lastSegment = normalized.split('/').at(-1) || normalized;

  if (BLOCKED_FILES.has(lastSegment)) {
    return false;
  }

  if (BLOCKED_SEGMENTS.some((segment) => normalized.includes(segment))) {
    return false;
  }

  const dotIndex = normalized.lastIndexOf('.');
  const extension = dotIndex >= 0 ? normalized.slice(dotIndex) : '';
  return ALLOWED_EXTENSIONS.has(extension);
}

export function collectWorkspaceSearchMatches(
  documents: WorkspaceDocumentRecord[],
  query: string,
  limit = 8,
): WorkspaceSearchMatch[] {
  const terms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9_./-]/g, ''))
    .filter(Boolean);

  if (terms.length === 0) {
    return [];
  }

  return documents
    .filter((document) => isWorkspaceDocSearchPathAllowed(document.filePath))
    .map((document) => {
      const haystack = document.content.toLowerCase();
      let score = 0;
      let firstMatchIndex = -1;

      for (const term of terms) {
        const matches = haystack.split(term).length - 1;
        if (matches > 0) {
          score += matches;
          if (firstMatchIndex === -1) {
            firstMatchIndex = haystack.indexOf(term);
          }
        }
      }

      if (score === 0 || firstMatchIndex === -1) {
        return null;
      }

      return {
        filePath: document.filePath,
        excerpt: buildExcerpt(document.content, firstMatchIndex),
        score,
        line: document.content.slice(0, firstMatchIndex).split(/\r?\n/).length,
        source: 'workspace-file' as const,
      };
    })
    .filter((match): match is WorkspaceSearchMatch => match !== null)
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath))
    .slice(0, limit);
}

function buildExcerpt(content: string, startIndex: number) {
  const excerptRadius = 80;
  const start = Math.max(0, startIndex - excerptRadius);
  const end = Math.min(content.length, startIndex + excerptRadius);
  return content
    .slice(start, end)
    .replace(/\s+/g, ' ')
    .trim();
}
