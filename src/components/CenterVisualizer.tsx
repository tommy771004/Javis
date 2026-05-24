import React from 'react';
import { motion } from 'motion/react';
import {
  buildTelemetryWaveHeights,
  formatMetricValue,
  formatPercentMetric,
  formatTextMetric,
} from '../services/truthfulUiPolicies';
import {
  buildAssistantBriefing,
  resolveAssistantPresence,
} from '../services/personalAssistantPresentation';
import { isSystemStatsEvent, parseSystemStreamMessage } from '../services/systemStreamEvents';

export type CognitiveState = 'idle' | 'thinking' | 'searching' | 'speaking';

interface CenterVisualizerProps {
  cognitiveState: CognitiveState;
  voiceAmplitude: number;
  isMicActive?: boolean;
  webrtcStats?: {
    state: string;
    codec: string;
    rtt: number | null;
    jitter: number | null;
    packetsSent: number;
    packetsReceived: number;
    bytesSent: number;
    bytesReceived: number;
    bitrate: number | null;
  };
}

export function CenterVisualizer({ cognitiveState, voiceAmplitude, isMicActive, webrtcStats }: CenterVisualizerProps) {
  const [stats, setStats] = React.useState<{ 
    cpu: number; 
    mem: number; 
    net: string; 
    neuralSync?: string;
    rxSpeed?: number;
    txSpeed?: number;
    gpu: number; 
    tmp: string; 
    uptime: number; 
    processes: number; 
    secStatus: string;
    nodeVersion?: string;
    costLogsCount?: number;
    messagesCount?: number;
    cognitiveCount?: number;
    diskIo?: string;
    systemLogs?: string[];
  } | null>(null);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [gateway, setGateway] = React.useState<{ budget: number; spent: number; cacheHits: number } | null>(null);
  const [logs, setLogs] = React.useState<string[]>([
    "Javis is ready to watch the workspace.",
    "Local gateway is available.",
    "SQLite memory index is ready.",
    "Voice channel is on standby."
  ]);

  React.useEffect(() => {
    let active = true;

    async function fetchContextData() {
      try {
        const [tasksRes, gatewayRes] = await Promise.all([
          fetch('/api/tasks').then(res => res.ok ? res.json() : []),
          fetch('/api/gateway/stats').then(res => res.ok ? res.json() : null)
        ]);

        if (!active) return;
        if (tasksRes) setTasks(tasksRes);
        if (gatewayRes) setGateway(gatewayRes);
      } catch (err) {
        console.warn("Failed to update CenterVisualizer context data", err);
      }
    }

    fetchContextData();

    const stream = new EventSource('/api/system/stream');
    stream.onmessage = (event) => {
      const parsed = parseSystemStreamMessage(event.data);
      if (!active || !parsed) return;

      if (isSystemStatsEvent(parsed)) {
        const nextStats = parsed.stats as any;
        setStats(nextStats);
        if (Array.isArray(nextStats.systemLogs) && nextStats.systemLogs.length > 0) {
          setLogs(nextStats.systemLogs);
        }
      } else if (parsed.type === 'SYNC_PULSE') {
        fetchContextData();
      }
    };
    stream.onerror = () => {
      console.warn('CenterVisualizer system stream disconnected.');
    };

    return () => {
      active = false;
      stream.close();
    };
  }, []);

  // Map cognitive state to theme configs
  const getColorClasses = () => {
    if (isMicActive) {
      return {
        glow: 'rgba(34,197,94,0.6)',
        text: 'text-green-400 drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]',
        border: 'border-green-800/40',
        borderDash: 'border-green-500/40',
        gradient: 'bg-[radial-gradient(circle,rgba(20,83,45,0.2)_0%,rgba(6,78,59,0.4)_60%,rgba(2,20,10,0.8)_100%)]',
        shadow: 'shadow-[inset_0_0_50px_rgba(34,197,94,0.15)]',
        barColor: 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]',
        accentColor: 'border-green-400 text-green-400',
        sweepGrad: 'from-green-500/20 to-transparent'
      };
    }

    switch (cognitiveState) {
      case 'thinking':
        return {
          glow: 'rgba(245,158,11,0.5)',
          text: 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]',
          border: 'border-amber-800/40',
          borderDash: 'border-amber-700/40',
          gradient: 'bg-[radial-gradient(circle,rgba(180,83,9,0.15)_0%,rgba(69,26,3,0.4)_60%,rgba(20,4,0,0.8)_100%)]',
          shadow: 'shadow-[inset_0_0_50px_rgba(245,158,11,0.1)]',
          barColor: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]',
          accentColor: 'border-amber-500 text-amber-500',
          sweepGrad: 'from-amber-500/20 to-transparent'
        };
      case 'searching':
        return {
          glow: 'rgba(16,185,129,0.5)',
          text: 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]',
          border: 'border-emerald-800/40',
          borderDash: 'border-emerald-700/40',
          gradient: 'bg-[radial-gradient(circle,rgba(6,95,70,0.15)_0%,rgba(6,78,59,0.4)_60%,rgba(2,40,20,0.8)_100%)]',
          shadow: 'shadow-[inset_0_0_50px_rgba(16,185,129,0.1)]',
          barColor: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]',
          accentColor: 'border-emerald-500 text-emerald-500',
          sweepGrad: 'from-emerald-500/20 to-transparent'
        };
      case 'speaking':
        return {
          glow: 'rgba(59,130,246,0.6)',
          text: 'text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]',
          border: 'border-blue-700/40',
          borderDash: 'border-blue-500/40',
          gradient: 'bg-[radial-gradient(circle,rgba(29,78,216,0.2)_0%,rgba(30,58,138,0.4)_60%,rgba(3,7,18,0.8)_100%)]',
          shadow: 'shadow-[inset_0_0_50px_rgba(59,130,246,0.15)]',
          barColor: 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]',
          accentColor: 'border-blue-400 text-blue-400',
          sweepGrad: 'from-blue-500/20 to-transparent'
        };
      case 'idle':
      default:
        return {
          glow: 'rgba(34,211,238,0.5)',
          text: 'text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]',
          border: 'border-cyan-950/80',
          borderDash: 'border-cyan-800/30',
          gradient: 'bg-[radial-gradient(circle,rgba(8,145,178,0.06)_0%,rgba(8,47,73,0.15)_60%,rgba(2,6,12,0.95)_100%)]',
          shadow: 'shadow-[inset_0_0_50px_rgba(6,182,212,0.05)]',
          barColor: 'bg-cyan-500 shadow-[0_0_6px_rgba(34,211,238,0.6)]',
          accentColor: 'border-cyan-500/50 text-cyan-400',
          sweepGrad: 'from-cyan-500/15 to-transparent'
        };
    }
  };

  const theme = getColorClasses();

  // Map state to speed/duration coefficients
  const getDurations = () => {
    if (isMicActive) {
      return { outer: 8, sweep: 3, inner: 4 };
    }

    switch (cognitiveState) {
      case 'thinking':
        return { outer: 5, sweep: 2, inner: 3 };
      case 'searching':
        return { outer: 10, sweep: 4, inner: 5 };
      case 'speaking':
        return { outer: 15, sweep: 2.5, inner: 6 };
      case 'idle':
      default:
        return { outer: 30, sweep: 8, inner: 12 };
    }
  };

  const speeds = getDurations();

  const getStrokeColor = () => {
    if (isMicActive) return '#21c55d';
    switch (cognitiveState) {
      case 'thinking': return '#eab308';
      case 'searching': return '#10b981';
      case 'speaking': return '#3b82f6';
      case 'idle':
      default:
        return '#06b6d4';
    }
  };

  const hudColor = getStrokeColor();

  const displayBitrate = formatMetricValue(webrtcStats?.bitrate, 'kbps');
  const displayRtt = formatMetricValue(webrtcStats?.rtt, 'ms');
  const displayCodec = formatTextMetric(webrtcStats?.codec).toUpperCase();
  const vadStatus = isMicActive ? 'ACTIVE' : 'STANDBY';
  const ampState = voiceAmplitude.toFixed(1);
  const assistantPresence = resolveAssistantPresence({
    cognitiveState,
    isMicActive: Boolean(isMicActive),
    webrtcState: webrtcStats?.state,
  });
  const criticalLogCount = logs.filter(log => /error|fail|warning|critical/i.test(log)).length;
  const pendingTasks = tasks.filter(task => task?.status !== 'Completed').length;
  const assistantBriefing = buildAssistantBriefing({
    pendingTasks,
    criticalAlerts: criticalLogCount,
  });
  const waveHeights = buildTelemetryWaveHeights({
    count: 42,
    timestampMs: Date.now(),
    rxSpeed: stats?.rxSpeed,
    txSpeed: stats?.txSpeed,
    voiceAmplitude,
    cognitiveState,
  });

  return (
    <div className="flex-1 relative flex flex-col items-center justify-center border-l border-r border-cyan-950/60 px-6 mx-2 select-none h-full overflow-hidden transition-all duration-500">
      {/* HUD Corner brackets matching exactly Stark aesthetic */}
      <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 transition-colors duration-500 ${isMicActive ? 'border-green-700/50' : cognitiveState === 'thinking' ? 'border-amber-700/50' : cognitiveState === 'searching' ? 'border-emerald-700/50' : 'border-cyan-900/40'}`}></div>
      <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 transition-colors duration-500 ${isMicActive ? 'border-green-700/50' : cognitiveState === 'thinking' ? 'border-amber-700/50' : cognitiveState === 'searching' ? 'border-emerald-700/50' : 'border-cyan-900/40'}`}></div>
      <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 transition-colors duration-500 ${isMicActive ? 'border-green-700/50' : cognitiveState === 'thinking' ? 'border-amber-700/50' : cognitiveState === 'searching' ? 'border-emerald-700/50' : 'border-cyan-900/40'}`}></div>
      <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 transition-colors duration-500 ${isMicActive ? 'border-green-700/50' : cognitiveState === 'thinking' ? 'border-amber-700/50' : cognitiveState === 'searching' ? 'border-emerald-700/50' : 'border-cyan-900/40'}`}></div>

      {/* Main Core Graphic containing circular radar sweep */}
      <div className="relative w-[480px] h-[480px] flex items-center justify-center scale-[0.68] sm:scale-75 md:scale-90 lg:scale-100 transform origin-center">
        
        {/* Futuristic SVG HUD Branch Links ("支線") */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          {/* Top-Left Branch Link with Angled Turns and Terminals */}
          <path d="M 170 170 L 90 90 L -30 90" fill="none" stroke={hudColor} strokeWidth="1" strokeOpacity="0.7" />
          <path d="M 175 162 L 105 92" fill="none" stroke={hudColor} strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3,3" />
          <line x1="-30" y1="84" x2="-30" y2="96" stroke={hudColor} strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="90" cy="90" r="1.5" fill={hudColor} />

          {/* Top-Right Branch Link */}
          <path d="M 310 170 L 390 90 L 510 90" fill="none" stroke={hudColor} strokeWidth="1" strokeOpacity="0.7" />
          <path d="M 305 162 L 375 92" fill="none" stroke={hudColor} strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3,3" />
          <line x1="510" y1="84" x2="510" y2="96" stroke={hudColor} strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="390" cy="90" r="1.5" fill={hudColor} />

          {/* Bottom-Left Branch Link */}
          <path d="M 170 310 L 90 390 L -30 390" fill="none" stroke={hudColor} strokeWidth="1" strokeOpacity="0.7" />
          <path d="M 175 318 L 105 388" fill="none" stroke={hudColor} strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3,3" />
          <line x1="-30" y1="384" x2="-30" y2="396" stroke={hudColor} strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="90" cy="390" r="1.5" fill={hudColor} />

          {/* Bottom-Right Branch Link */}
          <path d="M 310 310 L 390 390 L 510 390" fill="none" stroke={hudColor} strokeWidth="1" strokeOpacity="0.7" />
          <path d="M 305 318 L 375 388" fill="none" stroke={hudColor} strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3,3" />
          <line x1="510" y1="384" x2="510" y2="396" stroke={hudColor} strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="390" cy="390" r="1.5" fill={hudColor} />
        </svg>

        {/* 4 assistant context panels with real system parameters */}
        {/* Memory Box (Top Left) */}
        <div 
          className="absolute w-[175px] bg-[#020905]/95 p-2 border font-mono text-[8px] tracking-wider transition-all duration-500 rounded-sm hover:bg-black/95 shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-xs flex flex-col gap-1 select-none pointer-events-auto"
          style={{
            left: '-205px',
            top: '25px',
            borderColor: `${hudColor}45`,
            boxShadow: `0 0 16px ${hudColor}15`
          }}
        >
          <div className="flex justify-between border-b pb-1" style={{ borderColor: `${hudColor}25` }}>
            <span style={{ color: hudColor }} className="font-bold tracking-widest">WORKSPACE MEMORY</span>
            <span className="text-emerald-500 animate-pulse text-[7.5px] font-bold">READY</span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>Saved context:</span>
            <span style={{ color: hudColor }} className="font-bold">
              {stats?.cognitiveCount !== undefined ? stats.cognitiveCount : 0}
            </span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>Conversation blocks:</span>
            <span style={{ color: hudColor }} className="font-bold">
              {stats?.messagesCount !== undefined ? stats.messagesCount : 0}
            </span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>Storage:</span>
            <span className="text-emerald-400 font-bold">SQLITE5/FTS5</span>
          </div>
        </div>

        {/* Dynamic Execution Logs Box (Top Right) */}
        <div 
          className="absolute w-[185px] bg-[#020905]/95 p-2 border font-mono text-[8px] tracking-wider transition-all duration-500 rounded-sm hover:bg-black/95 shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-xs flex flex-col gap-1 select-none pointer-events-auto"
          style={{
            right: '-215px',
            top: '25px',
            borderColor: `${hudColor}45`,
            boxShadow: `0 0 16px ${hudColor}15`
          }}
        >
          <div className="flex justify-between border-b pb-1 mb-1" style={{ borderColor: `${hudColor}25` }}>
            <span style={{ color: hudColor }} className="font-bold tracking-widest">RECENT SIGNAL</span>
            <span className="text-emerald-500 text-[7px] font-bold animate-pulse">LIVE</span>
          </div>
          <div className="flex justify-between text-cyan-400/70 text-[8px] mb-1.5">
            <span>Cost events:</span>
            <span style={{ color: hudColor }} className="font-bold">
              {stats?.costLogsCount !== undefined ? stats.costLogsCount : 0}
            </span>
          </div>
          <div className="flex justify-between text-cyan-400/70 text-[8px] mb-1.5">
            <span>Context reuse:</span>
            <span style={{ color: hudColor }} className="font-bold">
              {stats?.neuralSync || 'N/A'}%
            </span>
          </div>
          <div className="flex justify-between border-t border-cyan-800/10 pt-1 mt-1 text-[7px] text-cyan-500/80">
            <span>Latest:</span>
            <span className="truncate max-w-[124px] text-cyan-400 font-sans">{logs[logs.length - 1] || 'Quiet for now'}</span>
          </div>
        </div>

        {/* Network VoIP/Bridge Status Box (Bottom Left) */}
        <div 
          className="absolute w-[175px] bg-[#020905]/95 p-2 border font-mono text-[8px] tracking-wider transition-all duration-500 rounded-sm hover:bg-black/95 shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-xs flex flex-col gap-1 select-none pointer-events-auto"
          style={{
            left: '-205px',
            bottom: '25px',
            borderColor: `${hudColor}45`,
            boxShadow: `0 0 16px ${hudColor}15`
          }}
        >
          <div className="flex justify-between border-b pb-1" style={{ borderColor: `${hudColor}25` }}>
            <span style={{ color: hudColor }} className="font-bold tracking-widest">VOICE LINK</span>
            <span className="text-blue-400 text-[7.5px] font-bold animate-pulse">{isMicActive ? 'OPEN' : 'STANDBY'}</span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>Bitrate:</span>
            <span style={{ color: hudColor }} className="font-bold">{displayBitrate}</span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>Latency:</span>
            <span style={{ color: hudColor }} className="font-bold">{displayRtt}</span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>Codec:</span>
            <span style={{ color: hudColor }} className="font-bold truncate max-w-[80px] inline-block text-right">
              {displayCodec}
            </span>
          </div>
        </div>

        {/* Core Settings Stats (Bottom Right) */}
        <div 
          className="absolute w-[175px] bg-[#020905]/95 p-2 border font-mono text-[8px] tracking-wider transition-all duration-500 rounded-sm hover:bg-black/95 shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-xs flex flex-col gap-1 select-none pointer-events-auto"
          style={{
            right: '-205px',
            bottom: '25px',
            borderColor: `${hudColor}45`,
            boxShadow: `0 0 16px ${hudColor}15`
          }}
        >
          <div className="flex justify-between border-b pb-1" style={{ borderColor: `${hudColor}25` }}>
            <span style={{ color: hudColor }} className="font-bold tracking-widest">ASSISTANT CARE</span>
            <span className={isMicActive ? "text-green-400 text-[7.5px] font-bold animate-pulse" : "text-cyan-400 text-[7.5px] font-bold"}>{vadStatus}</span>
          </div>
          <div className="flex justify-between text-cyan-400/70 items-center">
            <span>Voice level:</span>
            <span style={{ color: hudColor }} className="font-bold">{ampState} dB</span>
          </div>
          <div className="h-1 bg-cyan-950/80 rounded overflow-hidden my-1 border border-cyan-900/30">
            <div 
              className="h-full bg-cyan-400 transition-all duration-75"
              style={{
                width: `${Math.min(100, voiceAmplitude)}%`,
                backgroundColor: isMicActive ? '#22c55e' : '#22d3ee',
                boxShadow: isMicActive ? '0 0 6px #22c55e' : '0 0 6px #22d3ee'
              }}
            ></div>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>Runtime:</span>
            <span style={{ color: hudColor }} className="font-bold">
              {stats?.nodeVersion ? `NODE_${stats.nodeVersion.split('.')[0].toUpperCase()}` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>Spend:</span>
            <span style={{ color: hudColor }} className="font-bold">{gateway ? `$${gateway.spent.toFixed(5)} USD` : 'N/A'}</span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>Cache:</span>
            <span style={{ color: hudColor }} className="font-bold">{gateway ? `${formatPercentMetric(gateway.cacheHits)} CACHED` : 'N/A'}</span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>Security:</span>
            <span className="text-emerald-400 font-bold">{stats?.secStatus || 'N/A'}</span>
          </div>
        </div>

        {/* Radar Horizontal Axle Grid Line */}
        <div className="absolute w-[95%] h-[1px] bg-cyan-950/45 left-[2.5%] top-1/2 -translate-y-1/2 z-0"></div>
        {/* Radar Vertical Axle Grid Line */}
        <div className="absolute h-[95%] w-[1px] bg-cyan-950/45 top-[2.5%] left-1/2 -translate-x-1/2 z-0"></div>
        {/* 45-degree Diagonal Alignment Line */}
        <div className="absolute w-[95%] h-[1px] bg-cyan-950/20 top-1/2 left-[2.5%] -translate-y-1/2 rotate-45 z-0"></div>
        <div className="absolute w-[95%] h-[1px] bg-cyan-950/20 top-1/2 left-[2.5%] -translate-y-1/2 -rotate-45 z-0"></div>

        {/* Outer Fine Dots Compass Ring */}
        <div className="absolute inset-0 rounded-full border border-cyan-950/30 border-dashed animate-[spin_100s_linear_infinite] pointer-events-none" />

        {/* Dynamic Sonar Scanning Beam Selector */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: speeds.sweep, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[15px] rounded-full pointer-events-none z-10"
          style={{
            background: `conic-gradient(from 0deg, transparent 60%, ${isMicActive ? 'rgba(34,197,94,0.30)' : cognitiveState === 'thinking' ? 'rgba(245,158,11,0.25)' : cognitiveState === 'searching' ? 'rgba(16,185,129,0.25)' : 'rgba(34,211,238,0.22)'} 100%)`
          }}
        />

        {/* Outer Ring with Calibration Markers */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: speeds.outer, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-[15px] rounded-full border transition-colors duration-500 ${theme.border}`}
          style={{ borderStyle: 'solid', borderWidth: '1px' }}
        >
          {/* Top, Bottom, Left, Right cross notches inside outer ring */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-cyan-400"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-cyan-400"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[1px] w-3 bg-cyan-400"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[1px] w-3 bg-cyan-400"></div>
        </motion.div>

        {/* Concentric Circle 2 (Dynamic Dotted Scanner Tracker) */}
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: speeds.outer * 1.5, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-[65px] rounded-full border transition-colors duration-500 ${theme.borderDash}`}
          style={{ borderStyle: 'dashed', borderWidth: '1px' }}
        />
        
        {/* Concentric Circle 3 (Fine Tick Guide) */}
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: speeds.inner, repeat: Infinity, ease: "linear" }} 
          className={`absolute inset-[115px] rounded-full border-t border-b border-cyan-900/10 transition-colors duration-500`} 
        />
        <motion.div 
          animate={{ rotate: -360 }} 
          transition={{ duration: speeds.inner * 1.2, repeat: Infinity, ease: "linear" }} 
          className={`absolute inset-[130px] rounded-full border-l border-r border-cyan-900/15 transition-colors duration-500`} 
        />

        {/* Outer Core Square Wrapper for Holographic central box */}
        <div className="absolute w-[180px] h-[180px] rounded-full border border-cyan-950 bg-black/5 flex items-center justify-center">
          
          {/* Glowing central sphere target containing the status core */}
          <motion.div 
            animate={{ 
              scale: (isMicActive || cognitiveState === 'speaking') ? [1, 1.05, 1] : [1, 1.02, 1],
              boxShadow: (isMicActive || cognitiveState === 'speaking')
                ? [`0 0 30px ${theme.glow}`, `0 0 50px ${theme.glow}`, `0 0 30px ${theme.glow}`]
                : [`0 0 15px ${theme.glow}`, `0 0 25px ${theme.glow}`, `0 0 15px ${theme.glow}`]
            }}
            transition={{ duration: (isMicActive || cognitiveState === 'speaking') ? 0.3 : 4, repeat: Infinity, ease: "easeInOut" }}
            className={`absolute w-[140px] h-[140px] rounded-full transition-all duration-500 ${theme.gradient} flex items-center justify-center z-20`}
          >
            {/* Holographic grid shadow overlays */}
            <div className={`absolute inset-0 rounded-full transition-all duration-500 ${theme.shadow}`}></div>
            
            {/* HUD Core state bracket design */}
            <div className={`absolute w-24 h-24 border ${theme.accentColor} border-opacity-30 bg-black/60 flex flex-col items-center justify-center p-2 rounded-sm shadow-[inset_0_0_15px_rgba(0,255,255,0.05)]`}>
              {/* Box brackets */}
              <div className="absolute -top-[1.5px] -left-[1.5px] w-2 h-2 border-t-2 border-l-2 border-cyan-400"></div>
              <div className="absolute -top-[1.5px] -right-[1.5px] w-2 h-2 border-t-2 border-r-2 border-cyan-400"></div>
              <div className="absolute -bottom-[1.5px] -left-[1.5px] w-2 h-2 border-b-2 border-l-2 border-cyan-400"></div>
              <div className="absolute -bottom-[1.5px] -right-[1.5px] w-2 h-2 border-b-2 border-r-2 border-cyan-400"></div>

              <span className="text-[7.5px] tracking-[0.22em] text-cyan-500/80 font-bold uppercase mb-1">Javis</span>
              <span className={`tracking-[0.04em] text-[11px] text-center leading-tight font-bold font-mono transition-all duration-500 ${theme.text}`}>
                {assistantPresence.label}
              </span>
              <span className="text-[6.5px] tracking-[0.08em] text-cyan-500/80 font-semibold mt-1 text-center leading-tight">{pendingTasks} tasks watched</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Spoken UI Command Center Status */}
      <div className="absolute bottom-[16%] flex flex-col items-center gap-4 w-full">
        <div className="flex items-center gap-3 font-mono tracking-widest text-xs font-bold bg-black/40 border border-cyan-950/60 px-4 py-1.5 rounded-full shadow-[inset_0_0_10px_rgba(0,255,255,0.02)]">
          <div className={`w-2 h-2 rounded-full border transition-all duration-500 ${
            isMicActive
              ? 'border-green-500 bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]'
              : cognitiveState === 'speaking'
                ? 'border-blue-500 bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]'
                : cognitiveState === 'thinking'
                  ? 'border-amber-500 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                  : cognitiveState === 'searching'
                    ? 'border-emerald-500 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                    : 'border-cyan-500 bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]'
          }`}></div>
          <span className={`transition-all duration-500 uppercase text-[10px] tracking-[0.25em] ${
            isMicActive
              ? 'text-green-400 font-bold'
              : cognitiveState === 'speaking'
                ? 'text-blue-400'
                : cognitiveState === 'thinking'
                  ? 'text-amber-400 animate-pulse'
                  : cognitiveState === 'searching'
                    ? 'text-emerald-400 animate-pulse'
                    : 'text-cyan-400'
          }`}>
            {assistantPresence.label}
          </span>
        </div>
        <div className="max-w-[440px] text-center px-5 py-2 rounded-md border border-cyan-950/60 bg-black/35 shadow-[inset_0_0_12px_rgba(6,182,212,0.04)]">
          <div className="text-[11px] text-cyan-200/90 leading-relaxed font-mono tracking-[0.02em]">{assistantPresence.detail}</div>
          <div className="text-[9px] text-cyan-500/90 mt-1 font-mono">{assistantBriefing}</div>
        </div>
         
        {/* Real Network RX/TX Traffic Visualizer */}
        <div className="flex items-end justify-center gap-[3px] h-4 w-48 opacity-80" title="Network RX/TX Telemetry Waveform">
          {waveHeights.map((animateHeight, i) => {
            return (
              <motion.div 
                key={i}
                animate={{ height: animateHeight }}
                transition={{ duration: 0.1, ease: "linear" }}
                className={`w-[3px] transition-colors duration-500 ${theme.barColor}`}
              />
            );
          })}
        </div>

        {/* Dynamic VoIP network status display for interactive feedback */}
        {isMicActive && webrtcStats && webrtcStats.state === 'connected' && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[9px] text-green-400 font-mono tracking-widest uppercase text-center mt-1 border border-green-800/30 px-3 py-1 bg-green-950/20 shadow-[inset_0_0_8px_rgba(34,197,94,0.1)] rounded-sm"
          >
            RTT: {displayRtt} | Jitter: {formatMetricValue(webrtcStats.jitter, 'ms')} | Bitrate: {displayBitrate}
          </motion.div>
        )}
      </div>
    </div>
  );
}
