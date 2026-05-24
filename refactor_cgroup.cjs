const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// 1. Remove cgroup memory check in stats
const cgroupStatsRegex = /\s*\/\/ Check cgroups memory limits[\s\S]*?\} catch \(e\) \{\}/;
serverCode = serverCode.replace(cgroupStatsRegex, '');

// 2. Remove cgroup constraint code in enforcePhysicalSandbox
const cgroupSandboxRegex = /\s*\/\/ Create dynamically constrained cgroup[\s\S]*?serverDB\.addSystemLog\('SEC', 'WARN', \`Low-level CGroup allocation failed, OS rejected privileges: \$\{e\.message\}\`\);\s*\}/;
serverCode = serverCode.replace(cgroupSandboxRegex, '');

// 3. Remove "CGroup-Virtualized" string assignment if present
serverCode = serverCode.replace(/workspaceSandboxed = "CGroup-Virtualized";/, 'workspaceSandboxed = "Windows-Native-Execution";');

fs.writeFileSync('server.ts', serverCode, 'utf8');
