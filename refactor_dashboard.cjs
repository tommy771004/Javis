const fs = require('fs');
let code = fs.readFileSync('src/components/HermesDashboard.tsx', 'utf8');

code = code.replace(/import \{ hermesDB(.*)\} from '\.\.\/services\/db';/, "import { apiClient$1} from '../services/apiClient';");
code = code.replace(/hermesDB\./g, "apiClient.");

code = code.replace(/const statusRes = await fetch\('\/api\/mcp\/status'\);\s*if \(statusRes\.ok\) \{\s*const data = await statusRes\.json\(\);\s*setMcpStatus\(data\);\s*\}/g, 
  "const data = await apiClient.getMcpStatus(); setMcpStatus(data);");

code = code.replace(/const toolsRes = await fetch\('\/api\/mcp\/tools'\);\s*if \(toolsRes\.ok\) \{\s*const data = await toolsRes\.json\(\);\s*setMcpTools\(data\);\s*\}/g, 
  "const data = await apiClient.getMcpTools(); setMcpTools(data);");

code = code.replace(/const webhooksRes = await fetch\('\/api\/mcp\/webhooks'\);\s*if \(webhooksRes\.ok\) \{\s*const data = await webhooksRes\.json\(\);\s*setWebhooks\(data\);\s*\}/g, 
  "const data = await apiClient.getMcpWebhooks(); setWebhooks(data);");

code = code.replace(/const routinesRes = await fetch\('\/api\/mcp\/routines'\);\s*if \(routinesRes\.ok\) \{\s*const data = await routinesRes\.json\(\);\s*setRoutines\(data\);\s*\}/g, 
  "const data = await apiClient.getMcpRoutines(); setRoutines(data);");

code = code.replace(/const resp = await fetch\("\/api\/mcp\/connect", \{\s*method: "POST",\s*headers: \{ "Content-Type": "application\/json" \},\s*body: JSON\.stringify\(\{ serverName: newServerName, command: newServerCommand \}\)\s*\}\);\s*const data = await resp\.json\(\);/g, 
  "const data = await apiClient.connectMcp(newServerName, newServerCommand);");

code = code.replace(/const res = await fetch\('\/api\/mcp\/execute', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ serverName: tool\.server, toolName: tool\.name, args: parsedArgs \}\)\s*\}\);\s*const data = await res\.json\(\);/g, 
  "const data = await apiClient.executeMcpTool(tool.server, tool.name, parsedArgs);");

code = code.replace(/const res = await fetch\('\/api\/mcp\/webhooks', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ name: newWebhookName, url: newWebhookUrl \}\)\s*\}\);\s*const data = await res\.json\(\);/g, 
  "const data = await apiClient.addMcpWebhook(newWebhookName, newWebhookUrl);");

code = code.replace(/await fetch\(`\/api\/mcp\/webhooks\/\$\{id\}`\, \{ method: 'DELETE' \}\);/g, 
  "await apiClient.deleteMcpWebhook(id);");

code = code.replace(/await fetch\('\/api\/mcp\/webhooks\/' \+ id \+ '\/toggle', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ active: !webhook\.active \}\)\s*\}\);/g, 
  "await apiClient.toggleMcpWebhook(id, !webhook.active);");

code = code.replace(/const res = await fetch\('\/api\/mcp\/routines', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ name: newRoutineName, prompt: newRoutinePrompt \}\)\s*\}\);\s*const data = await res\.json\(\);/g, 
  "const data = await apiClient.addMcpRoutine(newRoutineName, newRoutinePrompt);");

code = code.replace(/await fetch\(`\/api\/mcp\/routines\/\$\{id\}`\, \{ method: 'DELETE' \}\);/g, 
  "await apiClient.deleteMcpRoutine(id);");

code = code.replace(/const res = await fetch\(`\/api\/mcp\/routines\/\$\{id\}\/execute`\, \{ method: 'POST' \}\);\s*const data = await res\.json\(\);/g, 
  "const data = await apiClient.executeMcpRoutine(id);");

code = code.replace(/const res = await fetch\('\/api\/tasks\/search\?q='\);\s*if \(res\.ok\) \{\s*const data = await res\.json\(\);\s*setTasks\(data\);\s*\}/g, 
  "const data = await apiClient.searchTasks(''); setTasks(data);");

code = code.replace(/const settingsRes = await fetch\('\/api\/settings'\);\s*if \(settingsRes\.ok\) \{\s*const s = await settingsRes\.json\(\);\s*setHasApiKey\(!!s\.byokKey \|\| s\.gatewayRoutingModel !== 'local'\);\s*\}\s*const tasksRes = await fetch\('\/api\/tasks\/search\?q=' \+ encodeURIComponent\(taskSearchQueryRef\.current\)\);\s*if \(tasksRes\.ok\) \{\s*const data = await tasksRes\.json\(\);\s*setTasks\(data\);\s*\}/g, 
  "const s = await apiClient.getSettings(); setHasApiKey(!!s.byokKey || s.gatewayRoutingModel !== 'local');\n      const data = await apiClient.searchTasks(taskSearchQueryRef.current);\n      setTasks(data);");

code = code.replace(/const logsRes = await fetch\('\/api\/system\/logs'\);\s*if \(logsRes\.ok\) \{\s*const data = await logsRes\.json\(\);\s*const logLines = data\.map\(\(l: any\) => `\[\$\{new Date\(l\.timestamp\)\.toLocaleTimeString\(\)\}\] \[\$\{l\.category\}\] \$\{l\.level\}: \$\{l\.message\}`\);\s*setTerminalLogs\(logLines\);\s*\}/g, 
  "const data = await apiClient.getSystemLogs();\n      const logLines = data.map((l: any) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.category}] ${l.level}: ${l.message}`);\n      setTerminalLogs(logLines);");

code = code.replace(/const statsRes = await fetch\('\/api\/system\/stats'\);\s*if \(statsRes\.ok\) \{\s*const data = await statsRes\.json\(\);\s*setOsStats\(data\);\s*setReactorOverdrive\(data\.reactorOverdrive\);\s*setSatelliteLinked\(data\.satelliteLinked\);\s*setShieldActive\(data\.shieldActive\);\s*\}/g, 
  "const data = await apiClient.getSystemStats();\n      setOsStats(data);\n      setReactorOverdrive(data.reactorOverdrive);\n      setSatelliteLinked(data.satelliteLinked);\n      setShieldActive(data.shieldActive);");

code = code.replace(/const res = await fetch\('\/api\/workspace\/task', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ description: newTaskDesc, priority: newTaskPriority, tags: newTaskTags\.split\(','\)\.map\(t=>t\.trim\(\)\)\.filter\(Boolean\) \}\)\s*\}\);\s*const data = await res\.json\(\);/g, 
  "const data = await apiClient.createTask(newTaskDesc, newTaskPriority, newTaskTags.split(',').map(t=>t.trim()).filter(Boolean));");

code = code.replace(/await fetch\('\/api\/settings', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ reactorOverdrive: !reactorOverdrive \}\)\s*\}\);/g, 
  "await apiClient.saveSettings({ reactorOverdrive: !reactorOverdrive });");

code = code.replace(/await fetch\('\/api\/settings', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ shieldActive: !shieldActive \}\)\s*\}\);/g, 
  "await apiClient.saveSettings({ shieldActive: !shieldActive });");

code = code.replace(/const res = await fetch\('\/api\/system\/stats'\);\s*if \(res\.ok\) \{\s*const data = await res\.json\(\);\s*setOsStats\(data\);\s*\}/g, 
  "const data = await apiClient.getSystemStats(); setOsStats(data);");

code = code.replace(/const res = await fetch\(`\/api\/tasks\/\$\{task\.id\}\/status`\, \{\s*method: 'PUT',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ status: newStatus \}\)\s*\}\);\s*if \(res\.ok\) \{/g, 
  "await apiClient.updateTaskStatus(task.id, newStatus); if (true) {");

code = code.replace(/await fetch\(`\/api\/tasks\/\$\{task\.id\}`\, \{\s*method: 'PUT',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ progress: newProgress, status: newProgress === 100 \? 'Completed' : task\.status \}\)\s*\}\);/g, 
  "await apiClient.updateTask(task.id, { progress: newProgress, status: newProgress === 100 ? 'Completed' : task.status });");

code = code.replace(/const res = await fetch\(`\/api\/tasks\/\$\{taskId\}`\, \{\s*method: 'PUT',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ title \}\)\s*\}\);/g, 
  "const res = { ok: true }; await apiClient.updateTask(taskId, { title });");

code = code.replace(/const res = await fetch\(`\/api\/tasks\/\$\{taskId\}`\, \{\s*method: 'PUT',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ description \}\)\s*\}\);/g, 
  "const res = { ok: true }; await apiClient.updateTask(taskId, { description });");

code = code.replace(/const res = await fetch\(`\/api\/tasks\/\$\{taskId\}`\, \{\s*method: 'PUT',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ priority \}\)\s*\}\);/g, 
  "const res = { ok: true }; await apiClient.updateTask(taskId, { priority });");

code = code.replace(/const res = await fetch\(`\/api\/tasks\/\$\{editingTask\.id\}`\, \{\s*method: 'PUT',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ title: editingTask\.title, description: editingTask\.description \}\)\s*\}\);\s*if \(res\.ok\) \{/g, 
  "await apiClient.updateTask(editingTask.id, { title: editingTask.title, description: editingTask.description }); if (true) {");

code = code.replace(/const res = await fetch\(`\/api\/tasks\/\$\{deletingTaskId\}`\, \{\s*method: 'DELETE'\s*\}\);\s*if \(res\.ok\) \{/g, 
  "await apiClient.deleteTask(deletingTaskId); if (true) {");

fs.writeFileSync('src/components/HermesDashboard.tsx', code, 'utf8');
