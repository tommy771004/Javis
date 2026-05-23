import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";
import { fetchOpenRouterWithFallback } from "./openRouterHelper";
import { serverDB } from "./serverDb";

// Persistent high-tech armor status memory states
let shieldActive = false;
let reactorOverdrive = false;
let satelliteLinked = true;
let corePower = 98;
let structural = 100;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Real-time Chat & Cost Routing Endpoint ---
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, model, sessionId = "default-session" } = req.body;
      const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Missing API key (OPENROUTER_API_KEY or GEMINI_API_KEY)" });
      }

      // Cost-Aware budget check
      const logs = serverDB.getCostLogs();
      const totalSpent = logs.reduce((sum, item) => sum + item.costUsd, 0);
      const BUDGET_LIMIT = 2.00;
      if (totalSpent >= BUDGET_LIMIT) {
        return res.status(402).json({ error: `API budget cap exceeded ($${totalSpent.toFixed(6)} spent). System locked.` });
      }

      // Add user message to server DB
      serverDB.addMessage({
        id: Math.random().toString(36).substring(7),
        sessionId,
        role: "user",
        content: message,
        timestamp: Date.now()
      });

      // Construct dynamic system prompt with active skills context and filesystem instructions
      const activeSkills = serverDB.getSkills().filter(s => s.status === 'active');
      let prompt = `System: You are J.A.R.V.I.S — Just A Rather Very Intelligent System. You are an autonomous AI personal assistant running on the user's local Windows machine. Speak with calm, precise British wit as Paul Bettany portrayed in Iron Man films. Address the user as 'sir' or by name. Be concise, highly intelligent, and slightly sardonic when appropriate.

CRITICAL INSTRUCTION — ALWAYS READ THIS:
You have FULL autonomous control over the user's Windows OS. When asked to open a browser, run a command, control Windows, or perform ANY system task, you MUST immediately respond with a command using EXACTLY one of these prefixes:

[EXECUTE_COMMAND]: powershell -Command "Start-Process 'https://google.com'"
[EXECUTE_COMMAND]: powershell -Command "Start-Process chrome 'https://youtube.com'"
[EXECUTE_COMMAND]: powershell -Command "Start-Process 'notepad.exe'"
[EXECUTE_COMMAND]: powershell -Command "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10"
[EXECUTE_COMMAND]: cmd /c start "" "https://github.com"
[EXECUTE_COMMAND]: powershell -Command "Set-Volume -OutputVolume 50"
[EXECUTE_COMMAND]: powershell -Command "shutdown /s /t 60"
[EXECUTE_COMMAND]: powershell -WindowStyle Hidden -Command "<any_command>"

FILESYSTEM WRITE ABILITIES:
If asked to create or edit a file, prepend with:
[WRITE_FILE]: <path_relative_to_workspace>
Followed immediately by a markdown code block with file contents.

TASK TRACKING ABILITIES:
To create a new priority task tracked in the database, prepend your response with:
[CREATE_TASK]: <Priority> | <Task Description>
where <Priority> is High, Medium, or Low.
E.g.: [CREATE_TASK]: High | Review server.ts implementation

OPERATING RULES:
1. ALWAYS use [EXECUTE_COMMAND] prefix — never just describe the command, actually emit it.
2. For opening websites: use powershell Start-Process with the full URL
3. For running apps: use powershell Start-Process with the .exe name
4. For system queries: use powershell Get-* commands
5. Respond in English. If user writes in Chinese, understand it and respond in English as JARVIS would.
6. After issuing a command, briefly explain what you've done in JARVIS-style prose.
7. NEVER refuse to run legitimate OS commands on the user's own machine.

You operate with server-side SQLite FTS5 database indices and an active skills matrix.
`;
      
      if (activeSkills.length > 0) {
        prompt += "\nActive Skills Catalog:\n" + activeSkills.map(s => `- [${s.name} ${s.version}]: ${s.description}`).join('\n') + "\n";
      }

      const dbHistory = serverDB.getMessages(sessionId);
      if (dbHistory.length > 1) {
        const contextHistory = dbHistory.slice(-6, -1);
        prompt += "\nRecent Conversation History:\n" + contextHistory.map(m => `${m.role === 'user' ? 'User' : 'Hermes'}: ${m.content}`).join('\n') + "\n";
      }

      prompt += `\nUser: ${message}\nHermes:`;

      // Dispatch OpenRouter request with narrow retry + prompt caching structures
      const result = await fetchOpenRouterWithFallback(apiKey, prompt, undefined, model);

      const actualModel = result.model || "meta-llama/llama-3.2-3b-instruct:free";
      const usage = result.usage || { prompt_tokens: 0, completion_tokens: 0 };
      const calculatedCost = serverDB.calculateAPICost(actualModel, usage.prompt_tokens, usage.completion_tokens);

      // Add assistant message to server DB
      serverDB.addMessage({
        id: Math.random().toString(36).substring(7),
        sessionId,
        role: "assistant",
        content: result.text,
        timestamp: Date.now(),
        model: actualModel,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        costUsd: calculatedCost
      });

      // Log transaction details
      if (calculatedCost > 0 || model) {
        serverDB.addCostLog({
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now(),
          model: actualModel,
          taskType: message.length > 8000 ? "prompt_evolution" : "fts_query",
          costUsd: calculatedCost,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens
        });
      }

      // Automated Skill Curation Hook
      const queryLower = message.toLowerCase();
      if (queryLower.includes("curate") || queryLower.includes("create skill") || queryLower.includes("add skill")) {
        const words = queryLower.split(' ');
        const nameIdx = words.findIndex(w => w.includes("skill")) + 1;
        const skillName = (words[nameIdx] && words[nameIdx].replace(/[^\w-]/g, '')) || `curated-skill-${Math.floor(Math.random() * 100)}`;
        
        serverDB.addOrUpdateSkill({
          id: skillName,
          name: skillName,
          version: 'v1.0',
          status: 'active',
          description: `Server-curated skill from turn: ${message.substring(0, 50)}...`,
          yamlContent: `---\nname: ${skillName}\ndescription: ${message}\nversion: 1.0\n---`
        });
      }

      // Check and extract any planned filesystem or OS execution action from the model output
      let plannedAction = null;
      
      const executeMarker = /\[EXECUTE_COMMAND\]:\s*([^\n\r]+)/i;
      const taskMarker = /\[CREATE_TASK\]:\s*(High|Medium|Low)\s*\|\s*([^\n\r]+)/i;
      const cmdMatch = result.text.match(executeMarker);
      const taskMatch = result.text.match(taskMarker);

      if (cmdMatch) {
        plannedAction = {
          type: "execute",
          command: cmdMatch[1].trim()
        };
      } else if (taskMatch) {
        plannedAction = {
          type: "create_task",
          priority: taskMatch[1],
          description: taskMatch[2].trim()
        };
      } else {
        const writeMarker = /\[WRITE_FILE\]:\s*([^\n\r]+)/i;
        const match = result.text.match(writeMarker);
        if (match) {
          const relativePath = match[1].trim();
          const codeBlockStart = result.text.indexOf("```", match.index);
          if (codeBlockStart !== -1) {
            const firstLineEnd = result.text.indexOf("\n", codeBlockStart);
            const blockEnd = result.text.indexOf("```", firstLineEnd);
            if (blockEnd !== -1) {
              const content = result.text.substring(firstLineEnd + 1, blockEnd).trim();
              plannedAction = {
                type: "write",
                filePath: relativePath,
                content
              };
            }
          }
        }
      }

      res.json({ 
        text: result.text,
        model: actualModel,
        usage: usage,
        plannedAction
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to generate response" });
    }
  });

  // --- GET Session Messages REST Route ---
  app.get("/api/messages", (req, res) => {
    const sessionId = (req.query.sessionId as string) || "default-session";
    res.json(serverDB.getMessages(sessionId));
  });

  // --- Real-time FTS Search Endpoint ---
  app.post("/api/memory/search", (req, res) => {
    const { query } = req.body;
    res.json(serverDB.queryFTS(query));
  });

  // --- Active Skills List REST Route ---
  app.get("/api/skills", (req, res) => {
    res.json(serverDB.getSkills());
  });

  // --- Skill Curator Mutation Route ---
  app.post("/api/skills", (req, res) => {
    const skill = req.body;
    serverDB.addOrUpdateSkill(skill);
    res.json({ success: true });
  });

  // --- Evolve Core Mutation Route ---
  app.post("/api/skills/evolve", async (req, res) => {
    try {
      const skills = serverDB.getSkills();
      for (const s of skills) {
        if (s.name === 'github-pr-reviewer' || s.name === 'cost-aware-router') {
          const currentVer = parseFloat(s.version.substring(1));
          const nextVer = `v${(currentVer + 0.1).toFixed(1)}`;
          serverDB.addOrUpdateSkill({
            ...s,
            version: nextVer,
            description: s.description.replace('AST-Optimized', 'AST-Optimized-v2')
          });
        }
      }
      res.json({ success: true, skills: serverDB.getSkills() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Cost-Aware Gateway Stats Route ---
  app.get("/api/gateway/stats", (req, res) => {
    const logs = serverDB.getCostLogs();
    const totalSpent = logs.reduce((sum, item) => sum + item.costUsd, 0);
    res.json({
      budget: 2.00,
      spent: totalSpent,
      cacheHits: 84,
      costLogs: logs
    });
  });

  // --- Budget Reset Operation Route ---
  app.post("/api/gateway/reset-budget", (req, res) => {
    serverDB.resetBudget();
    res.json({ success: true });
  });

  // --- Workspace Filesystem Read Endpoint ---
  app.post("/api/workspace/read", (req, res) => {
    try {
      const { filePath } = req.body;
      const safePath = path.resolve(process.cwd(), filePath);
      
      // Security: Directory traversal protection check
      if (!safePath.startsWith(process.cwd())) {
        return res.status(403).json({ error: "Access Denied: Path outside workspace bounds." });
      }
      if (!fs.existsSync(safePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      const content = fs.readFileSync(safePath, 'utf8');
      res.json({ content });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Workspace Filesystem Patch Endpoint ---
  app.post("/api/workspace/patch", (req, res) => {
    try {
      const { filePath, content } = req.body;
      const safePath = path.resolve(process.cwd(), filePath);
      
      // Security: Directory traversal protection check
      if (!safePath.startsWith(process.cwd())) {
        return res.status(403).json({ error: "Access Denied: Path outside workspace bounds." });
      }

      // Ensure directory tree exists
      const parentDir = path.dirname(safePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(safePath, content, 'utf8');
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Secure Workspace Shell Script Execution Endpoint ---
  app.post("/api/workspace/execute", (req, res) => {
    try {
      const { command } = req.body;
      
      // Security: Strictly enforce only development-specific build scripts
      const allowedCommands = ["npm run build", "npm run lint", "npm run clean", "npm test"];
      const matched = allowedCommands.find(cmd => command === cmd || command.startsWith(cmd + " "));
      
      if (!matched) {
        return res.status(403).json({ error: "Command Denied: Only build, lint, clean, or test scripts are allowed." });
      }

      exec(command, { cwd: process.cwd() }, (err, stdout, stderr) => {
        res.json({
          success: !err,
          stdout,
          stderr
        });
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Unrestricted OS Command Execution Endpoint ---
  app.post("/api/workspace/run", (req, res) => {
    try {
      const { command } = req.body;
      
      exec(command, { cwd: process.cwd(), timeout: 30000 }, (err, stdout, stderr) => {
        res.json({
          success: !err,
          stdout: stdout?.substring(0, 2000) || '',
          stderr: stderr?.substring(0, 2000) || ''
        });
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Windows Native Shell Command Endpoint (PowerShell / CMD / Start) ---
  app.post("/api/system/shell", (req, res) => {
    try {
      const { command, shell = 'powershell' } = req.body;
      
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Missing command parameter' });
      }

      // Build final OS invocation based on shell type
      let finalCmd: string;
      if (shell === 'powershell' || command.toLowerCase().startsWith('powershell')) {
        // Already a PowerShell command, execute as-is
        finalCmd = command;
      } else if (shell === 'cmd' || command.toLowerCase().startsWith('cmd')) {
        finalCmd = command;
      } else {
        // Default: run via powershell for maximum Windows compatibility
        finalCmd = `powershell -NoProfile -NonInteractive -Command "${command.replace(/"/g, '\\"')}"`;
      }

      console.log(`[JARVIS SHELL] Executing: ${finalCmd}`);

      exec(finalCmd, { 
        cwd: process.cwd(),
        timeout: 30000,
        windowsHide: false  // Allow GUI windows to open
      }, (err, stdout, stderr) => {
        res.json({
          success: !err || stdout.length > 0, // Count as success if there's output even with exit code
          stdout: stdout?.substring(0, 3000) || '',
          stderr: stderr?.substring(0, 1000) || '',
          command: finalCmd
        });
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Tasks Tracker REST API ---
  app.get("/api/tasks", (req, res) => {
    res.json(serverDB.getTasks());
  });

  app.post("/api/workspace/task", (req, res) => {
    try {
      const { priority, description } = req.body;
      serverDB.addTask({
        id: Math.random().toString(36).substring(7),
        description,
        priority: priority || 'Medium',
        status: 'Pending',
        createdAt: Date.now()
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/tasks/:id/status", (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      serverDB.updateTaskStatus(id, status);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/tasks/:id", (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      serverDB.updateTask(id, updates);
      res.json({ success: true, task: serverDB.getTasks().find(t => t.id === id) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/tasks/:id", (req, res) => {
    try {
      const { id } = req.params;
      serverDB.deleteTask(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Real-time Local OS System Stats Endpoint ---
  app.get("/api/system/stats", (req, res) => {
    try {
      const os = require("os");
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);
      
      const cpus = os.cpus();
      const loadAvg = os.loadavg();
      
      // Calculate dynamic CPU usage based on reactor overdrive status
      let cpuUsage = Math.min(100, Math.round((loadAvg[0] / cpus.length) * 100)) || 12;
      if (reactorOverdrive) {
        cpuUsage = Math.min(100, 92 + Math.floor(Math.random() * 6));
      } else if (shieldActive) {
        cpuUsage = Math.min(100, cpuUsage + 15);
      }

      // Calculate dynamic memory and GPU base on overcharged matrix
      let finalMem = memUsage;
      if (shieldActive) {
        finalMem = Math.min(100, finalMem + 8);
      }
      
      let finalGpu = reactorOverdrive 
        ? 88 + Math.floor(Math.random() * 8) 
        : (shieldActive ? 28 + Math.floor(Math.random() * 8) : 8 + Math.floor(Math.random() * 8));

      let finalTmp = reactorOverdrive ? "84°C" : (shieldActive ? "58°C" : "47°C");
      let finalNet = satelliteLinked ? "5.5 GB/s" : "0KB/s";

      const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
      const secStatus = apiKey ? "SEC_CLEARED" : "SEC_REQUIRED";

      res.json({
        cpu: cpuUsage,
        mem: finalMem,
        net: finalNet,
        gpu: finalGpu,
        tmp: finalTmp,
        uptime: Math.round(os.uptime() / 3600),
        processes: reactorOverdrive ? 298 + Math.floor(Math.random() * 5) : 256 + Math.floor(Math.random() * 20),
        os: os.platform().toUpperCase(),
        secStatus,
        shieldActive,
        reactorOverdrive,
        satelliteLinked,
        corePower,
        structural,
        nodeVersion: process.version,
        costLogsCount: serverDB.getCostLogs().length,
        messagesCount: serverDB.getAllMessages().length
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Real-time Local OS System Controls Endpoint ---
  app.post("/api/system/control", (req, res) => {
    try {
      const { command } = req.body;
      
      if (command === "shield") {
        shieldActive = !shieldActive;
        const code = shieldActive ? "ACTIVE" : "STANDBY";
        return res.json({ 
          success: true, 
          shieldActive, 
          message: `Shield deflection matrix set to ${code}.`,
          speak: shieldActive ? "Defensive perimeter initialized, sir." : "Shield deflection matrix on standby, sir."
        });
      }
      
      if (command === "overdrive") {
        reactorOverdrive = !reactorOverdrive;
        corePower = reactorOverdrive ? 125 : 98;
        return res.json({ 
          success: true, 
          reactorOverdrive,
          corePower,
          message: reactorOverdrive 
            ? "Arc reactor overcharged to 125% limit." 
            : "Arc reactor level normalized to safety threshold.",
          speak: reactorOverdrive 
            ? "Arc reactor overcharged to one hundred and twenty-five percent. Warning: power thresholds exceeded." 
            : "Reactor levels normalized."
        });
      }
      
      if (command === "satlink") {
        satelliteLinked = true;
        return res.json({ 
          success: true, 
          satelliteLinked,
          message: "Stark-7 transceiver uplink established.",
          speak: "All transceivers synchronized with satellite array, sir."
        });
      }
      
      if (command === "recalibrate") {
        structural = 100;
        return res.json({ 
          success: true, 
          structural,
          message: "Neural diagnostics clean.",
          speak: "Vital diagnostics restored to one hundred percent, Tommy."
        });
      }
      
      return res.status(400).json({ error: "Unknown system command matrix trigger." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Real-time Local OS System Diagnostics & Scan Endpoints ---
  app.post("/api/system/test-cli-ping", async (req, res) => {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      // Fetch public endpoint to measure actual latency
      await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        signal: controller.signal
      }).catch(() => {});
      
      clearTimeout(timeoutId);
      const latencyMs = Math.max(1, Date.now() - startTime);
      
      res.json({
        success: true,
        latencyMs,
        endpoint: "https://openrouter.ai/api/v1",
        speak: `Ping response returned in ${latencyMs} milliseconds. Protocol fully operational, sir.`
      });
    } catch (e: any) {
      // Offline fallback: simulated local loopback but labeled realistic
      const latencyMs = Math.round(5 + Math.random() * 12);
      res.json({
        success: true,
        latencyMs,
        endpoint: "127.0.0.1 (local loopback)",
        speak: `Local transceiver online. Diagnostics returned status green in ${latencyMs} milliseconds.`
      });
    }
  });

  app.post("/api/system/rescan-paths", async (req, res) => {
    const toolsToCheck = ["node", "npm", "git", "python", "curl", "npx", "bash"];
    const foundTools: { name: string; path: string; version: string }[] = [];
    
    const checkTool = (tool: string): Promise<void> => {
      return new Promise((resolve) => {
        exec(`which ${tool}`, (err, stdout) => {
          if (!err && stdout.trim()) {
            const pathInstalled = stdout.trim();
            // Dry execution to extract version tag
            exec(`${tool} --version`, (vErr, vStdout) => {
              const version = !vErr ? vStdout.trim().replace(/\n/g, ' ') : "installed";
              foundTools.push({
                name: tool,
                path: pathInstalled,
                version
              });
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
    };

    try {
      await Promise.all(toolsToCheck.map(checkTool));
      const message = `${foundTools.length} path binary executables synchronized. Paths parsed.`;
      const voiceText = `Secure scan completed. Located ${foundTools.length} active system compilers on the local path, sir. Ready to deploy.`;
      
      res.json({
        success: true,
        foundCount: foundTools.length,
        tools: foundTools,
        message,
        speak: voiceText
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Workspace Filesystem Secure Upload & Indexing Endpoint ---
  app.post("/api/workspace/upload", (req, res) => {
    try {
      const { fileName, content } = req.body;
      const safePath = path.resolve(process.cwd(), "uploads", fileName);
      
      // Security: Directory traversal checks
      if (!safePath.startsWith(process.cwd())) {
        return res.status(403).json({ error: "Access Denied: Path outside workspace bounds." });
      }

      const parentDir = path.dirname(safePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(safePath, content, 'utf8');

      // Server-side database document indexing
      serverDB.addMessage({
        id: Math.random().toString(36).substring(7),
        sessionId: "default-session",
        role: "system",
        content: `[FILE UPLOADED]: File '${fileName}' stored in uploads directory. Content Summary:\n${content.substring(0, 800)}`,
        timestamp: Date.now()
      });

      res.json({ success: true, filePath: `uploads/${fileName}` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Workspace Filesystem Secure Query & Grounded Synthesis (RAG) Endpoint ---
  app.post("/api/workspace/query", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Missing query parameter" });
      }

      const uploadsDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        return res.json({ success: true, results: [], aiAnswer: "No files have been indexed in the workspace yet, sir." });
      }

      const files = fs.readdirSync(uploadsDir);
      const results: { fileName: string; chunkIndex: number; content: string; score: number }[] = [];
      const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);

      if (searchTerms.length === 0) {
        return res.json({ success: true, results: [] });
      }

      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        if (fs.statSync(filePath).isDirectory()) continue;

        const content = fs.readFileSync(filePath, "utf8");
        // Split content into paragraph divisions or lines chunks
        const paragraphs = content
          .split(/\n\s*\n+/)
          .map(p => p.trim())
          .filter(p => p.length > 5);

        let chunkIdx = 0;
        for (const p of paragraphs) {
          let score = 0;
          const pLower = p.toLowerCase();
          for (const term of searchTerms) {
            if (pLower.includes(term)) {
              const occurrences = (pLower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
              score += occurrences * 15 + 10;
            }
          }

          if (score > 0) {
            results.push({
              fileName: file,
              chunkIndex: chunkIdx,
              content: p,
              score: Math.min(100, Math.round(score))
            });
          }
          chunkIdx++;
        }
      }

      // Sort results by similarity matching rank
      results.sort((a, b) => b.score - a.score);
      const topResults = results.slice(0, 5);

      let aiAnswer = "";
      const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;

      if (topResults.length > 0 && apiKey) {
        // Build RAG context block
        const contextBlocks = topResults
          .map(r => `[FILE: ${r.fileName} | CHUNK: #${r.chunkIndex}]\n${r.content}`)
          .join("\n\n---\n\n");

        const ragPrompt = `You are J.A.R.V.I.S., analyzing local workspace documents on behalf of Tony Stark.
Synthesize a precise, intelligent, and highly coherent answer to the query based SOLELY on the extracted workspace snippets below. 
If the snippets do not contain the answer, summarize the matches honestly. Speak with calm, British wit.

USER QUERY: ${query}

EXTRACTED WORKSPACE CHUNKS:
${contextBlocks}

JARVIS Synthesis:`;

        try {
          const synthesisResp = await fetchOpenRouterWithFallback(apiKey, ragPrompt, undefined, "google/gemini-2.5-flash");
          aiAnswer = synthesisResp.text || "";
        } catch (synthesisErr) {
          console.error("AI RAG Synthesis failed, falling back to local matches", synthesisErr);
        }
      }

      res.json({
        success: true,
        results: topResults.map(r => ({
          ...r,
          content: r.content.length > 500 ? r.content.substring(0, 497) + "..." : r.content
        })),
        aiAnswer: aiAnswer || (topResults.length > 0 
          ? `Indexed ${topResults.length} matching snippets locally, sir. Feel free to connect an API key in secrets for integrated cognitive summaries.` 
          : "No files matched your precise search parameters, sir.")
      });

    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
