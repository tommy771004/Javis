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
  brandName: "J.A.R.V.I.S",
  brandMotto: "僅此一個相當智慧的系統核心",
  systemStatus: "系統狀態",
  statusOptimal: "最佳狀態",
  localTime: "當地時間",
  alertNotifications: "警告通知",
  systemConfig: "系統參數設定",
  tStark: "東尼 史塔克",

  controlsHeader: "系統整合控制面板",
  controlsSubtitle: "Mark LXXXV // 指令模組對齊",
  menuExecution: "配置執行模式",
  menuMemory: "記憶庫 (Memory Bank)",
  menuSecurity: "系統安全與權限",
  menuLanguages: "介面語言 & 聲線",
  menuAppearance: "外觀樣式 (Skins)",
  menuAbout: "關於 J.A.R.V.I.S",
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
  btnScanning: "JARVIS 正在同步核心網絡...",
  lblActive: "運作中",
  lblNotInstalled: "未安裝",
  lblInstallNow: "即刻安裝",
  lblDocs: "文件",
  lblByokTitle: "OpenRouter API 憑證設定 (BYOK)",
  lblApiKey: "OpenRouter API 金鑰/憑證:",
  lblPreferredModel: "偏好語言模型字串 (OpenRouter 規格目錄):",
  lblGatewayEndpoint: "API 網關端點 (Endpoint):",
  btnSaveByok: "儲存金鑰並同步引擎核心",

  memoryTitle: "J.A.R.V.I.S 核心記憶網絡 (Memory Banks)",
  memoryDesc: "JARVIS 能在對話邊界中持續累積記憶與認知。可在下方檢索或配置活躍中的指令與宣告。",
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
  writeDesc: "定義當 JARVIS 自動修改程式碼、建立或刪除專案檔案時的檔案系統保護等級。",
  writeBtnManual: "🔴 手動審查程式碼",
  writeBtnAuto: "💚 自動寫入工作區",
  taskHeader: "任務資料庫自動登錄規則 (DB Ledger)",
  taskDesc: "允許 JARVIS 在分析對話拆解目標時，自動於本機 SQLite / DB 帳本中登錄重要任務清冊。",
  taskBtnManual: "🔴 手動加入任務",
  taskBtnAuto: "💙 自動編排登錄",

  langVoiceTitle: "J.A.R.V.I.S 聲線調整 (Speech Harmonizers)",
  langVoiceDesc: "微調聲學特徵、語音合成速度，並切換適合的系統在地化語言設定。",
  voiceHeader: "聲線特徵與音高設定 (Acoustic Pitch)",
  voiceDesc: "調校仿生合成語音特徵，使助理語音符合英國深沉男中音、或節奏緊湊的情報官聲調。",
  voiceBaritone: "🎩 英國男中音 (深沉)",
  voiceIntel: "⚡ 情報官聲調 (緊湊)",
  voiceStandard: "🤖 標準機器音 (待命)",
  localeHeader: "語系環境選擇 (System Language)",
  localeBtnTw: "繁體中文 (台灣繁中用語)",
  localeBtnEn: "English (United States GB)",

  appearanceTitle: "HUD 投影外觀控制 (Stark Interface Skins)",
  appearanceDesc: "動態調整全息投影介面的主色與發光波長特徵，瞬間切換全螢幕視覺氛圍。",
  skinCyanTitle: "全息光束青色 (Hologram Cyan)",
  skinCyanDesc: "標準戰術科技全像雷射 HUD 特徵 (480nm 波長)。明亮眩目、高度科技感。",
  skinEmeraldTitle: "反應爐翡翠綠 (Reactor Emerald)",
  skinEmeraldDesc: "符合低光環境安全的綠能發光面板 (530nm)。適合夜間長途監控、護眼首選。",
  skinAmberTitle: "古典實驗室琥珀 (Classic Amber)",
  skinAmberDesc: "史塔克車庫實驗室專用之經典暖焦糖琥珀暖色面板。高對比沉影、極致優雅。",
  skinRedTitle: "馬克 85 鋼鐵紅 (Hotrod Hot Red)",
  skinRedDesc: "戰鬥型 Mark LXXXV 鋼鐵裝甲熱力紅色彩方案。反應級增壓、全面備戰。",

  aboutTitle: "關於 智慧助理 J.A.R.V.I.S Core",
  aboutDesc: "Stark Industries 經典人機互動介面 (AI-Driven Agent Console) 的完整終端核心實作。",
  aboutTagline: "「先生，您需要重新校準熱能發射裝置嗎？」",
  aboutP1: "J.A.R.V.I.S (Just A Rather Very Intelligent System) 是史塔克工業開創的高智慧中央控制核心，本系統模擬全自動終端控制、本機 OS 連接、BYOK 憑證同步及智慧防禦矩陣。",
  aboutP2: "本主網核心介面能感知多種行為命令。當本機 Cli 或 OpenRouter 閘道連線後，可實現多學科任務編排與本機寫檔。多種權限開關為您安全護航。",
  aboutP3: "編號 Mark LXXXV。為世界和平與系統工作區保駕護航。Online nominal.",

  // SysMonitor keys
  systemVitalSigns: "系統 // 生命徵象監控",
  vitalSignsShort: "生命徵象",
  lblHeartRate: "模擬心率",
  lblBpm: "BPM",
  lblBodyTemp: "裝甲溫度",
  lblNeuralLink: "神經連結",
  lblActiveState: "連線中",
  lblSystemAutomation: "系統 // 自動化監控",
  lblRtMonitor: "即時監控",
  lblCpuLoad: "核心運算 (CPU) 負載",
  lblRamMemory: "暫存記憶體 (RAM) 使用率",
  lblGpuCore: "圖形處理器 (GPU) 負載",
  lblNetSpeed: "網路傳輸",
  lblSysTemp: "主機溫度",
  lblSystemUplink: "系統 // 衛星上行鏈路",
  lblStarkSat4: "史塔克 4 號軌道衛星",
  lblSignalSecure: "加密安全通道",
  lblHermesCoreActive: "HERMES 核心代理程式：運作中",
  lblActivateCognitive: "啟用全自動認知協定",
  hermesMatrixTitle: "HERMES 智慧矩陣 v4.5",
  hermesProfile: "設定檔: 預設開發系統",
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
  hermesNoTasks: "Cognitive 核心目前尚無活動中的任務。",
  hermesNoResults: "無符合您關鍵字元搜尋條件的任務專案。",
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
  lblSecurityCleared: "安全金鑰防禦矩陣：通過",
  lblAuthProtocol: "防禦授權通訊協定 XXXIX",
  
  // Footer keys
  lblMute: "[F4] 靜音",
  lblUnmute: "[F4] 取消靜音",
  lblFullscreen: "[F11] 滿版全螢幕",
  lblClassified: "史塔克工業 // 賈維斯計畫 // 機密級防禦",
  lblCopyright: "© 史塔克工業 版權所有",

  // ActivityLog keys
  lblArmorStatus: "系統 // 鋼鐵裝甲防禦狀態",
  lblPowerCore: "弧光反應爐功率核心",
  lblStructuralIntegrity: "裝甲結構完整度",
  lblSystemInteraction: "主機防禦互動控制矩陣",
  lblShield: "防禦護盾",
  lblCorePow: "反應爐增壓",
  lblSatLink: "衛星同步",
  lblCalibrate: "校準診斷",
  lblRtLog: "系統 // 賈維斯決策即時日誌",

  // FileUpload keys
  lblFileUpload: "工作區檔案上傳與即時索引",
  lblNoFileLoaded: "尚未載入任何文件 - 請拖放至此或點擊進行上傳",
  lblUploadComplete: "資料上傳成功",
  lblDropOrClick: "拖放檔案至此處，或點擊瀏覽進行上傳",

  // CommandInput keys
  lblCommandDirectory: "指令輸入與語意認知目錄",
  placeholderVoiceActive: "正在透過衛星語音辨識接收錄入...",
  placeholderTextActive: "請輸入傳授予賈維斯助理的指令、提問或程式編輯指示...",
  lblVoiceActiveBtn: "全時衛星語音辨識：開啟中",
  lblVoiceInactiveBtn: "全時衛星語音辨識：靜態待命",
  lblCinemediaExpanse: "電影級極致視野大螢幕 [F11]",

  lblHoloUtils: "全息投影工具",
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
  brandName: "J.A.R.V.I.S",
  brandMotto: "JUST A RATHER VERY INTELLIGENT SYSTEM",
  systemStatus: "SYSTEM STATUS",
  statusOptimal: "OPTIMAL",
  localTime: "LOCAL TIME",
  alertNotifications: "Alert Notifications",
  systemConfig: "System Configuration",
  tStark: "T. STARK",

  controlsHeader: "SYSTEM INTEGRATION CONTROLS",
  controlsSubtitle: "Mark LXXXV // Command Module Alignment",
  menuExecution: "Configure Execution Mode",
  menuMemory: "Memory Bank",
  menuSecurity: "Security & Permissions",
  menuLanguages: "Languages & Voice Settings",
  menuAppearance: "Interface Skins (HUD)",
  menuAbout: "About J.A.R.V.I.S",
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
  btnScanning: "JARVIS is syncing neural arrays...",
  lblActive: "Online Active",
  lblNotInstalled: "Not Installed",
  lblInstallNow: "Install Now",
  lblDocs: "Docs",
  lblByokTitle: "OpenRouter API Credentials (BYOK)",
  lblApiKey: "OpenRouter API Key:",
  lblPreferredModel: "Preferred Language Model String (OpenRouter Catalog):",
  lblGatewayEndpoint: "Gateway Endpoint URL:",
  btnSaveByok: "Save Credentials & Sync Engine Core",

  memoryTitle: "J.A.R.V.I.S Memory Core Banks",
  memoryDesc: "JARVIS accumulates cognitive state across conversational sessions. Review active guidelines or purge memory vectors below.",
  btnPurge: "PURGE MEMORY",
  inputMemoryPlaceholder: "Insert custom programmatic directive or context string manually...",
  btnStoreContext: "Store Context",

  securityTitle: "Automated System Protection (Security Matrix)",
  securityDesc: "Define execution permission envelopes, filesystem validation policies, and transactional database triggers.",
  shellHeader: "OS Command Execution Policy",
  shellDesc: "Determine if commands synthesized by NLP agents can run in the silent background of your machine.",
  shellBtnManual: "🔴 Prompt for Authentication",
  shellBtnSafe: "🟡 Read-Only Safe Commands",
  shellBtnAuto: "⚡ Run Autonomously (Full Bypass)",
  writeHeader: "Workspace Write Restrictions",
  writeDesc: "Restrict code writer mechanisms when JARVIS attempts to modify, inject, or delete workspace repositories.",
  writeBtnManual: "🔴 Code Review Enforce",
  writeBtnAuto: "💚 Write Workspace Directly",
  taskHeader: "Task Database Auto Ledger",
  taskDesc: "Permit JARVIS to automatically serialize high-priority milestones to the persistent SQLite Database.",
  taskBtnManual: "🔴 Prompt Database Logs",
  taskBtnAuto: "💙 Auto-Register Milestones",

  langVoiceTitle: "J.A.R.V.I.S Speech Tuning (Speech Harmonizers)",
  langVoiceDesc: "Refine acoustic tone profiles, speaking velocity, and locale translations to align with the British Baritone.",
  voiceHeader: "Acoustic Tone & Speed Profile",
  voiceDesc: "Calibrate speaker synthesis behavior. Choose heavy baritone acoustics or quick-paced operations officer voice structures.",
  voiceBaritone: "🎩 British Baritone (Deep)",
  voiceIntel: "⚡ Intel Officer (Abridged)",
  voiceStandard: "🤖 Robotic Standby (Default)",
  localeHeader: "System Language Environment",
  localeBtnTw: "繁體中文 (Taiwan Terminology)",
  localeBtnEn: "English (United States GB)",

  appearanceTitle: "HUD Projection Outlines (Stark Skins)",
  appearanceDesc: "Transition holographic interface hues and wavelength filters. Change visual canvas aesthetics instantly.",
  skinCyanTitle: "Stark Hologram Cyan",
  skinCyanDesc: "Default high-fidelity tactical HUD profile (480nm). Standard glow, high neon contrast.",
  skinEmeraldTitle: "Arc Reactor Emerald",
  skinEmeraldDesc: "Low-light safe emerald emit scheme (530nm). Optimised for overnight terminal auditing and eye preservation.",
  skinAmberTitle: "Classic Jarvis Amber",
  skinAmberDesc: "Stark Garage retro configuration. High contrast amber hues with gorgeous warm backlighting details.",
  skinRedTitle: "Mark LXXXV Hotrod Red",
  skinRedDesc: "Combat combat-ready armor tint wave scheme. Full secondary plasma overdrive visual setting.",

  aboutTitle: "About J.A.R.V.I.S Terminal Core",
  aboutDesc: "A complete faithful reconstruction of the Stark Industries Human-AI HUD interface system.",
  aboutTagline: "“Shall I recalibrate thermal emission triggers for you, sir?”",
  aboutP1: "J.A.R.V.I.S (Just A Rather Very Intelligent System) is Stark Industries' most iconic virtual operating environment, simulating background task tracking, deep shell integrations, and granular permission controls.",
  aboutP2: "This interface handles full pipeline execution. When paired with live CLIs or BYOK gateways, you unlock complete filesystem writes, automatic database logging, and system diagnostics.",
  aboutP3: "System Mark LXXXV. Ready to guard world peace and preserve the operator's workspace. All systems nominal.",

  // SysMonitor keys
  systemVitalSigns: "SYSTEM // VITAL SIGNS",
  vitalSignsShort: "VITAL SIGNS",
  lblHeartRate: "Heart Rate",
  lblBpm: "BPM",
  lblBodyTemp: "Armor Temp",
  lblNeuralLink: "Neural Link",
  lblActiveState: "ACTIVE",
  lblSystemAutomation: "SYSTEM // AUTOMATION",
  lblRtMonitor: "RT-MONITOR",
  lblCpuLoad: "CPU LOAD",
  lblRamMemory: "RAM MEMORY",
  lblGpuCore: "GPU CORE",
  lblNetSpeed: "NET SPEED",
  lblSysTemp: "SYS TEMP",
  lblSystemUplink: "SYSTEM // UP-LINK",
  lblStarkSat4: "STARK-SAT-4",
  lblSignalSecure: "SIGNAL SECURE",
  lblHermesCoreActive: "HERMES CORE GATEWAY ACTIVE",
  lblActivateCognitive: "ACTIVATE COGNITIVE PROTOCOLS",
  hermesMatrixTitle: "HERMES INTELLIGENCE MATRIX v4.5",
  hermesProfile: "PROFILE: DEFAULT_DEV_SYS",
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
  lblSecurityCleared: "SECURITY CREDENTIALS CLEARED",
  lblAuthProtocol: "AUTHENTICATION PROTOCOL XXXIX",
  
  // Footer keys
  lblMute: "[F4] Mute",
  lblUnmute: "[F4] Unmute",
  lblFullscreen: "[F11] Fullscreen",
  lblClassified: "STARK INDUSTRIES // PROJECT J.A.R.V.I.S // CLASSIFIED",
  lblCopyright: "© STARK INDUSTRIES",

  // ActivityLog keys
  lblArmorStatus: "SYSTEM // ARMOR STATUS",
  lblPowerCore: "POWER CORE",
  lblStructuralIntegrity: "STRUCTURAL INTEGRITY",
  lblSystemInteraction: "SYSTEM INTERACTION MATRIX",
  lblShield: "Shield",
  lblCorePow: "Core Pow",
  lblSatLink: "Sat Link",
  lblCalibrate: "Calibrate",
  lblRtLog: "SYSTEM // RT-LOG",

  // FileUpload keys
  lblFileUpload: "FILE UPLOAD",
  lblNoFileLoaded: "No file loaded - drop or click above to upload",
  lblUploadComplete: "Upload Complete",
  lblDropOrClick: "Drop file here or Click to Browse",

  // CommandInput keys
  lblCommandDirectory: "COMMAND DIRECTORY",
  placeholderVoiceActive: "Awaiting continuous voice capture...",
  placeholderTextActive: "Transmit instructions or questions to JARVIS...",
  lblVoiceActiveBtn: "VOICE MATRIX ACTIVATED",
  lblVoiceInactiveBtn: "VOICE CAPTURE INACTIVE",
  lblCinemediaExpanse: "cinemedia expansia [f11]",

  lblHoloUtils: "Hologram Utilities",
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
