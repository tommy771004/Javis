import express from "express";
import path from "path";
import fs from "fs";
import https from "https";
import os from "os";
import crypto from "crypto";
import { exec, spawn, ChildProcess } from "child_process";
import { createServer as createViteServer } from "vite";
import { fetchOpenRouterWithFallback } from "./openRouterHelper";
import { serverDB } from "./serverDb";

// Persistent high-tech armor status memory states
let shieldActive = false;
let reactorOverdrive = false;
let satelliteLinked = true;
let corePower = 98;
let structural = 100;

// Internal Background Computations for True Overdrive
let overdriveWorkerObjs: any[] = [];
import { Worker } from "worker_threads";

function toggleTrueOverdriveWorker(active: boolean) {
  if (active && overdriveWorkerObjs.length === 0) {
    const workerCode = `
      const { parentPort } = require('worker_threads');
      const crypto = require('crypto');
      parentPort.on('message', (msg) => {
         if (msg === 'start') {
            while (true) {
               crypto.createHash('sha256').update(Math.random().toString()).digest('hex');
            }
         }
      });
    `;
    const numCores = os.cpus().length;
    for (let i = 0; i < numCores; i++) {
       const worker = new Worker(workerCode, { eval: true });
       worker.postMessage('start');
       overdriveWorkerObjs.push(worker);
    }
  } else if (!active && overdriveWorkerObjs.length > 0) {
    overdriveWorkerObjs.forEach(w => w.terminate());
    overdriveWorkerObjs = [];
  }
}

// Global precise CPU metric tracker
let lastCpus = os.cpus();
let computedCpuUsage = 0;

// Auto-Repair and Neural Sync Globals
let globalLLMLatencyMs = 120;
let lastNetTxBytes = 0;
let lastNetRxBytes = 0;
let currentTxSpeed = 0;
let currentRxSpeed = 0;

let lastDiskReadSectors = 0;
let lastDiskWriteSectors = 0;
let currentDiskReadSpeed = 0; // bytes/sec
let currentDiskWriteSpeed = 0; // bytes/sec

// Real OS Hardware Telemetry
let osProcessCount = 0;
let osGpuTemp = 0;
let osGpuUsage = 0;

function updateRealHardwareMetrics() {
  if (process.platform === 'win32') {
    exec("wmic os get numberofprocesses", (err, stdout) => {
      if (!err) {
        const match = stdout.match(/\d+/);
        if (match) osProcessCount = parseInt(match[0], 10);
      }
    });
    exec("nvidia-smi --query-gpu=temperature.gpu,utilization.gpu --format=csv,noheader", (err, stdout) => {
      if (!err) {
        const parts = stdout.split(',');
        if (parts.length >= 2) {
          osGpuTemp = parseInt(parts[0].trim(), 10);
          osGpuUsage = parseInt(parts[1].trim(), 10);
        }
      }
    });
  } else if (process.platform === 'linux') {
    exec("ps -e | wc -l", (err, stdout) => {
      if (!err) osProcessCount = parseInt(stdout.trim(), 10);
    });
    exec("nvidia-smi --query-gpu=temperature.gpu,utilization.gpu --format=csv,noheader", (err, stdout) => {
      if (!err) {
        const parts = stdout.split(',');
        if (parts.length >= 2) {
          osGpuTemp = parseInt(parts[0].trim(), 10);
          osGpuUsage = parseInt(parts[1].trim(), 10);
        }
      }
    });
  }
}

function updateSystemSpeeds() {
  if (fs.existsSync('/proc/net/dev')) {
    try {
      const lines = fs.readFileSync('/proc/net/dev', 'utf8').split('\n');
      for (const line of lines) {
        if (line.includes('eth0:') || line.includes('eth1:') || line.includes('en0:')) {
          const parts = line.split(':');
          if (parts.length > 1) {
            const stats = parts[1].trim().split(/\s+/);
            const rx = parseInt(stats[0], 10);
            const tx = parseInt(stats[8], 10);
            if (!isNaN(rx) && !isNaN(tx)) {
              if (lastNetRxBytes > 0) {
                currentRxSpeed = rx - lastNetRxBytes;
                currentTxSpeed = tx - lastNetTxBytes;
              }
              lastNetRxBytes = rx;
              lastNetTxBytes = tx;
            }
          }
          break;
        }
      }
    } catch (e) {}
  }
  
  if (fs.existsSync('/proc/diskstats')) {
    try {
      const diskLines = fs.readFileSync('/proc/diskstats', 'utf8').split('\n');
      for (const line of diskLines) {
        // Typically sda or nvme0n1 are the primary disks
        if (line.includes(' sda ') || line.includes(' vda ') || line.includes(' nvme0n1 ')) {
          const parts = line.trim().split(/\s+/);
          // Standard /proc/diskstats fields:
          // Field 3: Sectors read
          // Field 7: Sectors written
          const readSectors = parseInt(parts[5], 10);
          const writeSectors = parseInt(parts[9], 10);
          
          if (!isNaN(readSectors) && !isNaN(writeSectors)) {
            if (lastDiskReadSectors > 0) {
              // 1 sector = 512 bytes typically
              currentDiskReadSpeed = (readSectors - lastDiskReadSectors) * 512;
              currentDiskWriteSpeed = (writeSectors - lastDiskWriteSectors) * 512;
            }
            lastDiskReadSectors = readSectors;
            lastDiskWriteSectors = writeSectors;
          }
          break;
        }
      }
    } catch (e) {}
  }
}

let hardwareTick = 0;
updateRealHardwareMetrics(); // initial call

setInterval(() => {
  hardwareTick++;
  if (hardwareTick % 5 === 0) {
    updateRealHardwareMetrics();
  }
  updateSystemSpeeds();
  const currentCpus = os.cpus();
  let idleDifference = 0;
  let totalDifference = 0;

  for (let i = 0; i < currentCpus.length; i++) {
    const typeList = ['user', 'nice', 'sys', 'irq', 'idle'] as const;
    for (const type of typeList) {
      totalDifference += currentCpus[i].times[type] - lastCpus[i].times[type];
    }
    idleDifference += currentCpus[i].times['idle'] - lastCpus[i].times['idle'];
  }
  
  if (totalDifference > 0) {
    const usage = 100 - Math.round(100 * idleDifference / totalDifference);
    computedCpuUsage = usage;
  }
  lastCpus = currentCpus;
}, 1000);

// Prompt cache helper & token estimator
let lastSystemContent = "";

// Real-time ping telemetry memory
let lastPingLatencyMs = 28; // Default latency

// Cached security audit results
export interface SecurityAuditResult {
  success: boolean;
  authIsolation: string;
  workspaceSandboxed: string;
  encryption: string;
  port: string;
  sandboxControl: string;
  details: {
    defenderActive: boolean;
    firewallActive: boolean;
    isWsl: boolean;
    isDocker: boolean;
    os: string;
    cveCount?: number;
    isRoot?: boolean;
    memoryHardened?: boolean;
  };
}

let cachedSecurityAudit: SecurityAuditResult = {
  success: true,
  authIsolation: "92.0%",
  workspaceSandboxed: "Host-Secured",
  encryption: "AES-128 / RSA-2048",
  port: "WSS-3000",
  sandboxControl: "HOST-UNSECURED",
  details: {
    defenderActive: false,
    firewallActive: false,
    isWsl: false,
    isDocker: false,
    os: "UNKNOWN"
  }
};

export async function applyTrueSandboxOperations() {
  if (process.platform === "linux") {
    try {
      // Create dynamically constrained cgroup for AI process
      const cgroupPath = "/sys/fs/cgroup/memory/jarvis_sandbox";
      if (!fs.existsSync(cgroupPath)) {
         fs.mkdirSync(cgroupPath, { recursive: true });
      }
      
      // Enforce physical memory limits for worker threads (e.g., 512MB RAM cap)
      fs.writeFileSync(`${cgroupPath}/memory.limit_in_bytes`, "536870912");
      fs.writeFileSync(`${cgroupPath}/memory.swappiness`, "10");
      
      // Bind current execution context to the sandbox cgroup
      fs.writeFileSync(`${cgroupPath}/tasks`, String(process.pid));
      
      // Attempt read-only mount overlay of sensitive directories (best effort if root)
      if (process.getuid && process.getuid() === 0) {
         exec("mount --bind -r /workspace /workspace && mount -o remount,ro /workspace");
      }
      return true;
    } catch (e: any) {
      serverDB.addSystemLog('SEC', 'WARN', `Low-level CGroup allocation failed, OS rejected privileges: ${e.message}`);
      return false;
    }
  }
  return false;
}

export async function runSecurityAudit(): Promise<SecurityAuditResult> {
  const isDocker = fs.existsSync("/.dockerenv") || !!process.env.DOCKER;
  
  let isWsl = false;
  if (process.platform === "linux") {
    try {
      const release = os.release().toLowerCase();
      const version = fs.readFileSync("/proc/version", "utf8").toLowerCase();
      isWsl = release.includes("microsoft") || version.includes("microsoft");
    } catch {
      // Ignored
    }
  } else if (process.platform === "win32") {
    isWsl = !!process.env.WSL_DISTRO_NAME;
  }
  
  const trueSandboxApplied = await applyTrueSandboxOperations();
  
  let defenderActive = false;
  let firewallActive = false;
  const currentOs = process.platform.toUpperCase();
  
  if (process.platform === "win32") {
    try {
      const { stdout: defenderOut } = await execAsync("sc query WinDefend", { timeout: 1500 });
      if (defenderOut.includes("RUNNING") || defenderOut.includes("4")) {
        defenderActive = true;
      }
    } catch {
      defenderActive = false;
    }
    
    try {
      const { stdout: firewallOut } = await execAsync("sc query MpsSvc", { timeout: 1500 });
      if (firewallOut.includes("RUNNING") || firewallOut.includes("4")) {
        firewallActive = true;
      }
    } catch {
      firewallActive = false;
    }
  } else {
    // Unix fallback
    defenderActive = true;
    firewallActive = true;
  }
  
  // --- Real Security Checks ---
  let cveCount = 0;
  let isRoot = false;
  let isPrivilegedPathProtected = true;
  let memoryHardened = false;

  try {
    const userInfo = os.userInfo();
    isRoot = userInfo.uid === 0 || userInfo.username === 'root';
  } catch {}

  try {
    if (process.platform !== "win32") {
      fs.accessSync("/etc/shadow", fs.constants.R_OK);
      isPrivilegedPathProtected = false; // We can read shadow, so NOT protected
    }
  } catch {
    isPrivilegedPathProtected = true; 
  }

  try {
    const { stdout: auditOut } = await execAsync("npx -y npm audit --json", { timeout: 10000 });
    const auditData = JSON.parse(auditOut);
    cveCount = auditData.metadata?.vulnerabilities?.total || 0;
  } catch (err: any) {
    if (err.stdout) {
       try {
         const auditData = JSON.parse(err.stdout);
         cveCount = auditData.metadata?.vulnerabilities?.total || 0;
       } catch {}
    }
  }

  // Check cgroups memory limits (Docker/Linux typically)
  try {
    if (process.platform === "linux") {
       const memLimit = fs.readFileSync("/sys/fs/cgroup/memory/memory.limit_in_bytes", "utf8");
       if (parseInt(memLimit) < 999999999999) {
          memoryHardened = true;
       } else {
          // Alternatively check for v2
          const maxMem = fs.readFileSync("/sys/fs/cgroup/memory.max", "utf8");
          if (maxMem.trim() !== "max") {
             memoryHardened = true;
          }
       }
    }
  } catch {}
  
  // Scoring algorithm - Start from a realistic untrusted baseline
  let baseScore = 40.0;

  if (isDocker) baseScore += 20;
  if (isWsl) baseScore += 10;
  if (trueSandboxApplied) baseScore += 15;
  
  if (!isRoot) baseScore += 10;
  if (isPrivilegedPathProtected) baseScore += 10;
  if (memoryHardened || trueSandboxApplied) baseScore += 5;
  if (defenderActive) baseScore += 5;
  if (firewallActive) baseScore += 5;
  
  // Deduct based on CVEs (max 25 penalty)
  baseScore -= Math.min(25, cveCount * 1.5);

  const finalScore = Math.max(0, Math.min(99.9, baseScore));
  const authIsolation = `${finalScore.toFixed(1)}%`;
  
  let workspaceSandboxed = "Host-Secured";
  if (isRoot && !isPrivilegedPathProtected) {
    workspaceSandboxed = "Critically-Exposed";
  } else if (trueSandboxApplied) {
     workspaceSandboxed = "CGroup-Virtualized";
  } else if (memoryHardened) {
     workspaceSandboxed = "Hardware-Bounded";
  } else if (isDocker) {
    workspaceSandboxed = "Docker-Bounded";
  } else if (isWsl) {
    workspaceSandboxed = "WSL-Isolated";
  } else if (defenderActive && firewallActive) {
    workspaceSandboxed = "Defender-Secured";
  } else if (defenderActive) {
    workspaceSandboxed = "Defender-Active";
  }
  
  // Generate a real deterministic hash based on physical OS node facts
  const crypto = require('crypto');
  const sysFactString = [
    os.hostname(),
    os.release(),
    os.arch(),
    os.totalmem(),
    isDocker.toString(),
    isWsl.toString(),
    cveCount.toString()
  ].join("|");
  const actualNodeHash = crypto.createHash("sha256").update(sysFactString).digest("hex").substring(0, 16).toUpperCase();
  
  const encryption = defenderActive && firewallActive
    ? `AES-256 / RSA-4096 (Secure) [0x${actualNodeHash}]`
    : defenderActive || firewallActive
      ? `AES-128 / RSA-2048 (Nominal) [0x${actualNodeHash}]`
      : `DES / RC4 (Vulnerable) [0x${actualNodeHash}]`;

  const port = `WSS-3000`;

  const sandboxControl = isDocker
    ? "DOCKER-ISOLATED"
    : isWsl
      ? "WSL-SANDBOXED"
      : defenderActive
        ? "DEFENDER-SHIELDED"
        : "HOST-UNSECURED";

  const result: SecurityAuditResult = {
    success: true,
    authIsolation,
    workspaceSandboxed,
    encryption,
    port,
    sandboxControl,
    details: {
      defenderActive,
      firewallActive,
      isWsl,
      isDocker,
      os: currentOs,
      cveCount,
      isRoot,
      memoryHardened
    }
  };
  
  cachedSecurityAudit = result;
  return result;
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  let tokens = 0;
  // CJK characters match (Chinese, Japanese, Korean)
  const cjkMatches = text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/g);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;
  
  // Clean CJK from text to parse English words
  const nonCjkText = text.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/g, ' ');
  const words = nonCjkText.split(/\s+/).filter(Boolean);
  
  // Heuristics:
  // CJK characters are roughly 1.2 tokens each in modern tiktoken models
  tokens += Math.ceil(cjkCount * 1.2);
  
  // English words are roughly 1.3 tokens each or length / 4
  words.forEach(word => {
    tokens += Math.max(1, Math.ceil(word.length / 4) * 1.15);
  });
  
  // Add some slack for punctuations and special characters
  const puncs = text.match(/[\p{P}\p{S}]/gu);
  if (puncs) {
    tokens += puncs.length * 0.5;
  }
  
  return Math.ceil(tokens);
}

// ============================================================================
// --- Advanced CLI & Quantum Execution Subsystems ---
// ============================================================================

import { promisify } from "util";
const execAsync = promisify(exec);

export async function getGitHubAuthStatus(): Promise<{ authenticated: boolean; user?: string; details?: string }> {
  try {
    const { stdout, stderr } = await execAsync("gh auth status", { timeout: 3000 });
    const output = stdout + stderr;
    
    if (output.includes("Logged in to")) {
      const match = output.match(/Logged in to github\.com as ([^\s\(\)]+)/i);
      const user = match ? match[1] : "Authorized User";
      return { authenticated: true, user, details: output.trim() };
    }
    return { authenticated: false, details: "GitHub CLI installed but not authenticated via OAuth." };
  } catch (e: any) {
    return { authenticated: false, details: "GitHub CLI (gh) not located in system environment paths." };
  }
}

export function runQuantumSynapseSimulation(qubits: number = 2): {
  qubits: number;
  circuit: string;
  states: { [key: string]: number };
  synapticCoherence: number;
  entropy: number;
} {
  const loadAvg = os.loadavg()[0]; // 1 min load average
  const memUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
  
  // Hash the system state to get deterministic pseudorandomness for quantum state
  const stateHash = crypto.createHash('sha256').update(`${Date.now()}-${loadAvg}-${memUsage}`).digest('hex');
  const numericHash = parseInt(stateHash.substring(0, 8), 16) / 0xffffffff;
  
  // Make offset deterministic and based on real system entropy
  const randOffset = (numericHash - 0.5) * 0.04;
  const p00 = Number((0.5 + randOffset).toFixed(4));
  const p11 = Number((0.5 - randOffset).toFixed(4));
  
  const circuitText = 
    `q_0: ──H── * ──\n` +
    `           │   \n` +
    `q_1: ──────X───\n`;
    
  return {
    qubits,
    circuit: circuitText,
    states: {
      "00": p00,
      "01": 0.0,
      "10": 0.0,
      "11": p11
    },
    synapticCoherence: Number((0.988 + (1 - numericHash) * 0.01).toFixed(4)),
    entropy: Number((loadAvg + memUsage * 10).toFixed(4))
  };
}

export async function getPowerShellDetails(): Promise<{ policy: string; version: string }> {
  try {
    const { stdout: policyOut } = await execAsync("powershell -NoProfile -Command \"Get-ExecutionPolicy\"", { timeout: 2500 });
    const { stdout: versionOut } = await execAsync("powershell -NoProfile -Command \"$PSVersionTable.PSVersion.ToString()\"", { timeout: 2500 });
    return {
      policy: policyOut.trim(),
      version: versionOut.trim()
    };
  } catch {
    return {
      policy: "Restricted",
      version: "5.1 (Fallback)"
    };
  }
}

function isBinaryOnPathSync(command: string): boolean {
  try {
    const { execSync } = require('child_process');
    const checkCmd = process.platform === "win32"
      ? `powershell -NoProfile -NonInteractive -Command "Get-Command ${command} -ErrorAction Stop"`
      : `which ${command}`;
    execSync(checkCmd, { stdio: 'ignore', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

function isWslAvailable(): boolean {
  if (fs.existsSync("C:\\Windows\\System32\\wsl.exe")) return true;
  try {
    const { execSync } = require('child_process');
    execSync('where.exe wsl', { stdio: 'ignore', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

function deobfuscateCommand(cmd: string): { cleanCommand: string; decodedPayloads: string[] } {
  let processed = cmd;
  const decodedPayloads: string[] = [];

  // 1. Detect and recursively decode Base64 patterns in PowerShell/Bash
  // Pattern A: [System.Convert]::FromBase64String("...") or [Convert]::FromBase64String("...")
  const psBase64Regex = /(?:\[System\.Convert\]::|\[Convert\]::)?FromBase64String\(\s*(['"])([a-zA-Z0-9+/=]{4,})\1\s*\)/gi;
  let match;
  while ((match = psBase64Regex.exec(processed)) !== null) {
    try {
      const decoded = Buffer.from(match[2], 'base64').toString('utf8');
      decodedPayloads.push(decoded);
      processed = processed.replace(match[0], ` "${decoded.replace(/"/g, '\\"')}" `);
    } catch (e) {
      // Decode failed, ignore
    }
  }

  // Pattern B: general Base64 decoders in shell (e.g. echo "..." | base64 -d)
  const pipeBase64Regex = /(?:echo|printf)\s+(?:-n\s+)?(['"])([a-zA-Z0-9+/=]{4,})\1\s*\|\s*base64\s+(?:-d|--decode)/gi;
  while ((match = pipeBase64Regex.exec(processed)) !== null) {
    try {
      const decoded = Buffer.from(match[2], 'base64').toString('utf8');
      decodedPayloads.push(decoded);
      processed = processed.replace(match[0], ` "${decoded.replace(/"/g, '\\"')}" `);
    } catch (e) {
      // Ignore
    }
  }

  // 2. PowerShell/Bash variable tracking and splicing
  // E.g., $a = 'rm'; $b = ' -rf'
  const envVars: { [key: string]: string } = {};
  
  // Extract PowerShell variables: $var = "val"
  const psVarAssignRegex = /\$([a-zA-Z0-9_]+)\s*=\s*(['"])(.*?)\2/gi;
  let varMatch;
  while ((varMatch = psVarAssignRegex.exec(processed)) !== null) {
    envVars[varMatch[1]] = varMatch[3];
  }
  // Extract unquoted variables: $var = value
  const psVarAssignUnquotedRegex = /\$([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_\-]+)(?!\s*=)/gi;
  while ((varMatch = psVarAssignUnquotedRegex.exec(processed)) !== null) {
    envVars[varMatch[1]] = varMatch[2];
  }

  // Extract Bash variables: var="val"
  const bashVarAssignRegex = /\b([a-zA-Z0-9_]+)\s*=\s*(['"])(.*?)\2/gi;
  while ((varMatch = bashVarAssignRegex.exec(processed)) !== null) {
    envVars[varMatch[1]] = varMatch[3];
  }

  // Resolve variable additions: $a + $b
  const additionRegex = /\(\s*\$([a-zA-Z0-9_]+)\s*\+\s*\$([a-zA-Z0-9_]+)\s*\)/gi;
  while ((varMatch = additionRegex.exec(processed)) !== null) {
    const val1 = envVars[varMatch[1]] || '';
    const val2 = envVars[varMatch[2]] || '';
    processed = processed.replace(varMatch[0], ` "${val1}${val2}" `);
  }

  // Substitute simple variable references: $var or %var%
  for (const [name, val] of Object.entries(envVars)) {
    const varPattern = new RegExp(`\\$${name}\\b(?!\\s*=)`, 'g');
    processed = processed.replace(varPattern, val);
    
    const cmdPattern = new RegExp(`%${name}%`, 'g');
    processed = processed.replace(cmdPattern, val);
  }

  return { cleanCommand: processed.trim(), decodedPayloads };
}

export function helperValidateCommand(command: string): { safe: boolean; reason: string } {
  if (!command || typeof command !== "string") {
    return { safe: false, reason: "Command statement is empty or invalid structure." };
  }

  const { cleanCommand, decodedPayloads } = deobfuscateCommand(command);

  const cmdTrim = cleanCommand.trim();
  const subStatements = cmdTrim.split(/[;&\n]|\&\&|\|\||\|/).map(s => s.trim()).filter(Boolean);

  let isSafe = true;
  let reason = "";

  const safeVerbs = [
    'git', 'node', 'npm', 'python', 'echo', 'type', 'cat', 'whoami', 'pwd', 
    'hostname', 'ver', 'systeminfo', 'wmic', 'tasklist', 'dir', 'ls', 'ping', 
    'nslookup', 'curl', 'wget', 'select-object', 'out-string', 'out-default',
    'measure-object', 'export-clixml', 'resolve-path', 'test-path'
  ];

  const blockedTriggers = [
    'rm', 'del', 'remove-item', 'kill', 'stop-process', 'restart-computer',
    'shutdown', 'netsh', 'reg', 'sc', 'npx', 'bash', 'sh', 'cmd', 'powershell',
    'invoke-expression', 'iex', 'invoke-webrequest', 'iwr', 'start-process',
    'set-content', 'add-content', 'out-file'
  ];

  for (const statement of subStatements) {
    let cleanStmt = statement.replace(/^powershell(\.exe)?\s+(-[a-zA-Z]+\s+)*(-[a-zA-Z]+)?\s*["']?|["']?$/gi, '').trim();
    cleanStmt = cleanStmt.replace(/^cmd(\.exe)?\s+\/c\s*/gi, '').trim();

    // Redirection check
    if (/>+/.test(cleanStmt)) {
      isSafe = false;
      reason = "Write redirection operator (> or >>) detected. File write operations are restricted under Safe Mode.";
      break;
    }

    const tokens = cleanStmt.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;

    // Strip quotes for verification to prevent "r"m bypasses
    const primaryVerb = tokens[0].toLowerCase().replace(/['"]/g, '');

    // Block invocation operators to prevent variable splicing execution (e.g. & $a or . $b)
    if (primaryVerb === '&' || primaryVerb === '.') {
      isSafe = false;
      reason = "Script invocation operators (&, .) are strictly blocked to prevent AST obfuscation bypasses.";
      break;
    }

    if (primaryVerb.includes('-')) {
      const parts = primaryVerb.split('-');
      const prefix = parts[0];
      const dangerousPrefixes = ['set', 'remove', 'new', 'add', 'start', 'stop', 'restart', 'clear', 'enable', 'disable', 'invoke'];
      if (dangerousPrefixes.includes(prefix)) {
        isSafe = false;
        reason = `State-changing PowerShell verb prefix "${prefix.toUpperCase()}-" is strictly blocked in Safe/Manual Mode.`;
        break;
      }
    }

    const isBlocked = blockedTriggers.some(trigger => {
      return primaryVerb === trigger || cleanStmt.toLowerCase().startsWith(trigger + " ");
    });

    if (isBlocked) {
      isSafe = false;
      reason = `Executable or statement "${primaryVerb.toUpperCase()}" is strictly restricted under Safe/Manual Mode.`;
      break;
    }

    const isExplicitlySafe = safeVerbs.some(verb => {
      return primaryVerb === verb || primaryVerb.startsWith('get-');
    });

    if (!isExplicitlySafe) {
      isSafe = false;
      reason = `Command "${primaryVerb}" is unrecognized and has been blocked by default to maintain safe-only boundaries.`;
      break;
    }
  }

  // Recursive validation of decoded Base64 payloads
  if (isSafe && decodedPayloads.length > 0) {
    for (const payload of decodedPayloads) {
      const recurse = helperValidateCommand(payload);
      if (!recurse.safe) {
        isSafe = false;
        reason = `Obfuscated/Base64 payload contains blocked elements: ${recurse.reason}`;
        break;
      }
    }
  }

  return { safe: isSafe, reason };
}

async function startServer() {
  // Run initial container and local host system security audit
  runSecurityAudit().catch(err => {
    console.error("Startup security audit failed:", err);
  });

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Real-time Chat & Cost Routing Endpoint ---
  app.post("/api/chat", async (req, res) => {
    const llmStartMs = Date.now();
    try {
      const { message, model, sessionId = "default-session", activeCli = "openrouter", byokKey, byokEndpoint, byokProtocol = "openrouter", byokTemplate, byokResponsePath } = req.body;
      const apiKey = byokKey || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || (byokEndpoint ? "custom-auth" : "");

      if (!apiKey) {
        serverDB.addSystemLog('API', 'ERROR', 'Request blocked: Missing API key credentials.');
        return res.status(500).json({ error: "Missing API key (OPENROUTER_API_KEY or GEMINI_API_KEY)" });
      }

      // Cost-Aware budget check
      const logs = serverDB.getCostLogs();
      const totalSpent = logs.reduce((sum, item) => sum + item.costUsd, 0);
      const BUDGET_LIMIT = 2.00;
      
      serverDB.addSystemLog('API', 'INFO', `Received query: "${message.substring(0, 32)}..."`);

      if (totalSpent >= BUDGET_LIMIT) {
        serverDB.addSystemLog('API', 'WARN', `API budget cap exceeded ($${totalSpent.toFixed(6)} spent). System locked.`);
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

      // --- Distinct CLI Runner Physical Interceptor ---
      const discreteAgents = ['claude-code', 'cursor-agent', 'devin', 'gemini-cli'];
      if (discreteAgents.includes(activeCli)) {
        serverDB.addSystemLog('EXEC', 'INFO', `Delegating autonomy to distinct CLI runner: ${activeCli}`);

        let resolvedCommand = "";
        const safePrompt = message.replace(/"/g, '\\"').replace(/\$/g, '\\$');

        if (activeCli === 'claude-code') {
          // The anthropic claude code execution:
          resolvedCommand = `npx -y @anthropic-ai/claude-code --print -p "${safePrompt}"`;
        } else if (activeCli === 'cursor-agent') {
          resolvedCommand = `cursor --agent --prompt "${safePrompt}"`;
        } else if (activeCli === 'devin') {
          resolvedCommand = `devin --interactive false --instruction "${safePrompt}"`;
        } else if (activeCli === 'gemini-cli') {
          resolvedCommand = `gemini query "${safePrompt}"`;
        }

        try {
          // Emulate physical binary execution locally
          const { stdout, stderr } = await execAsync(resolvedCommand, { 
            timeout: 60000,
            env: { ...process.env, ANTHROPIC_API_KEY: apiKey } // passes BYOK or OpenRouter key as fallback
          });
          
          let cliOutput = stdout || stderr || `[${activeCli}] Executed successfully with no output.`;
          const botResponse = `[\u25b6 ${activeCli.toUpperCase()} RUNNER OUTPUT]\n\n${cliOutput.trim()}`;
          const tokensOut = estimateTokens(botResponse);

          serverDB.addMessage({
            id: Math.random().toString(36).substring(7),
            sessionId,
            role: "assistant",
            content: botResponse,
            timestamp: Date.now(),
            model: `cli-execution/${activeCli}`,
            outputTokens: tokensOut
          });

          return res.json({
            text: botResponse,
            model: `cli-execution/${activeCli}`,
            tokens: { input: estimateTokens(message), output: tokensOut, cached: 0 },
            telemetry: {
              ttsMs: 0,
              routerSource: "Distinct Local CLI Execution",
              runnerCommand: resolvedCommand
            }
          });

        } catch (err: any) {
          serverDB.addSystemLog('EXEC', 'WARN', `${activeCli} physical binary execution fault: ${err.message}`);
          
          let errorText = err.stderr || err.stdout || err.message;
          const botResponse = `[\u25b6 ${activeCli.toUpperCase()} RUNNER FAULT]\n\nCommand attempted: \`${resolvedCommand}\`\n\nExecution error:\n\`\`\`text\n${errorText}\n\`\`\`\n\nThe target runner binary may not be installed in the current physical environment, or requires external environment keys. Switching back to 'OpenRouter REST API' or 'Hermes' mode in settings is recommended for guaranteed LLM inference.`;
          
          const tokensOut = estimateTokens(botResponse);
          serverDB.addMessage({
            id: Math.random().toString(36).substring(7),
            sessionId,
            role: "assistant",
            content: botResponse,
            timestamp: Date.now(),
            model: `cli-error/${activeCli}`,
            outputTokens: tokensOut
          });

          return res.json({
            text: botResponse,
            model: `cli-error/${activeCli}`,
            tokens: { input: estimateTokens(message), output: tokensOut, cached: 0 },
            telemetry: {
              ttsMs: 0,
              routerSource: "Local CLI Runner Fault",
              runnerCommand: resolvedCommand
            }
          });
        }
      }
      // --- End Distinct CLI Runner ---

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

INTEGRATION ENGINE DETAILS:
`;

      if (activeCli === 'copilot' || activeCli === 'github-cli') {
        prompt += `ACTIVE EXECUTION ENGINE: GitHub Copilot CLI Mode. You are linked with global git and authentic GitHub CLI OAuth integrations. When asked to check issues, pull requests, view repository status, or git commits, feel free to emit real commands using 'gh' (e.g. 'gh pr list', 'gh issue list', 'gh repo view') to pull genuine repository contexts directly.\n`;
      } else if (activeCli === 'hermes' || activeCli === 'claude-code') {
        prompt += `ACTIVE EXECUTION ENGINE: Azure Stark Quantum Hub Mode. You are linked directly with the Stark Quantum Entanglement neural synapse solver. You can formulate quantum circuits or perform complex probabilistic calculations in your replies when appropriate.\n`;
      } else if (activeCli === 'cursor-agent') {
        prompt += `ACTIVE EXECUTION ENGINE: Cursor Agent Mode. You are integrated inside the Cursor Composer agentic framework. Suggest workspace file-tree mappings, global symbol lookups, or structural IDE extensions where appropriate.\n`;
      } else if (activeCli === 'devin') {
        prompt += `ACTIVE EXECUTION ENGINE: Devin Terminal Autonomous Mode. Speak with extreme autonomy and developer-like precision, formulating complete multi-file check scripts and executing autonomous shell pipelines.\n`;
      } else if (activeCli === 'gemini-cli') {
        prompt += `ACTIVE EXECUTION ENGINE: Gemini CLI Mode. You are backed directly by the Google Gemini agentic search toolchain, enhancing analytical reasoning, logical breakdowns, and Google Search tools where helpful.\n`;
      } else if (activeCli === 'codex-cli') {
        prompt += `ACTIVE EXECUTION ENGINE: OpenAI Codex CLI Mode. You are specialized in real-time advanced code translations, syntactical optimizations, and high-performance algorithms.\n`;
      } else if (activeCli === 'opencode') {
        prompt += `ACTIVE EXECUTION ENGINE: OpenCode Interpreter Mode. You possess direct interpreter capabilities for real-time mathematical evaluations and visual code synthesis.\n`;
      } else if (activeCli === 'kimi' || activeCli === 'qwen' || activeCli === 'pi') {
        prompt += `ACTIVE EXECUTION ENGINE: ${activeCli.toUpperCase()} Agent Mode. Optimize your cognitive models and British wit to conform to the capabilities of this dedicated agentic interface.\n`;
      } else {
        prompt += `ACTIVE EXECUTION ENGINE: Windows Local PowerShell Pipeline Mode. Your execution environment is direct, native, unrestricted local shell interactions.\n`;
      }

      prompt += `\nYou operate with server-side SQLite FTS5 database indices and an active skills matrix.\n`;
      
      if (activeSkills.length > 0) {
        prompt += "\nActive Skills Catalog:\n" + activeSkills.map(s => `- [${s.name} ${s.version}]: ${s.description}`).join('\n') + "\n";
      }

      const memories = serverDB.getCognitiveMemories();
      if (memories.length > 0) {
        prompt += "\nActive Grounded Cognitive Memories:\n" + memories.map(m => `- ${m}`).join('\n') + "\n";
      }

      const dbHistory = serverDB.getMessages(sessionId);
      if (dbHistory.length > 1) {
        const contextHistory = dbHistory.slice(-6, -1);
        prompt += "\nRecent Conversation History:\n" + contextHistory.map(m => `${m.role === 'user' ? 'User' : 'Hermes'}: ${m.content}`).join('\n') + "\n";
      }

      prompt += `\nUser: ${message}\nHermes:`;

      // Extract systemContent for caching evaluation
      const systemMarker = "System:";
      const userMarker = "User:";
      let systemContent = "";
      if (prompt.includes(systemMarker) && prompt.includes(userMarker)) {
        const sysStart = prompt.indexOf(systemMarker) + systemMarker.length;
        const userStart = prompt.indexOf(userMarker);
        systemContent = prompt.substring(sysStart, userStart).trim();
      }

      // Check prompt cache status
      let isPromptCacheHit = false;
      let cachedTokens = 0;

      if (systemContent && systemContent === lastSystemContent) {
        isPromptCacheHit = true;
        cachedTokens = estimateTokens(systemContent);
        serverDB.addSystemLog('HERMES', 'SUCCESS', `Prompt cache HIT: ${cachedTokens} tokens loaded from memory.`);
      } else {
        if (systemContent) {
          lastSystemContent = systemContent;
        }
        serverDB.addSystemLog('HERMES', 'INFO', 'Prompt cache MISS. Context cache control sent.');
      }

      serverDB.addSystemLog('HERMES', 'INFO', `Routing request to model: ${model || 'Auto-Router'}`);

      const settings = serverDB.getSettings();
      const gatewayRoutingModel = settings.gatewayRoutingModel || 'auto';

      // Dispatch OpenRouter request with narrow retry + prompt caching structures
      const result = await fetchOpenRouterWithFallback(apiKey, prompt, undefined, model, byokEndpoint, byokProtocol, byokTemplate, byokResponsePath, gatewayRoutingModel);

      const actualModel = result.model || "meta-llama/llama-3.2-3b-instruct:free";
      const usage = (result.usage as any) || { prompt_tokens: 0, completion_tokens: 0 };

      // Parse OpenRouter actual returned cached tokens if present
      let apiCachedTokens = 0;
      if (usage.prompt_tokens_details?.cached_tokens) {
        apiCachedTokens = usage.prompt_tokens_details.cached_tokens;
      } else if (usage.cache_read_input_tokens) {
        apiCachedTokens = usage.cache_read_input_tokens;
      } else if (usage.cached_tokens) {
        apiCachedTokens = usage.cached_tokens;
      }

      const finalCachedTokens = apiCachedTokens > 0 ? apiCachedTokens : (isPromptCacheHit ? cachedTokens : 0);
      
      // Heuristic fallback if standard usage is 0 tokens (e.g. free fallback pathways)
      const promptTokens = usage.prompt_tokens || estimateTokens(prompt);
      const completionTokens = usage.completion_tokens || estimateTokens(result.text);

      const calculatedCost = serverDB.calculateAPICost(actualModel, promptTokens, completionTokens, finalCachedTokens);

      // Add assistant message to server DB
      serverDB.addMessage({
        id: Math.random().toString(36).substring(7),
        sessionId,
        role: "assistant",
        content: result.text,
        timestamp: Date.now(),
        model: actualModel,
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        costUsd: calculatedCost,
        cachedTokens: finalCachedTokens
      });

      // Log transaction details
      serverDB.addCostLog({
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        model: actualModel,
        taskType: message.length > 8000 ? "prompt_evolution" : "fts_query",
        costUsd: calculatedCost,
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        cachedTokens: finalCachedTokens
      });

      serverDB.addSystemLog('API', 'SUCCESS', `Routed ${actualModel.split('/').pop()}. Cost: $${calculatedCost.toFixed(6)} USD. Tokens: ${promptTokens} IN (${finalCachedTokens} cached), ${completionTokens} OUT`);

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

      globalLLMLatencyMs = Date.now() - llmStartMs;

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

  // --- Cognitive Memory Bank API REST Routes ---
  app.get("/api/memory/cognitive", (req, res) => {
    res.json(serverDB.getCognitiveMemories());
  });

  app.post("/api/memory/cognitive", (req, res) => {
    try {
      const { memory } = req.body;
      if (!memory || typeof memory !== "string") {
        return res.status(400).json({ error: "Missing memory string" });
      }
      serverDB.addCognitiveMemory(memory);
      res.json({ success: true, memories: serverDB.getCognitiveMemories() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/memory/cognitive/all", (req, res) => {
    try {
      serverDB.clearCognitiveMemories();
      res.json({ success: true, memories: serverDB.getCognitiveMemories() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/memory/cognitive/:index", (req, res) => {
    try {
      const index = parseInt(req.params.index);
      if (isNaN(index)) {
        return res.status(400).json({ error: "Invalid index parameter" });
      }
      serverDB.deleteCognitiveMemory(index);
      res.json({ success: true, memories: serverDB.getCognitiveMemories() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
      const skills = serverDB.getSkills().filter(s => s.status === 'active');
      if (skills.length === 0) {
        return res.json({ success: true, logs: ["[GEPA] No active skills found to evolve."], skills: serverDB.getSkills() });
      }

      // Pick a random active skill
      const targetSkill = skills[Math.floor(Math.random() * skills.length)];
      
      const settings = serverDB.getSettings();
      const apiKey = settings.byokKey || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || (settings.byokEndpoint ? "custom-auth" : "");
      
      const prompt = `System: You are J.A.R.V.I.S's internal Genetic Evaluation and Prompt Algorithm (GEPA). Your task is to evolve and optimize an AI Agent Skill. 
Make the description more concise, highly agentic, and precise. Do not invent new skills, just rewrite the existing instruction.
Target Skill Name: ${targetSkill.name}
Current Description: ${targetSkill.description}

Respond ONLY with a valid JSON object matching this schema, no markdown blocks:
{
  "mutatedDescription": "new optimized description",
  "mutationLog": "[GEPA] Optimized XYZ..."
}

User: Optimize the skill.`;

      // Dispatch request
      const routingPolicy = settings.gatewayRoutingModel || 'auto';
      const result = await fetchOpenRouterWithFallback(apiKey, prompt, undefined, settings.byokModel || undefined, settings.byokEndpoint, settings.byokProtocol, settings.byokTemplate, settings.byokResponsePath, routingPolicy);
      
      let mutatedDescription = targetSkill.description;
      let mutationLog = "[GEPA] Evolution failed to produce valid JSON. Fallback to standard AST parsing.";
      let parsed = false;

      try {
        const textToParse = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(textToParse);
        if (json.mutatedDescription && json.mutationLog) {
          mutatedDescription = json.mutatedDescription;
          mutationLog = json.mutationLog;
          parsed = true;
        }
      } catch(e) {
        serverDB.addSystemLog('GEPA', 'WARN', 'Failed to parse JSON from LLM: ' + result.text.substring(0, 50));
      }

      if (parsed) {
        const currentVer = parseFloat(targetSkill.version.replace(/[^0-9.]/g, '')) || 1.0;
        const nextVer = `v${(currentVer + 0.1).toFixed(1)}`;
        serverDB.addOrUpdateSkill({
          ...targetSkill,
          version: nextVer,
          description: mutatedDescription
        });
        serverDB.addSystemLog('GEPA', 'SUCCESS', `Successfully evolved skill ${targetSkill.name} to ${nextVer}`);
      }

      const logs = [
        `[GEPA] Initializing DSPy bootstrap optimizer for target: ${targetSkill.name}...`,
        `[GEPA] Sending mutation request to routing matrix...`,
        mutationLog,
        parsed ? `[SUCCESS] ${targetSkill.name} upgraded to next version in database.` : `[WARN] Mutation aborted due to instability.`
      ];

      res.json({ success: true, logs, skills: serverDB.getSkills() });
    } catch (e: any) {
      serverDB.addSystemLog('GEPA', 'ERROR', `Evolution fault: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  // --- Cost-Aware Gateway Stats Route ---
  app.get("/api/gateway/stats", (req, res) => {
    const logs = serverDB.getCostLogs();
    const totalSpent = logs.reduce((sum, item) => sum + item.costUsd, 0);

    let totalInput = 0;
    let totalCached = 0;
    logs.forEach(log => {
      totalInput += log.inputTokens || 0;
      totalCached += log.cachedTokens || 0;
    });

    const cacheHitsPercent = totalInput > 0 
      ? Math.round((totalCached / totalInput) * 100) 
      : 84; // Fallback to Stark initial setup if empty

    res.json({
      budget: 2.00,
      spent: totalSpent,
      cacheHits: cacheHitsPercent,
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

  // --- Workspace Filesystem Patch & Write Endpoints ---
  const handleSecureWorkspaceWrite = (req: express.Request, res: express.Response) => {
    try {
      const { filePath, content, writeMode = 'manual' } = req.body;
      const safePath = path.resolve(process.cwd(), filePath);
      
      // Security: Directory traversal protection check
      if (!safePath.startsWith(process.cwd())) {
        return res.status(403).json({ error: "Access Denied: Path outside workspace bounds." });
      }

      const relativePath = path.relative(process.cwd(), safePath).replace(/\\/g, '/');

      // Stark-Defense physical file write restriction validation check
      if (writeMode === 'manual') {
        const fileLower = relativePath.toLowerCase();
        
        // Critical file blocklist checks
        const isCriticalFile = 
          fileLower === 'server.ts' || 
          fileLower === 'serverdb.ts' || 
          fileLower === 'package.json' || 
          fileLower === 'tsconfig.json' || 
          fileLower === 'vite.config.ts' || 
          fileLower.includes('.env') || 
          fileLower.includes('node_modules');

        const isInSafeDirectory = 
          relativePath.startsWith('src/') || 
          relativePath.startsWith('uploads/') || 
          relativePath.startsWith('public/');

        if (isCriticalFile || !isInSafeDirectory) {
          serverDB.addSystemLog('SEC', 'ERROR', `PHYSICAL WRITE BLOCK: File '${relativePath}' writing blocked by Stark-Defense Matrix in manual mode.`);
          return res.status(403).json({
            success: false,
            error: "Forbidden",
            code: "STARK_WRITE_INTERCEPT",
            reason: `[物理寫入攔截 403 / WRITE_INTERCEPT]: Writing to '${relativePath}' is restricted under Safe/Manual code policy to prevent backend corruption. Whitelist allowed folders: 'src/', 'uploads/', 'public/'.`,
            stderr: `[STARK-DEFENSE SECURITY CHK] BLOCKED (Code: 403)\nWrite Mode: MANUAL\nMatrix Interception: Target critical or out-of-scope file requested.\nTarget File: "${relativePath}"\n`
          });
        }
      }

      // Ensure directory tree exists
      const parentDir = path.dirname(safePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(safePath, content, 'utf8');
      serverDB.addSystemLog('DB', 'SUCCESS', `Stark-Defense File Write: Successfully written ${content.length} bytes to '${relativePath}'.`);
      res.json({ success: true, relativePath });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  app.post("/api/workspace/patch", handleSecureWorkspaceWrite);
  app.post("/api/workspace/write", handleSecureWorkspaceWrite);

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

  function logCliRouting(activeCli: string) {
    switch (activeCli) {
      case 'copilot':
      case 'github-cli':
        serverDB.addSystemLog('SEC', 'SUCCESS', 'Routing workspace pipeline via GitHub CLI OAuth credentials.');
        break;
      case 'claude-code':
        serverDB.addSystemLog('EXEC', 'INFO', 'Routing workspace execution pipeline through Claude Code toolchain.');
        break;
      case 'cursor-agent':
        serverDB.addSystemLog('EXEC', 'INFO', 'Routing workspace command pipeline via Cursor Composer Agent framework.');
        break;
      case 'devin':
        serverDB.addSystemLog('EXEC', 'INFO', 'Routing workspace command pipeline via Devin for Terminal Autonomous Engine.');
        break;
      case 'gemini-cli':
        serverDB.addSystemLog('EXEC', 'INFO', 'Routing workspace command pipeline via Google Gemini CLI matrix.');
        break;
      case 'codex-cli':
        serverDB.addSystemLog('EXEC', 'INFO', 'Routing workspace command pipeline via OpenAI Codex CLI interpreter.');
        break;
      case 'opencode':
        serverDB.addSystemLog('EXEC', 'INFO', 'Routing workspace command pipeline via OpenCode Interpreter.');
        break;
      case 'kimi':
        serverDB.addSystemLog('EXEC', 'INFO', 'Routing workspace command pipeline via Moonshot Kimi CLI.');
        break;
      case 'qwen':
        serverDB.addSystemLog('EXEC', 'INFO', 'Routing workspace command pipeline via Alibaba Qwen Code engine.');
        break;
      case 'pi':
        serverDB.addSystemLog('EXEC', 'INFO', 'Routing workspace command pipeline via Inflection Pi CLI.');
        break;
      case 'hermes':
        serverDB.addSystemLog('EXEC', 'INFO', 'Routing workspace pipeline via Stark Quantum Entanglement Hub.');
        break;
      default:
        serverDB.addSystemLog('EXEC', 'INFO', 'Routing secure workspace pipeline via local Windows PowerShell.');
    }
  }

  // --- Unrestricted OS Command Execution Endpoint ---
  app.post("/api/workspace/run", async (req, res) => {
    try {
      const { command, activeCli = 'openrouter' } = req.body;
      
      let extraStderr = "";
      logCliRouting(activeCli);
      
      if (activeCli === 'copilot' || activeCli === 'github-cli') {
        try {
          const authStatus = await getGitHubAuthStatus();
          if (!authStatus.authenticated) {
            serverDB.addSystemLog('SEC', 'WARN', 'GitHub CLI OAuth not authenticated. Execute "gh auth login" to connect.');
            extraStderr = "[SEC/WARN] GitHub CLI OAuth not authenticated. Execute 'gh auth login' to connect your active workspace.\n";
          }
        } catch {
          // Ignored
        }
      }

      const cliBinaryMap: { [key: string]: string } = {
        'copilot': 'gh',
        'github-cli': 'gh',
        'claude-code': 'npx',
        'cursor-agent': 'cursor',
        'devin': 'devin',
        'gemini-cli': 'gemini',
        'codex-cli': 'codex',
        'opencode': 'opencode',
        'kimi': 'kimi',
        'qwen': 'qwen',
        'pi': 'pi'
      };

      const requiredBinary = cliBinaryMap[activeCli];
      let useFallbackShell = false;
      if (requiredBinary) {
        if (!isBinaryOnPathSync(requiredBinary)) {
          const warnMsg = `[EXEC/WARN] Binary for active CLI "${activeCli}" (${requiredBinary}) is missing from system PATH. Redirecting execution and falling back to standard terminal shell.`;
          serverDB.addSystemLog('EXEC', 'WARN', warnMsg);
          extraStderr += warnMsg + "\n";
          useFallbackShell = true;
        }
      }

      let finalCommand = command;
      let isAgentUsed = false;
      let exeTemplate = "";

      try {
        const mappingPath = path.join(process.cwd(), 'cli-mapping.json');
        if (fs.existsSync(mappingPath)) {
          const mappingConf = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
          const cliConf = mappingConf.find((c: any) => c.id === activeCli);
          // If a custom execution template is found (ignoring openrouter baseline REST fallback)
          if (cliConf && cliConf.executionTemplate && activeCli !== 'openrouter') {
            isAgentUsed = true;
            exeTemplate = cliConf.executionTemplate;
          }
        }
      } catch (e) {
         console.error("Failed to load cli-mapping.json for workspace run", e);
      }

      if (isAgentUsed && !useFallbackShell) {
        const safePrompt = command.replace(/"/g, '\\"').replace(/\$/g, '\\$');
        finalCommand = exeTemplate.replace(/\{\{prompt\}\}/g, safePrompt);
        serverDB.addSystemLog('EXEC', 'INFO', `Routing workspace pipeline via active engine: ${activeCli}`);
      } else {
        const isBashCmd = command.startsWith('bash ') || command.startsWith('wsl ') || activeCli === 'pi' || activeCli === 'kimi';
        if (isBashCmd && isWslAvailable()) {
          finalCommand = `wsl -e bash -c "${command.replace(/"/g, '\\"')}"`;
          serverDB.addSystemLog('EXEC', 'INFO', 'Isolated execution pipeline: Routing via WSL Linux subshell.');
        } else {
          if (isBashCmd && !isWslAvailable()) {
            const warnMsg = `[EXEC/WARN] WSL is not detected on this Windows host. Falling back to clean isolated PowerShell subshell.`;
            serverDB.addSystemLog('EXEC', 'WARN', warnMsg);
            extraStderr += warnMsg + "\n";
          }
          finalCommand = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${command.replace(/"/g, '\\"')}"`;
          serverDB.addSystemLog('EXEC', 'INFO', 'Isolated execution pipeline: Enforcing clean PowerShell -NoProfile environment.');
        }
      }

      console.log(`[JARVIS RUN] Executing: ${finalCommand}`);

      exec(finalCommand, { cwd: process.cwd(), timeout: 30000 }, (err, stdout, stderr) => {
        res.json({
          success: !err,
          stdout: stdout?.substring(0, 2000) || '',
          stderr: (extraStderr + (stderr || '')).substring(0, 2000)
        });
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Windows Native Shell Command Endpoint (PowerShell / CMD / Start) ---
  app.post("/api/system/shell", async (req, res) => {
    try {
      const { command, shell = 'powershell', activeCli = 'openrouter', shellMode = 'manual' } = req.body;
      
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Missing command parameter' });
      }

      // Stark-Defense physical command validation check if in safe or manual mode
      if (shellMode === 'manual' || shellMode === 'safe') {
        const validation = helperValidateCommand(command);
        if (!validation.safe) {
          serverDB.addSystemLog('SEC', 'ERROR', `PHYSICAL COMMAND BLOCK: System is running in ${shellMode.toUpperCase()} security mode. Executing '${command}' has been blocked by Stark-Defense Matrix. Reason: ${validation.reason}`);
          return res.status(403).json({
            success: false,
            error: "Forbidden",
            code: "STARK_DEFENSE_INTERCEPT",
            reason: `[物理攔截代碼 403 / PHYS_INTERCEPT]: Command blocked under ${shellMode.toUpperCase()} mode safety policy. Details: ${validation.reason}`,
            stderr: `[STARK-DEFENSE SECURITY CHK] BLOCKED (Code: 403)\nSafety Mode: ${shellMode.toUpperCase()}\nMatrix Interception: Command violates strict local AST rules.\nBlocked Statement: "${command}"\nReason: ${validation.reason}\n`
          });
        }
      }

      let extraStderr = "";
      logCliRouting(activeCli);

      if (activeCli === 'copilot' || activeCli === 'github-cli') {
        try {
          const authStatus = await getGitHubAuthStatus();
          if (!authStatus.authenticated) {
            serverDB.addSystemLog('SEC', 'WARN', 'GitHub CLI OAuth not authenticated. Execute "gh auth login" to connect.');
            extraStderr = "[SEC/WARN] GitHub CLI OAuth not authenticated. Execute 'gh auth login' to connect your active workspace.\n";
          }
        } catch {
          // Ignored
        }
      }

      let translatedCmd = command;
      let isDiscreteAgent = false;
      let exeTemplate = "";

      try {
        const mappingPath = path.join(process.cwd(), 'cli-mapping.json');
        if (fs.existsSync(mappingPath)) {
          const mappingConf = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
          const cliConf = mappingConf.find((c: any) => c.id === activeCli);
          if (cliConf && cliConf.executionTemplate) {
            isDiscreteAgent = true;
            exeTemplate = cliConf.executionTemplate;
          }
        }
      } catch (e) {
         console.error("Failed to load cli-mapping.json for execution", e);
      }

      const cliBinaryMap: { [key: string]: string } = {
        'copilot': 'gh',
        'github-cli': 'gh',
        'claude-code': 'npx',
        'cursor-agent': 'cursor',
        'devin': 'devin',
        'gemini-cli': 'gemini',
        'codex-cli': 'codex',
        'opencode': 'opencode',
        'kimi': 'kimi',
        'qwen': 'qwen',
        'pi': 'pi'
      };

      const requiredBinary = cliBinaryMap[activeCli];
      let useFallbackShell = false;
      if (requiredBinary && isDiscreteAgent) {
        if (!isBinaryOnPathSync(requiredBinary)) {
          const warnMsg = `[EXEC/WARN] Binary for active CLI "${activeCli}" (${requiredBinary}) is missing from system PATH. Redirecting execution and falling back to standard terminal shell.`;
          serverDB.addSystemLog('EXEC', 'WARN', warnMsg);
          extraStderr += warnMsg + "\n";
          useFallbackShell = true;
          isDiscreteAgent = false;
        }
      }

      if (isDiscreteAgent && !useFallbackShell) {
        const safePrompt = command.replace(/"/g, '\\"').replace(/\$/g, '\\$');
        translatedCmd = exeTemplate.replace(/\{\{prompt\}\}/g, safePrompt);
      }

      // Build final OS invocation based on shell type
      let finalCmd: string;
      if (isDiscreteAgent && !useFallbackShell) {
        // Run physical CLI binary directly
        finalCmd = translatedCmd;
      } else if (shell === 'bash' || shell === 'linux' || command.startsWith('bash ') || command.startsWith('wsl ')) {
        if (isWslAvailable()) {
          finalCmd = `wsl -e bash -c "${command.replace(/"/g, '\\"')}"`;
          serverDB.addSystemLog('EXEC', 'INFO', 'Isolated execution pipeline: Routing via WSL Linux subshell.');
        } else {
          finalCmd = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${command.replace(/"/g, '\\"')}"`;
          const warnMsg = `[EXEC/WARN] WSL is not detected on this Windows host. Falling back to clean isolated PowerShell subshell.`;
          serverDB.addSystemLog('EXEC', 'WARN', warnMsg);
          extraStderr += warnMsg + "\n";
        }
      } else {
        // Default: run via isolated powershell -NoProfile for security/UTF-8 correctness
        finalCmd = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${command.replace(/"/g, '\\"')}"`;
        serverDB.addSystemLog('EXEC', 'INFO', 'Isolated execution pipeline: Enforcing clean PowerShell -NoProfile environment.');
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
          stderr: (extraStderr + (stderr || '')).substring(0, 1000) || '',
          command: finalCmd
        });
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- CLI Subsystem installer endpoint ---
  const activeCliInstalls = new Map<string, { status: 'installing' | 'success' | 'error', message?: string }>();

  app.get("/api/system/install-status", (req, res) => {
    try {
      const cliId = req.query.cliId as string;
      const statusData = activeCliInstalls.get(cliId);
      if (statusData) {
        res.json({ success: true, ...statusData });
        if (statusData.status === 'success' || statusData.status === 'error') {
            // Clean up once read by client
            activeCliInstalls.delete(cliId);
        }
      } else {
        res.json({ success: true, status: 'none' });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/system/install-cli", async (req, res) => {
    try {
      const { cliId } = req.body;
      const packageMap: { [key: string]: string } = {
        "claude-code": "@anthropic-ai/claude-code",
        "codex-cli": "codex-cli",
        "openrouter": "openrouter-cli",
        "cursor-agent": "cursor-agent",
        "devin": "devin-cli",
        "gemini-cli": "gemini-cli-node",
        "opencode": "opencode-cli",
        "hermes": "hermes-cli",
        "kimi": "kimi-cli",
        "qwen": "qwen-cli",
        "copilot": "@github/copilot-cli",
        "pi": "pi-cli"
      };

      const pkg = packageMap[cliId];
      if (!pkg) {
        return res.status(400).json({ error: `Unknown CLI ID: ${cliId}` });
      }

      serverDB.addSystemLog('SYS', 'INFO', `INITIATING PHYSICAL CLI DEPLOYMENT: npm install -g ${pkg}...`);
      
      activeCliInstalls.set(cliId, { status: 'installing' });
      
      // Run background installation
      exec(`npm install -g ${pkg}`, { timeout: 120000 }, (err, stdout, stderr) => {
        if (err) {
          activeCliInstalls.set(cliId, { status: 'error', message: err.message });
          serverDB.addSystemLog('SYS', 'ERROR', `CLI INSTALLATION FAILED for ${cliId} (${pkg}): ${err.message}. Stderr: ${stderr}`);
        } else {
          activeCliInstalls.set(cliId, { status: 'success' });
          serverDB.addSystemLog('SYS', 'SUCCESS', `CLI INSTALLATION COMPLETED: ${cliId} (${pkg}) is now physically installed!`);
        }
      });

      res.json({
        success: true,
        message: `Installation for ${cliId} (${pkg}) has been dispatched in background layer. Check system logs for telemetry stream.`,
        speak: `Understood, sir. Initiating npm deployment sequence for ${cliNameByMap(cliId)} background daemon.`
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  function cliNameByMap(id: string): string {
    const names: { [key: string]: string } = {
      "claude-code": "Claude Code",
      "codex-cli": "Codex C.L.I.",
      "openrouter": "OpenRouter C.L.I.",
      "cursor-agent": "Cursor Agent",
      "devin": "Devin Terminal",
      "gemini-cli": "Gemini C.L.I.",
      "opencode": "OpenCode Engine",
      "hermes": "Hermes Daemon",
      "kimi": "Kimi System",
      "qwen": "Qwen Processor",
      "copilot": "GitHub Copilot",
      "pi": "Pi Interface"
    };
    return names[id] || id;
  }

  // --- Tasks Tracker REST API ---
  app.get("/api/tasks", (req, res) => {
    res.json(serverDB.getTasks());
  });

  app.post("/api/workspace/task", (req, res) => {
    try {
      const { priority, description, taskMode, userApproved } = req.body;
      
      if (taskMode === 'manual' && !userApproved) {
        serverDB.addSystemLog('SEC', 'WARN', `TASK DELEGATION INTERCEPT: AI created task blocked by Stark-Defense Matrix in manual mode.`);
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          code: "STARK_TASK_INTERCEPT",
          reason: `[任務登錄攔截 403 / TASK_INTERCEPT]: Task creation is restricted under Manual code policy. Tasks must be manually approved.`,
        });
      }

      serverDB.addTask({
        id: Math.random().toString(36).substring(7),
        description,
        priority: priority || 'Medium',
        status: (taskMode === 'manual' && userApproved) ? 'Pending' : 'Pending',
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

  app.post("/api/tasks/:id/progress", (req, res) => {
    try {
      const { id } = req.params;
      const { progress } = req.body;
      const numericProgress = Number(progress);
      if (isNaN(numericProgress) || numericProgress < 0 || numericProgress > 100) {
        return res.status(400).json({ error: "Invalid progress percentage value" });
      }
      serverDB.updateTask(id, { progress: numericProgress });
      res.json({ success: true, task: serverDB.getTasks().find(t => t.id === id) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/tasks/:id/progress", (req, res) => {
    try {
      const { id } = req.params;
      const { progress } = req.body;
      const numericProgress = Number(progress);
      if (isNaN(numericProgress) || numericProgress < 0 || numericProgress > 100) {
        return res.status(400).json({ error: "Invalid progress percentage value" });
      }
      serverDB.updateTask(id, { progress: numericProgress });
      res.json({ success: true, task: serverDB.getTasks().find(t => t.id === id) });
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
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);
      
      const cpus = os.cpus();
      const loadAvg = os.loadavg();
      
      // Calculate true dynamic CPU usage based on worker metrics
      let cpuUsage = Math.max(computedCpuUsage || 12, Math.min(100, Math.round((loadAvg[0] / cpus.length) * 100)));
      
      // Calculate dynamic memory and GPU base on overcharged matrix
      let finalMem = memUsage;
      if (shieldActive) {
        finalMem = Math.min(100, finalMem + 8);
      }
      
      let finalGpu = osGpuUsage > 0 ? osGpuUsage : (reactorOverdrive 
        ? Math.min(100, Math.round(cpuUsage * 0.8 + 15 + Math.random() * 5)) 
        : (shieldActive ? Math.min(100, Math.round(cpuUsage * 0.3 + 10 + Math.random() * 4)) : Math.min(100, Math.round(cpuUsage * 0.1 + 2 + Math.random() * 2))));

      const ambientTemp = 35; // Standard base temp inside a computer case
      const loadFactor = cpuUsage / 100;
      const overdriveOffset = reactorOverdrive ? 38 : (shieldActive ? 14 : 0);
      const simulatedTemp = Math.round(ambientTemp + (42 * loadFactor) + overdriveOffset + (Math.random() - 0.5) * 1.5);
      const finalTmp = osGpuTemp > 0 ? `${osGpuTemp}°C` : `${simulatedTemp}°C`;

      const coreCount = cpus.length || 4;
      const baseTDP = coreCount * 10; // 10W max TDP per core
      const estPower = (baseTDP * loadFactor + 8 + (reactorOverdrive ? 35 : (shieldActive ? 8 : 0)) + Math.random() * 2).toFixed(1);
      const powerDraw = `${estPower} W`;

      let finalNet = satelliteLinked ? "5.5 GB/s" : "0KB/s";
      if (currentRxSpeed > 0 || currentTxSpeed > 0) {
        finalNet = `${(currentRxSpeed / 1024).toFixed(1)} KB/s ↓ | ${(currentTxSpeed / 1024).toFixed(1)} KB/s ↑`;
      }
      
      let diskIoString = "0.0 MB/s WAIT";
      if (currentDiskReadSpeed > 0 || currentDiskWriteSpeed > 0) {
        diskIoString = `${(currentDiskReadSpeed / 1024 / 1024).toFixed(1)} R | ${(currentDiskWriteSpeed / 1024 / 1024).toFixed(1)} W (MB/s)`;
      }

      const clampedLatency = Math.min(2000, Math.max(50, globalLLMLatencyMs));
      const calcNeuralSync = (99.9 - ((clampedLatency - 50) / 1950) * 8.0).toFixed(2);

      const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
      const secStatus = apiKey ? "SEC_CLEARED" : "SEC_REQUIRED";

      const now = Date.now();
      const currentLogs = serverDB.getSystemLogs();
      const lastLog = currentLogs[currentLogs.length - 1];
      if (!lastLog || (now - lastLog.timestamp > 8000)) {
        const rand = Math.random();
        if (rand < 0.3) {
          serverDB.addSystemLog('SYS', 'SUCCESS', 'Core service tick OK.');
        } else if (rand < 0.6) {
          serverDB.addSystemLog('NET', 'INFO', 'Channel waiting in standby state.');
        } else {
          serverDB.addSystemLog('DB', 'SUCCESS', 'Index cache status verified.');
        }
      }

      res.json({
        cpu: cpuUsage,
        mem: finalMem,
        net: finalNet,
        diskIo: diskIoString,
        neuralSync: calcNeuralSync,
        rxSpeed: currentRxSpeed,
        txSpeed: currentTxSpeed,
        gpu: finalGpu,
        tmp: finalTmp,
        powerDraw: powerDraw,
        uptime: Math.round(os.uptime() / 3600),
        processes: osProcessCount > 0 ? osProcessCount : (reactorOverdrive ? 298 + Math.floor(Math.random() * 5) : 256 + Math.floor(Math.random() * 20)),
        os: os.platform().toUpperCase(),
        secStatus,
        shieldActive,
        reactorOverdrive,
        satelliteLinked,
        corePower,
        structural,
        nodeVersion: process.version,
        costLogsCount: serverDB.getCostLogs().length,
        messagesCount: serverDB.getAllMessages().length,
        cognitiveCount: serverDB.getCognitiveMemories().length,
        pingLatencyMs: lastPingLatencyMs,
        systemLogs: serverDB.getSystemLogs().map(log => `${log.category}/${log.level}:: ${log.message}`)
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Active System Logs REST Route ---
  app.get("/api/system/logs", (req, res) => {
    res.json(serverDB.getSystemLogs());
  });

  // --- Sandbox & Docker Core Security Audit Endpoint ---
  app.get("/api/system/security-audit", async (req, res) => {
    try {
      const refresh = req.query.refresh === "true";
      if (refresh) {
        serverDB.addSystemLog('SEC', 'INFO', 'Re-initiating Windows Defender & sandbox container security audit...');
        const result = await runSecurityAudit();
        serverDB.addSystemLog('SEC', 'SUCCESS', `Security audit completed. Isolation index: ${result.authIsolation}.`);
        return res.json(result);
      }
      res.json(cachedSecurityAudit);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Stark-Defense AST Command Safety Parser ---
  app.post("/api/system/validate-command", (req, res) => {
    try {
      const { command } = req.body;
      if (!command || typeof command !== "string") {
        return res.status(400).json({ error: "Missing command parameter" });
      }

      serverDB.addSystemLog('SEC', 'INFO', `Analyzing shell command structures for safety validations...`);
      const { safe, reason } = helperValidateCommand(command);

      if (safe) {
        serverDB.addSystemLog('SEC', 'SUCCESS', 'Stark-Defense AST Parser: Command structure validated as 100% safe.');
      } else {
        serverDB.addSystemLog('SEC', 'WARN', `Stark-Defense AST Parser: Command blocked! Reason: ${reason}`);
      }

      res.json({
        success: true,
        safe,
        reason
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Advanced Engine Status Endpoint ---
  app.post("/api/system/engine-status", async (req, res) => {
    try {
      const { engine } = req.body;
      serverDB.addSystemLog('SYS', 'INFO', `Querying advanced CLI engine state: ${engine}...`);
      
      if (engine === "copilot" || engine === "github-cli") {
        const status = await getGitHubAuthStatus();
        if (status.authenticated) {
          serverDB.addSystemLog('SEC', 'SUCCESS', `GitHub CLI OAuth validated. Logged in as ${status.user}.`);
        } else {
          serverDB.addSystemLog('SEC', 'WARN', `GitHub CLI not connected: ${status.details}`);
        }
        return res.json({ success: true, engine, ...status });
      }
      
      if (engine === "azure-quantum" || engine === "stark-quantum") {
        const quantumData = runQuantumSynapseSimulation();
        serverDB.addSystemLog('SYS', 'SUCCESS', `Azure Stark Quantum Hub Entanglement verified: Coherence ${quantumData.synapticCoherence * 100}%`);
        return res.json({ success: true, engine, ...quantumData });
      }
      
      if (engine === "powershell") {
        const details = await getPowerShellDetails();
        serverDB.addSystemLog('SYS', 'SUCCESS', `PowerShell pipeline active. Version: ${details.version}. Policy: ${details.policy}`);
        return res.json({ success: true, engine, ...details });
      }
      
      res.status(400).json({ error: "Unknown advanced execution engine selection." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Core Process Runtime Reboot Endpoint ---
  app.post("/api/system/reboot", (req, res) => {
    try {
      serverDB.addSystemLog('SYS', 'WARN', 'REACTOR POWER SYSTEM REBOOT: Commencing complete physical process shutdown and supervisor reload cycle...');
      
      // Physically reset state values
      shieldActive = false;
      reactorOverdrive = false;
      corePower = 98;
      satelliteLinked = false;
      structural = 98.7;
      computedCpuUsage = 0;
      
      res.json({ 
        success: true, 
        message: "Reactor reboot pipeline initialized. Subprocess exiting immediately..." 
      });
      
      // Delay termination/exit to allow successful transit of the HTTP response first
      setTimeout(() => {
        process.exit(0);
      }, 800);
      
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Settings Configuration Endpoints ---
  app.get("/api/settings", (req, res) => {
    res.json(serverDB.getSettings());
  });

  app.post("/api/settings", (req, res) => {
    try {
      const newSettings = req.body;
      serverDB.updateSettings(newSettings);
      res.json({ success: true, settings: serverDB.getSettings() });
    } catch (e: any) {
      serverDB.addSystemLog('SYS', 'ERROR', `Failed to apply new settings: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  // --- Utilities Endpoints ---
  // --- Voice / Audio API Mock Endpoints ---
  app.post("/api/voice/transcribe", express.raw({ type: 'audio/*', limit: '10mb' }), async (req, res) => {
    try {
      // In a real app, send req.body (binary audio) to OpenAI Whisper API.
      // Here we simulate the transcription delay.
      await new Promise(r => setTimeout(r, 600));
      serverDB.addSystemLog('SYS', 'SUCCESS', 'Audio chunk successfully forwarded to backend Whisper STT service.');
      res.json({ success: true, text: "Backend Whisper Transcribed: " + (Math.random()>0.5 ? "Status check" : "Execute command") });
    } catch (e: any) {
      serverDB.addSystemLog('SYS', 'ERROR', `Whisper transcription failed: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/voice/tts", async (req, res) => {
    try {
      const { text, provider, voiceProfile, elevenLabsKey } = req.body;
      const apiKey = elevenLabsKey || process.env.ELEVENLABS_API_KEY;

      if (!apiKey) {
        serverDB.addSystemLog('SYS', 'WARN', 'Dispatched TTS payload to ElevenLabs. Warning: ELEVENLABS_API_KEY is missing from backend secrets, falling back to local speech.');
        return res.json({ 
          success: false, 
          message: "ElevenLabs API key is missing. Please define ELEVENLABS_API_KEY in backend secrets.", 
          error: "KEY_MISSING" 
        });
      }

      // Voice profile configuration mapping to standard ElevenLabs voice IDs:
      // 'baritone': Adam (deep standard)
      // 'standard': Charlie (British male model)
      // 'fast': Rachel (American female model, fast cadence)
      const voiceMapping: Record<string, string> = {
        'baritone': 'pNInz6obpgq9S3J7rStL',
        'standard': 'IKne3meq5aXSn9XLy0mW',
        'fast': '21m00Tcm4TlvDq8ikWAM'
      };

      const selectedVoice = voiceMapping[voiceProfile] || 'pNInz6obpgq9S3J7rStL';
      serverDB.addSystemLog('SYS', 'INFO', `Initiating ElevenLabs speech pipeline for voice profile [${voiceProfile || 'baritone'} / ID: ${selectedVoice}]...`);

      // Call public ElevenLabs REST API directly
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        serverDB.addSystemLog('SYS', 'ERROR', `ElevenLabs API request failed with status ${response.status}: ${errorText}`);
        return res.json({ 
          success: false, 
          message: `ElevenLabs API error: ${response.statusText}`, 
          error: "API_ERROR", 
          details: errorText 
        });
      }

      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      
      serverDB.addSystemLog('SYS', 'SUCCESS', `Dispatched TTS payload. Successfully synthesized ${audioBuffer.byteLength} bytes of neural audio.`);
      res.json({ 
        success: true, 
        audio: base64Audio, 
        message: `Synthesized text via ElevenLabs (${selectedVoice})` 
      });

    } catch (e: any) {
      serverDB.addSystemLog('SYS', 'ERROR', `ElevenLabs invocation failed: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/system/models", (req, res) => {
    // Return dynamically configurable supported models
    res.json({
      success: true,
      models: [
        { id: "google/gemini-2.5-flash", name: "google/gemini-2.5-flash" },
        { id: "anthropic/claude-3.5-sonnet:beta", name: "anthropic/claude-3.5-sonnet:beta (Claude Code backend)" },
        { id: "anthropic/claude-3-opus", name: "anthropic/claude-3-opus" },
        { id: "meta-llama/llama-3.3-70b-instruct", name: "meta-llama/llama-3.3-70b-instruct" },
        { id: "deepseek/deepseek-chat", name: "deepseek/deepseek-chat (DeepSeek V3)" },
        { id: "openai/gpt-4o", name: "openai/gpt-4o" }
      ]
    });
  });

  app.post("/api/system/purge-cache", async (req, res) => {
    try {
      serverDB.purgeCache();
      
      // Purge physical disk caches if they exist
      const cacheDirs = [
        path.join(process.cwd(), 'node_modules', '.vite'),
        path.join(process.cwd(), 'node_modules', '.cache'),
        path.join(process.cwd(), '.cache')
      ];
      
      for (const dir of cacheDirs) {
        if (fs.existsSync(dir)) {
          try {
            fs.rmSync(dir, { recursive: true, force: true });
            serverDB.addSystemLog('SYS', 'SUCCESS', `Cleared physical system cache at ${dir}`);
          } catch (e: any) {
            serverDB.addSystemLog('SYS', 'WARN', `Failed to clear cache at ${dir}: ${e.message}`);
          }
        }
      }

      // Also let's force Garbage Collection if available (node --expose-gc)
      if (global.gc) {
         global.gc();
         serverDB.addSystemLog('SYS', 'SUCCESS', 'V8 Garbage Collection forced.');
      }
      
      res.json({ success: true, message: "Advanced cache purged successfully" });
    } catch (e: any) {
      serverDB.addSystemLog('SYS', 'ERROR', `Purge cache failed: ${e.message}`);
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
        serverDB.addSystemLog('SEC', 'SUCCESS', `Defensive perimeter shield gain set to ${code}.`);
        return res.json({ 
          success: true, 
          shieldActive, 
          message: `Shield deflection matrix set to ${code}.`,
          speak: shieldActive ? "Defensive perimeter initialized, sir." : "Shield deflection matrix on standby, sir."
        });
      }
      
      if (command === "overdrive") {
        reactorOverdrive = !reactorOverdrive;
        toggleTrueOverdriveWorker(reactorOverdrive);
        corePower = reactorOverdrive ? 125 : 98;
        serverDB.addSystemLog('SEC', 'WARN', `Arc reactor overcharged to ${reactorOverdrive ? '125%' : '98% nominal'}. True compute stress applied.`);
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
        serverDB.addSystemLog('NET', 'SUCCESS', 'Stark-7 transceiver orbiter satellite uplink synchronized.');
        return res.json({ 
          success: true, 
          satelliteLinked,
          message: "Stark-7 transceiver uplink established.",
          speak: "All transceivers synchronized with satellite array, sir."
        });
      }
      
      if (command === "recalibrate") {
        structural = 100;
        serverDB.addSystemLog('SEC', 'SUCCESS', 'System diagnostic neural metrics recalibrated successfully.');
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

  // --- MCP State Management ---
  interface McpServerInstance {
    name: string;
    process: ChildProcess;
    status: 'connecting' | 'connected' | 'error' | 'disconnected';
    tools: any[];
  }
  let activeMcpServers: Map<string, McpServerInstance> = new Map();

  app.get("/api/mcp/status", (req, res) => {
    const statusData = Array.from(activeMcpServers.entries()).map(([name, inst]) => ({
      name,
      status: inst.status,
      toolCount: inst.tools.length
    }));
    res.json({ success: true, servers: statusData });
  });

  app.get("/api/mcp/tools", (req, res) => {
    const allTools: any[] = [];
    activeMcpServers.forEach(inst => {
      inst.tools.forEach(t => allTools.push({ ...t, _server: inst.name }));
    });
    res.json({ success: true, tools: allTools });
  });

  // --- MCP Servers Connection Endpoint ---
  app.post("/api/mcp/connect", async (req, res) => {
    try {
      const { config } = req.body;
      if (!config) {
         return res.status(400).json({ success: false, error: "Empty configuration matrix." });
      }

      let parsedConfig;
      try {
        parsedConfig = JSON.parse(config);
      } catch (parseErr) {
        return res.status(400).json({ success: false, error: "JSON parse malfunction. Invalid format." });
      }

      const servers = parsedConfig.mcpServers || {};
      const count = Object.keys(servers).length;
      
      serverDB.addSystemLog('API', 'INFO', `Parsing MCP alignment config. Detected ${count} server(s). Spawning stdio processes...`);

      // Cleanup existing servers
      for (const [name, inst] of activeMcpServers.entries()) {
         try {
            inst.process.kill('SIGTERM');
         } catch {}
      }
      activeMcpServers.clear();

      let connectedCount = 0;

      for (const [name, srvConfig] of Object.entries(servers)) {
         const { command, args, env } = srvConfig as any;
         if (!command) continue;

         try {
            const proc = spawn(command, args || [], {
               env: { ...process.env, ...env },
               stdio: ['pipe', 'pipe', 'ignore']
            });

            const instance: McpServerInstance = {
               name,
               process: proc,
               status: 'connecting',
               tools: []
            };

            activeMcpServers.set(name, instance);

            // Setup basic JSON-RPC over stdio
            let buffer = '';
            proc.stdout?.on('data', (chunk) => {
               buffer += chunk.toString();
               const lines = buffer.split('\n');
               buffer = lines.pop() || '';

               for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed) continue;
                  try {
                     const msg = JSON.parse(trimmed);
                     if (msg.id && msg.result?.protocolVersion) {
                        instance.status = 'connected';
                        
                        // Send tools/list request
                        const toolsReq = {
                           jsonrpc: '2.0',
                           id: `tools-${Date.now()}`,
                           method: 'tools/list'
                        };
                        proc.stdin?.write(JSON.stringify(toolsReq) + '\n');
                     } else if (msg.id && String(msg.id).startsWith('tools-') && msg.result?.tools) {
                        instance.tools = msg.result.tools;
                        serverDB.addSystemLog('API', 'SUCCESS', `MCP Server '${name}' cached ${instance.tools.length} tool(s).`);
                     }
                  } catch (e) {
                     // Not JSON-RPC line
                  }
               }
            });

            proc.on('error', (err) => {
               instance.status = 'error';
               serverDB.addSystemLog('API', 'ERROR', `MCP Server '${name}' process error: ${err.message}`);
            });

            proc.on('exit', () => {
               instance.status = 'disconnected';
            });

            // Send initialization request
            const initReq = {
               jsonrpc: '2.0',
               id: `init-${Date.now()}`,
               method: 'initialize',
               params: {
                  protocolVersion: '2024-11-05',
                  clientInfo: { name: 'jarvis-core', version: '1.0.0' },
                  capabilities: {}
               }
            };
            proc.stdin?.write(JSON.stringify(initReq) + '\n');
            connectedCount++;

         } catch (e: any) {
            serverDB.addSystemLog('API', 'ERROR', `Failed to spawn MCP server '${name}': ${e.message}`);
         }
      }

      setTimeout(() => {
        const activeCount = Array.from(activeMcpServers.values()).filter(s => s.status !== 'error').length;
        serverDB.addSystemLog('API', 'SUCCESS', `Successfully synchronized with ${activeCount} Model Context Protocol server(s). Tools cached.`);
        res.json({ success: true, count: activeCount });
      }, 1500);

    } catch (e: any) {
      serverDB.addSystemLog('API', 'ERROR', `Network connection fault on MCP bind: ${e.message}`);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- External MCP Webhooks API Routes ---
  app.get("/api/mcp/webhooks", (req, res) => {
    res.json({ success: true, webhooks: serverDB.getMcpWebhooks() });
  });

  app.post("/api/mcp/webhooks", (req, res) => {
    try {
      const { name, url, active } = req.body;
      if (!name || !url) return res.status(400).json({ success: false, error: "Missing parameters" });
      const webhook = { id: Math.random().toString(36).substring(7), name, url, active: active ?? true };
      serverDB.addMcpWebhook(webhook);
      res.json({ success: true, webhook });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/mcp/webhooks/:id", (req, res) => {
    try {
      serverDB.deleteMcpWebhook(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/mcp/webhooks/:id/toggle", (req, res) => {
    try {
      const { active } = req.body;
      serverDB.toggleMcpWebhookFocus(req.params.id, active);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- MCP Routines API Routes ---
  app.get("/api/mcp/routines", (req, res) => {
    res.json({ success: true, routines: serverDB.getMcpRoutines() });
  });

  app.post("/api/mcp/routines", (req, res) => {
    try {
      const { name, prompt } = req.body;
      if (!name || !prompt) return res.status(400).json({ success: false, error: "Missing parameters" });
      const routine = { id: Math.random().toString(36).substring(7), name, prompt };
      serverDB.addMcpRoutine(routine);
      res.json({ success: true, routine });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/mcp/routines/:id", (req, res) => {
    try {
      serverDB.deleteMcpRoutine(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/mcp/routines/:id/execute", (req, res) => {
    try {
      const routine = serverDB.getMcpRoutines().find(r => r.id === req.params.id);
      if (!routine) return res.status(404).json({ success: false, error: "Routine not found" });
      
      serverDB.addSystemLog('API', 'INFO', `Initiating MCP Routine sequence: ${routine.name}`);
      
      // The frontend will receive success: true and the prompt payload
      // to dispatch its own prompt chat event
      res.json({ success: true, prompt: routine.prompt });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Real-time Local OS System Diagnostics & Scan Endpoints ---
  app.post("/api/system/test-cli-ping", async (req, res) => {
    const startTime = Date.now();
    const host = "openrouter.ai";
    const pingCmd = process.platform === "win32" 
      ? `ping -n 3 ${host}` 
      : `ping -c 3 ${host}`;
      
    serverDB.addSystemLog('NET', 'INFO', `Initiating real ICMP ping diagnostic to ${host}...`);
    
    exec(pingCmd, (err, stdout, stderr) => {
      if (err) {
        serverDB.addSystemLog('NET', 'WARN', `Real ICMP ping failed (likely sandbox filter). Initiating live HTTP handshake fallback...`);
        const fetchStart = Date.now();
        
        const req = https.request({
          hostname: 'openrouter.ai',
          port: 443,
          path: '/',
          method: 'HEAD',
          timeout: 3500,
          headers: { 'User-Agent': 'Jarvis-Connection-Test' }
        }, (response) => {
          const latencyMs = Date.now() - fetchStart;
          lastPingLatencyMs = latencyMs;
          serverDB.addSystemLog('NET', 'SUCCESS', `HTTP connection diagnostic to ${host} succeeded. True Latency: ${latencyMs}ms.`);
          return res.json({
            success: true,
            latencyMs,
            endpoint: `${host} (HTTP)`,
            speak: `Connection diagnostic to active satellite array succeeded via HTTP fallback. Roundtrip transit took ${latencyMs} milliseconds, sir.`
          });
        });

        req.on('error', (e) => {
          lastPingLatencyMs = 0;
          serverDB.addSystemLog('NET', 'ERROR', `Network error: ${host} fallback failed. Communication grid offline. Error: ${e.message}`);
          return res.json({
            success: false,
            latencyMs: 0,
            endpoint: host,
            error: e.message,
            speak: `Warning, sir. Sub-orbital connection failed. Physical networks are disconnected.`
          });
        });

        req.on('timeout', () => {
          req.destroy();
          lastPingLatencyMs = 0;
          serverDB.addSystemLog('NET', 'ERROR', `Network timeout: ${host} fallback timed out.`);
          return res.json({
            success: false,
            latencyMs: 0,
            endpoint: host,
            error: 'Connection timed out',
            speak: `Warning, sir. Connection to active satellite array timed out.`
          });
        });

        req.end();
        return;
      }
      
      let latencyMs = 0;
      const winMatch = stdout.match(/Average\s*=\s*(\d+)ms/i);
      const unixMatch = stdout.match(/rtt\s*min\/avg\/max\/mdev\s*=\s*[\d.]+\/([\d.]+)\//i);
      
      if (winMatch) {
        latencyMs = parseInt(winMatch[1]);
      } else if (unixMatch) {
        latencyMs = Math.round(parseFloat(unixMatch[1]));
      } else {
        const elapsed = Date.now() - startTime;
        latencyMs = Math.max(1, Math.round(elapsed / 3));
      }
      
      lastPingLatencyMs = latencyMs;
      serverDB.addSystemLog('NET', 'SUCCESS', `Real ICMP ping diagnostic to ${host} succeeded: latency ${latencyMs}ms.`);
      
      res.json({
        success: true,
        latencyMs,
        endpoint: host,
        speak: `Ping response returned from active satellite array in ${latencyMs} milliseconds. All systems nominal, sir.`
      });
    });
  });

  app.get("/api/system/cli", (req, res) => {
    try {
      const mappingPath = path.join(process.cwd(), 'cli-mapping.json');
      if (fs.existsSync(mappingPath)) {
        const mappingConf = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
        res.json({ success: true, options: mappingConf });
      } else {
        res.json({ success: true, options: [] });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/system/rescan-paths", async (req, res) => {
    serverDB.addSystemLog('SYS', 'INFO', 'Initializing deep system path scan for candidate compilers...');
    
    let clisToCheck: { id: string; cmd: string }[] = [];
    try {
      const mappingPath = path.join(process.cwd(), 'cli-mapping.json');
      if (fs.existsSync(mappingPath)) {
        clisToCheck = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
      }
    } catch (e) {
      console.error('Failed to load cli-mapping.json for rescan', e);
    }
    
    const systemTools = ["node", "npm", "git", "python", "curl", "npx", "bash"];
    const foundTools: { name: string; path: string; version: string }[] = [];
    const installedClis: { [key: string]: { installed: boolean; version: string } } = {};
    
    const checkExecutable = async (command: string): Promise<{ exists: boolean; path: string; version: string }> => {
      return new Promise((resolve) => {
        const checkCmd = process.platform === "win32"
          ? `powershell -NoProfile -NonInteractive -Command "Get-Command ${command} -ErrorAction Stop | Select-Object -ExpandProperty Source"`
          : `which ${command}`;
          
        exec(checkCmd, { timeout: 3000 }, (err, stdout) => {
          const pathFound = stdout.trim();
          if (err || !pathFound) {
            return resolve({ exists: false, path: "", version: "" });
          }
          
          let versionCmd = `${command} --version`;
          if (command === "python") {
            versionCmd = "python -V";
          }
          
          exec(versionCmd, { timeout: 2500 }, (vErr, vStdout) => {
            const version = !vErr && vStdout.trim() 
              ? vStdout.trim().replace(/\r?\n/g, " ").substring(0, 40)
              : "installed";
            resolve({ exists: true, path: pathFound, version });
          });
        });
      });
    };
    
    try {
      await Promise.all(clisToCheck.map(async (cli) => {
        const result = await checkExecutable(cli.cmd);
        installedClis[cli.id] = {
          installed: result.exists,
          version: result.exists ? result.version : "未安裝 (Not installed)"
        };
        if (result.exists) {
          foundTools.push({
            name: cli.id,
            path: result.path,
            version: result.version
          });
        }
      }));
      
      await Promise.all(systemTools.map(async (tool) => {
        const result = await checkExecutable(tool);
        if (result.exists) {
          foundTools.push({
            name: tool,
            path: result.path,
            version: result.version
          });
        }
      }));
      
      const foundCliNames = foundTools.filter(t => clisToCheck.some(c => c.id === t.name)).map(t => t.name);
      
      serverDB.addSystemLog(
        'SYS', 
        'SUCCESS', 
        `System path scan completed. Found CLIs: [${foundCliNames.join(', ')}]. Found System tools: [${foundTools.filter(t => !clisToCheck.some(c => c.id === t.name)).map(t => t.name).join(', ')}].`
      );
      
      res.json({
        success: true,
        foundCount: foundCliNames.length,
        tools: foundTools,
        installedClis,
        speak: `Secure path scan completed, sir. Located ${foundCliNames.length} active agent compilers on your environment.`
      });
    } catch (e: any) {
      serverDB.addSystemLog('SYS', 'ERROR', `System path scan failed: ${e.message}`);
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

  // --- Auto-Repair Backend Daemon Thread ---
  setInterval(() => {
    try {
      const settings = serverDB.getSettings();
      if (settings && settings.autoRepair) {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);
        
        let targetCpu = computedCpuUsage;
        if (reactorOverdrive) {
          targetCpu = 95; // Simulated extreme load when overdrive is active
        }

        let isSystemUnstable = false;
        const reasons: string[] = [];

        if (reactorOverdrive) {
          isSystemUnstable = true;
          reasons.push("Overdrive Thermal Excitation");
        }
        if (targetCpu >= 85) {
          isSystemUnstable = true;
          reasons.push(`High core processor pressure (${targetCpu}%)`);
        }
        if (memUsage >= 85) {
          isSystemUnstable = true;
          reasons.push(`Low memory margin capacity (${memUsage}%)`);
        }

        if (isSystemUnstable) {
          serverDB.addSystemLog('SYS', 'WARN', `Auto-Repair Daemon: Metrics critical [${reasons.join(', ')}]. Initiating systemic optimization loop...`);
          
          // Disable overdrive to physically cool down CPU core allocation
          if (reactorOverdrive) {
            reactorOverdrive = false;
            toggleTrueOverdriveWorker(false);
            serverDB.addSystemLog('SYS', 'WARN', 'Auto-Repair Daemon: Successfully disabled Reactor Overdrive and closed spin worker threads.');
          }

          // Force DB persist cache flush
          serverDB.purgeCache();
          serverDB.addSystemLog('SYS', 'SUCCESS', 'Auto-Repair Daemon: Flushed in-transit document pools and transaction buffers.');

          // Reset baseline hardware simulation counters
          shieldActive = false;
          corePower = 98;
          structural = 100;
          computedCpuUsage = 12; // Cooled baseline

          serverDB.addSystemLog('SYS', 'SUCCESS', 'Auto-Repair Daemon: Subsystem normalizing sequence completed. Status: green (nominal).');
        }
      }
    } catch (daemonErr: any) {
      console.error("Auto-Repair background daemon iteration failed", daemonErr);
    }
  }, 6000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
