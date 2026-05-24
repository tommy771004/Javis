const fs = require('fs');

// 1. Clean serverDb.ts
let dbCode = fs.readFileSync('serverDb.ts', 'utf8');

dbCode = dbCode.replace(/private systemLogs: SystemLogEntry\[\] = \[[^\]]+\];/, 'private systemLogs: SystemLogEntry[] = [];');

const costLogsTarget = `    const initialCostLogs: DbCostLog[] = [
      {
        id: 'tx-init-01',
        timestamp: Date.now() - 3600000 * 2,
        model: 'anthropic/claude-3-5-haiku-latest',
        taskType: 'fts_query',
        costUsd: 0.00086,
        inputTokens: 1200,
        outputTokens: 120,
        cachedTokens: 960
      },
      {
        id: 'tx-init-02',
        timestamp: Date.now() - 3600000 * 1,
        model: 'anthropic/claude-3-5-sonnet-latest',
        taskType: 'prompt_evolution',
        costUsd: 0.01245,
        inputTokens: 8400,
        outputTokens: 480,
        cachedTokens: 7200
      }
    ];`;
const costLogsReplacement = `    const initialCostLogs: DbCostLog[] = [];`;
dbCode = dbCode.replace(costLogsTarget, costLogsReplacement);

dbCode = dbCode.replace(/satelliteName: 'STARK-SAT-4',/, "satelliteName: 'Main Router',");
dbCode = dbCode.replace(/armorModel: 'Mark LXXXV',/, "armorModel: 'Production Build',");
dbCode = dbCode.replace(/operatorName: 'T\\. STARK',/, "operatorName: 'Administrator',");

fs.writeFileSync('serverDb.ts', dbCode, 'utf8');

// 2. Clean i18n.tsx
let i18nCode = fs.readFileSync('src/services/i18n.tsx', 'utf8');

i18nCode = i18nCode.replace(/tStark: "ADMIN OPERATOR",/g, `tStark: "System Admin",`);
i18nCode = i18nCode.replace(/lblStarkSat4: "SQLite 資料庫",/g, `lblStarkSat4: "SQLite 儲存庫",`);
i18nCode = i18nCode.replace(/aboutTagline: "「先生，需要為您索引新的工作區檔案嗎？」",/g, `aboutTagline: "專案工作區智慧助理系統",`);
i18nCode = i18nCode.replace(/aboutP1: "HERMES \\(Heuristic Educational Real-time Memory Executive System\\)[^"]+",/g, `aboutP1: "整合型智慧控制核心，提供全自動任務追蹤、本機 OS 連接、BYOK 憑證同步及沙盒安全機制。",`);
i18nCode = i18nCode.replace(/lblCinemediaExpanse: "極致視野大螢幕 \\\[F11\\\]",/g, `lblCinemediaExpanse: "全螢幕檢視 [F11]",`);

i18nCode = i18nCode.replace(/lblStarkSat4: "SQLITE DATABASE",/g, `lblStarkSat4: "Local Database",`);
i18nCode = i18nCode.replace(/aboutTagline: "“Shall I index new workspace files for you, sir\\?”",/g, `aboutTagline: "Project Workspace Assistant System",`);
i18nCode = i18nCode.replace(/aboutP1: "HERMES \\(Heuristic Educational Real-time Memory Executive System\\)[^"]+",/g, `aboutP1: "Integrated virtual operating environment with background task tracking and system integrations.",`);
i18nCode = i18nCode.replace(/lblCinemediaExpanse: "cinemedia expansia \\\[f11\\\]",/g, `lblCinemediaExpanse: "Toggle Fullscreen [F11]",`);

fs.writeFileSync('src/services/i18n.tsx', i18nCode, 'utf8');
