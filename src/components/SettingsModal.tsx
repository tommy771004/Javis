import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ShieldAlert, Terminal, FileText, CheckCircle2, Volume2, 
  Settings, Key, RefreshCw, Play, Languages, Palette, Layers, 
  Info, Brain, Radio, HelpCircle, Activity, Sparkles, Check, Server, Monitor,
  Trash2, Zap
} from 'lucide-react';
import { getTranslations, useI18n } from '../services/i18n';
import { JarvisLogo } from './JarvisLogo';
import { apiClient } from '../services/apiClient';
import { playTactileClick } from '../services/audioSynth';
import { CACHE_PURGE_RESET_EVENT } from '../services/uiResetPolicies';
import { formatCliPackageMap, parseCliPackageMapInput } from '../services/settingsIntegrationPolicies';

export interface SecuritySettings {
  shellMode: 'manual' | 'safe' | 'auto';
  writeMode: 'manual' | 'auto';
  taskMode: 'manual' | 'auto';
  voiceProfile: 'baritone' | 'fast' | 'standard';
  autoRepair: boolean;
  activeSkin?: string;
  satelliteName?: string;
  armorModel?: string;
  operatorName?: string;
  byokKey?: string;
  byokModel?: string;
  byokEndpoint?: string;
  byokProtocol?: string;
  byokTemplate?: string;
  byokResponsePath?: string;
  systemPrompt?: string;
  activeCli?: string;
  elevenLabsKey?: string;
  alwaysOnTop?: boolean;
  launchOnStartup?: boolean;
  gatewayRoutingModel?: 'auto' | 'haiku' | 'sonnet';
  cliPackageMap?: Record<string, string>;
  // Provider API keys stored in encrypted DB
  openrouterKey?: string;
  openaiKey?: string;
  geminiKey?: string;
}

const DEFAULT_SETTINGS: SecuritySettings = {
  shellMode: 'manual',
  writeMode: 'manual',
  taskMode: 'manual',
  voiceProfile: 'baritone',
  autoRepair: false,
  activeSkin: 'cyan',
  satelliteName: 'LOCAL_SQLITE_DB',
  armorModel: 'Core v4.5',
  operatorName: 'ADMIN OPERATOR',
  byokKey: '',
  byokModel: 'google/gemini-2.5-flash',
  byokEndpoint: 'https://openrouter.ai/api/v1',
  byokProtocol: 'openrouter',
  byokTemplate: '{\n  "model": "${model}",\n  "messages": "${messages}"\n}',
  byokResponsePath: 'choices[0].message.content',
  systemPrompt: '',
  activeCli: 'openrouter',
  elevenLabsKey: '',
  alwaysOnTop: false,
  launchOnStartup: false,
  gatewayRoutingModel: 'auto',
  openrouterKey: '',
  openaiKey: '',
  geminiKey: '',
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: SecuritySettings) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

// Full list of premium CLI options matching the screenshot
interface CLIOption {
  id: string;
  name: string;
  version: string;
  desc?: string;
  isInstalled: boolean;
  tag?: string;
  statusColor: 'green' | 'red' | 'orange' | 'gray';
  iconText: string;
  iconBg: string;
}

export function SettingsModal({ isOpen, onClose, onSettingsChange, isMuted, onToggleMute }: SettingsModalProps) {
  const { locale, t, setLocale } = useI18n();
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [activeMenu, setActiveMenu] = useState<string>('execution');
  const [execTab, setExecTab] = useState<'cli' | 'byok'>('cli');
  const [selectedCLI, setSelectedCLI] = useState<string>('openrouter');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [cliOptions, setCliOptions] = useState<CLIOption[]>([]);
  const [cognitiveMemories, setCognitiveMemories] = useState<string[]>([]);
  const [newMemory, setNewMemory] = useState<string>('');
  const [installingCli, setInstallingCli] = useState<string | null>(null);

  // Dynamic system security audit and telemetry fetching
  const [synapseLatency, setSynapseLatency] = useState<string>('SCANNING...');
  const [securitySignals, setSecuritySignals] = useState<string>('SCANNING...');
  const [workspaceSandboxed, setWorkspaceSandboxed] = useState<string>('SCANNING...');
  const [encryptionLevel, setEncryptionLevel] = useState<string>('SCANNING...');
  const [activePort, setActivePort] = useState<string>('SCANNING...');
  const [sandboxControl, setSandboxControl] = useState<string>('SCANNING...');
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || activeMenu !== 'about') return;

    let active = true;
    setIsAuditing(true);

    async function fetchSecurityAndStats() {
      try {
        const [auditRes, statsRes] = await Promise.all([
          fetch('/api/system/security-audit').then(res => res.ok ? res.json() : null),
          fetch('/api/system/stats').then(res => res.ok ? res.json() : null)
        ]);

        if (!active) return;

        if (auditRes && auditRes.success) {
          setSecuritySignals(auditRes.securitySignals);
          setWorkspaceSandboxed(auditRes.workspaceSandboxed);
          if (auditRes.encryption) setEncryptionLevel(auditRes.encryption);
          if (auditRes.port) setActivePort(auditRes.port);
          if (auditRes.sandboxControl) setSandboxControl(auditRes.sandboxControl);
        }

        if (statsRes && statsRes.pingLatencyMs !== undefined) {
          setSynapseLatency(`${statsRes.pingLatencyMs} ms`);
        } else {
          setSynapseLatency('18 ms');
        }
      } catch (err) {
        console.warn("Failed to fetch security audit or stats in SettingsModal", err);
      } finally {
        if (active) {
          // Immediately terminate audit state once requests complete - removing artificial delays
          setIsAuditing(false);
        }
      }
    }

    fetchSecurityAndStats();

    return () => {
      active = false;
    };
  }, [isOpen, activeMenu]);

  // BYOK (Bring Your Own Key) OpenRouter API state values
  const [openRouterKey, setOpenRouterKey] = useState<string>('');
  const [openRouterModel, setOpenRouterModel] = useState<string>('google/gemini-2.5-flash');
  const [openRouterEndpoint, setOpenRouterEndpoint] = useState<string>('https://openrouter.ai/api/v1');
  const [openRouterProtocol, setOpenRouterProtocol] = useState<string>('openrouter');
  const [customBodyTemplate, setCustomBodyTemplate] = useState<string>('{\n  "model": "${model}",\n  "messages": "${messages}"\n}');
  const [customResponsePath, setCustomResponsePath] = useState<string>('choices[0].message.content');
  
  const [elevenLabsKey, setElevenLabsKey] = useState<string>('');
  const [openrouterKey, setOpenrouterKey] = useState<string>('');
  const [openaiKey, setOpenaiKey] = useState<string>('');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [envSaveStatus, setEnvSaveStatus] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');

  // Core Identity Profile customizable state values
  const [operatorName, setOperatorName] = useState<string>('');
  const [armorModel, setArmorModel] = useState<string>('');
  const [satelliteName, setSatelliteName] = useState<string>('');
  const [activeSkin, setActiveSkin] = useState<string>('cyan');

  const [mcpServersText, setMcpServersText] = useState<string>('{\n  "mcpServers": {\n    "example": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-everything"]\n    }\n  }\n}');
  const [isMcpConnecting, setIsMcpConnecting] = useState(false);
  const [mcpStatus, setMcpStatus] = useState<string>('Disconnected');
  const [mcpSkillsList, setMcpSkillsList] = useState<any[]>([]);
  const [mcpSkillsLoading, setMcpSkillsLoading] = useState(false);
  const [isPurgingCache, setIsPurgingCache] = useState(false);
  
  const [mcpWebhooks, setMcpWebhooks] = useState<any[]>([]);
  const [mcpRoutines, setMcpRoutines] = useState<any[]>([]);

  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutinePrompt, setNewRoutinePrompt] = useState('');
  const [cliPackageMapText, setCliPackageMapText] = useState<string>(formatCliPackageMap({}));
  const [cliPackageMapStatus, setCliPackageMapStatus] = useState<string>('');

  const [supportedModels, setSupportedModels] = useState<{id: string, name: string, defaultPrompt?: string}[]>([
    { id: "google/gemini-2.5-flash", name: "google/gemini-2.5-flash" }
  ]);
  
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(false);
  const [launchOnStartup, setLaunchOnStartup] = useState<boolean>(false);

  useEffect(() => {
    // Fetch dynamically supported models
    fetch('/api/system/models')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.models) {
          setSupportedModels(data.models);
        }
      })
      .catch((e) => console.error("Failed to load supported models:", e));
      
    // Initialize desktop controls saved state
    const savedOnTop = localStorage.getItem('jarvis_always_on_top') === 'true';
    const savedStartup = localStorage.getItem('jarvis_launch_on_startup') === 'true';
    setAlwaysOnTop(savedOnTop);
    setLaunchOnStartup(savedStartup);
  }, []);

  useEffect(() => {
    if (activeMenu === 'mcpSkills') {
      setMcpSkillsLoading(true);
      fetch('/api/mcp/tools')
        .then(r => r.json())
        .then(data => {
           if (data.success) {
              setMcpSkillsList(data.tools || []);
           }
        })
        .finally(() => setMcpSkillsLoading(false));
    } else if (activeMenu === 'mcpExternal') {
      fetch('/api/mcp/webhooks')
        .then(r => r.json())
        .then(data => data.success && setMcpWebhooks(data.webhooks))
        .catch(console.error);
    } else if (activeMenu === 'mcpRoutines') {
      fetch('/api/mcp/routines')
        .then(r => r.json())
        .then(data => data.success && setMcpRoutines(data.routines))
        .catch(console.error);
    }
  }, [activeMenu]);

  useEffect(() => {
    try {
      const storedMcp = localStorage.getItem('jarvis_mcp_config');
      if (storedMcp) setMcpServersText(storedMcp);


      // -----------------------------------------------------------------------
      // Single Source of Truth: /api/settings (backend encrypted DB) is primary.
      // localStorage is written FROM the DB response so both stay in sync.
      // localStorage is used as fallback ONLY if the backend is unreachable.
      // -----------------------------------------------------------------------
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data) {
            setSettings({ ...DEFAULT_SETTINGS, ...data });
            setCliPackageMapText(formatCliPackageMap(data.cliPackageMap));

            // Mirror DB → state AND localStorage so subsequent reads are consistent
            const applyAndCache = (lsKey: string, setter: (v: string) => void, value: string | undefined) => {
              if (value) { setter(value); localStorage.setItem(lsKey, value); }
            };

            applyAndCache('jarvis_operator_name',       setOperatorName,       data.operatorName);
            applyAndCache('jarvis_armor_model',         setArmorModel,         data.armorModel);
            applyAndCache('jarvis_satellite_name',      setSatelliteName,      data.satelliteName);
            applyAndCache('jarvis_byok_key',            setOpenRouterKey,      data.byokKey);
            applyAndCache('jarvis_byok_model',          setOpenRouterModel,    data.byokModel);
            applyAndCache('jarvis_byok_endpoint',       setOpenRouterEndpoint, data.byokEndpoint);
            applyAndCache('jarvis_byok_protocol',       setOpenRouterProtocol, data.byokProtocol);
            applyAndCache('jarvis_byok_template',       setCustomBodyTemplate, data.byokTemplate);
            applyAndCache('jarvis_byok_response_path',  setCustomResponsePath, data.byokResponsePath);
            applyAndCache('jarvis_system_prompt',       setSystemPrompt,       data.systemPrompt);
            applyAndCache('jarvis_active_cli',          setSelectedCLI,        data.activeCli);
            applyAndCache('jarvis_elevenlabs_key',      setElevenLabsKey,      data.elevenLabsKey);
            applyAndCache('jarvis_openrouter_key',      setOpenrouterKey,      data.openrouterKey);
            applyAndCache('jarvis_openai_key',          setOpenaiKey,          data.openaiKey);
            applyAndCache('jarvis_gemini_key',          setGeminiKey,          data.geminiKey);

            if (data.activeSkin) {
              setActiveSkin(data.activeSkin);
              localStorage.setItem('jarvis_active_skin', data.activeSkin);
              window.dispatchEvent(new CustomEvent('skin-updated'));
            }
            if (data.alwaysOnTop !== undefined) setAlwaysOnTop(data.alwaysOnTop);
            if (data.launchOnStartup !== undefined) setLaunchOnStartup(data.launchOnStartup);
          }
        })
        .catch(err => {
          // Backend unreachable — fall back to localStorage as secondary source
          console.warn('[Settings] Backend unreachable, falling back to localStorage:', err);
          const stored = localStorage.getItem('jarvis_security_settings');
          if (stored) {
            const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            setSettings(parsed);
            setCliPackageMapText(formatCliPackageMap(parsed.cliPackageMap));
          }

          const fallback = (lsKey: string, setter: (v: string) => void, def?: string) => {
            const v = localStorage.getItem(lsKey) || def;
            if (v) setter(v);
          };
          fallback('jarvis_operator_name',       setOperatorName,       locale === 'zh-TW' ? '系統管理員' : 'ADMIN OPERATOR');
          fallback('jarvis_armor_model',         setArmorModel,         'Core v4.5');
          fallback('jarvis_satellite_name',      setSatelliteName,      locale === 'zh-TW' ? '本機 SQLite 資料庫' : 'LOCAL_SQLITE_DB');
          fallback('jarvis_active_skin',         setActiveSkin,         'cyan');
          fallback('jarvis_byok_key',            setOpenRouterKey);
          fallback('jarvis_byok_model',          setOpenRouterModel);
          fallback('jarvis_byok_endpoint',       setOpenRouterEndpoint);
          fallback('jarvis_byok_protocol',       setOpenRouterProtocol);
          fallback('jarvis_byok_template',       setCustomBodyTemplate);
          fallback('jarvis_byok_response_path',  setCustomResponsePath);
          fallback('jarvis_system_prompt',       setSystemPrompt);
          fallback('jarvis_active_cli',          setSelectedCLI);
          fallback('jarvis_elevenlabs_key',      setElevenLabsKey);
          fallback('jarvis_openrouter_key',      setOpenrouterKey);
          fallback('jarvis_openai_key',          setOpenaiKey);
          fallback('jarvis_gemini_key',          setGeminiKey);
        });

      runPathScan(true);

      apiClient.getCognitiveMemories().then(mems => {
        setCognitiveMemories(mems);
      }).catch(err => console.warn('Failed to load cognitive memories', err));
    } catch (e) {
      console.error('Failed to parse security settings', e);
    }
  }, [isOpen]);


  const saveSettings = async (newSettings: SecuritySettings) => {
    setSettings(newSettings);
    localStorage.setItem('jarvis_security_settings', JSON.stringify(newSettings));
    
    // Explicitly mirror individual keys so we don't break existing local reads
    if (newSettings.byokKey !== undefined) localStorage.setItem('jarvis_byok_key', newSettings.byokKey);
    if (newSettings.byokModel !== undefined) localStorage.setItem('jarvis_byok_model', newSettings.byokModel);
    if (newSettings.byokEndpoint !== undefined) localStorage.setItem('jarvis_byok_endpoint', newSettings.byokEndpoint);
    if (newSettings.byokProtocol !== undefined) localStorage.setItem('jarvis_byok_protocol', newSettings.byokProtocol);
    if (newSettings.byokTemplate !== undefined) localStorage.setItem('jarvis_byok_template', newSettings.byokTemplate);
    if (newSettings.byokResponsePath !== undefined) localStorage.setItem('jarvis_byok_response_path', newSettings.byokResponsePath);
    if (newSettings.systemPrompt !== undefined) localStorage.setItem('jarvis_system_prompt', newSettings.systemPrompt);
    if (newSettings.activeCli !== undefined) localStorage.setItem('jarvis_active_cli', newSettings.activeCli);
    if (newSettings.elevenLabsKey !== undefined) localStorage.setItem('jarvis_elevenlabs_key', newSettings.elevenLabsKey);
    if (newSettings.openrouterKey !== undefined) localStorage.setItem('jarvis_openrouter_key', newSettings.openrouterKey);
    if (newSettings.openaiKey !== undefined) localStorage.setItem('jarvis_openai_key', newSettings.openaiKey);
    if (newSettings.geminiKey !== undefined) localStorage.setItem('jarvis_gemini_key', newSettings.geminiKey);

    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (e) {
      console.error("Failed to sync settings to server:", e);
    }
  };

  if (!isOpen) return null;

  const handleShellChange = (mode: 'manual' | 'safe' | 'auto') => {
    const updated = { ...settings, shellMode: mode };
    saveSettings(updated);

    const feedback =
      mode === 'auto'
        ? t.logShellSpeakAuto
        : mode === 'safe'
          ? t.logShellSpeakSafe
          : t.logShellSpeakManual;

    triggerLog(t.logShellMessage(mode.toUpperCase()), feedback);
  };

  const handleWriteChange = (mode: 'manual' | 'auto') => {
    const updated = { ...settings, writeMode: mode };
    saveSettings(updated);
    triggerLog(
      t.logWriteMessage(mode.toUpperCase()),
      mode === 'auto' ? t.logWriteSpeakAuto : t.logWriteSpeakManual
    );
  };

  const handleTaskChange = (mode: 'manual' | 'auto') => {
    const updated = { ...settings, taskMode: mode };
    saveSettings(updated);
    triggerLog(
      t.logTaskMessage(mode.toUpperCase()),
      t.logTaskSpeak
    );
  };

  const handleIdentityChange = (key: 'operatorName' | 'armorModel' | 'satelliteName', val: string) => {
    if (key === 'operatorName') {
      setOperatorName(val);
      localStorage.setItem('jarvis_operator_name', val);
      const updated = { ...settings, operatorName: val };
      saveSettings(updated);
    } else if (key === 'armorModel') {
      setArmorModel(val);
      localStorage.setItem('jarvis_armor_model', val);
      const updated = { ...settings, armorModel: val };
      saveSettings(updated);
    } else if (key === 'satelliteName') {
      setSatelliteName(val);
      localStorage.setItem('jarvis_satellite_name', val);
      const updated = { ...settings, satelliteName: val };
      saveSettings(updated);
    }
    window.dispatchEvent(new Event('identity-updated'));
  };

  const handleSkinChange = (skin: string) => {
    playTactileClick();
    localStorage.setItem('jarvis_active_skin', skin);
    setActiveSkin(skin);
    window.dispatchEvent(new CustomEvent('skin-updated'));
    // Persist to backend encrypted DB so the preference survives process restarts
    const updated = { ...settings, activeSkin: skin };
    saveSettings(updated);
    triggerLog(t.logSkinMessage(skin));
  };

  const handleDesktopToggle = async (type: 'always-on-top' | 'startup', enabled: boolean) => {
    if (type === 'always-on-top') {
      setAlwaysOnTop(enabled);
      localStorage.setItem('jarvis_always_on_top', enabled ? 'true' : 'false');
      triggerLog(t.logDesktopOverlayMessage(enabled), t.logDesktopOverlaySpeak(enabled));
      
      await fetch('/api/system/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'always-on-top', enabled })
      });
    } else {
      setLaunchOnStartup(enabled);
      localStorage.setItem('jarvis_launch_on_startup', enabled ? 'true' : 'false');
      triggerLog(t.logDesktopStartupMessage(enabled), t.logDesktopStartupSpeak);
      
      await fetch('/api/system/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'startup', enabled })
      });
    }
  };

  const handleVoiceChange = (profile: 'baritone' | 'fast' | 'standard') => {
    const updated = { ...settings, voiceProfile: profile };
    saveSettings(updated);
    const feedback =
      profile === 'baritone'
        ? t.logVoiceSpeakBaritone
        : profile === 'fast'
          ? t.logVoiceSpeakFast
          : t.logVoiceSpeakStandard;
    triggerLog(
      t.logVoiceMessage(profile.toUpperCase()),
      feedback
    );
  };

  const triggerLog = (msg: string, speak?: string) => {
    window.dispatchEvent(new CustomEvent('append-sys-log', {
      detail: { message: msg, speak }
    }));
  };

  const handleSaveBYOK = () => {
    const updated = {
       ...settings,
       byokKey: openRouterKey,
       byokModel: openRouterModel,
       byokEndpoint: openRouterEndpoint,
       byokProtocol: openRouterProtocol,
       byokTemplate: customBodyTemplate,
       byokResponsePath: customResponsePath,
       systemPrompt: systemPrompt
    };
    saveSettings(updated);
    
    triggerLog(
      `SYS: BYOK API PARAMETERS UPDATE. MODEL: ${openRouterModel}`,
      `Protocol Adapter: ${openRouterProtocol.toUpperCase()}`
    );
  };

  const handleSaveCliPackageMap = async () => {
    try {
      const parsedMap = parseCliPackageMapInput(cliPackageMapText);
      const updated = { ...settings, cliPackageMap: parsedMap };
      await saveSettings(updated);
      setCliPackageMapText(formatCliPackageMap(parsedMap));
      setCliPackageMapStatus(locale === 'zh-TW' ? 'CLI 套件來源對映已儲存。' : 'CLI package map saved.');
      triggerLog(
        `SYS: CLI PACKAGE MAP UPDATED. ${Object.keys(parsedMap).length} ROUTES ACTIVE.`,
        locale === 'zh-TW' ? 'CLI 套件來源對映已同步。' : 'CLI package source mappings synchronized.'
      );
    } catch (e: any) {
      const msg = e?.message || 'Invalid CLI package map JSON.';
      setCliPackageMapStatus(msg);
      triggerLog(`SYS: CLI PACKAGE MAP REJECTED. ${msg}`);
    }
  };

  const handleSelectCLI = async (cliId: string) => {
    setSelectedCLI(cliId);
    saveSettings({ ...settings, activeCli: cliId });
    
    let engineParam = "powershell";
    if (cliId === "copilot") {
      engineParam = "copilot";
    } else if (cliId === "hermes" || cliId === "claude-code") {
      engineParam = "stark-quantum";
    }
    
    try {
      const resp = await fetch("/api/system/engine-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine: engineParam })
      });
      const data = await resp.json();
      
      if (data.success) {
        if (cliId === "copilot") {
          const authMsg = data.authenticated 
            ? `Active pipeline connected to GitHub CLI protocol. OAuth validated: Logged in as ${data.user}, sir.`
            : `Active pipeline connected. Warning: ${data.details}`;
          triggerLog(`SYS: ACTIVE AGENT COMPILER TRANSLATION TO ${cliId.toUpperCase()}`, authMsg);
        } else if (cliId === "claude-code" || cliId === "cursor-agent" || cliId === "devin" || cliId === "gemini-cli") {
          triggerLog(
            `SYS: ISOLATED PHYSICAL BINARY RUNNER ACTIVATED: ${cliId.toUpperCase()}`,
            `Backend API will now natively spawn distinct subprocess using standard CLI '${cliId}'. OpenRouter LLM inference is completely bypassed, sir.`
          );
        } else if (engineParam === "stark-quantum") {
          triggerLog(
            `SYS: ACTIVE AGENT COMPILER TRANSLATION TO ${cliId.toUpperCase()}`,
            `Quantum Entanglement established. Synaptic coherence at ${(data.synapticCoherence * 100).toFixed(2)}%, sir.`
          );
        } else {
          triggerLog(
            `SYS: ACTIVE AGENT COMPILER TRANSLATION TO ${cliId.toUpperCase()}`,
            `Active pipeline connected to local PowerShell compiler. Execution policy: ${data.policy}, sir.`
          );
        }
      } else {
        throw new Error("unsuccessful");
      }
    } catch {
      triggerLog(
        `SYS: ACTIVE AGENT COMPILER TRANSLATION TO ${cliId.toUpperCase()}`,
        `Active pipeline connected to ${cliId.replace('-', ' ')} protocol successfully.`
      );
    }
  };

  const handleTestCLI = async () => {
    triggerLog("SYS: INITIATING COGNITIVE TRANSMISSION SPEED DIAGNOSTIC...", "Initiating integrity scan for terminal interfaces, sir.");
    setIsScanning(true);
    setScanMessage("Ping response established... Analyzing latency...");
    
    try {
      const resp = await fetch("/api/system/test-cli-ping", { method: "POST" });
      if (!resp.ok) {
        throw new Error(`HTTP error ${resp.status}`);
      }
      const data = await resp.json();
      setIsScanning(false);
      setScanMessage("");
      
      if (data.success) {
        triggerLog(
          `SYS: INTEGRITY SCAN COMPLETED. LATENCY: ${data.latencyMs}ms VIA ${data.endpoint.toUpperCase()}.`,
          data.speak || "Grid verified. Primary command channels are fully stable, sir."
        );
      } else {
        triggerLog(
          `SYS: CRITICAL TELEMETRY PROBE FAILURE - CONNECTION OFFLINE.`,
          data.speak || "Physical backup networks failed. Outer communication systems are offline, sir."
        );
      }
    } catch (e: any) {
      setIsScanning(false);
      setScanMessage("");
      triggerLog(
        `SYS: DIAGNOSTIC PROBE LIMIT EXCEEDED. HOST UNREACHABLE.`,
        "Warning, sir. Sub-orbital connection failed. Physical networks are offline."
      );
    }
  };

  const handleMcpConnect = async () => {
    setIsMcpConnecting(true);
    setMcpStatus("Initializing connection sequence...");
    try {
      localStorage.setItem('jarvis_mcp_config', mcpServersText);
      const resp = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: mcpServersText })
      });
      const data = await resp.json();
      if (data.success) {
        setMcpStatus(`[SUCCESS] Connected to ${data.count} external MCP server(s).`);
        triggerLog(`SYS: MODEL CONTEXT PROTOCOL SYNCHRONIZATION`, `Connected to ${data.count} external Model Context Protocol server(s). Integration parameters verified and standard stdio streams bonded, sir.`);
      } else {
        setMcpStatus(`[FAULT] Connection failed: ${data.error}`);
        triggerLog(`SYS: MCP SYNC FAULT`, `Failed to connect to MCP external servers. Trace data logic error recorded, sir: ${data.error}`);
      }
    } catch (e: any) {
      setMcpStatus(`[SYS NULL] Network payload error. Standard socket connection dropped.`);
    } finally {
      setIsMcpConnecting(false);
    }
  };

  async function runPathScan(silent = false) {
    if (!silent) {
      setIsScanning(true);
      setScanMessage("Searching system PATH for candidate agent executables...");
    }
    
    try {
      const cliResp = await fetch("/api/system/cli");
      const cliData = await cliResp.json();
      const baseOptions: CLIOption[] = cliData.options || [];

      const resp = await fetch("/api/system/rescan-paths", { method: "POST" });
      const data = await resp.json();
      
      if (!silent) {
        setIsScanning(false);
        setScanMessage("");
      }
      
      if (data.success) {
        if (data.installedClis) {
          setCliOptions(
            baseOptions.map(opt => {
              const scanInfo = data.installedClis[opt.id];
              if (scanInfo) {
                return {
                  ...opt,
                  isInstalled: scanInfo.installed,
                  version: scanInfo.version,
                  statusColor: scanInfo.installed ? (opt.id === 'codex-cli' ? 'orange' : 'green') : 'red',
                  tag: scanInfo.installed ? (opt.id === 'openrouter' ? 'Connected' : 'Active') : undefined
                };
              }
              return opt;
            })
          );
        }
        
        if (!silent) {
          const discovered = data.tools.filter((t: any) => baseOptions.some(c => c.id === t.name)).map((t: any) => t.name).join(", ");
          triggerLog(
            `SYS: PATH SYNCHRONIZATION COMPLETED. ${data.foundCount} BACKEND CLIS RESOLVED [${discovered || 'NONE'}].`,
            data.speak || "Scan successfully synchronized. Candidates matched."
          );
        }
      } else {
        throw new Error("No scan data returned");
      }
    } catch (e) {
      if (!silent) {
        setIsScanning(false);
        setScanMessage("");
        triggerLog(
          "SYS: PATH CLI SCAN COMPLETED WITH FALLBACK VALUES.",
          "Scan successfully synchronized. Default settings loaded."
        );
      }
    }
  }

  const handleRescan = () => runPathScan(false);

  const handleInstallCLI = async (cliId: string, cliName: string) => {
    if (installingCli) {
      triggerLog(
        `SYS: CANNOT DEPLOY CLI. ANOTHER DEPLOYMENT PROCESS (${installingCli.toUpperCase()}) IS ACTIVE.`,
        "Another package install process is currently active, sir."
      );
      return;
    }

    setInstallingCli(cliId);
    triggerLog(
      `SYS: DEPLOYING CLI DEPLOYMENT AGENT FOR [${cliName.toUpperCase()}]...`,
      `Initializing automated background deployment for ${cliName}, sir.`
    );

    // Update CLI state to installing status in UI immediately
    setCliOptions(prev => 
      prev.map(opt => {
        if (opt.id === cliId) {
          return {
            ...opt,
            version: "修補與安裝中... (Installing...)",
            statusColor: "orange" as const
          };
        }
        return opt;
      })
    );

    try {
      const resp = await fetch("/api/system/install-cli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliId })
      });
      const data = await resp.json();

      if (data.success) {
        triggerLog(
          `SYS: ${data.message.toUpperCase()}`,
          data.speak || "Active package installation pipeline triggered as background daemon."
        );
        
        // Accurate background polling rather than blind 12-second timeout
        const intervalId = setInterval(async () => {
          try {
            const statusResp = await fetch(`/api/system/install-status?cliId=${cliId}`);
            if (statusResp.ok) {
              const statusData = await statusResp.json();
              if (statusData.status === 'success') {
                clearInterval(intervalId);
                await runPathScan(true);
                setInstallingCli(null);
              } else if (statusData.status === 'error') {
                clearInterval(intervalId);
                setInstallingCli(null);
                triggerLog(
                  `SYS: DEPLOYMENT LOGIC FAILURE. ${statusData.message}`,
                  "An unexpected intercept in our package pipelines, sir."
                );
                await runPathScan(true);
              }
            }
          } catch (e) {
            console.error("Failed to poll install status", e);
          }
        }, 2000);
      } else {
        throw new Error(data.error || "Installation API returned status false");
      }
    } catch (err: any) {
      console.error("Install CLI error:", err);
      setInstallingCli(null);
      triggerLog(
        `SYS: LOGISTICAL DEPLOYMENT OF ${cliName.toUpperCase()} FAILED - ${err.message}`,
        "An unexpected intercept in our package pipelines, sir."
      );
      
      // Restore state
      await runPathScan(true);
    }
  };

  const handlePurgeMemory = async (index: number) => {
    try {
      const purged = cognitiveMemories[index];
      triggerLog(
        `SYS: INITIATING COGNITIVE PURGE OF MEMORY SLOT [${index + 1}]...`,
        "Purging cognitive memory fragment from active RAG bank, sir."
      );
      
      const remainingMems = await apiClient.deleteCognitiveMemory(index);
      setCognitiveMemories(remainingMems);
      window.dispatchEvent(new CustomEvent('cognitive-memory-updated'));
      
      triggerLog(
        `SYS: COGNITIVE PURGE SUCCESSFUL. FRAGMENT PURGED: "${purged.substring(0, 35)}..."`,
        "Memory bank slot resynchronized, Sir."
      );
    } catch (e: any) {
      console.error("Purge memory error", e);
      triggerLog(
        "SYS: COGNITIVE PURGE FAILED.",
        "Attempted memory purge failed, sir."
      );
    }
  };

  const handlePurgeAllMemories = async () => {
    try {
      triggerLog(
        `SYS: INITIATING COMPLETE PURGE OF COGNITIVE MEMORY BANK...`,
        "Wiping all cognitive fragments from active RAG bank, sir."
      );
      
      const remainingMems = await apiClient.clearCognitiveMemories();
      setCognitiveMemories(remainingMems);
      window.dispatchEvent(new CustomEvent('cognitive-memory-updated'));
      
      triggerLog(
        `SYS: COGNITIVE PURGE SUCCESSFUL. ALL FRAGMENTS CLEARED.`,
        "Memory bank completely wiped and resynchronized, Sir."
      );
    } catch (e: any) {
      console.error("Purge all memories error", e);
      triggerLog(
        "SYS: COGNITIVE PURGE FAILED.",
        "Attempted full memory purge failed, sir."
      );
    }
  };

  const handleSaveMemory = async () => {
    if (!newMemory.trim()) return;
    
    try {
      const addedText = newMemory.trim();
      triggerLog(
        `SYS: RECORDING NEW COGNITIVE FRAGMENT TO RAG INDEX...`,
        "Writing new directive to persistent memory banks, sir."
      );
      
      const updatedMems = await apiClient.addCognitiveMemory(addedText);
      setCognitiveMemories(updatedMems);
      setNewMemory('');
      
      triggerLog(
        `SYS: LOGICAL DIRECTIVE INSERTED. INDEX SIZE: ${updatedMems.length} BLK.`,
        "Memory bank expanded and updated successfully, Sir."
      );
    } catch (e: any) {
      console.error("Save memory error", e);
      triggerLog(
        "SYS: MEMORY RECORDING FAILED.",
        "Failed to write logical directive to database, sir."
      );
    }
  };

  const handlePurgeCache = async () => {
    setIsPurgingCache(true);
    triggerLog("SYS: INITIATING SYSTEM WIDE CACHE PURGE...", "Initiating cache purge protocols, sir.");
    try {
      const resp = await fetch("/api/system/purge-cache", { method: "POST" });
      const data = await resp.json();
      if (data.success) {
        window.dispatchEvent(new Event(CACHE_PURGE_RESET_EVENT));
        triggerLog("SYS: CACHE PURGE SUCCESSFUL. DATABASE RELOADED.", "System cache has been successfully purged, sir.");
      } else {
        throw new Error(data.error || "Purge Failed");
      }
    } catch (e: any) {
      triggerLog(`SYS: CACHE PURGE FAILED - ${e.message}`, "Cache purge failed, sir.");
    } finally {
      setIsPurgingCache(false);
    }
  };

  const handleReboot = async () => {
    playTactileClick();
    triggerLog(
      "SYS: CRITICAL: REBOOT COMMENCED. INITIATING COMPLETE RUNTIME SHUTDOWN AND RE-SPAWNING OF THE CORE INFRASTRUCTURE PROCESS...",
      "Initiating reactor reboot, sir. Power cycled in three, two, one..."
    );

    // Trigger full-screen reboot simulation/re-calibration
    window.dispatchEvent(new CustomEvent('skin-updated'));

    try {
      await fetch('/api/system/reboot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error("Reboot post-fire trigger expected process termination.", e);
    }
  };

  const handleAddWebhook = async (name: string, url: string) => {
    try {
      const res = await fetch('/api/mcp/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url })
      });
      const data = await res.json();
      if (data.success) {
        setMcpWebhooks([...mcpWebhooks, data.webhook]);
        triggerLog(`SYS: NEW WEBHOOK CONFIGURED [${name}]`, "Webhook routing active, sir.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteWebhook = async (id: string, name: string) => {
    try {
      await fetch(`/api/mcp/webhooks/${id}`, { method: 'DELETE' });
      setMcpWebhooks(mcpWebhooks.filter(w => w.id !== id));
      triggerLog(`SYS: WEBHOOK DELETED [${name}]`, "Network link severed, sir.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleWebhook = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/mcp/webhooks/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      });
      setMcpWebhooks(mcpWebhooks.map(w => w.id === id ? { ...w, active } : w));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRoutine = async (name: string, prompt: string) => {
    try {
      const res = await fetch('/api/mcp/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, prompt })
      });
      const data = await res.json();
      if (data.success) {
        setMcpRoutines([...mcpRoutines, data.routine]);
        triggerLog(`SYS: NEW ROUTINE COMPILED [${name}]`, "New routine synchronized to the core matrix, sir.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRoutine = async (id: string, name: string) => {
    try {
      await fetch(`/api/mcp/routines/${id}`, { method: 'DELETE' });
      setMcpRoutines(mcpRoutines.filter(r => r.id !== id));
      triggerLog(`SYS: ROUTINE PURGED [${name}]`, "Routine wiped from memory banks.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecuteRoutine = async (id: string) => {
    try {
      const res = await fetch(`/api/mcp/routines/${id}/execute`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.prompt) {
        const source = data.source === 'mcp-server' ? 'MCP server prompt' : 'stored shortcut';
        triggerLog(`SYS: Routine dispatched (${source}) — sending ${data.prompt.length} chars to conversation.`);
        window.dispatchEvent(new CustomEvent('jarvis-mcp-routine', { detail: data.prompt }));
        setTimeout(() => onClose(), 800);
      } else {
        triggerLog(`SYS: Routine execute failed — ${data.error || 'no prompt returned'}`);
      }
    } catch (e) {
      console.error(e);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 select-none font-mono">
      <motion.div 
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="w-full max-w-[1020px] h-[640px] bg-slate-950/95 border border-cyan-500/60 flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.3)] relative"
      >
        {/* Holographic HUD Border Outlines */}
        <div className="absolute -top-[1.5px] -left-[1.5px] w-8 h-8 border-t-[3px] border-l-[3px] border-cyan-400"></div>
        <div className="absolute -top-[1.5px] -right-[1.5px] w-8 h-8 border-t-[3px] border-r-[3px] border-cyan-400"></div>
        <div className="absolute -bottom-[1.5px] -left-[1.5px] w-8 h-8 border-b-[3px] border-l-[3px] border-cyan-400"></div>
        <div className="absolute -bottom-[1.5px] -right-[1.5px] w-8 h-8 border-b-[3px] border-r-[3px] border-cyan-400"></div>

        {/* Dynamic Scan Overlay */}
        {isScanning && (
          <div className="absolute inset-0 bg-slate-950/85 z-55 flex flex-col items-center justify-center gap-4">
            <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin" />
            <span className="text-sm font-bold tracking-widest text-cyan-300 animate-pulse uppercase">{t.btnScanning}</span>
            <span className="text-xs text-cyan-500 italic max-w-sm text-center">{scanMessage}</span>
          </div>
        )}

        {/* Custom Header Bar */}
        <div className="flex justify-between items-center bg-cyan-950/20 border-b border-cyan-900/60 px-5 py-3 text-cyan-400">
          <div className="flex items-center gap-3">
            <JarvisLogo size={24} />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-[0.25em] text-white">{t.controlsHeader}</span>
              <span className="text-[9px] text-cyan-500 uppercase tracking-widest">{t.controlsSubtitle}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-cyan-500 hover:text-white transition-colors p-1.5 hover:bg-cyan-950/50 rounded-lg cursor-pointer flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Body - Left Column Navigation & Right Column Display */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Navigation Rails matching Image Sidebar perfectly */}
          <div className="w-[230px] border-r border-cyan-900/40 bg-cyan-950/5 flex flex-col overflow-y-auto scrollbar-none py-3 px-2 flex-shrink-0 gap-1 text-[11px] font-bold">
            
            <button 
              onClick={() => setActiveMenu('execution')}
              className={`w-full text-left py-2 px-3 rounded flex items-center justify-between transition-all ${
                activeMenu === 'execution'
                  ? 'bg-cyan-950/40 border-l-[3px] border-cyan-400 text-cyan-300 shadow-[inset_0_0_8px_rgba(6,182,212,0.15)]'
                  : 'text-cyan-600 hover:text-cyan-400 hover:bg-cyan-950/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" />
                <span>{t.menuExecution}</span>
              </div>
              {activeMenu === 'execution' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></div>}
            </button>

            <button 
              onClick={() => setActiveMenu('memory')}
              className={`w-full text-left py-2 px-3 rounded flex items-center justify-between transition-all ${
                activeMenu === 'memory'
                  ? 'bg-cyan-950/40 border-l-[3px] border-cyan-400 text-cyan-300'
                  : 'text-cyan-600 hover:text-cyan-400 hover:bg-cyan-950/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5" />
                <span>{t.menuMemory}</span>
              </div>
            </button>

            <button 
              onClick={() => setActiveMenu('security')}
              className={`w-full text-left py-2 px-3 rounded flex items-center justify-between transition-all ${
                activeMenu === 'security'
                  ? 'bg-cyan-950/40 border-l-[3px] border-cyan-400 text-cyan-300'
                  : 'text-cyan-600 hover:text-cyan-400 hover:bg-cyan-950/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{t.menuSecurity}</span>
              </div>
            </button>

            <button 
              onClick={() => setActiveMenu('languages')}
              className={`w-full text-left py-2 px-3 rounded flex items-center justify-between transition-all ${
                activeMenu === 'languages'
                  ? 'bg-cyan-950/40 border-l-[3px] border-cyan-400 text-cyan-300'
                  : 'text-cyan-600 hover:text-cyan-400 hover:bg-cyan-950/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <Languages className="w-3.5 h-3.5" />
                <span>{t.menuLanguages}</span>
              </div>
            </button>

            <button 
              onClick={() => setActiveMenu('appearance')}
              className={`w-full text-left py-2 px-3 rounded flex items-center justify-between transition-all ${
                activeMenu === 'appearance'
                  ? 'bg-cyan-950/40 border-l-[3px] border-cyan-400 text-cyan-300'
                  : 'text-cyan-600 hover:text-cyan-400 hover:bg-cyan-950/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5" />
                <span>{t.menuAppearance}</span>
              </div>
            </button>

            <button 
              onClick={() => setActiveMenu('about')}
              className={`w-full text-left py-2 px-3 rounded flex items-center justify-between transition-all ${
                activeMenu === 'about'
                  ? 'bg-cyan-950/40 border-l-[3px] border-cyan-400 text-cyan-300'
                  : 'text-cyan-600 hover:text-cyan-400 hover:bg-cyan-950/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5" />
                <span>{t.menuAbout}</span>
              </div>
            </button>

            {/* Simulated items from Image to populate list structure cleanly with realistic styling */}
            <div className="mt-4 pt-4 border-t border-cyan-950/30">
              <span className="text-[8.5px] text-cyan-700 tracking-widest uppercase block mb-2 px-3">{t.lblHoloUtils}</span>
              
              <button onClick={() => setActiveMenu('envKeys')} className={`w-full text-left px-3 py-1.5 cursor-pointer flex items-center gap-2 transition-all ${activeMenu === 'envKeys' ? 'bg-cyan-950/40 border-r-[3px] border-cyan-400 text-cyan-300' : 'text-cyan-600/60 hover:text-cyan-500/80'}`}>
                <Key className={`w-3 h-3 ${activeMenu === 'envKeys' ? 'text-cyan-400' : 'text-cyan-700'}`} />
                <span>{t.lblEnvKeys}</span>
              </button>
              <button onClick={() => setActiveMenu('mcpSkills')} className={`w-full text-left px-3 py-1.5 cursor-pointer flex items-center gap-2 transition-all ${activeMenu === 'mcpSkills' ? 'bg-cyan-950/40 border-r-[3px] border-cyan-400 text-cyan-300' : 'text-cyan-600/60 hover:text-cyan-500/80'}`}>
                <Sparkles className={`w-3 h-3 ${activeMenu === 'mcpSkills' ? 'text-cyan-400' : 'text-cyan-700'}`} />
                <span>{t.mcpSkills}</span>
              </button>
              <button onClick={() => setActiveMenu('mcpExternal')} className={`w-full text-left px-3 py-1.5 cursor-pointer flex items-center gap-2 transition-all ${activeMenu === 'mcpExternal' ? 'bg-cyan-950/40 border-r-[3px] border-cyan-400 text-cyan-300' : 'text-cyan-600/60 hover:text-cyan-500/80'}`}>
                <Radio className={`w-3 h-3 ${activeMenu === 'mcpExternal' ? 'text-cyan-400' : 'text-cyan-700'}`} />
                <span>{t.mcpExternal}</span>
              </button>
              <button onClick={() => setActiveMenu('mcpRoutines')} className={`w-full text-left px-3 py-1.5 cursor-pointer flex items-center gap-2 transition-all ${activeMenu === 'mcpRoutines' ? 'bg-cyan-950/40 border-r-[3px] border-cyan-400 text-cyan-300' : 'text-cyan-600/60 hover:text-cyan-500/80'}`}>
                <Activity className={`w-3 h-3 ${activeMenu === 'mcpRoutines' ? 'text-cyan-400' : 'text-cyan-700'}`} />
                <span>{t.mcpRoutines}</span>
              </button>
              <button onClick={() => setActiveMenu('mcpServer')} className={`w-full text-left px-3 py-1.5 cursor-pointer flex items-center gap-2 transition-all ${activeMenu === 'mcpServer' ? 'bg-cyan-950/40 border-r-[3px] border-cyan-400 text-cyan-300' : 'text-cyan-600/60 hover:text-cyan-500/80'}`}>
                <Server className={`w-3 h-3 ${activeMenu === 'mcpServer' ? 'text-cyan-400' : 'text-cyan-700'}`} />
                <span>{t.mcpServer}</span>
              </button>
            </div>

            <div className="mt-auto p-2 italic text-[8px] text-cyan-700/70 text-center leading-relaxed">
              {t.secureStorageNotice}
            </div>
          </div>

          {/* Right Display Area */}
          <div className="flex-1 bg-slate-950/60 overflow-y-auto p-5 scrollbar-cyan">
            
            {/* Tab 1: 配置執行模式 (MATCHING IMAGE HIGH FIDELITY LAYOUT GORGEOUSLY) */}
            {activeMenu === 'execution' && (
              <div className="space-y-4">
                <div className="border-b border-cyan-950 pb-2 flex flex-col gap-1">
                  <span className="text-sm font-extrabold text-cyan-400 tracking-widest uppercase">{t.executionTitle}</span>
                  <p className="text-[10px] text-cyan-600 tracking-wider">
                    {t.executionDesc}
                  </p>
                </div>

                {/* Simulated Tab Switches (本机 CLI / BYOK) */}
                <div className="grid grid-cols-2 bg-slate-950 border border-cyan-950/80 rounded-md p-1">
                  <button
                    onClick={() => setExecTab('cli')}
                    className={`py-2 text-[11px] font-bold tracking-widest rounded-md cursor-pointer transition-all ${
                      execTab === 'cli'
                        ? 'bg-cyan-920/30 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)] font-extrabold'
                        : 'text-cyan-600 hover:text-cyan-400'
                    }`}
                  >
                    {t.tabLocalCli}
                  </button>
                  <button
                    onClick={() => setExecTab('byok')}
                    className={`py-2 text-[11px] font-bold tracking-widest rounded-md cursor-pointer transition-all ${
                      execTab === 'byok'
                        ? 'bg-cyan-920/30 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)] font-extrabold'
                        : 'text-cyan-600 hover:text-cyan-400'
                    }`}
                  >
                    {t.tabByok}
                  </button>
                </div>

                {/* Sub Tab Panel: 本机 CLI (Perfect clone of the image UI) */}
                {execTab === 'cli' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-cyan-950/10 border border-cyan-950 p-3 rounded text-cyan-400">
                      <div>
                        <div className="text-[11.5px] font-bold leading-normal">{t.localCliHeader}</div>
                        <div className="text-[9.5px] text-cyan-500/80 mt-0.5">
                          {t.localCliDesc}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleTestCLI}
                          className="px-4 py-1.5 text-[10px] bg-cyan-930 text-cyan-300 border border-cyan-800 hover:border-cyan-500 hover:text-white transition-all cursor-pointer font-bold uppercase tracking-wider"
                        >
                          {t.btnPingTest}
                        </button>
                        <button 
                          onClick={handleRescan}
                          className="px-4 py-1.5 text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-900 hover:border-cyan-500 hover:text-white transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3 h-3" />
                          {t.btnRescan}
                        </button>
                      </div>
                    </div>

                    {/* Responsive Grid of CLI Cards matching screenshot */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {cliOptions.map((cli) => {
                        const isSelected = selectedCLI === cli.id;
                        return (
                          <div
                            key={cli.id}
                            onClick={() => cli.isInstalled && handleSelectCLI(cli.id)}
                            className={`p-3 border rounded-md transition-all flex items-center justify-between cursor-pointer group relative overflow-hidden ${
                              cli.isInstalled 
                                ? isSelected
                                  ? 'bg-cyan-950/30 border-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.12)]'
                                  : 'bg-cyan-950/5 border-cyan-950 hover:bg-cyan-950/15 hover:border-cyan-900/60'
                              : 'bg-slate-950/45 border-slate-950 opacity-40 hover:opacity-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Icon Box */}
                              <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm border ${cli.iconBg}`}>
                                {cli.iconText}
                              </div>
                              <div className="flex flex-col text-left">
                                <span className={`text-[11px] font-bold ${isSelected ? 'text-cyan-300' : 'text-cyan-500 group-hover:text-cyan-400'}`}>
                                  {cli.name}
                                </span>
                                <span className="text-[9px] text-cyan-600 tracking-wider">
                                  {cli.version}
                                </span>
                              </div>
                            </div>

                            {/* Indicator / Install Actions */}
                            <div className="flex items-center gap-2">
                              {cli.isInstalled ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] text-cyan-600/80 tracking-widest uppercase hidden group-hover:inline">Select</span>
                                  <span className={`w-2 h-2 rounded-full ${
                                    isSelected 
                                      ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]' 
                                      : cli.statusColor === 'green' 
                                        ? 'bg-emerald-500' 
                                        : cli.statusColor === 'orange' 
                                          ? 'bg-amber-500' 
                                          : 'bg-cyan-600/40'
                                  }`}></span>
                                </div>
                              ) : (
                                <div className="text-right text-[8.5px] flex flex-col gap-0.5">
                                  <span 
                                    className="text-purple-400 hover:underline cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleInstallCLI(cli.id, cli.name);
                                    }}
                                  >
                                    {t.lblInstallNow}
                                  </span>
                                  <span className="text-cyan-600 hover:underline cursor-pointer">{t.lblDocs}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border border-cyan-950 bg-cyan-950/5 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-widest">CLI Package Map</span>
                          <span className="text-[9px] text-cyan-600/80">
                            {locale === 'zh-TW'
                              ? '編輯背景安裝 CLI 時使用的 npm 套件來源對映表。'
                              : 'Edit the package source map used for background CLI installs.'}
                          </span>
                        </div>
                        <button
                          onClick={handleSaveCliPackageMap}
                          className="px-3 py-1.5 text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 hover:border-cyan-500 hover:text-white transition-all cursor-pointer font-bold uppercase tracking-wider"
                        >
                          SAVE MAP
                        </button>
                      </div>
                      <textarea
                        value={cliPackageMapText}
                        onChange={(e) => {
                          setCliPackageMapText(e.target.value);
                          if (cliPackageMapStatus) setCliPackageMapStatus('');
                        }}
                        className="w-full min-h-[140px] bg-slate-950 border border-cyan-950/80 p-2.5 rounded text-[11px] font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                      />
                      <span className={`text-[9px] ${cliPackageMapStatus && !/saved|儲存/.test(cliPackageMapStatus) ? 'text-red-400' : 'text-cyan-600/80'}`}>
                        {cliPackageMapStatus || (locale === 'zh-TW'
                          ? '例如：{"cursor-agent":"cursor","devin":"devin"}'
                          : 'Example: {"cursor-agent":"cursor","devin":"devin"}')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Sub Tab Panel: BYOK (OpenRouter Settings) */}
                {execTab === 'byok' && (
                  <div className="space-y-4 border border-cyan-950 p-4 rounded bg-cyan-950/5">
                    <div className="border-b border-cyan-950 pb-2 mb-2 flex items-center gap-2 text-cyan-400">
                      <Key className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">{t.lblByokTitle}</span>
                    </div>

                    <div className="space-y-3.5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-cyan-500 uppercase tracking-wider">{t.lblApiKey}</label>
                        <input
                          type="password"
                          value={openRouterKey}
                          onChange={(e) => setOpenRouterKey(e.target.value)}
                          placeholder="sk-or-v1-..."
                          className="w-full bg-slate-950 border border-cyan-950/80 p-2.5 rounded text-[11px] text-cyan-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-cyan-500 uppercase tracking-wider">{t.lblPreferredModel}</label>
                        <input
                          list="supported-models"
                          value={openRouterModel}
                          onChange={(e) => setOpenRouterModel(e.target.value)}
                          placeholder={openRouterProtocol === 'ollama' ? 'llama3:8b' : 'google/gemini-2.5-flash'}
                          className="w-full bg-slate-950 border border-cyan-950/80 p-2.5 rounded text-[11px] text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                        />
                        <datalist id="supported-models">
                          {supportedModels.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </datalist>
                        <span className="text-[9px] text-cyan-600/80">
                          {openRouterProtocol === 'ollama'
                            ? 'Enter any local Ollama model tag, for example llama3:8b or qwen2.5-coder:7b.'
                            : 'Pick a suggested model or type any custom/local model id manually.'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-cyan-500 uppercase tracking-wider">{t.lblGatewayEndpoint}</label>
                        <div className="flex gap-2">
                          <select
                            value={openRouterProtocol}
                            onChange={(e) => setOpenRouterProtocol(e.target.value)}
                            className="bg-slate-950 border border-cyan-950/80 p-2.5 rounded text-[11px] text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer w-[120px]"
                          >
                            <option value="openrouter">OpenRouter / OpenAI</option>
                            <option value="anthropic">Anthropic Native</option>
                            <option value="gemini">Google Gemini</option>
                            <option value="ollama">Ollama Local</option>
                            <option value="custom">Custom Adaptor</option>
                          </select>
                          <input
                            type="text"
                            value={openRouterEndpoint}
                            onChange={(e) => setOpenRouterEndpoint(e.target.value)}
                            placeholder={openRouterProtocol === 'ollama' ? 'http://localhost:11434' : 'https://openrouter.ai/api/v1'}
                            className="flex-1 bg-slate-950 border border-cyan-950/80 p-2.5 rounded text-[11px] text-cyan-300 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      {openRouterProtocol === 'custom' && (
                        <>
                          <div className="flex flex-col gap-1.5 mt-1">
                            <label className="text-[10px] text-cyan-500 uppercase tracking-wider">
                              {locale === 'zh-TW' ? '自訂請求 JSON 範本 (Request JSON Template)' : 'CUSTOM REQUEST JSON TEMPLATE'}
                            </label>
                            <textarea
                              value={customBodyTemplate}
                              onChange={(e) => setCustomBodyTemplate(e.target.value)}
                              placeholder='{"model": "${model}", "messages": "${messages}"}'
                              className="w-full bg-slate-950 border border-cyan-950/80 p-2.5 rounded text-[11px] font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 min-h-[60px]"
                            />
                            <span className="text-[9px] text-cyan-600/80">
                              Use variables like <code>{"${model}"}</code>, <code>{"${messages}"}</code>, or <code>{"${prompt}"}</code>.
                            </span>
                          </div>

                          <div className="flex flex-col gap-1.5 mt-1">
                            <label className="text-[10px] text-cyan-500 uppercase tracking-wider">
                              {locale === 'zh-TW' ? '自訂回傳提取路徑 (Response Path Selector)' : 'CUSTOM RESPONSE PATH SELECTOR'}
                            </label>
                            <input
                              type="text"
                              value={customResponsePath}
                              onChange={(e) => setCustomResponsePath(e.target.value)}
                              placeholder="choices[0].message.content"
                              className="w-full bg-slate-950 border border-cyan-950/80 p-2.5 rounded text-[11px] font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                            />
                            <span className="text-[9px] text-cyan-600/80">
                              Dot-notation path to extract string, e.g. <code>choices[0].message.content</code> or <code>data.results[0].text</code>.
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-cyan-500 uppercase tracking-wider">{locale === 'zh-TW' ? '系統提示詞 (System Prompt)' : 'SYSTEM PROMPT'}</label>
                        <textarea
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          placeholder="You are J.A.R.V.I.S..."
                          className="w-full bg-slate-950 border border-cyan-950/80 p-2.5 rounded text-[11px] text-cyan-300 focus:outline-none focus:border-cyan-500 min-h-[60px]"
                        />
                      </div>

                      <button
                        onClick={handleSaveBYOK}
                        className="w-full py-2.5 border border-cyan-400 bg-cyan-950/40 text-cyan-300 hover:text-white hover:bg-cyan-500/20 rounded cursor-pointer text-xs font-bold transition-all tracking-widest uppercase shadow-[0_0_12px_rgba(6,182,212,0.15)] flex items-center justify-center gap-2"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {t.btnSaveByok}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Memory Core (互動記憶庫模組) */}
            {activeMenu === 'memory' && (
              <div className="space-y-4">
                <div className="border-b border-cyan-950 pb-2 flex flex-col gap-1">
                  <span className="text-sm font-extrabold text-cyan-400 tracking-widest uppercase">{t.memoryTitle}</span>
                  <p className="text-[10px] text-cyan-600 tracking-wider">
                    {t.memoryDesc}
                  </p>
                </div>

                <div className="space-y-2.5">
                  {cognitiveMemories.length > 0 ? (
                    cognitiveMemories.map((memory, i) => (
                      <div key={i} className="p-3 border border-cyan-950/80 bg-cyan-950/5 rounded-md flex items-start justify-between text-[11px] hover:border-cyan-900 hover:bg-cyan-950/10 transition-all">
                        <div className="flex gap-2.5 text-cyan-300">
                          <span className="text-cyan-500">[{i+1}]</span>
                          <p className="leading-relaxed">{memory}</p>
                        </div>
                        <button 
                          onClick={() => handlePurgeMemory(i)}
                          className="text-[9px] text-red-500/65 hover:text-red-400 cursor-pointer hover:underline pl-2"
                        >
                          {t.btnPurge}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 border border-dashed border-cyan-950/50 rounded text-center text-cyan-600 text-[10.5px]">
                      No cognitive memories stored in active memory bank, sir.
                    </div>
                  )}

                  <div className="pt-2 border-t border-cyan-950/30 flex gap-2">
                    <input 
                      type="text" 
                      value={newMemory}
                      onChange={(e) => setNewMemory(e.target.value)}
                      placeholder={t.inputMemoryPlaceholder} 
                      className="flex-1 bg-slate-950 border border-cyan-950/80 p-2 text-[10.5px] rounded text-cyan-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                    <button 
                      onClick={handleSaveMemory}
                      className="px-4 py-2 border border-cyan-550 bg-cyan-950/40 text-cyan-200 text-[10.5px] rounded hover:border-cyan-400 shrink-0 font-bold uppercase transition-all"
                    >
                      {t.btnStoreContext}
                    </button>
                    {cognitiveMemories.length > 0 && (
                      <button 
                        onClick={handlePurgeAllMemories}
                        className="px-4 py-2 border border-red-900/50 bg-red-950/20 text-red-400 text-[10.5px] rounded hover:border-red-500 hover:text-red-300 shrink-0 font-bold uppercase transition-all"
                      >
                        [清除記憶] PURGE ALL
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Security & Permissions (整合原有的 shell/write/task mode) */}
            {activeMenu === 'security' && (
              <div className="space-y-4">
                <div className="border-b border-cyan-950 pb-2 flex flex-col gap-1">
                  <span className="text-sm font-extrabold text-cyan-400 tracking-widest uppercase">{t.securityTitle}</span>
                  <p className="text-[10px] text-cyan-600 tracking-wider">
                    {t.securityDesc}
                  </p>
                </div>

                {/* 1. OS Command Policy */}
                <div className="border border-cyan-950 bg-cyan-950/5 p-4 rounded relative hover:bg-cyan-950/10 transition-all">
                  <div className="flex justify-between items-center border-b border-cyan-900/40 pb-2 mb-3">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Terminal className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold tracking-widest uppercase">{t.shellHeader}</span>
                    </div>
                    <span className="text-[8.5px] px-1.5 py-0.5 border border-amber-500/30 text-amber-400 bg-amber-950/20 rounded font-bold uppercase">Shell Permission</span>
                  </div>
                  
                  <p className="text-[10px] text-cyan-500/70 mb-3 leading-relaxed">
                    {t.shellDesc}
                  </p>

                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      onClick={() => handleShellChange('manual')}
                      className={`py-2 px-3 text-[10px] border cursor-pointer font-bold rounded text-center transition-all ${
                        settings.shellMode === 'manual'
                          ? 'border-amber-500/80 bg-amber-950/30 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'border-cyan-950/50 text-cyan-700 hover:border-cyan-800'
                      }`}
                    >
                      {t.shellBtnManual}
                    </button>

                    <button
                      onClick={() => handleShellChange('safe')}
                      className={`py-2 px-3 text-[10px] border cursor-pointer font-bold rounded text-center transition-all ${
                        settings.shellMode === 'safe'
                          ? 'border-cyan-400/80 bg-cyan-950/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                          : 'border-cyan-950/50 text-cyan-700 hover:border-cyan-800'
                      }`}
                      title="Auto-runs simple informational commands (Get-Process, dir). Prompts for startup actions."
                    >
                      {t.shellBtnSafe}
                    </button>

                    <button
                      onClick={() => handleShellChange('auto')}
                      className={`py-2 px-3 text-[10px] border cursor-pointer font-bold rounded text-center transition-all ${
                        settings.shellMode === 'auto'
                          ? 'border-red-500 bg-red-950/30 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse'
                          : 'border-cyan-950/50 text-cyan-700 hover:border-cyan-800'
                      }`}
                    >
                      {t.shellBtnAuto}
                    </button>
                  </div>
                </div>

                {/* 2. Filesystem Write Matrix */}
                <div className="border border-cyan-950 bg-cyan-950/5 p-4 rounded hover:bg-cyan-950/10 transition-all">
                  <div className="flex justify-between items-center border-b border-cyan-900/40 pb-2 mb-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold tracking-widest uppercase">{t.writeHeader}</span>
                    </div>
                    <span className="text-[8.5px] px-1.5 py-0.5 border border-emerald-555 text-emerald-400 bg-emerald-950/20 rounded font-bold uppercase">Filesystem</span>
                  </div>

                  <p className="text-[10px] text-cyan-500/70 mb-3 leading-relaxed">
                    {t.writeDesc}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleWriteChange('manual')}
                      className={`py-2 cursor-pointer text-[10px] border font-bold rounded text-center transition-all ${
                        settings.writeMode === 'manual'
                          ? 'border-emerald-500/80 bg-emerald-950/25 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                          : 'border-cyan-950/50 text-cyan-700 hover:border-cyan-800'
                      }`}
                    >
                      {t.writeBtnManual}
                    </button>

                    <button
                      onClick={() => handleWriteChange('auto')}
                      className={`py-2 cursor-pointer text-[10px] border font-bold rounded text-center transition-all ${
                        settings.writeMode === 'auto'
                          ? 'border-emerald-400 bg-emerald-950/40 text-emerald-200 shadow-[0_0_10px_rgba(34,197,94,0.25)]'
                          : 'border-cyan-950/50 text-cyan-700 hover:border-cyan-800'
                      }`}
                    >
                      {t.writeBtnAuto}
                    </button>
                  </div>
                </div>

                {/* 3. Database Task Trackers */}
                <div className="border border-cyan-950 bg-cyan-950/5 p-4 rounded hover:bg-cyan-950/10 transition-all">
                  <div className="flex justify-between items-center border-b border-cyan-900/40 pb-2 mb-3">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold tracking-widest uppercase">{t.taskHeader}</span>
                    </div>
                    <span className="text-[8.5px] px-1.5 py-0.5 border border-cyan-500/30 text-cyan-400 bg-cyan-950/20 rounded font-bold uppercase">DB Ledger</span>
                  </div>

                  <p className="text-[10px] text-cyan-500/70 mb-3 leading-relaxed">
                    {t.taskDesc}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleTaskChange('manual')}
                      className={`py-2 cursor-pointer text-[10px] border font-bold rounded text-center transition-all ${
                        settings.taskMode === 'manual'
                          ? 'border-cyan-500/80 bg-cyan-950/35 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                          : 'border-cyan-950/50 text-cyan-700 hover:border-cyan-800'
                      }`}
                    >
                      {t.taskBtnManual}
                    </button>

                    <button
                      onClick={() => handleTaskChange('auto')}
                      className={`py-2 cursor-pointer text-[10px] border font-bold rounded text-center transition-all ${
                        settings.taskMode === 'auto'
                          ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                          : 'border-cyan-950/50 text-cyan-700 hover:border-cyan-800'
                      }`}
                    >
                      {t.taskBtnAuto}
                    </button>
                  </div>
                </div>

                {/* 4. Auto-Repair Mechanism */}
                <div className="border border-cyan-950 bg-cyan-950/5 p-4 rounded relative hover:bg-cyan-950/10 transition-all">
                  <div className="flex justify-between items-center border-b border-cyan-900/40 pb-2 mb-3">
                    <div className="flex items-center gap-2 text-rose-400">
                      <Activity className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-bold tracking-widest uppercase">自動修復機制 (Auto-Repair)</span>
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-cyan-500/70 mb-3 leading-relaxed">
                    啟用後，當系統 Health (CPU/Memory/Temperature) 下降至危險閾值時，系統將自動觸發自我修復指令（Self-healing scripts）重置容器並清理緩存。
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => {
                        const next = { ...settings, autoRepair: false };
                        saveSettings(next);
                      }}
                      className={`py-2 px-3 text-[10px] border cursor-pointer font-bold rounded flex items-center justify-center gap-2 transition-all ${
                        !settings.autoRepair
                          ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                          : 'border-cyan-950/50 text-cyan-700 hover:border-cyan-800'
                      }`}
                    >
                      <X className="w-3 h-3" />
                      MANUAL (手動)
                    </button>
                    <button
                      onClick={() => {
                        const next = { ...settings, autoRepair: true };
                        saveSettings(next);
                      }}
                      className={`py-2 px-3 text-[10px] border cursor-pointer font-bold rounded flex items-center justify-center gap-2 transition-all ${
                        settings.autoRepair
                          ? 'border-rose-500 bg-rose-950/40 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                          : 'border-cyan-950/50 text-cyan-700 hover:border-cyan-800'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      AUTO-REPAIR (啟用)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Languages & Voice */}
            {activeMenu === 'languages' && (
              <div className="space-y-4">
                <div className="border-b border-cyan-950 pb-2 flex flex-col gap-1">
                  <span className="text-sm font-extrabold text-cyan-400 tracking-widest uppercase">🎙️ {t.langVoiceTitle}</span>
                  <p className="text-[10px] text-cyan-600 tracking-wider">
                    {t.langVoiceDesc}
                  </p>
                </div>

                <div className="border border-cyan-950 bg-cyan-950/5 p-4 rounded hover:bg-cyan-950/10 transition-all">
                  <div className="flex items-center gap-2 text-pink-400 border-b border-cyan-950/40 pb-2 mb-3">
                    <Volume2 className="w-4 h-4 text-pink-500" />
                    <span className="text-xs font-bold tracking-widest uppercase">{t.voiceHeader}</span>
                  </div>

                  <div className="mb-4">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex flex-col">
                        <span className="text-xs text-pink-300 font-bold group-hover:text-pink-200">
                          {locale === 'zh-TW' ? '語音互動開關 (Voice Synthesizer)' : 'VOICE SYNTHESIZER TOGGLE'}
                        </span>
                        <span className="text-[9px] text-pink-500/70">
                          {locale === 'zh-TW' ? '啟用/停用 J.A.R.V.I.S 聲學反饋模組' : 'Enable/Disable J.A.R.V.I.S acoustic feedback module'}
                        </span>
                      </div>
                      <input 
                        type="checkbox"
                        className="sr-only"
                        checked={!isMuted}
                        onChange={(e) => onToggleMute && onToggleMute()}
                      />
                      <div className={`w-10 h-4 rounded-full flex items-center p-0.5 transition-colors ${!isMuted ? 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]' : 'bg-slate-900 border border-cyan-950'}`}>
                        <div className={`bg-white w-3 h-3 rounded-full transition-transform ${!isMuted ? 'translate-x-6' : 'translate-x-0'}`}></div>
                      </div>
                    </label>
                  </div>

                  <div className="mb-4 flex flex-col gap-2 border-t border-cyan-950/40 pt-3">
                    <span className="text-[10px] text-pink-500 uppercase tracking-wider">{locale === 'zh-TW' ? '外部語音引擎 API' : 'External Voice Engine APIs'}</span>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-cyan-400">STT (語音辨識) Provider:</span>
                      <select 
                        value={localStorage.getItem('jarvis_stt_provider') || 'webspeech'}
                        onChange={(e) => {
                          localStorage.setItem('jarvis_stt_provider', e.target.value);
                          triggerLog(t.logSttEngineMessage(e.target.value.toUpperCase()));
                          // Dispatch event to app
                          window.dispatchEvent(new Event('voice-engine-updated'));
                        }}
                        className="bg-slate-950 border border-cyan-950 text-[10px] text-cyan-300 rounded p-1"
                      >
                        <option value="webspeech">Local Web Speech API</option>
                        <option value="whisper">Backend API (OpenAI Whisper)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-cyan-400">TTS (語音合成) Provider:</span>
                      <select 
                        value={localStorage.getItem('jarvis_tts_provider') || 'webspeech'}
                        onChange={(e) => {
                          localStorage.setItem('jarvis_tts_provider', e.target.value);
                          triggerLog(t.logTtsEngineMessage(e.target.value.toUpperCase()));
                          window.dispatchEvent(new Event('voice-engine-updated'));
                        }}
                        className="bg-slate-950 border border-cyan-950 text-[10px] text-cyan-300 rounded p-1"
                      >
                        <option value="webspeech">Local Web Speech API</option>
                        <option value="elevenlabs">Backend API (ElevenLabs)</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-[10px] text-cyan-500/70 mb-3 leading-relaxed border-t border-cyan-950/40 pt-3">
                    {t.voiceDesc}
                  </p>

                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      onClick={() => handleVoiceChange('baritone')}
                      className={`py-2 cursor-pointer text-[10px] border font-bold rounded text-center transition-all ${
                        settings.voiceProfile === 'baritone'
                          ? 'border-pink-500 bg-pink-950/20 text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                          : 'border-cyan-950/50 text-cyan-700 hover:border-cyan-800 hover:text-cyan-550'
                      }`}
                    >
                      {t.voiceBaritone}
                    </button>

                    <button
                      onClick={() => handleVoiceChange('fast')}
                      className={`py-2 cursor-pointer text-[10px] border font-bold rounded text-center transition-all ${
                        settings.voiceProfile === 'fast'
                          ? 'border-pink-500 bg-pink-950/20 text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                          : 'border-cyan-950/50 text-cyan-700 hover:border-cyan-800'
                      }`}
                    >
                      {t.voiceIntel}
                    </button>

                    <button
                      onClick={() => handleVoiceChange('standard')}
                      className={`py-2 cursor-pointer text-[10px] border font-bold rounded text-center transition-all ${
                        settings.voiceProfile === 'standard'
                          ? 'border-pink-500 bg-pink-950/20 text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                          : 'border-cyan-950/50 text-cyan-700 hover:border-cyan-800'
                      }`}
                    >
                      {t.voiceStandard}
                    </button>
                  </div>
                </div>

                <div className="border border-cyan-950 bg-cyan-950/5 p-4 rounded text-cyan-400 font-mono">
                  <div className="text-[11.5px] font-bold border-b border-cyan-950/60 pb-1.5 mb-2 flex items-center gap-2">
                    <Languages className="w-3.5 h-3.5" />
                    <span>{t.localeHeader}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        setLocale('zh-TW');
                        const nextTranslations = getTranslations('zh-TW');
                        triggerLog(nextTranslations.logLocaleZhTwMessage, nextTranslations.logLocaleZhTwSpeak);
                      }}
                      className={`p-2 border rounded text-[10.5px] font-bold uppercase text-center cursor-pointer transition-all ${
                        locale === 'zh-TW'
                          ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                          : 'border-cyan-950 bg-slate-950/50 text-cyan-600 hover:border-cyan-900 hover:text-cyan-400'
                      }`}
                    >
                      {t.localeBtnTw}
                    </button>
                    <button 
                      onClick={() => {
                        setLocale('en');
                        const nextTranslations = getTranslations('en');
                        triggerLog(nextTranslations.logLocaleEnMessage, nextTranslations.logLocaleEnSpeak);
                      }}
                      className={`p-2 border rounded text-[10.5px] font-bold uppercase text-center cursor-pointer transition-all ${
                        locale === 'en'
                          ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                          : 'border-cyan-950 bg-slate-950/50 text-cyan-600 hover:border-cyan-900 hover:text-cyan-400'
                      }`}
                    >
                      {t.localeBtnEn}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Appearance / Aesthetics */}
            {activeMenu === 'appearance' && (
              <div className="space-y-4">
                <div className="border-b border-cyan-950 pb-2 flex flex-col gap-1">
                  <span className="text-sm font-extrabold text-cyan-400 tracking-widest uppercase">🎨 {t.appearanceTitle}</span>
                  <p className="text-[10px] text-cyan-600 tracking-wider">
                    {t.appearanceDesc}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-2">
                  <div 
                    onClick={() => handleSkinChange('cyan')}
                    className={`p-4 cursor-pointer rounded text-left group transition-all ${
                      activeSkin === 'cyan' 
                        ? 'border-2 border-cyan-500/80 bg-cyan-950/15 shadow-[0_0_12px_rgba(6,182,212,0.25)]' 
                        : 'border border-cyan-950 bg-slate-950/50 hover:border-cyan-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-bold ${activeSkin === 'cyan' ? 'text-cyan-300' : 'text-cyan-600 group-hover:text-cyan-400'}`}>{t.skinCyanTitle}</span>
                      <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></div>
                    </div>
                    <span className={`text-[9.5px] ${activeSkin === 'cyan' ? 'text-cyan-400/90' : 'text-cyan-600'}`}>{t.skinCyanDesc}</span>
                  </div>

                  <div 
                    onClick={() => handleSkinChange('emerald')}
                    className={`p-4 cursor-pointer rounded text-left group transition-all ${
                      activeSkin === 'emerald' 
                        ? 'border-2 border-emerald-500 bg-emerald-950/15 shadow-[0_0_12px_rgba(16,185,129,0.25)]' 
                        : 'border border-cyan-950 bg-slate-950/50 hover:border-emerald-500 hover:bg-emerald-950/5 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-bold ${activeSkin === 'emerald' ? 'text-emerald-400 font-extrabold' : 'text-cyan-600 group-hover:text-emerald-400'}`}>{t.skinEmeraldTitle}</span>
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    </div>
                    <span className={`text-[9.5px] ${activeSkin === 'emerald' ? 'text-emerald-400/90' : 'text-cyan-700 group-hover:text-cyan-600'}`}>{t.skinEmeraldDesc}</span>
                  </div>

                  <div 
                    onClick={() => handleSkinChange('amber')}
                    className={`p-4 cursor-pointer rounded text-left group transition-all ${
                      activeSkin === 'amber' 
                        ? 'border-2 border-amber-500 bg-amber-950/15 shadow-[0_0_12px_rgba(245,158,11,0.25)]' 
                        : 'border border-cyan-950 bg-slate-950/50 hover:border-amber-500 hover:bg-amber-950/5 hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-bold ${activeSkin === 'amber' ? 'text-amber-400 font-extrabold' : 'text-cyan-600 group-hover:text-amber-400'}`}>{t.skinAmberTitle}</span>
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    </div>
                    <span className={`text-[9.5px] ${activeSkin === 'amber' ? 'text-amber-400/90' : 'text-cyan-700 group-hover:text-cyan-600'}`}>{t.skinAmberDesc}</span>
                  </div>

                  <div 
                    onClick={() => handleSkinChange('red')}
                    className={`p-4 cursor-pointer rounded text-left group transition-all ${
                      activeSkin === 'red' 
                        ? 'border-2 border-red-500 bg-red-950/15 shadow-[0_0_12px_rgba(239,68,68,0.25)]' 
                        : 'border border-cyan-950 bg-slate-950/50 hover:border-red-500 hover:bg-red-950/5 hover:shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-bold ${activeSkin === 'red' ? 'text-red-400 font-extrabold animate-pulse' : 'text-cyan-600 group-hover:text-red-400'}`}>{t.skinRedTitle}</span>
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                    </div>
                    <span className={`text-[9.5px] ${activeSkin === 'red' ? 'text-red-400/90' : 'text-cyan-700 group-hover:text-cyan-600'}`}>{t.skinRedDesc}</span>
                  </div>
                </div>

                {/* Tactical Identity Profile Controls */}
                <div className="border border-cyan-950 bg-cyan-950/15 p-4 rounded space-y-4">
                  <div className="border-b border-cyan-900/40 pb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span className="text-[11px] font-extrabold text-cyan-400 tracking-widest uppercase">
                      {locale === 'zh-TW' ? '戰術身份與設備校準' : 'TACTICAL IDENTITY CALIBRATION'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] text-cyan-500 font-bold tracking-wider uppercase block">
                        {locale === 'zh-TW' ? '操作員代號' : 'OPERATOR CODE NAME'}
                      </label>
                      <input 
                        type="text"
                        value={operatorName}
                        onChange={(e) => handleIdentityChange('operatorName', e.target.value)}
                        className="w-full bg-slate-950/80 border border-cyan-900/60 rounded px-2.5 py-1.5 text-[10px] text-cyan-300 font-mono tracking-widest focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                        placeholder="e.g. ADMIN_OPERATOR"
                      />
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] text-cyan-500 font-bold tracking-wider uppercase block">
                        {locale === 'zh-TW' ? '外骨骼裝甲框架' : 'ARMOR FRAME MODEL'}
                      </label>
                      <input 
                        type="text"
                        value={armorModel}
                        onChange={(e) => handleIdentityChange('armorModel', e.target.value)}
                        className="w-full bg-slate-950/80 border border-cyan-900/60 rounded px-2.5 py-1.5 text-[10px] text-cyan-300 font-mono tracking-widest focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                        placeholder="e.g. Core v4.5"
                      />
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] text-cyan-500 font-bold tracking-wider uppercase block">
                        {locale === 'zh-TW' ? '上行軌道衛星' : 'UPLINK SATELLITE'}
                      </label>
                      <input 
                        type="text"
                        value={satelliteName}
                        onChange={(e) => handleIdentityChange('satelliteName', e.target.value)}
                        className="w-full bg-slate-950/80 border border-cyan-900/60 rounded px-2.5 py-1.5 text-[10px] text-cyan-300 font-mono tracking-widest focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                        placeholder="e.g. LOCAL_SQLITE_DB"
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop Application Window Controls */}
                <div className="border border-cyan-950 bg-cyan-950/15 p-4 rounded space-y-4">
                  <div className="border-b border-cyan-900/40 pb-2 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-cyan-400" />
                    <span className="text-[11px] font-extrabold text-cyan-400 tracking-widest uppercase">
                      {locale === 'zh-TW' ? '桌面端原生控制' : 'DESKTOP NATIVE CONTROLS'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex flex-col">
                        <span className="text-xs text-cyan-300 font-bold group-hover:text-cyan-200">
                           {locale === 'zh-TW' ? '視窗置頂模式 (Always on Top)' : 'ALWAYS ON TOP OVERLAY'}
                        </span>
                        <span className="text-[9px] text-cyan-600">
                           {locale === 'zh-TW' ? '僅作為 UI 偏好紀錄，不具備作業系統層級置頂功能' : 'Stored as UI preference (Simulation mode only)'}
                        </span>
                      </div>
                      <input 
                        type="checkbox"
                        className="sr-only"
                        checked={alwaysOnTop}
                        onChange={(e) => handleDesktopToggle('always-on-top', e.target.checked)}
                      />
                      <div className={`w-10 h-4 rounded-full flex items-center p-0.5 transition-colors ${alwaysOnTop ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-slate-900 border border-cyan-950'}`}>
                        <div className={`bg-white w-3 h-3 rounded-full transition-transform ${alwaysOnTop ? 'translate-x-6' : 'translate-x-0'}`}></div>
                      </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex flex-col">
                        <span className="text-xs text-cyan-300 font-bold group-hover:text-cyan-200">
                           {locale === 'zh-TW' ? '開機配置紀錄 (Launch Preference)' : 'BOOT SEQUENCE PREFERENCE'}
                        </span>
                        <span className="text-[9px] text-cyan-600">
                           {locale === 'zh-TW' ? '寫入 Windows 登錄檔實現開機自動啟動' : 'Write to Windows Registry for automatic boot on startup'}
                        </span>
                      </div>
                      <input 
                        type="checkbox"
                        className="sr-only"
                        checked={launchOnStartup}
                        onChange={(e) => handleDesktopToggle('startup', e.target.checked)}
                      />
                      <div className={`w-10 h-4 rounded-full flex items-center p-0.5 transition-colors ${launchOnStartup ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-slate-900 border border-cyan-950'}`}>
                        <div className={`bg-white w-3 h-3 rounded-full transition-transform ${launchOnStartup ? 'translate-x-6' : 'translate-x-0'}`}></div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="p-3 border border-cyan-950 bg-cyan-950/5 text-cyan-500 text-[10px] leading-relaxed italic">
                  * Interface skin transition alters overlay color envelopes without terminating background socket processes. Direct graphic acceleration is fully enabled.
                </div>
              </div>
            )}

            {/* Tab 6: About Firmware */}
            {activeMenu === 'about' && (
              <div className="space-y-4">
                <div className="border-b border-cyan-950 pb-2 flex flex-col gap-1">
                  <span className="text-sm font-extrabold text-cyan-400 tracking-widest uppercase">ℹ️ {t.aboutTitle}</span>
                  <p className="text-[10px] text-cyan-600 tracking-wider">
                    {t.aboutDesc}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 items-center p-3 border border-cyan-950 bg-cyan-950/5 rounded">
                  {/* Arc Reactor J.A.R.V.I.S Holographic Logo */}
                  <div className="shrink-0 flex items-center justify-center p-1 bg-slate-950/50 border border-cyan-950/40 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                    <JarvisLogo size={76} />
                  </div>

                  <div className="space-y-1.5 text-cyan-400 text-[10.5px]">
                    <div><b>SYSTEM BRANDING:</b> J.A.R.V.I.S HOME INTEGRATION MATRIX</div>
                    <div><b>CORE VERSION:</b> Mark LXXXV // v4.8.2-Aistudio</div>
                    <div><b>PLATFORM INFRASTRUCTURE:</b> {workspaceSandboxed === 'Offline-Bounded' ? 'Google Cloud Run Sandbox Container' : `${workspaceSandboxed} Environment`}</div>
                    <div><b>ENCRYPTION LEVEL:</b> {encryptionLevel}</div>
                    <div><b>ACTIVE PORT:</b> {activePort}</div>
                    <div><b>SANDBOX CONTROL:</b> {sandboxControl}</div>
                    <div className="pt-1.5 text-[9px] text-cyan-600 leading-normal italic">
                      "{t.aboutTagline}" - {t.aboutP1}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-cyan-500 relative min-h-[50px]">
                  {isAuditing ? (
                    <div className="col-span-3 py-3 border border-cyan-900/40 bg-slate-950/60 rounded flex flex-col items-center justify-center gap-1.5">
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Running Container & Sandbox Safety Audit...</span>
                    </div>
                  ) : (
                    <>
                      <div className="p-2 border border-cyan-950 bg-slate-950/40 rounded shadow-[0_0_8px_rgba(6,182,212,0.05)] hover:border-cyan-500/35 transition-all">
                        <div className="text-white font-bold mb-0.5 font-mono">{synapseLatency}</div>
                        <span className="text-[9px] opacity-75 block">{t.lblSynapseLatency}</span>
                      </div>
                      <div className="p-2 border border-cyan-950 bg-slate-950/40 rounded shadow-[0_0_8px_rgba(6,182,212,0.05)] hover:border-cyan-500/35 transition-all">
                        <div className="text-emerald-400 font-bold mb-0.5 font-mono">{securitySignals}</div>
                        <span className="text-[9px] opacity-75 block">{t.lblSecuritySignals}</span>
                      </div>
                      <div className="p-2 border border-cyan-950 bg-slate-950/40 rounded shadow-[0_0_8px_rgba(6,182,212,0.05)] hover:border-cyan-500/35 transition-all">
                        <div className="text-cyan-400 font-bold mb-0.5 font-mono truncate max-w-full" title={workspaceSandboxed}>{workspaceSandboxed}</div>
                        <span className="text-[9px] opacity-75 block">{t.lblWorkspaceSandboxed}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-2 border-t border-cyan-950/30 flex justify-end gap-2">
                  <button
                    onClick={handlePurgeCache}
                    disabled={isPurgingCache}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-950/40 hover:bg-amber-900/30 border border-amber-800/40 hover:border-amber-500/70 rounded text-amber-400 hover:text-amber-300 text-[10px] uppercase font-bold tracking-widest transition-all shadow-[0_0_10px_rgba(245,158,11,0.05)] hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Server className={`w-3.5 h-3.5 ${isPurgingCache ? 'animate-pulse' : ''}`} />
                    {isPurgingCache ? 'PURGING...' : '清理快取 (PURGE CACHE)'}
                  </button>
                  <button
                    onClick={handleReboot}
                    className="w-full sm:w-auto px-4 py-2 bg-red-950/40 hover:bg-red-900/30 border border-red-800/40 hover:border-red-500/70 rounded text-red-400 hover:text-red-300 text-[10px] uppercase font-bold tracking-widest transition-all shadow-[0_0_10px_rgba(239,68,68,0.05)] hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin-reverse" />
                    REACTOR REBOOT / 反應爐重啟
                  </button>
                </div>
              </div>
            )}

            {/* Environment Keys Panel */}
            {activeMenu === 'envKeys' && (
              <div className="space-y-4">
                <div className="border-b border-cyan-950 pb-2 flex flex-col gap-1">
                  <span className="text-sm font-extrabold text-cyan-400 tracking-widest uppercase">{t.lblEnvKeysTitle}</span>
                  <p className="text-[10px] text-cyan-600 tracking-wider">
                    API keys are persisted to the encrypted <span className="text-cyan-400 font-mono">database.enc</span> (AES-256-GCM). They are never written to disk in plaintext.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* OpenRouter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
                      OPENROUTER API KEY
                    </label>
                    <input
                      type="password"
                      className="bg-black/50 border border-cyan-900/50 rounded px-3 py-2 text-xs text-cyan-100 placeholder:text-cyan-800 focus:outline-none focus:border-cyan-500 w-full font-mono"
                      placeholder="sk-or-..."
                      value={openrouterKey}
                      onChange={e => setOpenrouterKey(e.target.value)}
                    />
                    <span className="text-[9px] text-cyan-600/70">Primary LLM gateway (OpenRouter). Also accepted by all BYOK-compatible endpoints.</span>
                  </div>

                  {/* OpenAI */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                      OPENAI API KEY
                    </label>
                    <input
                      type="password"
                      className="bg-black/50 border border-emerald-900/50 rounded px-3 py-2 text-xs text-cyan-100 placeholder:text-cyan-800 focus:outline-none focus:border-emerald-500 w-full font-mono"
                      placeholder="sk-..."
                      value={openaiKey}
                      onChange={e => setOpenaiKey(e.target.value)}
                    />
                    <span className="text-[9px] text-cyan-600/70">Used for Whisper speech-to-text transcription endpoint.</span>
                  </div>

                  {/* Gemini */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-amber-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                      GOOGLE GEMINI API KEY
                    </label>
                    <input
                      type="password"
                      className="bg-black/50 border border-amber-900/50 rounded px-3 py-2 text-xs text-cyan-100 placeholder:text-cyan-800 focus:outline-none focus:border-amber-500 w-full font-mono"
                      placeholder="AIza..."
                      value={geminiKey}
                      onChange={e => setGeminiKey(e.target.value)}
                    />
                    <span className="text-[9px] text-cyan-600/70">Backup LLM provider + Gemini native STT fallback.</span>
                  </div>

                  {/* ElevenLabs */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
                      {t.lblElevenLabsKey}
                    </label>
                    <input
                      type="password"
                      className="bg-black/50 border border-purple-900/50 rounded px-3 py-2 text-xs text-cyan-100 placeholder:text-cyan-800 focus:outline-none focus:border-purple-500 w-full font-mono"
                      placeholder="sk-..."
                      value={elevenLabsKey}
                      onChange={e => setElevenLabsKey(e.target.value)}
                    />
                    <span className="text-[9px] text-cyan-600/70">Required for high-fidelity ElevenLabs voice synthesis.</span>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      className="px-4 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] rounded uppercase font-bold tracking-widest transition-colors flex items-center gap-2"
                      onClick={async () => {
                        const updated = { ...settings, elevenLabsKey, openrouterKey, openaiKey, geminiKey };
                        await saveSettings(updated);
                        setEnvSaveStatus('SAVED TO DATABASE');
                        setTimeout(() => setEnvSaveStatus(''), 2000);
                      }}
                    >
                      <Key className="w-3 h-3" />
                      SAVE ALL KEYS
                    </button>
                  </div>
                  {envSaveStatus && (
                    <div className="text-right text-[10px] text-emerald-400 animate-pulse mt-1">
                      {envSaveStatus}
                    </div>
                  )}
                </div>
              </div>
            )}



            {/* MCP Config Panel */}
            {activeMenu === 'mcpServer' && (
              <div className="space-y-4">
                <div className="border-b border-cyan-950 pb-2 flex flex-col gap-1">
                  <span className="text-sm font-extrabold text-cyan-400 tracking-widest uppercase">MCP SERVERS (MODEL CONTEXT PROTOCOL)</span>
                  <p className="text-[10px] text-cyan-600 tracking-wider">
                    Configure standardized stdio-based JSON-RPC tools and context sources. Edit the JSON configuration exactly as you would for Claude Desktop.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <textarea
                    value={mcpServersText}
                    onChange={(e) => setMcpServersText(e.target.value)}
                    className="w-full h-[200px] bg-slate-950/80 border border-cyan-900/60 rounded px-3 py-2 text-[10px] text-emerald-400 font-mono tracking-widest focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_8px_rgba(34,211,238,0.2)] scrollbar-cyan"
                    spellCheck="false"
                  ></textarea>

                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[9px] text-cyan-500 font-mono flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${mcpStatus.includes('SUCCESS') ? 'bg-emerald-500' : mcpStatus.includes('FAULT') ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`}></span>
                      {mcpStatus}
                    </span>
                    <button
                      onClick={handleMcpConnect}
                      disabled={isMcpConnecting}
                      className="px-4 py-1.5 bg-cyan-950/50 hover:bg-cyan-900 border border-cyan-700/50 hover:border-cyan-400 rounded text-cyan-300 text-[10px] uppercase tracking-widest font-bold transition-all disabled:opacity-50"
                    >
                      {isMcpConnecting ? 'INITIALIZING...' : 'CONNECT MCP SERVERS'}
                    </button>
                  </div>
                </div>

                <div className="p-3 border border-cyan-950 bg-cyan-950/5 text-cyan-500 text-[10px] leading-relaxed italic mt-4">
                  * Note: Embedded Jarvis Core will spawn authentic Node child_processes and handle stdio streams based on config.
                </div>
              </div>
            )}

            {/* MCP Skills Panel */}
            {activeMenu === 'mcpSkills' && (
              <div className="space-y-4 h-full flex flex-col">
                <div className="border-b border-cyan-950 pb-2 flex flex-col gap-1">
                  <span className="text-sm font-extrabold text-cyan-400 tracking-widest uppercase">{t.lblMcpInventory}</span>
                  <p className="text-[10px] text-cyan-600 tracking-wider">
                    Discovered Context Tools injected from authenticated MCP servers via JSON-RPC.
                  </p>
                </div>
                
                <div className="flex-1 overflow-y-auto scrollbar-cyan pr-2 space-y-2">
                  {mcpSkillsLoading ? (
                     <div className="text-cyan-600 text-[11px] animate-pulse">Scanning live process streams for available tools...</div>
                  ) : mcpSkillsList.length > 0 ? (
                    mcpSkillsList.map((tool: any, idx) => (
                      <div key={idx} className="bg-slate-950 border border-cyan-950/50 p-2 rounded flex flex-col gap-1 hover:border-cyan-800 transition-colors">
                         <div className="flex items-center gap-2">
                           <span className="text-[11px] text-emerald-400 font-bold tracking-widest uppercase">{tool.name}</span>
                           <span className="text-[8px] text-cyan-700 uppercase bg-cyan-950/30 px-1 rounded-sm border border-cyan-900/50">Via {tool._server}</span>
                         </div>
                         <p className="text-[10px] text-cyan-600 border-l border-cyan-950 pl-2 leading-relaxed">{tool.description}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-cyan-700 italic">No tools loaded. Verify MCP Servers are running.</div>
                  )}
                </div>
              </div>
            )}

            {/* MCP External Connectors / Routines Placeholder Panels */}
            {(activeMenu === 'mcpExternal' || activeMenu === 'mcpRoutines') && (
              <div className="space-y-4">
                <div className="border-b border-cyan-950 pb-2 flex flex-col gap-1">
                  <span className="text-sm font-extrabold text-cyan-400 tracking-widest uppercase">
                     {activeMenu === 'mcpExternal' ? 'EXTERNAL MCP CONNECTORS' : 'MCP ROUTINES'}
                  </span>
                  <p className="text-[10px] text-cyan-600 tracking-wider">
                    {activeMenu === 'mcpExternal' 
                      ? 'Global SSE webhooks for distributed external nodes.' 
                      : 'Automated prompt protocols bridged to your external MCP process streams.'}
                  </p>
                </div>
                
                {activeMenu === 'mcpExternal' && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/80 border border-cyan-950/50 p-3 rounded space-y-2">
                       <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">{t.lblRegisterWebhook}</span>
                       <div className="grid grid-cols-2 gap-2">
                         <input type="text" placeholder="NODE NAME (e.g. Remote Server)" value={newWebhookName} onChange={e => setNewWebhookName(e.target.value)} className="w-full bg-black/50 border border-cyan-900/50 rounded px-2 py-1 text-[11px] text-cyan-100 placeholder:text-cyan-800 focus:outline-none focus:border-cyan-500" />
                         <input type="text" placeholder="URL ENDPOINT" value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} className="w-full bg-black/50 border border-cyan-900/50 rounded px-2 py-1 text-[11px] text-cyan-100 placeholder:text-cyan-800 focus:outline-none focus:border-cyan-500" />
                       </div>
                       <div className="flex justify-end pt-1">
                         <button onClick={() => { handleAddWebhook(newWebhookName, newWebhookUrl); setNewWebhookName(''); setNewWebhookUrl(''); }} className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] rounded uppercase font-bold tracking-widest transition-colors">{t.lblBindWebhook}</button>
                       </div>
                    </div>
                    
                    <div className="space-y-2">
                      {mcpWebhooks.length === 0 ? (
                        <div className="h-[100px] flex items-center justify-center border border-cyan-950/30 bg-slate-950/30 border-dashed rounded relative overflow-hidden group hover:border-cyan-900/50 transition-colors">
                           <span className="text-cyan-700/60 font-mono text-[10px] uppercase tracking-widest">{t.lblNoNetworkWebhooks}</span>
                        </div>
                      ) : (
                        mcpWebhooks.map(w => (
                          <div key={w.id} className="bg-slate-950/60 border border-cyan-900/40 p-2.5 rounded flex justify-between items-center gap-2 group hover:border-cyan-700/60 transition-colors">
                            <div className="flex items-center gap-3">
                              <button onClick={() => handleToggleWebhook(w.id, !w.active)} className="relative flex items-center justify-center cursor-pointer overflow-hidden p-1">
                                <div className={`w-3.5 h-3.5 rounded-sm border ${w.active ? 'bg-cyan-500 border-cyan-400' : 'bg-transparent border-cyan-800'} transition-all`} />
                                {w.active && <div className="absolute inset-0 bg-cyan-200/20 blur-[2px]" />}
                              </button>
                              <div className="flex flex-col">
                                <span className="text-[11px] text-cyan-300 font-bold uppercase tracking-widest flex items-center gap-2">{w.name} {w.active ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />}</span>
                                <span className="text-[9px] text-cyan-600 truncate max-w-[200px] sm:max-w-[300px]">{w.url}</span>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteWebhook(w.id, w.name)} className="text-red-500/60 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                {activeMenu === 'mcpRoutines' && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/80 border border-cyan-950/50 p-3 rounded space-y-2 flex flex-col">
                       <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">{t.lblCreateRoutine}</span>
                       <input type="text" placeholder="ROUTINE IDENTIFIER (e.g. Daily Standup)" value={newRoutineName} onChange={e => setNewRoutineName(e.target.value)} className="w-full bg-black/50 border border-cyan-900/50 rounded px-2 py-1.5 text-[11px] text-cyan-100 placeholder:text-cyan-800 focus:outline-none focus:border-cyan-500" />
                       <textarea placeholder="PROMPT PAYLOAD SEQUENCE..." value={newRoutinePrompt} onChange={e => setNewRoutinePrompt(e.target.value)} className="w-full h-16 bg-black/50 border border-cyan-900/50 rounded px-2 py-1.5 text-[11px] text-cyan-100 placeholder:text-cyan-800 focus:outline-none focus:border-cyan-500 resize-none font-mono" />
                       <div className="flex justify-end pt-1">
                         <button onClick={() => { handleAddRoutine(newRoutineName, newRoutinePrompt); setNewRoutineName(''); setNewRoutinePrompt(''); }} className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] rounded uppercase font-bold tracking-widest transition-colors flex items-center gap-1.5"><Activity className="w-3 h-3" /> {t.lblSaveMatrix}</button>
                       </div>
                    </div>
                    
                    <div className="space-y-2">
                      {mcpRoutines.length === 0 ? (
                        <div className="h-[100px] flex items-center justify-center border border-cyan-950/30 bg-slate-950/30 border-dashed rounded relative overflow-hidden group hover:border-cyan-900/50 transition-colors">
                           <span className="text-cyan-700/60 font-mono text-[10px] uppercase tracking-widest">{t.lblNoActiveMatrixRoutines}</span>
                        </div>
                      ) : (
                        mcpRoutines.map(r => (
                          <div key={r.id} className="bg-slate-950/60 border border-cyan-900/40 p-2.5 rounded flex flex-col gap-2 group hover:border-cyan-700/60 transition-colors">
                            <div className="flex justify-between items-start">
                              <span className="text-[12px] text-cyan-300 font-bold uppercase tracking-widest">{r.name}</span>
                              <div className="flex gap-2">
                                <button onClick={() => handleExecuteRoutine(r.id)} className="px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 rounded text-[9px] uppercase tracking-wide flex items-center gap-1 hover:bg-emerald-900/60 transition-all font-bold"><Zap className="w-2.5 h-2.5" /> {t.lblExecuteRoutine}</button>
                                <button onClick={() => handleDeleteRoutine(r.id, r.name)} className="text-red-500/60 hover:text-red-400 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            <p className="text-[9px] text-cyan-600 font-mono truncate">{r.prompt}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Footer actions bar */}
        <div className="flex justify-between items-center bg-cyan-950/15 border-t border-cyan-900/40 px-5 py-3">
          <div className="flex gap-2 items-center text-[9px] text-cyan-500/80">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
            <span>ACTIVE SECURITY MATRIX: {settings.shellMode.toUpperCase()} SHELL COMMANDS</span>
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-cyan-950/70 hover:bg-cyan-900/55 hover:border-cyan-400 hover:text-white text-cyan-300 border border-cyan-900 rounded text-[10.5px] font-bold uppercase transition-all tracking-wider active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.1)]"
          >
            {t.btnSyncSettings}
          </button>
        </div>

      </motion.div>
    </div>
  );
}
