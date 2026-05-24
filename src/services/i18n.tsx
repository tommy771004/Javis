import React, { createContext, useContext, useState, useEffect } from 'react';

export type Locale = 'zh-TW' | 'en';

export interface Translations {
  // General Brand & Status
  brandName: string;
  brandMotto: string;
  systemStatus: string;
  statusOptimal: string;
  localTime: string;
  alertNotifications: string;
  systemConfig: string;
  tStark: string;

  // Settings Modal Navigation & Header
  controlsHeader: string;
  controlsSubtitle: string;
  menuExecution: string;
  menuMemory: string;
  menuSecurity: string;
  menuLanguages: string;
  menuAppearance: string;
  menuAbout: string;
  mcpSkills: string;
  mcpExternal: string;
  mcpRoutines: string;
  mcpServer: string;
  secureStorageNotice: string;

  // Execution Tab
  executionTitle: string;
  executionDesc: string;
  tabLocalCli: string;
  tabByok: string;
  localCliHeader: string;
  localCliDesc: string;
  btnPingTest: string;
  btnRescan: string;
  btnScanning: string;
  lblActive: string;
  lblNotInstalled: string;
  lblInstallNow: string;
  lblDocs: string;
  lblByokTitle: string;
  lblApiKey: string;
  lblPreferredModel: string;
  lblGatewayEndpoint: string;
  btnSaveByok: string;

  // Memory Tab
  memoryTitle: string;
  memoryDesc: string;
  btnPurge: string;
  inputMemoryPlaceholder: string;
  btnStoreContext: string;

  // Security Tab
  securityTitle: string;
  securityDesc: string;
  shellHeader: string;
  shellDesc: string;
  shellBtnManual: string;
  shellBtnSafe: string;
  shellBtnAuto: string;
  writeHeader: string;
  writeDesc: string;
  writeBtnManual: string;
  writeBtnAuto: string;
  taskHeader: string;
  taskDesc: string;
  taskBtnManual: string;
  taskBtnAuto: string;

  // Languages & Voice Tab
  langVoiceTitle: string;
  langVoiceDesc: string;
  voiceHeader: string;
  voiceDesc: string;
  voiceBaritone: string;
  voiceIntel: string;
  voiceStandard: string;
  localeHeader: string;
  localeBtnTw: string;
  localeBtnEn: string;

  // Appearance Tab
  appearanceTitle: string;
  appearanceDesc: string;
  skinCyanTitle: string;
  skinCyanDesc: string;
  skinEmeraldTitle: string;
  skinEmeraldDesc: string;
  skinAmberTitle: string;
  skinAmberDesc: string;
  skinRedTitle: string;
  skinRedDesc: string;

  // About Tab
  aboutTitle: string;
  aboutDesc: string;
  aboutTagline: string;
  aboutP1: string;
  aboutP2: string;
  aboutP3: string;

  // SysMonitor keys
  systemVitalSigns: string;
  vitalSignsShort: string;
  lblHeartRate: string;
  lblBpm: string;
  lblBodyTemp: string;
  lblNeuralLink: string;
  lblActiveState: string;
  lblSystemAutomation: string;
  lblRtMonitor: string;
  lblCpuLoad: string;
  lblRamMemory: string;
  lblGpuCore: string;
  lblNetSpeed: string;
  lblSysTemp: string;
  lblSystemUplink: string;
  lblStarkSat4: string;
  lblSignalSecure: string;
  lblHermesCoreActive: string;
  lblActivateCognitive: string;
  hermesMatrixTitle: string;
  hermesProfile: string;
  hermesTabLoop: string;
  hermesTabFts: string;
  hermesTabTasks: string;
  hermesTabGateway: string;
  hermesTabVoip: string;
  hermesTabDocs: string;
  hermesTaskTrackerTitle: string;
  hermesPendingLabel: string;
  hermesRightClickTip: string;
  hermesSearchPlaceholder: string;
  hermesNoTasks: string;
  hermesNoResults: string;
  hermesEditDesc: string;
  hermesMoveHigh: string;
  hermesMoveMedium: string;
  hermesMoveLow: string;
  hermesDeleteTask: string;
  hermesEditDetails: string;
  hermesObjective: string;
  hermesCancel: string;
  hermesCommit: string;
  hermesConfirmObliteration: string;
  hermesWarningCancel: string;
  hermesAbort: string;
  hermesObliterate: string;
  lblSecurityCleared: string;
  lblAuthProtocol: string;
  
  // Footer keys
  lblMute: string;
  lblUnmute: string;
  lblFullscreen: string;
  lblClassified: string;
  lblCopyright: string;

  // ActivityLog keys
  lblArmorStatus: string;
  lblPowerCore: string;
  lblStructuralIntegrity: string;
  lblSystemInteraction: string;
  lblShield: string;
  lblCorePow: string;
  lblSatLink: string;
  lblCalibrate: string;
  lblRtLog: string;

  // FileUpload keys
  lblFileUpload: string;
  lblNoFileLoaded: string;
  lblUploadComplete: string;
  lblDropOrClick: string;

  // CommandInput keys
  lblCommandDirectory: string;
  placeholderVoiceActive: string;
  placeholderTextActive: string;
  lblVoiceActiveBtn: string;
  lblVoiceInactiveBtn: string;
  lblCinemediaExpanse: string;
  // Additional Settings
  lblHoloUtils: string;
  lblEnvKeys: string;
  lblEnvKeysTitle: string;
  lblToggleAudio: string;
  lblMuteSys: string;
  lblSynapseLatency: string;
  lblAuthIsolation: string;
  lblWorkspaceSandboxed: string;
  lblElevenLabsKey: string;
  lblMcpInventory: string;
  lblRegisterWebhook: string;
  lblBindWebhook: string;
  lblNoNetworkWebhooks: string;
  lblCreateRoutine: string;
  lblSaveMatrix: string;
  lblNoActiveMatrixRoutines: string;
  lblExecuteRoutine: string;
  btnSyncSettings: string;
}

const zhTWTranslations: Translations = {
  brandName: "HERMES Workspace",
  brandMotto: "整合型開發與認知任務控制台",
  systemStatus: "系統狀態",
  statusOptimal: "運行中",
  localTime: "當地時間",
  alertNotifications: "警告通知",
  systemConfig: "系統參數設定",
  tStark: "ADMIN OPERATOR",

  controlsHeader: "系統整合控制面板",
  controlsSubtitle: "開發與任務協同整合參數設定",
  menuExecution: "配置執行模式",
  menuMemory: "記憶庫 (Memory Bank)",
  menuSecurity: "系統安全與權限",
  menuLanguages: "介面語言 & 聲線",
  menuAppearance: "外觀樣式 (Skins)",
  menuAbout: "關於 HERMES 控制台",
  mcpSkills: "技能模組 (Skills)",
  mcpExternal: "外部 MCP 連接器",
  mcpRoutines: "快捷提示詞庫 (Prompt Macros)",
  mcpServer: "MCP 安全伺服器",
  secureStorageNotice: "* 安全金鑰與參數僅保存在當前瀏覽器的本機空間 (localStorage)。",

  executionTitle: "執行模式與模型設定",
  executionDesc: "在本機 CLI 與 BYOK (自攜金鑰) 之間切換。金鑰僅加密保存在當前瀏覽器。",
  tabLocalCli: "本機 CLI",
  tabByok: "BYOK (OpenRouter API)",
  localCliHeader: "本機 CLI 代理程式",
  localCliDesc: "偵測本機系統變數 PATH。請選擇您希望使用的終端機自動化 CLI 工具。",
  btnPingTest: "測試連線 (Ping)",
  btnRescan: "重新掃描 PATH",
  btnScanning: "HERMES 正在同步核心網絡...",
  lblActive: "運作中",
  lblNotInstalled: "未安裝",
  lblInstallNow: "即刻安裝",
  lblDocs: "文件",
  lblByokTitle: "OpenRouter API 憑證設定 (BYOK)",
  lblApiKey: "OpenRouter API 金鑰/憑證:",
  lblPreferredModel: "偏好語言模型字串 (OpenRouter 規格目錄):",
  lblGatewayEndpoint: "API 網關端點 (Endpoint):",
  btnSaveByok: "儲存金鑰並同步引擎核心",

  memoryTitle: "HERMES 核心記憶網絡 (Memory Banks)",
  memoryDesc: "本系統能在對話邊界中持續累積記憶與認知。可在下方檢索或配置活躍中的指令與宣告。",
  btnPurge: "清除記憶",
  inputMemoryPlaceholder: "手動輸入並追加特定的常駐行為指令或上下文...",
  btnStoreContext: "儲存指令上下文",

  securityTitle: "系統執行與自動化防護 (Security Matrix)",
  securityDesc: "設定自動化代理程式的命令執行層級、檔案寫入保護及後端任務追蹤門檻。",
  shellHeader: "作業系統命令執行規則 (Command Permission)",
  shellDesc: "控制當 NLP 對話分析產生的終端機命令（Shell 指令）是否能在您的系統背景執行。",
  shellBtnManual: "🔴 手動授權 (每筆確認)",
  shellBtnSafe: "🟡 唯讀自動 (安全執行)",
  shellBtnAuto: "⚡ 全自動執行 (完全授權)",
  writeHeader: "工作區檔案寫入限制 (Filesystem)",
  writeDesc: "定義當系統自動修改程式碼、建立或刪除專案檔案時的檔案系統保護等級。",
  writeBtnManual: "🔴 手動審查程式碼",
  writeBtnAuto: "💚 自動寫入工作區",
  taskHeader: "任務資料庫自動登錄規則 (DB Ledger)",
  taskDesc: "允許系統在分析對話拆解目標時，自動於本機 SQLite / DB 帳本中登錄重要任務清冊。",
  taskBtnManual: "🔴 手動加入任務",
  taskBtnAuto: "💙 自動編排登錄",

  langVoiceTitle: "語音特徵設定 (Speech Voice)",
  langVoiceDesc: "微調聲學特徵、語音合成速度，並切換適合 " +
    "的系統在地化語言設定。",
  voiceHeader: "語音風格設定 (Voice Style)",
  voiceDesc: "調整語音合成助理的音色與語速。",
  voiceBaritone: "低沉男聲 (Baritone)",
  voiceIntel: "緊湊快節奏 (Fast)",
  voiceStandard: "標準語音 (Standard)",
  localeHeader: "語系環境選擇 (System Language)",
  localeBtnTw: "繁體中文 (台灣繁中用語)",
  localeBtnEn: "English (United States GB)",

  appearanceTitle: "介面外觀主題 (Theme)",
  appearanceDesc: "調整控制台的介面主色調與視覺風格。",
  skinCyanTitle: "青色 (Cyan)",
  skinCyanDesc: "標準高對比介面主題。",
  skinEmeraldTitle: "翡翠綠 (Emerald)",
  skinEmeraldDesc: "適合夜間開發的低光環境面板。",
  skinAmberTitle: "琥珀色 (Amber)",
  skinAmberDesc: "暖色調高對比面板。",
  skinRedTitle: "紅色 (Crimson)",
  skinRedDesc: "高對比紅色色彩方案。",

  aboutTitle: "關於 智慧助理 HERMES Workspace Core",
  aboutDesc: "整合型研發人機互動介面 (Developer Hub Console) 的完整終端核心實作。",
  aboutTagline: "「先生，需要為您索引新的工作區檔案嗎？」",
  aboutP1: "HERMES (Heuristic Educational Real-time Memory Executive System) 整合型智慧控制核心，提供全自動任務追蹤、本機 OS 連接、BYOK 憑證同步及沙盒安全機制。",
  aboutP2: "本主網核心介面能感知多種指令行為。當配對 OpenRouter 或本機 CLI 行為後，可實現多學科任務編排與文件自動化生成。多種安全性開關為您的工作區保駕護航。",
  aboutP3: "系統版本 v4.5。為研發工作區、技術架構以及伺服器安全保駕護航。Online nominal.",

  // SysMonitor keys
  systemVitalSigns: "系統 // 資源監控",
  vitalSignsShort: "系統指標",
  lblHeartRate: "系統負載頻率",
  lblBpm: "Hz",
  lblBodyTemp: "系統溫度",
  lblNeuralLink: "資料庫連線",
  lblActiveState: "運作中",
  lblSystemAutomation: "系統 // 自動化排程監控",
  lblRtMonitor: "即時監控",
  lblCpuLoad: "核心運算 (CPU) 負載",
  lblRamMemory: "暫存記憶體 (RAM) 使用率",
  lblGpuCore: "圖形處理器 (GPU) 負載",
  lblNetSpeed: "網路傳輸頻寬",
  lblSysTemp: "硬體溫度",
  lblSystemUplink: "系統 // 資料庫連線狀態",
  lblStarkSat4: "SQLite 資料庫",
  lblSignalSecure: "FTS5 全文檢索",
  lblHermesCoreActive: "核心後端程式：運作中",
  lblActivateCognitive: "啟用自動化排程",
  hermesMatrixTitle: "工作區任務管理",
  hermesProfile: "設定檔: 預設系統",
  hermesTabLoop: "學習迴圈 (Learning Loop)",
  hermesTabFts: "記憶庫檢索 (SQLite FTS5)",
  hermesTabTasks: "任務清單 (Task List)",
  hermesTabGateway: "成本網關 (Cost Gateway)",
  hermesTabVoip: "語音橋接器 (VoIP Bridge)",
  hermesTabDocs: "技術規格書 (Tech Specs)",
  hermesTaskTrackerTitle: "可執行任務追蹤器",
  hermesPendingLabel: "待處理: {count}",
  hermesRightClickTip: "點擊滑鼠右鍵顯示捷徑選單",
  hermesSearchPlaceholder: "搜尋任務說明內容...",
  hermesNoTasks: "系統中目前尚無活動中的任務。",
  hermesNoResults: "無符合您關鍵字搜尋條件的任務專案。",
  hermesEditDesc: "編輯任務描述 (Edit Description)",
  hermesMoveHigh: "變更為高優先權 (Move High Priority)",
  hermesMoveMedium: "變更為中優先權 (Move Medium Priority)",
  hermesMoveLow: "變更為低優先權 (Move Low Priority)",
  hermesDeleteTask: "刪除任務 (Delete Task)",
  hermesEditDetails: "編輯任務詳細數據",
  hermesObjective: "任務目標/描述:",
  hermesCancel: "取消 (Cancel)",
  hermesCommit: "認證寫入 (Commit Changes)",
  hermesConfirmObliteration: "確認任務抹除指示",
  hermesWarningCancel: "警告 (WARNING): 您確定要將此任務從記憶存庫中永久抹除嗎？",
  hermesAbort: "放棄抹除 (Abort Deletion)",
  hermesObliterate: "確實抹除 (Obliterate Task)",
  lblSecurityCleared: "安全驗證：通過",
  lblAuthProtocol: "系統存取協定",
  
  // Footer keys
  lblMute: "[F4] 靜音",
  lblUnmute: "[F4] 取消靜音",
  lblFullscreen: "[F11] 全螢幕",
  lblClassified: "HERMES WORKSPACE // DEVELOPER MANAGEMENT SYSTEM",
  lblCopyright: "© HERMES WORKSPACE SYSTEM",

  // ActivityLog keys
  lblArmorStatus: "系統 // 硬體狀態",
  lblPowerCore: "處理器負載",
  lblStructuralIntegrity: "儲存空間狀態",
  lblSystemInteraction: "任務流量控制",
  lblShield: "安全防禦",
  lblCorePow: "系統效能",
  lblSatLink: "資料同步",
  lblCalibrate: "診斷日誌",
  lblRtLog: "系統 // 操作即時日誌",

  // FileUpload keys
  lblFileUpload: "工作區檔案上傳與即時索引",
  lblNoFileLoaded: "尚未載入任何文件 - 請拖放至此或點擊進行上傳",
  lblUploadComplete: "資料上傳成功",
  lblDropOrClick: "拖放檔案至此處，或點擊瀏覽進行上傳",

  // CommandInput keys
  lblCommandDirectory: "指令輸入與語意認知目錄",
  placeholderVoiceActive: "正在接收錄音輸入...",
  placeholderTextActive: "請輸入傳授予系統的指令、提問或程式編輯指示...",
  lblVoiceActiveBtn: "語音模擬錄入：開啟中",
  lblVoiceInactiveBtn: "語音錄入：靜態待命",
  lblCinemediaExpanse: "極致視野大螢幕 [F11]",

  lblHoloUtils: "系統工具",
  lblEnvKeys: "環境金鑰",
  lblEnvKeysTitle: "環境變數與金鑰配置",
  lblToggleAudio: "切換介面音效",
  lblMuteSys: "靜音系統音效",
  lblSynapseLatency: "突觸延遲",
  lblAuthIsolation: "授權隔離",
  lblWorkspaceSandboxed: "工作區沙盒部署",
  lblElevenLabsKey: "ElevenLabs TTS API 金鑰",
  lblMcpInventory: "MCP 技能清單",
  lblRegisterWebhook: "註冊 Webhook",
  lblBindWebhook: "綁定 Webhook",
  lblNoNetworkWebhooks: "目前無活躍的網路 Webhooks",
  lblCreateRoutine: "建立快捷指令",
  lblSaveMatrix: "儲存矩陣",
  lblNoActiveMatrixRoutines: "目前無活躍的快捷指令",
  lblExecuteRoutine: "發送指令 (Macro)",
  btnSyncSettings: "同步設定並關閉 (Terminal Synchronized)",
};

const enTranslations: Translations = {
  brandName: "HERMES Workspace",
  brandMotto: "Integrated Developer & Cognitive Task Console",
  systemStatus: "SYSTEM STATUS",
  statusOptimal: "ONLINE",
  localTime: "LOCAL TIME",
  alertNotifications: "Alert Notifications",
  systemConfig: "System Configuration",
  tStark: "ADMIN OPERATOR",

  controlsHeader: "SYSTEM INTEGRATION CONTROLS",
  controlsSubtitle: "System Parameters & API Credentials Pairing",
  menuExecution: "Configure Execution Mode",
  menuMemory: "Memory Bank",
  menuSecurity: "Security & Permissions",
  menuLanguages: "Languages & Voice Settings",
  menuAppearance: "Interface Skins (HUD)",
  menuAbout: "About HERMES Console",
  mcpSkills: "Skills Modules",
  mcpExternal: "External MCP Connectors",
  mcpRoutines: "Prompt Macros (Shortcut)",
  mcpServer: "MCP Secure Servers",
  secureStorageNotice: "* Secure API keys and preferences are bounded solely to your browser session storage (localStorage).",

  executionTitle: "Execution Model & Engine",
  executionDesc: "Toggle between Local CLI or BYOK. API credentials are stored locally in your browser's encrypted sandbox.",
  tabLocalCli: "Local CLI",
  tabByok: "BYOK (OpenRouter API)",
  localCliHeader: "Local CLI Agent",
  localCliDesc: "Detected automatically via PATH variables. Select your preferred terminal executor script/binary.",
  btnPingTest: "Test Connection (Ping)",
  btnRescan: "Rescan PATH",
  btnScanning: "HERMES is syncing active files...",
  lblActive: "Online Active",
  lblNotInstalled: "Not Installed",
  lblInstallNow: "Install Now",
  lblDocs: "Docs",
  lblByokTitle: "OpenRouter API Credentials (BYOK)",
  lblApiKey: "OpenRouter API Key:",
  lblPreferredModel: "Preferred Language Model String (OpenRouter Catalog):",
  lblGatewayEndpoint: "Gateway Endpoint URL:",
  btnSaveByok: "Save Credentials & Sync Engine Core",

  memoryTitle: "HERMES Memory Core Banks",
  memoryDesc: "Hermes accumulates cognitive state across conversational sessions. Review active guidelines or purge memory vectors below.",
  btnPurge: "PURGE MEMORY",
  inputMemoryPlaceholder: "Insert custom programmatic directive or context string manually...",
  btnStoreContext: "Store Context",

  securityTitle: "Automated System Protection (Security)",
  securityDesc: "Define execution permission envelopes, filesystem validation policies, and transactional database triggers.",
  shellHeader: "OS Command Execution Policy",
  shellDesc: "Determine if commands synthesized by NLP agents can run in the background of your machine.",
  shellBtnManual: "🔴 Prompt for Authentication",
  shellBtnSafe: "🟡 Read-Only Safe Commands",
  shellBtnAuto: "⚡ Run Autonomously (Full Bypass)",
  writeHeader: "Workspace Write Restrictions",
  writeDesc: "Restrict code writer mechanisms when the system attempts to modify, inject, or delete workspace files.",
  writeBtnManual: "🔴 Code Review Enforce",
  writeBtnAuto: "💚 Write Workspace Directly",
  taskHeader: "Task Database Auto Ledger",
  taskDesc: "Permit systems to automatically serialize high-priority milestones to the persistent SQLite Database.",
  taskBtnManual: "🔴 Prompt Database Logs",
  taskBtnAuto: "💙 Auto-Register Milestones",

  langVoiceTitle: "Speech Features",
  langVoiceDesc: "Refine acoustic tone profiles, speaking velocity, and locale translations to align with parameters.",
  voiceHeader: "Voice Style & Speed",
  voiceDesc: "Calibrate the Text-to-Speech assistant voice style and tempo.",
  voiceBaritone: "Deep Voice (Baritone)",
  voiceIntel: "Fast Paced (Intel)",
  voiceStandard: "Standard Voice",
  localeHeader: "System Language Environment",
  localeBtnTw: "繁體中文 (Taiwan Terminology)",
  localeBtnEn: "English (United States GB)",

  appearanceTitle: "Interface Theme Settings",
  appearanceDesc: "Adjust the primary color and visual style of the console interface.",
  skinCyanTitle: "Cyan",
  skinCyanDesc: "Standard high-contrast interface theme.",
  skinEmeraldTitle: "Emerald",
  skinEmeraldDesc: "Low-light green theme optimized for dark environments.",
  skinAmberTitle: "Amber",
  skinAmberDesc: "Warm high-contrast amber theme.",
  skinRedTitle: "Crimson",
  skinRedDesc: "High-contrast red color scheme.",

  aboutTitle: "About HERMES Console Core",
  aboutDesc: "A complete faithful reconstruction of the Human-AI Developer HUD Interface console.",
  aboutTagline: "“Shall I index new workspace files for you, sir?”",
  aboutP1: "HERMES (Heuristic Educational Real-time Memory Executive System) is an integrated virtual operating environment, simulating background task tracking, deep shell integrations, and granular permission controls.",
  aboutP2: "This interface handles full pipeline execution. When paired with live CLIs or BYOK gateways, you unlock complete filesystem writes, automatic database logging, and system diagnostics.",
  aboutP3: "System build v4.5. Ready to align workspace requirements and preserve user safety. All systems nominal.",

  // SysMonitor keys
  systemVitalSigns: "SYSTEM // RESOURCES",
  vitalSignsShort: "SYSTEM METRICS",
  lblHeartRate: "System Load Freq",
  lblBpm: "Hz",
  lblBodyTemp: "System Temp",
  lblNeuralLink: "Database Link",
  lblActiveState: "ACTIVE",
  lblSystemAutomation: "SYSTEM // AUTOMATION ENGINE",
  lblRtMonitor: "RT-MONITOR",
  lblCpuLoad: "CPU LOAD",
  lblRamMemory: "RAM MEMORY",
  lblGpuCore: "GPU CORE",
  lblNetSpeed: "NET SPEED",
  lblSysTemp: "SYS TEMP",
  lblSystemUplink: "SYSTEM // DATABASE LINK",
  lblStarkSat4: "SQLITE DATABASE",
  lblSignalSecure: "FTS5 SEARCH",
  lblHermesCoreActive: "BACKEND PROCESS: ACTIVE",
  lblActivateCognitive: "ENABLE AUTOMATION",
  hermesMatrixTitle: "WORKSPACE TASK MANAGEMENT",
  hermesProfile: "PROFILE: DEFAULT_SYS",
  hermesTabLoop: "Learning Loop",
  hermesTabFts: "SQLite FTS5 Memory",
  hermesTabTasks: "Task List",
  hermesTabGateway: "Cost Gateway",
  hermesTabVoip: "VoIP Bridge",
  hermesTabDocs: "Tech Specs",
  hermesTaskTrackerTitle: "Actionable Task Tracker",
  hermesPendingLabel: "Pending: {count}",
  hermesRightClickTip: "Right-click for Context Menu",
  hermesSearchPlaceholder: "Search task descriptions...",
  hermesNoTasks: "No active tasks in cognitive database repository.",
  hermesNoResults: "No task records matched your filter query.",
  hermesEditDesc: "Edit Description",
  hermesMoveHigh: "Move to High Priority",
  hermesMoveMedium: "Move to Medium Priority",
  hermesMoveLow: "Move to Low Priority",
  hermesDeleteTask: "Delete Task",
  hermesEditDetails: "Edit Task Details",
  hermesObjective: "Task Objective Description:",
  hermesCancel: "Cancel",
  hermesCommit: "Commit Changes",
  hermesConfirmObliteration: "Confirm Task Obliteration",
  hermesWarningCancel: "警告 (WARNING): ARE YOU ABSOLUTELY RESOLVED ON ERASING THIS TASK FROM COGNITIVE REPOSITORY?",
  hermesAbort: "Abort Deletion",
  hermesObliterate: "Obliterate Task",
  lblSecurityCleared: "SECURITY VERIFICATION: PASSED",
  lblAuthProtocol: "SYSTEM ACCESS PROTOCOL",
  
  // Footer keys
  lblMute: "[F4] Mute",
  lblUnmute: "[F4] Unmute",
  lblFullscreen: "[F11] Fullscreen",
  lblClassified: "HERMES WORKSPACE // DEVELOPER MANAGEMENT SYSTEM",
  lblCopyright: "© HERMES WORKSPACE",

  // ActivityLog keys
  lblArmorStatus: "SYSTEM // HARDWARE STATUS",
  lblPowerCore: "PROCESSOR LOAD",
  lblStructuralIntegrity: "STORAGE STATUS",
  lblSystemInteraction: "TASK FLOW CONTROL",
  lblShield: "Sandbox Security",
  lblCorePow: "System Performance",
  lblSatLink: "Data Sync",
  lblCalibrate: "Diagnostic Logs",
  lblRtLog: "SYSTEM // OPERATION LOG",

  // FileUpload keys
  lblFileUpload: "FILE UPLOAD & AUTOMATIC INDEXING",
  lblNoFileLoaded: "No file loaded - drop or click above to upload",
  lblUploadComplete: "Upload Complete",
  lblDropOrClick: "Drop file here or Click to Browse",

  // CommandInput keys
  lblCommandDirectory: "COMMAND DIRECTORY",
  placeholderVoiceActive: "Awaiting voice capture...",
  placeholderTextActive: "Transmit instructions or questions to HERMES...",
  lblVoiceActiveBtn: "VOICE SYSTEM ACTIVATED",
  lblVoiceInactiveBtn: "VOICE CAPTURE INACTIVE",
  lblCinemediaExpanse: "cinemedia expansia [f11]",

  lblHoloUtils: "System Utilities",
  lblEnvKeys: "ENVIRONMENT KEYS",
  lblEnvKeysTitle: "ENVIRONMENT KEYS",
  lblToggleAudio: "Toggle UI Audio Effects",
  lblMuteSys: "Mute System Sounds",
  lblSynapseLatency: "Synapse Latency",
  lblAuthIsolation: "Auth Isolation",
  lblWorkspaceSandboxed: "Workspace Sandboxed",
  lblElevenLabsKey: "ElevenLabs TTS API Key",
  lblMcpInventory: "MCP SKILLS INVENTORY",
  lblRegisterWebhook: "Register Webhook",
  lblBindWebhook: "Bind Webhook",
  lblNoNetworkWebhooks: "No active network webhooks",
  lblCreateRoutine: "Create Macro Shortcut",
  lblSaveMatrix: "Save Matrix",
  lblNoActiveMatrixRoutines: "No active macros",
  lblExecuteRoutine: "Send Macro",
  btnSyncSettings: "Terminal Synchronized [Close]",
};

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh-TW');

  useEffect(() => {
    const saved = localStorage.getItem('jarvis_active_locale');
    if (saved === 'en' || saved === 'zh-TW') {
      setLocaleState(saved as Locale);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('jarvis_active_locale', newLocale);
  };

  const t = locale === 'zh-TW' ? zhTWTranslations : enTranslations;

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
