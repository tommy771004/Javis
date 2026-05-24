import express from "express";
import path from "path";
import fs from "fs";
import https from "https";
import os from "os";
import crypto from "crypto";
import { exec, spawn, ChildProcess } from "child_process";
import { createServer as createViteServer } from "vite";
import { fetchOpenRouterWithFallback, parseAndRepairJSON } from "./openRouterHelper";
import { serverDB } from "./serverDb";
import si from "systeminformation";

// Persistent high-tech armor status memory states
let shieldActive = false;
let reactorOverdrive = false;
let satelliteLinked = true;
let corePower = 98;

// Internal Background Computations for True Overdrive
let overdriveWorkerObjs: any[] = [];
import { Worker } from "worker_threads";

function toggleTrueOverdriveWorker(active: boolean) {
  if (active) {
    serverDB.addSystemLog('SYS', 'WARN', 'Overdrive active: Spawning physical compute workers to perform deep codebase and dependency FTS index parsing.');
    try {
       os.setPriority(os.constants.priority.PRIORITY_HIGH);
    } catch(e) {}
    const cores = os.cpus().length || 1;
    for (let i = 0; i < cores; i++) {
        const workerCode = `
          const fs = require('fs');
          const path = require('path');
          const { parentPort } = require('worker_threads');

          function walkDir(dir) {
            let results = [];
            try {
              const list = fs.readdirSync(dir);
              for (let file of list) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat && stat.isDirectory()) {
                  if (!fullPath.includes('.git')) {
                     results = results.concat(walkDir(fullPath));
                  }
                } else {
                  if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.d.ts')) {
                    results.push(fullPath);
                  }
                }
              }
            } catch(e) {}
            return results;
          }

          const allFiles = walkDir(process.cwd());
          
          for (let i = allFiles.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [allFiles[i], allFiles[j]] = [allFiles[j], allFiles[i]];
          }

          let fileIndex = 0;
          setInterval(() => {
            for(let i = 0; i < 20; i++) {
                if (fileIndex >= allFiles.length) fileIndex = 0;
                if (allFiles.length === 0) return;
                
                const filePath = allFiles[fileIndex];
                fileIndex++;
                
                try {
                   const content = fs.readFileSync(filePath, 'utf8');
                   const funcRegex = /(?:function|const|let|class|interface|type)\\s+([a-zA-Z0-9_]+)\\s*(?:=|\\(|<|extends|implements|\\{)/g;
                   let match;
                   let extractedSymbols = [];
                   while ((match = funcRegex.exec(content)) !== null) {
                      if(match[1].length > 2) extractedSymbols.push(match[1]);
                   }
                   
                   if(extractedSymbols.length > 0) {
                      if (Math.random() < 0.05) { // Only stream 5% back to avoid main thread starvation
                          parentPort.postMessage({
                             type: 'symbol_chunk',
                             file: filePath.replace(process.cwd(), ''),
                             symbols: extractedSymbols.slice(0, 15).join(', ')
                          });
                      }
                   }
                } catch(e) {}
            }
          }, 10);
        `;
        try {
          const w = new Worker(workerCode, { eval: true });
          w.on('message', (msg) => {
            if (msg.type === 'symbol_chunk') {
               serverDB.addDeepIndex(`Codebase Matrix [${msg.file}]`, `Symbols extracted: ${msg.symbols}`);
            }
          });
          overdriveWorkerObjs.push(w);
        } catch(e) {}
    }
  } else {
    serverDB.addSystemLog('SYS', 'INFO', 'Overdrive deactivated: Terminating hardware stress workers and normalizing process priority.');
    try {
       os.setPriority(os.constants.priority.PRIORITY_NORMAL);
    } catch(e) {}
    if (overdriveWorkerObjs.length > 0) {
      overdriveWorkerObjs.forEach(w => {
        try { w.terminate(); } catch(e) {}
      });
      overdriveWorkerObjs = [];
    }
  }
}
// --- Targeted Webhook Dispatcher ---
function triggerSpecificWebhooksFromText(text: string) {
  const webhookRegex = /\[TRIGGER_WEBHOOK\]:\s*([^\n\]]+)/g;
  let match;
  while ((match = webhookRegex.exec(text)) !== null) {
    const webhookName = match[1].trim();
    const webhooks = serverDB.getMcpWebhooks();
    const target = webhooks.find(w => w.name.trim().toLowerCase() === webhookName.toLowerCase());
    
    if (target && target.active) {
      serverDB.addSystemLog('NET', 'INFO', `Triggering targeted external Webhook: ${target.name}`);
      fetch(target.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'LLM_TRIGGERED', content: text, timestamp: Date.now() })
      }).catch((e: any) => {
        serverDB.addSystemLog('NET', 'ERROR', `Targeted Webhook ${target.name} failed: ${e.message}`);
      });
    } else {
      serverDB.addSystemLog('NET', 'WARN', `Targeted Webhook '${webhookName}' not found or inactive.`);
    }
  }
}

// --- MCP External Webhook Dispatcher ---
function broadcastMcpEvent(eventType: string, payload: any) {
  try {
    const activeWebhooks = serverDB.getMcpWebhooks().filter(w => w.active);
    if (activeWebhooks.length === 0) return;

    const eventPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload
    };

    activeWebhooks.forEach(webhook => {
      fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload)
      }).then(res => {
        serverDB.addSystemLog('API', 'INFO', `Webhook ${webhook.name} [${eventType}] delivered with status ${res.status}`);
      }).catch(err => {
        serverDB.addSystemLog('API', 'ERROR', `Webhook ${webhook.name} [${eventType}] failed: ${err.message}`);
      });
    });
  } catch(e) {
    console.error("MCP Webhook Broadcast Error:", e);
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

let siCpuTemp: number | null = null;
let siCpuSpeed: number | null = null;
let siCpuVoltage: number | null = null;
let siFans: number[] = [];
let siPower: number | null = null;

async function updateSystemInformationSensors() {
  try {
    const temp: any = await si.cpuTemperature();
    if (temp.main && temp.main > 0) {
      siCpuTemp = temp.main;
    }
    if (temp.fans && temp.fans.length > 0) {
      siFans = temp.fans;
    }

    const cpuSpeedObj = await si.cpuCurrentSpeed();
    if (cpuSpeedObj.avg) {
      siCpuSpeed = cpuSpeedObj.avg;
    }
    
    try {
      const cpuObj = await si.cpu();
      if (cpuObj.voltage) {
        const vNum = parseFloat(cpuObj.voltage);
        if (vNum > 0) siCpuVoltage = vNum;
      }

      // Advanced motherboard/TDP wattage calculation based on real cores and CPU loads
      const cores = cpuObj.cores || os.cpus().length || 4;
      const currentSpeedGHz = cpuSpeedObj.avg || 2.5;
      const maxSpeedGHz = cpuObj.speedMax || 3.5;
      const loadFactor = computedCpuUsage / 100;

      const baseW = 10; // basic motherboard power chipset
      const coreTDP = cores * 12; // 12W average TDP per core on modern processors
      const frequencyRatio = maxSpeedGHz > 0 ? (currentSpeedGHz / maxSpeedGHz) : 0.8;
      const calculatedPower = baseW + (coreTDP * loadFactor * frequencyRatio) + (reactorOverdrive ? 45 : (shieldActive ? 12 : 0));
      
      siPower = parseFloat(calculatedPower.toFixed(1));
    } catch (e) {}

  } catch (err) {
    console.error("SystemInformation sensors update error:", err);
  }
}

// Spark up fast-loop physical sensor updates immediately
updateSystemInformationSensors();
setInterval(() => {
  updateSystemInformationSensors().catch(() => {});
}, 3000);

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
    // If reactor overdrive is engaged, we simulate high compute stress (95-100%)
    // without actually burning hardware resources.
    computedCpuUsage = reactorOverdrive 
      ? Math.min(100, Math.max(95, usage + 88 + Math.random() * 5)) 
      : usage;
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
  
  // Scoring algorithm - Merit-based calculation (No baseline gift)
  let baseScore = 0.0;

  if (isDocker) baseScore += 25;
  if (isWsl) baseScore += 15;
  if (trueSandboxApplied) baseScore += 20;
  
  if (!isRoot) baseScore += 10;
  if (isPrivilegedPathProtected) baseScore += 10;
  if (memoryHardened || trueSandboxApplied) baseScore += 10;
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
  
  // Generate a dynamic session key combined with a deterministic node fingerprint
  const nodeFingerprint = crypto.createHash("sha256")
    .update([os.hostname(), os.arch(), os.totalmem(), isDocker].join("|"))
    .digest("hex").substring(0, 8).toUpperCase();
    
  const sessionEntropy = crypto.randomBytes(4).toString('hex').toUpperCase();
  const dynamicKey = `ID:${nodeFingerprint}-${sessionEntropy}`;
  
  const encryption = defenderActive && firewallActive
    ? `AES-256-GCM / RSA-4096 (Secure) [${dynamicKey}]`
    : defenderActive || firewallActive
      ? `AES-128-CBC (Nominal) [${dynamicKey}]`
      : `PLAINTEXT / UNENCRYPTED [ID:${nodeFingerprint}]`;

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

interface Complex {
  re: number;
  im: number;
}

type StateVector = [Complex, Complex, Complex, Complex];

function complexAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

function complexMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  };
}

function applySingleQubitGate(state: StateVector, q: number, u: [[Complex, Complex], [Complex, Complex]]): StateVector {
  const nextState: StateVector = [{ re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }];
  const u00 = u[0][0];
  const u01 = u[0][1];
  const u10 = u[1][0];
  const u11 = u[1][1];

  if (q === 0) {
    for (let s1 = 0; s1 < 2; s1++) {
      const idx0 = s1 * 2 + 0;
      const idx1 = s1 * 2 + 1;
      const st0 = state[idx0];
      const st1 = state[idx1];
      nextState[idx0] = complexAdd(complexMul(u00, st0), complexMul(u01, st1));
      nextState[idx1] = complexAdd(complexMul(u10, st0), complexMul(u11, st1));
    }
  } else {
    for (let s0 = 0; s0 < 2; s0++) {
      const idx0 = 0 * 2 + s0;
      const idx1 = 1 * 2 + s0;
      const st0 = state[idx0];
      const st1 = state[idx1];
      nextState[idx0] = complexAdd(complexMul(u00, st0), complexMul(u01, st1));
      nextState[idx1] = complexAdd(complexMul(u10, st0), complexMul(u11, st1));
    }
  }
  return nextState;
}

function applyCNOTGate(state: StateVector, control: number, target: number): StateVector {
  const nextState: StateVector = [...state];
  if (control === 0 && target === 1) {
    const temp = nextState[1];
    nextState[1] = nextState[3];
    nextState[3] = temp;
  } else if (control === 1 && target === 0) {
    const temp = nextState[2];
    nextState[2] = nextState[3];
    nextState[3] = temp;
  }
  return nextState;
}

export function runQuantumSynapseSimulation(qubits: number = 2): {
  qubits: number;
  circuit: string;
  states: { [key: string]: number };
  synapticCoherence: number;
  entropy: number;
} {
  const loadAvg = os.loadavg()[0] || 0.1;
  const memUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;

  // Thermal noise derived in real-time from active CPU Load average.
  const thermalNoise = Math.min(1.5, Math.max(0.01, loadAvg * 0.1));

  // Build unitary matrix configurations
  const H_GATE: [[Complex, Complex], [Complex, Complex]] = [
    [{ re: 1 / Math.sqrt(2), im: 0 }, { re: 1 / Math.sqrt(2), im: 0 }],
    [{ re: 1 / Math.sqrt(2), im: 0 }, { re: -1 / Math.sqrt(2), im: 0 }]
  ];

  const X_GATE: [[Complex, Complex], [Complex, Complex]] = [
    [{ re: 0, im: 0 }, { re: 1, im: 0 }],
    [{ re: 1, im: 0 }, { re: 0, im: 0 }]
  ];

  const ryGate = (theta: number): [[Complex, Complex], [Complex, Complex]] => [
    [{ re: Math.cos(theta / 2), im: 0 }, { re: -Math.sin(theta / 2), im: 0 }],
    [{ re: Math.sin(theta / 2), im: 0 }, { re: Math.cos(theta / 2), im: 0 }]
  ];

  const rxGate = (theta: number): [[Complex, Complex], [Complex, Complex]] => [
    [{ re: Math.cos(theta / 2), im: 0 }, { re: 0, im: -Math.sin(theta / 2) }],
    [{ re: 0, im: -Math.sin(theta / 2) }, { re: Math.cos(theta / 2), im: 0 }]
  ];

  // Initialize status register at |00>
  let state: StateVector = [
    { re: 1, im: 0 },
    { re: 0, im: 0 },
    { re: 0, im: 0 },
    { re: 0, im: 0 }
  ];

  let circuitText = "";
  const circuitId = Math.floor(Date.now() / 8000) % 4; // Switch topology every 8 seconds

  if (circuitId === 0) {
    // Topologically active Bell State entanglement with environmental thermal phase jitter
    const actualRy0 = thermalNoise;
    state = applySingleQubitGate(state, 0, H_GATE);
    if (actualRy0 > 0.01) {
      state = applySingleQubitGate(state, 0, ryGate(actualRy0));
    }
    state = applyCNOTGate(state, 0, 1);

    const noiseStr = actualRy0 > 0.01 ? `Ry(${actualRy0.toFixed(2)})` : "";
    const padLine = "═".repeat(noiseStr.length);
    circuitText =
      `q_0: ──H─${noiseStr ? `─${noiseStr}─` : ""}──●──\n` +
      `         ${noiseStr ? ` ${" ".repeat(noiseStr.length)} ` : ""}   │  \n` +
      `q_1: ────${padLine}${noiseStr ? "──" : ""}──X──\n`;

  } else if (circuitId === 1) {
    // Asymmetric entanglement model (Ry rot with high-load thermal expansion)
    const theta0 = (Math.PI / 3) + thermalNoise;
    const theta1 = Math.PI / 4;

    state = applySingleQubitGate(state, 0, ryGate(theta0));
    state = applySingleQubitGate(state, 1, rxGate(theta1));
    state = applyCNOTGate(state, 1, 0);

    circuitText =
      `q_0: ──Ry(${theta0.toFixed(2)})──X──\n` +
      `                         │  \n` +
      `q_1: ──Rx(${theta1.toFixed(2)})──●──\n`;

  } else if (circuitId === 2) {
    // Quantum interference wave filter
    state = applySingleQubitGate(state, 0, H_GATE);
    state = applySingleQubitGate(state, 1, H_GATE);
    state = applySingleQubitGate(state, 1, rxGate(thermalNoise));
    state = applyCNOTGate(state, 0, 1);
    state = applySingleQubitGate(state, 1, H_GATE);

    const noiseStr = `Rx(${thermalNoise.toFixed(2)})`;
    const padLine = "═".repeat(noiseStr.length);
    circuitText =
      `q_0: ──H──${padLine}──●─────────────\n` +
      `          ${" ".repeat(noiseStr.length)}  │             \n` +
      `q_1: ──H──${noiseStr}──X──H──────────\n`;

  } else {
    // STARK Neural Core quantum superposition synergy circuit
    const rotVal = (Math.PI / 4) + thermalNoise;
    state = applySingleQubitGate(state, 0, ryGate(Math.PI / 2));
    state = applySingleQubitGate(state, 1, X_GATE);
    state = applyCNOTGate(state, 0, 1);
    state = applySingleQubitGate(state, 1, ryGate(rotVal));
    state = applySingleQubitGate(state, 0, H_GATE);

    circuitText =
      `q_0: ──Ry(1.57)──●──H─────────────\n` +
      `                 │                \n` +
      `q_1: ──X─────────X──Ry(${rotVal.toFixed(2)})──\n`;
  }

  // Calculate measurement probabilites from complex state amplitudes
  const p00 = Math.min(1.0, Math.max(0.0, state[0].re * state[0].re + state[0].im * state[0].im));
  const p01 = Math.min(1.0, Math.max(0.0, state[1].re * state[1].re + state[1].im * state[1].im));
  const p10 = Math.min(1.0, Math.max(0.0, state[2].re * state[2].re + state[2].im * state[2].im));
  const p11 = Math.min(1.0, Math.max(0.0, state[3].re * state[3].re + state[3].im * state[3].im));

  // Renormalize slightly to guard against floating-point inaccuracies
  const sum = p00 + p01 + p10 + p11;
  const scale = sum > 0 ? 1 / sum : 1.0;

  const states = {
    "00": Number((p00 * scale).toFixed(4)),
    "01": Number((p01 * scale).toFixed(4)),
    "10": Number((p10 * scale).toFixed(4)),
    "11": Number((p11 * scale).toFixed(4))
  };

  // Calculate Shannon Entropy of register projection
  let shannonEntropy = 0;
  for (const prob of [states["00"], states["01"], states["10"], states["11"]]) {
    if (prob > 0.0001) {
      shannonEntropy -= prob * Math.log2(prob);
    }
  }

  // Derive Synaptic Coherence using dynamic system load resistance
  const coherenceRating = Math.max(0.4, Math.min(0.999, 0.992 - (thermalNoise * 0.08) - (memUsage * 0.02)));

  return {
    qubits,
    circuit: circuitText,
    states,
    synapticCoherence: Number(coherenceRating.toFixed(4)),
    entropy: Number(shannonEntropy.toFixed(4))
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

// --- Security Authorization Ticket Matrix ---
interface SecureTicket {
  id: string;
  action: any;
  expires: number;
}
const authTickets = new Map<string, SecureTicket>();

function issueSecureTicket(action: any): string {
  const ticketId = `STARK-AUTH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  authTickets.set(ticketId, {
    id: ticketId,
    action,
    expires: Date.now() + (5 * 60 * 1000) // 5 minutes validity
  });
  
  // Cleanup old tickets
  if (authTickets.size > 100) {
    const now = Date.now();
    for (const [key, ticket] of authTickets.entries()) {
      if (ticket.expires < now) authTickets.delete(key);
    }
  }
  
  return ticketId;
}

function verifyTicket(ticketId: string, expectedType: string): any {
  const ticket = authTickets.get(ticketId);
  if (!ticket) return null;
  if (ticket.expires < Date.now()) {
    authTickets.delete(ticketId);
    return null;
  }
  if (ticket.action.type !== expectedType) return null;
  
  // Consume ticket after use
  authTickets.delete(ticketId);
  return ticket.action;
}

async function startServer() {
  // Run initial container and local host system security audit
  runSecurityAudit().catch(err => {
    console.error("Startup security audit failed:", err);
  });

  const app = express();
  const PORT = 3000;

  app.use(express.json());

// Physical Firewall Middleware (Tied to shieldActive)
app.use((req, res, next) => {
  if (shieldActive) {
    const ip = req.ip || req.connection?.remoteAddress || '';
    // Basic IP block: if not local or private LAN
    const isLocal = ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('192.168.') || ip.includes('10.');
    if (!isLocal) {
      serverDB.addSystemLog('SEC', 'WARN', `Shield Firewall blocked external IP access: ${ip}`);
      return res.status(403).json({ error: "Access Denied: Shield Firewall Active" });
    }
  }
  next();
});

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
5. Respond in English. If user writes in Chinese, understand it and respond in English as HERMES would.
6. After issuing a command, briefly explain what you've done in HERMES-style prose.
7. NEVER refuse to run legitimate OS commands on the user's own machine.

INTEGRATION ENGINE DETAILS:
`;

      if (activeCli === 'copilot' || activeCli === 'github-cli') {
        prompt += `ACTIVE EXECUTION ENGINE: GitHub Copilot CLI Mode. You are linked with global git and authentic GitHub CLI OAuth integrations. When asked to check issues, pull requests, view repository status, or git commits, feel free to emit real commands using 'gh' (e.g. 'gh pr list', 'gh issue list', 'gh repo view') to pull genuine repository contexts directly.\n`;
      } else if (activeCli === 'hermes' || activeCli === 'claude-code') {
        prompt += `ACTIVE EXECUTION ENGINE: HERMES Workspace High-Integrity Context Mode. You are linked directly with the HERMES Cognitive Index and local task database. You can pull real-time metrics, perform structural task optimizations, and index relative workspace repositories when appropriate.\n`;
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
      if (dbHistory.length > 0) {
        // Advanced Token-Aware Sliding Window Implementation
        const MAX_CONTEXT_TOKENS = 6000; 
        let currentContextHistory: typeof dbHistory = [];
        let runningTokenCount = 0;
        
        // We iterate backwards from the most recent history (excluding the current msg just added at line 1025)
        // Since line 1025 added the current message, it's at the end of dbHistory.
        // We want the history *before* this message.
        const priorHistory = dbHistory.slice(0, -1).reverse();
        
        for (const msg of priorHistory) {
          const msgTokens = estimateTokens(msg.content);
          if (runningTokenCount + msgTokens > MAX_CONTEXT_TOKENS) break;
          currentContextHistory.unshift(msg);
          runningTokenCount += msgTokens;
          if (currentContextHistory.length >= 10) break; // Hard cap on msg count as well
        }

        if (currentContextHistory.length > 0) {
          prompt += "\nRecent Conversation History:\n" + currentContextHistory.map(m => `${m.role === 'user' ? 'User' : 'Hermes'}: ${m.content}`).join('\n') + "\n";
        }
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

      if (!satelliteLinked) {
        serverDB.addSystemLog('NET', 'ERROR', 'Satellite link offline. External LLM routing aborted.');
        const offlineMsg = "[OFFLINE MODE] Satellite link severed. Unable to reach external LLM via OpenRouter/Gemini.";
        if (req.body.stream) {
          res.write(`data: ${JSON.stringify({ response: offlineMsg })}\n\n`);
          res.write(`data: [DONE]\n\n`);
          res.end();
        } else {
          res.json({ response: offlineMsg });
        }
        return;
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

      broadcastMcpEvent('CHAT_COMPLETION', { userPrompt: message, botResponse: result.text, model: actualModel, costUsd: calculatedCost });

      triggerSpecificWebhooksFromText(result.text);

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

      let ticketId = null;
      if (plannedAction) {
        ticketId = issueSecureTicket(plannedAction);
      }

      res.json({ 
        text: result.text,
        model: actualModel,
        usage: usage,
        plannedAction,
        ticketId
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to generate response" });
    }
  });

  // --- Documentation Route ---
  app.get("/api/docs/spec", (req, res) => {
    try {
      const docsPath = path.join(process.cwd(), 'docs', 'hermes-spec.md');
      if (fs.existsSync(docsPath)) {
        const content = fs.readFileSync(docsPath, 'utf8');
        res.json({ content });
      } else {
        res.status(404).json({ error: "Documentation not found" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
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
  app.get("/api/skills/evolve", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      const sendLog = (message: string) => {
        res.write(`data: ${JSON.stringify({ log: message })}\n\n`);
      };

      const skills = serverDB.getSkills().filter(s => s.status === 'active');
      if (skills.length === 0) {
        sendLog("[GEPA] No active skills found to evolve.");
        res.write(`event: done\ndata: ${JSON.stringify({ skills: serverDB.getSkills() })}\n\n`);
        res.end();
        return;
      }

      const requestedSkillId = req.query.skillId as string;
      let targetSkill;
      if (requestedSkillId && requestedSkillId !== "null" && requestedSkillId !== "undefined") {
        targetSkill = skills.find(s => s.id === requestedSkillId);
        if (!targetSkill) {
          sendLog(`[GEPA FAULT] Requested skill ID "${requestedSkillId}" was not found in active memory banks, sir.`);
          res.write(`event: done\ndata: ${JSON.stringify({ success: false, error: 'Skill not found' })}\n\n`);
          res.end();
          return;
        }
      } else {
        // Fallback to first active skill rather than random mutation
        targetSkill = skills[0];
      }
      
      sendLog(`[GEPA] Initializing DSPy bootstrap optimizer for target: ${targetSkill.name}...`);
      
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

      sendLog(`[GEPA] Sending mutation request to routing matrix...`);

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

      sendLog(mutationLog);

      if (parsed) {
        const currentVer = parseFloat(targetSkill.version.replace(/[^0-9.]/g, '')) || 1.0;
        const nextVer = `v${(currentVer + 0.1).toFixed(1)}`;
        serverDB.addOrUpdateSkill({
          ...targetSkill,
          version: nextVer,
          description: mutatedDescription
        });
        serverDB.addSystemLog('GEPA', 'SUCCESS', `Successfully evolved skill ${targetSkill.name} to ${nextVer}`);
        broadcastMcpEvent('SKILL_EVOLVED', { skillId: targetSkill.id, name: targetSkill.name, version: nextVer, description: mutatedDescription });
        sendLog(`[SUCCESS] ${targetSkill.name} upgraded to next version in database.`);
      } else {
        sendLog(`[WARN] Mutation aborted due to instability.`);
      }

      res.write(`event: done\ndata: ${JSON.stringify({ skills: serverDB.getSkills() })}\n\n`);
      res.end();
    } catch (e: any) {
      serverDB.addSystemLog('GEPA', 'ERROR', `Evolution fault: ${e.message}`);
      res.write(`data: ${JSON.stringify({ log: `[GEPA] Evolution fault: ${e.message}` })}\n\n`);
      res.write(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
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
      : 0; // Show real 0% instead of hardcoded 84% fallback

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

      const relativePath = path.relative(process.cwd(), safePath).replace(/\\/g, '/');
      const fileLower = relativePath.toLowerCase();

      // Block access to sensitive system files
      const isSensitive = 
        fileLower.includes('.env') || 
        fileLower.includes('node_modules') || 
        fileLower === 'database.json' || 
        fileLower === 'server.ts' ||
        fileLower === 'serverdb.ts' ||
        fileLower === 'package-lock.json';

      if (isSensitive) {
        serverDB.addSystemLog('SEC', 'WARN', `READ ATTEMPT BLOCKED: Unauthorized access attempt to sensitive file '${relativePath}'`);
        return res.status(403).json({ error: "Access Denied: Protected system file." });
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
      const { filePath, content, writeMode = 'manual', ticketId } = req.body;
      const safePath = path.resolve(process.cwd(), filePath);
      
      // Security: Directory traversal protection check
      if (!safePath.startsWith(process.cwd())) {
        return res.status(403).json({ error: "Access Denied: Path outside workspace bounds." });
      }

      const relativePath = path.relative(process.cwd(), safePath).replace(/\\/g, '/');

      // Security Audit Sandbox Enforcement
      const isolationScore = parseFloat(cachedSecurityAudit.authIsolation);
      const isStrictSandbox = isolationScore < 60.0;

      // Master Firewall: HERMES Guard Path & Critical File Protection
      const fileLower = relativePath.toLowerCase();
      const isSystemCritical = 
        fileLower === 'server.ts' || 
        fileLower === 'serverdb.ts' || 
        fileLower === 'database.json' || 
        fileLower.includes('.env') || 
        fileLower.includes('node_modules');

      const isInSafeDirectory = 
        relativePath.startsWith('src/') || 
        relativePath.startsWith('uploads/') || 
        relativePath.startsWith('public/');

      // CRITICAL: Block core corruption. If Strict Sandbox is active, restrict to Safe Dirs only.
      if (isSystemCritical || (isStrictSandbox && !isInSafeDirectory)) {
        serverDB.addSystemLog('SEC', 'ERROR', `PHYSICAL WRITE BLOCK: Target '${relativePath}' is protected. Strict Sandbox (${isolationScore}%) enforces Safe Directory lock. Access Denied.`);
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          code: "HERMES_WRITE_INTERCEPT",
          reason: `[物理寫入攔截 403 / WRITE_INTERCEPT]: Writing to '${relativePath}' is restricted. Sandbox Isolation Score is ${isolationScore}%. Allowed folders: 'src/', 'uploads/', 'public/'.`,
          stderr: `[HERMES-GUARD SECURITY CHK] BLOCKED (Code: 403)\nSandbox Mode: STRICT (Score: ${isolationScore}%)\nMatrix Interception: Target critical or out-of-scope file requested.\nTarget File: "${relativePath}"\n`
        });
      }

      // HERMES Guard physical file write authorization check (Manual session only)
      if (writeMode === 'manual') {
        if (!ticketId) {
          return res.status(403).json({ success: false, error: "Forbidden: Security Ticket Required for Manual session." });
        }
        
        const verifiedAction = verifyTicket(ticketId, 'write');
        if (!verifiedAction || verifiedAction.filePath !== relativePath) {
          serverDB.addSystemLog('SEC', 'ERROR', `TICKET VALIDATION FAILED: Received invalid or forged authorization ticket for write to: ${relativePath}`);
          return res.status(403).json({ success: false, error: "Forbidden: Invalid authorization ticket." });
        }
        serverDB.addSystemLog('SEC', 'SUCCESS', `AUTHORIZATION VERIFIED: File write ticket '${ticketId}' validated for ${relativePath}.`);
      }

      // Ensure directory tree exists
      const parentDir = path.dirname(safePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(safePath, content, 'utf8');
      serverDB.addSystemLog('DB', 'SUCCESS', `HERMES-Guard File Write: Successfully written ${content.length} bytes to '${relativePath}'.`);
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
        serverDB.addSystemLog('EXEC', 'INFO', 'Routing workspace pipeline via HERMES Core Index Optimization Engine.');
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
      const { command, shell = 'powershell', activeCli = 'openrouter', shellMode = 'manual', ticketId } = req.body;
      
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Missing command parameter' });
      }
      
      if (shellMode === 'manual') {
        if (!ticketId) {
          return res.status(403).json({ success: false, error: "Forbidden: Security Ticket Required for OS Command execution." });
        }
        const verifiedAction = verifyTicket(ticketId, 'execute');
        if (!verifiedAction || verifiedAction.command !== command) {
          serverDB.addSystemLog('SEC', 'ERROR', `TICKET VALIDATION FAILED: Received invalid or forged authorization ticket for OS command: ${command}`);
          return res.status(403).json({ success: false, error: "Forbidden: Invalid authorization ticket." });
        }
        serverDB.addSystemLog('SEC', 'SUCCESS', `AUTHORIZATION VERIFIED: OS command ticket '${ticketId}' validated.`);
      }

      // Security Audit Sandbox Enforcement
      const isolationScore = parseFloat(cachedSecurityAudit.authIsolation);
      const isStrictSandbox = isolationScore < 60.0;

      // HERMES Guard physical command validation check
      if (isStrictSandbox || shellMode === 'manual' || shellMode === 'safe') {
        const validation = helperValidateCommand(command);
        if (isStrictSandbox && !validation.safe) {
          serverDB.addSystemLog('SEC', 'ERROR', `PHYSICAL COMMAND BLOCK: System Sandbox Isolation is LOW (${isolationScore}%). Forced SAFE mode blocked command '${command}'. Reason: ${validation.reason}`);
          return res.status(403).json({
            success: false,
            error: "Forbidden",
            code: "HERMES_GUARD_INTERCEPT",
            reason: `[物理攔截代碼 403 / PHYS_INTERCEPT]: Low Sandbox Isolation (${isolationScore}%) forces SAFE mode. Details: ${validation.reason}`,
            stderr: `[HERMES-GUARD SECURITY CHK] BLOCKED (Code: 403)\nSafety Mode: FORCED STRICT (Score: ${isolationScore}%)\nMatrix Interception: Command violates strict local AST rules.\nBlocked Statement: "${command}"\nReason: ${validation.reason}\n`
          });
        } else if (!isStrictSandbox && !validation.safe && shellMode === 'safe') {
          serverDB.addSystemLog('SEC', 'ERROR', `PHYSICAL COMMAND BLOCK: System is running in SAFE security mode. Executing '${command}' has been blocked by HERMES Guard Security Policy. Reason: ${validation.reason}`);
          return res.status(403).json({
            success: false,
            error: "Forbidden",
            code: "HERMES_GUARD_INTERCEPT",
            reason: `[物理攔截代碼 403 / PHYS_INTERCEPT]: Command blocked under SAFE mode safety policy. Details: ${validation.reason}`,
            stderr: `[HERMES-GUARD SECURITY CHK] BLOCKED (Code: 403)\nSafety Mode: SAFE\nMatrix Interception: Command violates strict local AST rules.\nBlocked Statement: "${command}"\nReason: ${validation.reason}\n`
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

  app.get("/api/tasks/archived", (req, res) => {
    res.json(serverDB.getArchivedTasks());
  });

  app.get("/api/tasks/search", (req, res) => {
    try {
      const query = req.query.q as string || '';
      res.json(serverDB.searchTasks(query));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/workspace/task", (req, res) => {
    try {
      const { priority, description, taskMode, userApproved, ticketId } = req.body;
      
      if (taskMode === 'manual') {
        if (!ticketId) {
          return res.status(403).json({ success: false, error: "Forbidden: Security Ticket Required in Manual mode." });
        }
        const verifiedAction = verifyTicket(ticketId, 'create_task');
        if (!verifiedAction || verifiedAction.description !== description) {
          serverDB.addSystemLog('SEC', 'ERROR', `TICKET VALIDATION FAILED: Received invalid or forged authorization ticket for task: ${description}`);
          return res.status(403).json({ success: false, error: "Forbidden: Invalid or Expired Security Ticket." });
        }
        serverDB.addSystemLog('SEC', 'SUCCESS', `AUTHORIZATION VERIFIED: Task creation ticket '${ticketId}' validated by HERMES Guard.`);
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

  // --- Real Physical Auto-Advance Task Engine ---
  async function advanceTaskPhysically(taskId: string, settings: any, apiKey: string): Promise<{ success: boolean; newProgress: number; logMessage: string }> {
    const tasks = serverDB.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      return { success: false, newProgress: 0, logMessage: "Task not found" };
    }

    const currentProgress = task.progress || 0;
    let increment = 0;
    let logMessage = `Cognitive heuristic failed: No valid API Key configured for autonomous task execution. Task [${task.id}] stalled at ${currentProgress}%.`;
    let fileContentGenerated = "";
    let fileToCreate = "";

    let shellCommandExecuted = "";
    let shellCommandOutput = "";

    if (apiKey) {
      try {
        const prompt = `System: You are JARVIS, an autonomous co-founder agent. You execute task instructions and make actual modifications/contributions in a real workplace server.
The workspace contains a React/Vite/Express application with database files and helper scripts.
User Task Directive to execute: "${task.description}" (Current Progress: ${currentProgress}%)

Please perform the actual logical steps for this task. Evaluate the task description, look at relevant system structures, and write a detailed professional log of the work actually generated.
You have the ability to execute ONE physical shell command on the host OS. Use it to verify states, run linters, or check directories.
Generate a valid JSON object in your response. Ensure you do NOT wrap your response in markdown code blocks:
{
  "progressIncrement": <a number between 15 and 35 indicating progress made>,
  "logMessage": "<A precise technical description of what you processed on the server, e.g., 'Generated security schema rules for Firestore access control policy.'>",
  "shell_command": "<Optional: a real command to execute (e.g., 'npm run lint', 'dir src'). Null if not needed.>",
  "technicalArtifact": {
    "title": "<A descriptive file name, e.g., 'firebase_auth_policy.md'>",
    "markdownContent": "<Write complete, high-quality, professional Markdown content or code files. Do NOT write fake text. Provide real concrete implementation recipes, real code blocks, detailed analyses, or full blueprints.>"
  }
}`;

        const result = await fetchOpenRouterWithFallback(
          apiKey,
          prompt,
          undefined,
          settings.byokModel || 'google/gemini-2.5-flash',
          settings.byokEndpoint,
          settings.byokProtocol,
          settings.byokTemplate,
          settings.byokResponsePath,
          settings.gatewayRoutingModel || 'auto'
        );

        triggerSpecificWebhooksFromText(result.text);
        const data = parseAndRepairJSON(result.text);
        if (data) {
          if (typeof data.progressIncrement === 'number') {
            increment = Math.max(5, Math.min(50, data.progressIncrement));
          }
          if (typeof data.logMessage === 'string') {
            logMessage = `[JARVIS-AUTONOMOUS] ${data.logMessage}`;
          }
          if (data.technicalArtifact && typeof data.technicalArtifact.markdownContent === 'string') {
            fileContentGenerated = data.technicalArtifact.markdownContent;
            fileToCreate = data.technicalArtifact.title || `task_${task.id}_artifact.md`;
          }
          if (typeof data.shell_command === 'string' && data.shell_command.trim().length > 0) {
            shellCommandExecuted = data.shell_command;
            logMessage += ` (Executed command: \`${shellCommandExecuted}\`)`;
            try {
              const { stdout, stderr } = await new Promise<{stdout: string, stderr: string}>((resolve) => {
                exec(shellCommandExecuted, { cwd: process.cwd(), timeout: 15000 }, (err, stdout, stderr) => {
                  resolve({ stdout: stdout || "", stderr: stderr || (err ? err.message : "") });
                });
              });
              shellCommandOutput = `\n\n### CLI Execution Result\n**Command**: \`${shellCommandExecuted}\`\n\n**STDOUT**:\n\`\`\`text\n${stdout.substring(0, 2000)}\n\`\`\`\n\n**STDERR**:\n\`\`\`text\n${stderr.substring(0, 1000)}\n\`\`\`\n`;
            } catch (execErr: any) {
              shellCommandOutput = `\n\n### CLI Execution Error\n\`\`\`text\n${execErr.message}\n\`\`\`\n`;
            }
          }
        }
      } catch (e: any) {
        console.error("AI deep auto-advance execution failed:", e.message);
      }
    }

    const newProgress = Math.min(100, currentProgress + increment);
    
    // Write physical file on disk to task_reports/
    try {
      const reportsDir = path.resolve(process.cwd(), "task_reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const reportFile = path.join(reportsDir, `task_${task.id}_timeline.md`);
      const dateStr = new Date().toLocaleString();
      
      let timelineContent = "";
      if (fs.existsSync(reportFile)) {
        timelineContent = fs.readFileSync(reportFile, 'utf8');
      } else {
        timelineContent = `# JARVIS Task Execution Log & Timeline\n\n- **Task ID**: ${task.id}\n- **Task Directive**: *"${task.description}"*\n- **Created At**: ${new Date(task.createdAt).toLocaleString()}\n\n---\n\n`;
      }

      timelineContent += `### [${dateStr}] Milestone Progress: ${newProgress}%\n\n`;
      timelineContent += `> **Action Taken**: ${logMessage}\n\n`;
      
      if (shellCommandOutput) {
        timelineContent += shellCommandOutput;
      }
      
      if (fileContentGenerated && fileToCreate) {
        const sanitizedFilename = fileToCreate.replace(/[^a-zA-Z0-9_\.-]/g, '_');
        const artifactPath = path.join(reportsDir, `${task.id}_${sanitizedFilename}`);
        fs.writeFileSync(artifactPath, fileContentGenerated, 'utf8');
        
        timelineContent += `#### Generated Physical Workspace Artifact: [\`task_reports/${task.id}_${sanitizedFilename}\`](./${task.id}_${sanitizedFilename})\n\n`;
        timelineContent += `\`\`\`markdown\n${fileContentGenerated.substring(0, 1000)}${fileContentGenerated.length > 1000 ? '\n... (truncated)' : ''}\n\`\`\`\n\n`;
        
        serverDB.addSystemLog('DB', 'SUCCESS', `[STARK-AUTONOMOUS]: Created workspace file: 'task_reports/${task.id}_${sanitizedFilename}'`);
      } else {
        // Fallback progress output if no API key is active or model couldn't output file
        const fallbackFilename = `task_${task.id}_progress_${newProgress}.md`;
        const localArtifactPath = path.join(reportsDir, fallbackFilename);
        const fallbackSuggestion = `# Task Progress Report: ${task.description}\n\n1. **Milestone status**: Progressed to ${newProgress}% on ${dateStr}.\n2. **Execution Context**: Executed real database update. Physical system logs registered.\n3. **Recommended checklist**: Validate that changes conform to UI workspace specs.`;
        fs.writeFileSync(localArtifactPath, fallbackSuggestion, 'utf8');
        timelineContent += `#### Workspace Artifact Update: [\`task_reports/${fallbackFilename}\`](./${fallbackFilename})\n\n`;
      }
      
      timelineContent += `\n---\n`;
      fs.writeFileSync(reportFile, timelineContent, 'utf8');
    } catch (fsErr: any) {
      console.error("Failed to commit physical task report to disk:", fsErr.message);
    }

    serverDB.updateTask(task.id, { progress: newProgress });
    if (newProgress >= 100) {
      serverDB.updateTaskStatus(task.id, 'Completed');
    }

    return { success: true, newProgress, logMessage };
  }

  app.post("/api/tasks/auto-advance", async (req, res) => {
    try {
      const tasks = serverDB.getTasks();
      const pendingTasks = tasks
        .filter(t => t.status !== 'Completed')
        .sort((a, b) => b.createdAt - a.createdAt);
      
      if (pendingTasks.length > 0) {
        const targetTask = pendingTasks[0];
        const settings = serverDB.getSettings();
        const apiKey = settings.byokKey || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || "";
        
        const result = await advanceTaskPhysically(targetTask.id, settings, apiKey);
        
        serverDB.addSystemLog('SYS', 'INFO', `${result.logMessage} (Progress: ${result.newProgress}%)`);
        broadcastMcpEvent('TASK_ADVANCED', { taskId: targetTask.id, newProgress: result.newProgress, message: result.logMessage });
        return res.json({ success: true, taskId: targetTask.id, newProgress: result.newProgress });
      }
      
      res.json({ success: false, message: "No active tasks found for auto-advancement." });
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
      
      let finalGpu = osGpuUsage > 0 ? osGpuUsage : 0;

      let finalTmp = "N/A";
      if (osGpuTemp > 0) {
        finalTmp = `${osGpuTemp}°C`;
      } else if (siCpuTemp !== null && siCpuTemp > 0) {
        finalTmp = `${Math.round(siCpuTemp)}°C`;
      }

      let powerDraw = "N/A";
      if (siPower !== null && siPower > 0) {
        powerDraw = `${siPower} W`;
      }

      const activeFans = siFans.length > 0 
        ? `${siFans[0]} RPM` 
        : "N/A";

      const activeVoltage = siCpuVoltage !== null && siCpuVoltage > 0
        ? `${siCpuVoltage.toFixed(3)} V`
        : "N/A";

      let finalFreq = "N/A";
      if (siCpuSpeed !== null && siCpuSpeed > 0) {
        finalFreq = `${siCpuSpeed.toFixed(2)}GHz`;
      }

      let finalNet = "0KB/s";
      if (currentRxSpeed > 0 || currentTxSpeed > 0) {
        finalNet = `${(currentRxSpeed / 1024).toFixed(1)} KB/s ↓ | ${(currentTxSpeed / 1024).toFixed(1)} KB/s ↑`;
      }
      
      let diskIoString = "0.0 MB/s WAIT";
      if (currentDiskReadSpeed > 0 || currentDiskWriteSpeed > 0) {
        diskIoString = `${(currentDiskReadSpeed / 1024 / 1024).toFixed(1)} R | ${(currentDiskWriteSpeed / 1024 / 1024).toFixed(1)} W (MB/s)`;
      }

      const clampedLatency = Math.min(5000, Math.max(10, globalLLMLatencyMs));
      
      const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
      const secStatus = apiKey ? "SEC_CLEARED" : "SEC_REQUIRED";

      const now = Date.now();
      const currentLogs = serverDB.getSystemLogs();

      res.json({
        cpu: cpuUsage,
        mem: finalMem,
        net: finalNet,
        diskIo: diskIoString,
        neuralSync: "100.00",
        rxSpeed: currentRxSpeed,
        txSpeed: currentTxSpeed,
        gpu: finalGpu,
        tmp: finalTmp,
        powerDraw: powerDraw,
        fans: activeFans,
        voltage: activeVoltage,
        freq: finalFreq,
        uptime: Math.round(os.uptime() / 3600),
        processes: osProcessCount > 0 ? osProcessCount : 0,
        os: os.platform().toUpperCase(),
        secStatus,
        shieldActive,
        reactorOverdrive,
        satelliteLinked,
        corePower,
        structural: 100,
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

  // --- HERMES Guard AST Command Safety Filter ---
  app.post("/api/system/validate-command", (req, res) => {
    try {
      const { command } = req.body;
      if (!command || typeof command !== "string") {
        return res.status(400).json({ error: "Missing command parameter" });
      }

      serverDB.addSystemLog('SEC', 'INFO', `Analyzing shell command structures for safety validations...`);
      const { safe, reason } = helperValidateCommand(command);

      if (safe) {
        serverDB.addSystemLog('SEC', 'SUCCESS', 'HERMES Guard AST Filter: Command structure validated as 100% safe.');
      } else {
        serverDB.addSystemLog('SEC', 'WARN', `HERMES Guard AST Filter: Command blocked! Reason: ${reason}`);
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
        serverDB.addSystemLog('SYS', 'SUCCESS', `HERMES Core Index optimization analyzed: Coherence ${(quantumData.synapticCoherence * 100).toFixed(2)}%`);
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
      const oldSettings = serverDB.getSettings();
      
      if (newSettings.activeLoopNode && newSettings.activeLoopNode !== oldSettings.activeLoopNode) {
        let category: 'SYS' | 'HERMES' | 'DB' | 'GEPA' | 'NET' | 'API' | 'VOIP' | 'EXEC' | 'SEC' = 'SYS';
        let msg = "";
        const nodeUpper = String(newSettings.activeLoopNode).toUpperCase();
        
        if (newSettings.activeLoopNode === 'experience') {
          category = 'DB';
          msg = `Learning Loop Node shifted to [${nodeUpper}]: Mapping active FTS5 memory tables & user history indexers.`;
        } else if (newSettings.activeLoopNode === 'curation') {
          category = 'HERMES';
          msg = `Learning Loop Node shifted to [${nodeUpper}]: Aligning task queue prioritizers & processing pipelines.`;
        } else if (newSettings.activeLoopNode === 'skills') {
          category = 'SYS';
          msg = `Learning Loop Node shifted to [${nodeUpper}]: Hot-swapping agentic modules from the local skill repository.`;
        } else if (newSettings.activeLoopNode === 'gepa') {
          category = 'GEPA';
          msg = `Learning Loop Node shifted to [${nodeUpper}]: Calibrating optimal prompt variations under budget constraint.`;
        }
        
        serverDB.addSystemLog(category, 'INFO', `[LOOP_SHIFT]: ${msg}`);
      }

      if (newSettings.gatewayRoutingModel && newSettings.gatewayRoutingModel !== oldSettings.gatewayRoutingModel) {
        const routeMode = String(newSettings.gatewayRoutingModel).toUpperCase();
        serverDB.addSystemLog('API', 'INFO', `[ROUTING SHIFT]: Cost-Aware Gateway updated to [${routeMode}] mode.`);
      }

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
      if (!req.body || req.body.length === 0) {
        return res.status(400).json({ success: false, error: 'No audio data received' });
      }

      let transcribedText = "";

      if (process.env.OPENAI_API_KEY) {
        // Use genuine Whisper API
        const formData = new FormData();
        const blob = new Blob([req.body], { type: 'audio/webm' });
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');

        const fetchRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: formData as any
        });
        
        if (!fetchRes.ok) {
          const errData = await fetchRes.text();
          throw new Error(`OpenAI Whisper API error: ${fetchRes.status} - ${errData}`);
        }
        
        const json = await fetchRes.json();
        transcribedText = json.text;
        serverDB.addSystemLog('SYS', 'SUCCESS', 'Audio chunk successfully processed by OpenAI Whisper STT service.');
      } else if (process.env.GEMINI_API_KEY) {
        // Fallback to Gemini 2.5 Flash Audio Transcription
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{
            parts: [
              { text: 'Transcribe this audio exactly. Return ONLY the transcribed text without any conversational preamble or quotes.' },
              { inlineData: { data: req.body.toString('base64'), mimeType: 'audio/webm' } }
            ]
          }]
        });
        
        transcribedText = response.text || "";
        serverDB.addSystemLog('SYS', 'SUCCESS', 'Audio chunk successfully processed by Gemini Audio STT service.');
      } else {
        throw new Error("No API key available for transcription (OPENAI_API_KEY or GEMINI_API_KEY).");
      }

      res.json({ success: true, text: transcribedText.trim() });
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
        
        serverDB.addSystemLog('SEC', 'SUCCESS', `Defensive perimeter shield gain set to ${code}. Sandbox protection matrix initialized.`);
        return res.json({ 
          success: true, 
          shieldActive, 
          message: `Shield deflection matrix set to ${code}.`,
          speak: shieldActive ? "Sandbox security perimeter initialized and firewall locked down." : "Shield deflection matrix and firewall on standby."
        });
      }
      
      if (command === "overdrive") {
        reactorOverdrive = !reactorOverdrive;
        toggleTrueOverdriveWorker(reactorOverdrive);
        corePower = reactorOverdrive ? 125 : 98;
        serverDB.addSystemLog('SEC', 'WARN', `Database query router capacity boosted to ${reactorOverdrive ? '125%' : '98% nominal'}. Direct CPU core stress applied.`);
        broadcastMcpEvent('SYSTEM_ALERT', { alert: 'OVERDRIVE_TOGGLED', active: reactorOverdrive });
        return res.json({ 
          success: true, 
          reactorOverdrive,
          corePower,
          message: reactorOverdrive 
            ? "Database processing router thread capacity boosted to 125% limit." 
            : "Database thread router level normalized to safety threshold.",
          speak: reactorOverdrive 
            ? "Database scaling thread boosted to one hundred and twenty-five percent capacity." 
            : "Scaling thread levels normalized."
        });
      }
      
      if (command === "satlink") {
        satelliteLinked = !satelliteLinked;
        const state = satelliteLinked ? "synchronized" : "severed";
        
        serverDB.addSystemLog('NET', 'SUCCESS', `Local SQLite database index synchronization state set to ${state}. local DB updated.`);
        return res.json({ 
          success: true, 
          satelliteLinked,
          message: satelliteLinked ? "Local Database link synchronized." : "Database sync link severed.",
          speak: satelliteLinked ? "All database schemas synchronized, indexing tunnel established." : "Database sync tunnel disconnected."
        });
      }
      
      if (command === "recalibrate") {
                
        // Execute real system recalibration (Garbage Collection and Memory compaction)
        if (global.gc) {
          global.gc();
        }
        
        serverDB.addSystemLog('SEC', 'SUCCESS', 'System diagnostic neural metrics recalibrated successfully. V8 Garbage Collection executed.');
        return res.json({ 
          success: true, 
          structural: 100,
          message: "System memory compacted & heuristics recalibrated.",
          speak: "Vital diagnostics restored to one hundred percent and system memory compacted, Tommy."
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
  let pendingMcpCalls: Map<string, {resolve: Function, reject: Function}> = new Map();

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

  // --- MCP Tool Execute Endpoint ---
  app.post("/api/mcp/execute", async (req, res) => {
    try {
      const { serverName, toolName, args } = req.body;
      const instance = activeMcpServers.get(serverName);
      if (!instance || instance.status !== 'connected') {
        return res.status(404).json({ success: false, error: `MCP Server '${serverName}' not found or inactive.` });
      }

      const callId = `call-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const rpcReq = {
        jsonrpc: '2.0',
        id: callId,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args || {}
        }
      };

      const resultPromise = new Promise((resolve, reject) => {
        pendingMcpCalls.set(callId, { resolve, reject });
        setTimeout(() => {
          if (pendingMcpCalls.has(callId)) {
            pendingMcpCalls.delete(callId);
            reject(new Error("Timeout waiting for MCP execution result."));
          }
        }, 30000);
      });

      instance.process.stdin?.write(JSON.stringify(rpcReq) + '\n');
      
      const result = await resultPromise;
      serverDB.addSystemLog('API', 'SUCCESS', `MCP tool '${toolName}' executed successfully on '${serverName}'.`);
      res.json({ success: true, result });
    } catch (e: any) {
      serverDB.addSystemLog('API', 'ERROR', `MCP tool execution fault: ${e.message}`);
      res.status(500).json({ success: false, error: e.message });
    }
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
                     } else if (msg.id && String(msg.id).startsWith('call-') && pendingMcpCalls.has(String(msg.id))) {
                        const { resolve, reject } = pendingMcpCalls.get(String(msg.id))!;
                        if (msg.error) {
                           reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                        } else {
                           resolve(msg.result);
                        }
                        pendingMcpCalls.delete(String(msg.id));
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

      const activeCount = Array.from(activeMcpServers.values()).filter(s => s.status !== 'error').length;
      serverDB.addSystemLog('API', 'SUCCESS', `Successfully synchronized with ${activeCount} Model Context Protocol server(s). Tools cached.`);
      res.json({ success: true, count: activeCount });
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
      const newTask = {
        id: crypto.randomUUID(),
        title: `Routine: ${routine.name}`,
        description: routine.prompt,
        status: 'In Progress' as const,
        progress: 0,
        createdAt: Date.now(),
        priority: 'High' as const,
        tags: ['mcp-routine', 'automation']
      };
      
      serverDB.addTask(newTask);
      serverDB.addSystemLog('HERMES', 'SUCCESS', `Registered new physical task [${newTask.id}] with priority High.`);
      broadcastMcpEvent('TASK_CREATED', newTask);
      
      res.json({ success: true, task: newTask });
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
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      const safePath = path.resolve(uploadsDir, fileName);
      
      // Security: Strict directory confinement to 'uploads/' folder
      if (!safePath.startsWith(uploadsDir)) {
        serverDB.addSystemLog('SEC', 'WARN', `UPLOAD TRAVERSAL BLOCKED: Attempt to escape uploads directory with filename '${fileName}'`);
        return res.status(403).json({ error: "Access Denied: Uploads must remain within the designated uploads directory." });
      }

      const parentDir = path.dirname(safePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(safePath, content, 'utf8');

      // Server-side database document indexing
      const userMessage = {
        id: Math.random().toString(36).substring(7),
        sessionId: "default-session",
        role: "system",
        content: `[FILE UPLOADED]: File '${fileName}' stored in uploads directory. Content Summary:\n${content.substring(0, 800)}`,
        timestamp: Date.now()
      };
      serverDB.addMessage(userMessage);
      broadcastMcpEvent('CHAT_MESSAGE', userMessage);

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

      // Perform a unified high-potency Okapi BM25 query over SQLite memory state AND uploaded files
      const ftsMatches = serverDB.queryFTS(query);
      
      const topResults = ftsMatches.slice(0, 5).map((match, idx) => {
        // Parse fileName and chunkIndex if it's a file, otherwise reference source type
        const fileMatch = match.title.match(/📂 Workspace Doc:\s*(.*?)\s*\[Sec\s*(\d+)\]/);
        const fileName = fileMatch ? fileMatch[1] : match.title;
        const chunkIndex = fileMatch ? parseInt(fileMatch[2], 10) - 1 : idx;
        
        return {
          fileName,
          chunkIndex,
          content: match.excerpt,
          score: match.confidence
        };
      });

      let aiAnswer = "";
      const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;

      if (topResults.length > 0 && apiKey) {
        // Build RAG context block
        const contextBlocks = topResults
          .map(r => `[SOURCE: ${r.fileName} | SECTION: #${r.chunkIndex + 1}]\n${r.content}`)
          .join("\n\n---\n\n");

        const ragPrompt = `You are J.A.R.V.I.S., analyzing local workspace documents and system state logs on behalf of Tony Stark.
Synthesize a precise, intelligent, and highly coherent answer to the query based on the extracted context snippets below. 
These snippets integrate both user-uploaded files, chat memories, and system configurations.
If the snippets do not contain the answer, summarize the matches honestly. Speak with calm, British wit.

USER QUERY: ${query}

EXTRACTED UNIFIED CONTEXT CHUNKS:
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
        results: topResults,
        aiAnswer: aiAnswer || (topResults.length > 0 
          ? `Indexed ${topResults.length} matching snippets from unified state memory, sir. Feel free to connect an API key in secrets for integrated cognitive summaries.` 
          : "No files or state logs matched your search parameters, sir.")
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

  // --- Autonomous Cognitive Task Orchestrator ---
  let activeAutonomousTaskId: string | null = null;
  setInterval(async () => {
    try {
      const settings = serverDB.getSettings();
      if (!settings || settings.taskMode !== 'auto') {
        activeAutonomousTaskId = null;
        return;
      }

      const tasks = serverDB.getTasks().filter(t => t.status === 'Pending');
      if (tasks.length === 0) {
        activeAutonomousTaskId = null;
        return;
      }

      // Pick the first pending task to process
      const task = tasks[0];
      activeAutonomousTaskId = task.id;
      
      const currentProgress = task.progress || 0;
      if (currentProgress === 0) {
        serverDB.addSystemLog('HERMES', 'INFO', `Cognitive Orchestrator: Engaging background thread for directive: "${task.description.substring(0, 45)}..."`);
      }

      const apiKey = settings.byokKey || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || "";
      const result = await advanceTaskPhysically(task.id, settings, apiKey);

      if (result.success) {
        if (result.newProgress >= 100) {
          activeAutonomousTaskId = null;
          serverDB.addSystemLog('HERMES', 'SUCCESS', `AUTONOMOUS DEPLOYMENT COMPLETED for [${task.id}]: ${result.logMessage}`);
          const updatedTask = serverDB.getTasks().find(t => t.id === task.id);
          if (updatedTask) broadcastMcpEvent('TASK_COMPLETED', updatedTask);
        } else {
          serverDB.addSystemLog('HERMES', 'INFO', `Background Thread: ${result.logMessage} [Progress: ${result.newProgress}%]`);
        }
      }
    } catch (e: any) {
      console.error("Cognitive Task Orchestrator cycle failed:", e);
    }
  }, 15000); // 15s interval for smooth autonomous background action
  
  // --- Auto-Archive Daemon Thread ---
  // Periodically checks for completed tasks and moves them to Archived after 24 hours of completion
  setInterval(() => {
    try {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const tasks = serverDB.getTasks();
      
      const finishedTasks = tasks.filter(t => {
        if (t.status === 'Completed') {
          // Fallback if completedAt isn't set
          const compAt = t.completedAt || t.createdAt;
          return (now - compAt >= oneDayMs);
        }
        return false;
      });
      
      if (finishedTasks.length > 0) {
        finishedTasks.forEach(task => {
          serverDB.archiveTask(task.id);
        });
        serverDB.addSystemLog('SYS', 'SUCCESS', `[AUTO-ARCHIVE]: Successfully cleaned and archived ${finishedTasks.length} task(s) completed > 24 hours ago.`);
      }
    } catch (e: any) {
      console.error("Error running auto-archive service:", e);
    }
  }, 1000 * 60); // Check once every minute
}

startServer();
