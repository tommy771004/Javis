const fs = require('fs');

// 1. Clean App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// The Auto-Repair useEffect starts around line 196 and ends around line 235.
// We can find it by Regex.
const autoRepairRegex = /\s*\/\/ Auto-Repair Health Monitor Polling\s*useEffect\(\(\) => \{[\s\S]*?\}, \[securitySettings\.autoRepair\]\);/;
appCode = appCode.replace(autoRepairRegex, '');

fs.writeFileSync('src/App.tsx', appCode, 'utf8');

// 2. Clean server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');

// Remove let structural = 100;
serverCode = serverCode.replace(/let structural = 100;\r?\n/, '');

// Remove assignments to structural
serverCode = serverCode.replace(/structural = 98\.7;\r?\n/g, '');
serverCode = serverCode.replace(/structural = 100;\r?\n/g, '');

// Remove neuralSync calculation
const neuralSyncCalcRegex = /const calcNeuralSync = Math\.max\(0\.0, 100\.0 - \(clampedLatency \/ 30\.0\)\)\.toFixed\(2\);\r?\n/;
serverCode = serverCode.replace(neuralSyncCalcRegex, '');

// Remove simulation block
const simulationBlockRegex = /\s*\/\/ --- Simulation: Dynamic Structural Integrity Degradation ---[\s\S]*?if \(reactorOverdrive && structural > 8\.0\) \{[\s\S]*?\}/;
serverCode = serverCode.replace(simulationBlockRegex, '');

// Update JSON response payload
serverCode = serverCode.replace(/neuralSync: calcNeuralSync,/, 'neuralSync: "100.00",');
serverCode = serverCode.replace(/structural,/, 'structural: 100,');

fs.writeFileSync('server.ts', serverCode, 'utf8');
