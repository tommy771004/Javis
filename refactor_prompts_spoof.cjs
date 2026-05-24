const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// --- 1. Fix Sci-Fi Prompt Overwrites ---

// 1a. Chat Prompt (line 1167)
const chatPromptRegex = /let prompt = `System: You are J\.A\.R\.V\.I\.S[^\`]+`/;
const newChatPrompt = `const settingsCtx = serverDB.getSettings();
      const sysName = settingsCtx.satelliteName || "HERMES";
      const opName = settingsCtx.operatorName || "Operator";
      let prompt = \`System: You are \${sysName}. You are an autonomous AI personal assistant running on the user's local Windows machine. Address the user as '\${opName}'. Be concise, highly intelligent, and direct.`;
serverCode = serverCode.replace(chatPromptRegex, newChatPrompt);

// 1b. GEPA Prompt (line 1558)
const gepaPromptRegex = /const prompt = `System: You are J\.A\.R\.V\.I\.S's internal Genetic Evaluation[^\`]+`/;
const newGepaPrompt = `const sysName = settings.satelliteName || "HERMES";
      const prompt = \`System: You are \${sysName}'s internal Genetic Evaluation and Prompt Algorithm (GEPA). Your task is to evolve and optimize an AI Agent Skill. `;
serverCode = serverCode.replace(gepaPromptRegex, newGepaPrompt);

// 1c. RAG Prompt (line 3574)
const ragPromptRegex = /const ragPrompt = `You are J\.A\.R\.V\.I\.S\., analyzing local workspace documents and system state logs on behalf of Tony Stark\./;
const newRagPrompt = `const settingsCtx = serverDB.getSettings();
        const sysName = settingsCtx.satelliteName || "HERMES";
        const opName = settingsCtx.operatorName || "Operator";
        const ragPrompt = \`You are \${sysName}, analyzing local workspace documents and system state logs on behalf of \${opName}.`;
serverCode = serverCode.replace(ragPromptRegex, newRagPrompt);

// --- 2. Fix Overdrive CPU / Power Spoofing ---

// 2a. Power Draw (line 133)
const powerDrawRegex = /const calculatedPower = baseW \+ \(coreTDP \* loadFactor \* frequencyRatio\) \+ \(reactorOverdrive \? 45 : \(shieldActive \? 12 : 0\)\);/;
const newPowerDraw = `const calculatedPower = baseW + (coreTDP * loadFactor * frequencyRatio);`;
serverCode = serverCode.replace(powerDrawRegex, newPowerDraw);

// 2b. CPU Spoofing (line 262)
const cpuSpoofRegex = /computedCpuUsage = reactorOverdrive \n\s*\? Math\.min\(100, Math\.max\(95, usage \+ 88 \+ Math\.random\(\) \* 5\)\)\n\s*: usage;/g;
// It seems there could be line breaks. Let's do a more robust regex or just replace the block.
serverCode = serverCode.replace(/computedCpuUsage = reactorOverdrive\s*\?[^;]+;/g, 'computedCpuUsage = usage;');

// Also in /api/system/stats (line ~2506)
const cpuUsageStatRegex = /let cpuUsage = Math\.max\(computedCpuUsage \|\| 12, Math\.min\(100, Math\.round\(\(loadAvg\[0\] \/ cpus\.length\) \* 100\)\)\);/;
const newCpuUsageStat = `let cpuUsage = computedCpuUsage || Math.min(100, Math.round((loadAvg[0] / cpus.length) * 100));`;
serverCode = serverCode.replace(cpuUsageStatRegex, newCpuUsageStat);

fs.writeFileSync('server.ts', serverCode, 'utf8');
