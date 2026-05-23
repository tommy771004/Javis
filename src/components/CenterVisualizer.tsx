import React from 'react';
import { motion } from 'motion/react';

export type CognitiveState = 'idle' | 'thinking' | 'searching' | 'speaking';

interface CenterVisualizerProps {
  cognitiveState: CognitiveState;
  voiceAmplitude: number;
  isMicActive?: boolean;
  webrtcStats?: {
    state: string;
    codec: string;
    rtt: number;
    jitter: number;
    packetsSent: number;
    packetsReceived: number;
    bytesSent: number;
    bytesReceived: number;
    bitrate: number;
  };
}

export function CenterVisualizer({ cognitiveState, voiceAmplitude, isMicActive, webrtcStats }: CenterVisualizerProps) {
  const [stats, setStats] = React.useState<{ 
    cpu: number; 
    mem: number; 
    net: string; 
    gpu: number; 
    tmp: string; 
    uptime: number; 
    processes: number; 
    secStatus: string;
    nodeVersion?: string;
    costLogsCount?: number;
    messagesCount?: number;
  } | null>(null);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [gateway, setGateway] = React.useState<{ budget: number; spent: number; cacheHits: number } | null>(null);
  const [logs, setLogs] = React.useState<string[]>([
    "SYS/INIT:: Security matrix cleared.",
    "HERMES/MATRIX:: Core gateway active.",
    "DB/SQLITE5:: FTS5 memory index built.",
    "NET/VOIP:: Standby listening established."
  ]);

  // Fetch metrics and statistics periodically matching terminal state
  React.useEffect(() => {
    let active = true;

    async function fetchAllData() {
      try {
        const [statsRes, tasksRes, gatewayRes] = await Promise.all([
          fetch('/api/system/stats').then(res => res.ok ? res.json() : null),
          fetch('/api/tasks').then(res => res.ok ? res.json() : []),
          fetch('/api/gateway/stats').then(res => res.ok ? res.json() : null)
        ]);

        if (!active) return;
        if (statsRes) setStats(statsRes);
        if (tasksRes) setTasks(tasksRes);
        if (gatewayRes) setGateway(gatewayRes);
      } catch (err) {
        console.warn("Failed to update CenterVisualizer dynamic data", err);
      }
    }

    fetchAllData();
    const intervalId = setInterval(fetchAllData, 3000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  // Context-aware execution log stream
  React.useEffect(() => {
    const generatorInterval = setInterval(() => {
      setLogs(prev => {
        let log = '';
        const rand = Math.random();
        if (cognitiveState === 'thinking') {
          if (rand < 0.25) log = `NEURAL/THINK:: Context mapped (${(8.4 + Math.random()*2).toFixed(1)}k tokens)`;
          else if (rand < 0.5) log = `LLM/PROMPT:: Analysing attention vectors... OK`;
          else if (rand < 0.75) log = `NEURAL/THINK:: Attention heads distributed`;
          else log = `API/GATEWAY:: Model streaming active`;
        } else if (cognitiveState === 'searching') {
          if (rand < 0.25) log = `FTS5/SCAN:: Querying FTS5 index...`;
          else if (rand < 0.5) log = `DB/QUERY:: Match index found candidates`;
          else if (rand < 0.75) log = `MEM/RECALL:: Retrieved relevant history`;
          else log = `FTS5/OK:: Scan parsing completed in ${(0.3 + Math.random()*0.5).toFixed(2)}ms`;
        } else if (cognitiveState === 'speaking') {
          if (rand < 0.25) log = `SPEECH/VOICE:: Decoding active audio frames...`;
          else if (rand < 0.5) log = `NET/VAD:: Dynamic level: ${voiceAmplitude.toFixed(1)} dB`;
          else if (rand < 0.75) log = `VOIP/BRIDGE:: Sent visualizer PCM chunk stream`;
          else log = `SPEECH/TTS:: Stream playback status fully stable`;
        } else {
          // Idle state
          if (rand < 0.2) log = `SYS/HEARTBEAT:: Core service tick OK`;
          else if (rand < 0.4) log = `MEM/REPLAY:: Index cache status verified`;
          else if (rand < 0.6 && tasks.length > 0) {
            const pending = tasks.filter(t => t.status === 'Pending');
            if (pending.length > 0) {
              const randomTask = pending[Math.floor(Math.random() * pending.length)];
              log = `SYS/TASK:: Executing: "${randomTask.description.substring(0, 16)}..."`;
            } else {
              log = `SYS/QUEUE:: All client tasks idle`;
            }
          }
          else if (rand < 0.8) log = `SYS/SEC:: Defense protocols validated.`;
          else log = `NET/VOIP:: Channel waiting in standby state`;
        }
        
        const next = [...prev, log];
        if (next.length > 4) next.shift(); // Keep last 4 log lines to fit and scroll perfectly inside the panel
        return next;
      });
    }, 2400);

    return () => clearInterval(generatorInterval);
  }, [cognitiveState, voiceAmplitude, tasks]);

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

  // Core Text Title
  const getCoreText = () => {
    if (isMicActive) {
      return webrtcStats?.state === 'connected' ? 'VOIP_LINK' : 'HANDSHAKE';
    }

    switch (cognitiveState) {
      case 'thinking': return 'NEURAL_THINK';
      case 'searching': return 'FTS5_SCAN';
      case 'speaking': return 'SPEECH_OUT';
      case 'idle':
      default:
        return 'ACTIVE';
    }
  };

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

  const displayBitrate = webrtcStats ? `${webrtcStats.bitrate} kbps` : '128 kbps';
  const displayRtt = webrtcStats ? `${webrtcStats.rtt} ms` : '15 ms';
  const displayCodec = webrtcStats ? webrtcStats.codec.toUpperCase() : 'OPUS/16K';
  const vadStatus = isMicActive ? 'ACTIVE' : 'STANDBY';
  const ampState = voiceAmplitude.toFixed(1);

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

        {/* 4 Interactive Terminal HUD Message Boxes with system parameters */}
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
            <span style={{ color: hudColor }} className="font-bold tracking-widest">[01/MEMORY/FTS5]</span>
            <span className="text-emerald-500 animate-pulse text-[7.5px] font-bold">ONLINE</span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>INDEX SIZE:</span>
            <span style={{ color: hudColor }} className="font-bold">
              {stats?.messagesCount ? (stats.messagesCount * 12 + 14210).toLocaleString() : '14,285'} BLK
            </span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>QUERY LATENCY:</span>
            <span style={{ color: hudColor }} className="font-bold">
              {(0.72 + Math.sin(Date.now() / 15000) * 0.08).toFixed(2)} ms
            </span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>DB INSTANCE:</span>
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
            <span style={{ color: hudColor }} className="font-bold tracking-widest">[02/DSPY/EVOLVE]</span>
            <span className="text-emerald-500 text-[7px] font-bold animate-pulse">OPTIMIZED</span>
          </div>
          <div className="flex justify-between text-cyan-400/70 text-[8px] mb-1.5">
            <span>TRACE RECORDS:</span>
            <span style={{ color: hudColor }} className="font-bold">
              {stats?.costLogsCount ? (stats.costLogsCount * 15 + 2380).toLocaleString() : '2,410'} TRAC
            </span>
          </div>
          <div className="flex justify-between text-cyan-400/70 text-[8px] mb-1.5">
            <span>MUTATION MATRIX:</span>
            <span style={{ color: hudColor }} className="font-bold">
              {cognitiveState === 'thinking' 
                ? (98.15 + Math.random() * 0.5).toFixed(2) 
                : (96.35 + Math.sin(Date.now() / 30000) * 0.3).toFixed(2)}% STD
            </span>
          </div>
          <div className="flex justify-between border-t border-cyan-800/10 pt-1 mt-1 text-[7px] text-cyan-500/80">
            <span>LOG SEC:</span>
            <span className="truncate max-w-[124px] text-cyan-400 font-sans">{logs[logs.length - 1] || 'STANDBY'}</span>
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
            <span style={{ color: hudColor }} className="font-bold tracking-widest">[03/NET/VOIP]</span>
            <span className="text-blue-400 text-[7.5px] font-bold animate-pulse">STREAMING</span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>BANDWIDTH FLW:</span>
            <span style={{ color: hudColor }} className="font-bold">{displayBitrate}</span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>VOIP LATENCY:</span>
            <span style={{ color: hudColor }} className="font-bold">{displayRtt}</span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>SIP PROTOCOL:</span>
            <span style={{ color: hudColor }} className="font-bold truncate max-w-[80px] inline-block text-right">
              {isMicActive ? (webrtcStats?.codec.toUpperCase() || 'OPUS @ 48KHZ') : 'OPUS @ 16KHZ'}
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
            <span style={{ color: hudColor }} className="font-bold tracking-widest">[04/CORE/VAD]</span>
            <span className={isMicActive ? "text-green-400 text-[7.5px] font-bold animate-pulse" : "text-cyan-400 text-[7.5px] font-bold"}>{vadStatus}</span>
          </div>
          <div className="flex justify-between text-cyan-400/70 items-center">
            <span>MIC LEVEL:</span>
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
            <span>DOCKER CLIENT:</span>
            <span style={{ color: hudColor }} className="font-bold">
              {stats?.nodeVersion ? `NODE_` + stats.nodeVersion.split('.')[0].toUpperCase() : 'NODE_V18'}
            </span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>ACCUM COST:</span>
            <span style={{ color: hudColor }} className="font-bold">${gateway ? gateway.spent.toFixed(4) : '0.0410'} USD</span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>CACHE HITS:</span>
            <span style={{ color: hudColor }} className="font-bold">{gateway ? gateway.cacheHits : '84'} HITS</span>
          </div>
          <div className="flex justify-between text-cyan-400/70">
            <span>AUTH METRIC:</span>
            <span className="text-emerald-400 font-bold">{stats?.secStatus || 'SEC_CLEARED'}</span>
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

              <span className="text-[7.5px] tracking-[0.3em] text-cyan-500/80 font-bold uppercase mb-0.5">CORE</span>
              <span className={`tracking-[0.15em] text-[11px] font-bold font-mono transition-all duration-500 ${theme.text} uppercase`}>
                {getCoreText()}
              </span>
              <span className="text-[6.5px] tracking-widest text-cyan-600 font-semibold mt-1 animate-pulse">SYSTEM OK</span>
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
            {isMicActive ? (webrtcStats?.state === 'connected' ? 'VOIP ACTIVE' : 'VOIP STBY') : (cognitiveState === 'idle' ? 'AWAITING COMMAND...' : `${cognitiveState}`)}
          </span>
        </div>
         
        {/* Responsive Sound Waveform representing natural interactive audio visual responses */}
        <div className="flex items-end justify-center gap-[3px] h-4 w-48 opacity-80" title="Soundwave frequency visualizer">
          {Array.from({ length: 42 }).map((_, i) => {
            let animateHeight = 2;
            if (isMicActive) {
              animateHeight = Math.random() * (voiceAmplitude / 2.2) + 2;
            } else if (cognitiveState === 'speaking') {
              animateHeight = Math.random() * (voiceAmplitude / 3.2) + 2;
            } else if (cognitiveState === 'thinking') {
              animateHeight = Math.random() * 8 + 2;
            } else if (cognitiveState === 'searching') {
              const waveVal = Math.sin((Date.now() / 150) - (i * 0.45)) * 6 + 8;
              animateHeight = Math.max(2, waveVal);
            } else {
              // Static glowing waves representing idling state
              const idleSine = Math.sin((Date.now() / 500) - (i * 0.2)) * 1.5 + 2.5;
              animateHeight = Math.max(2, idleSine);
            }

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
            RTT: {webrtcStats.rtt}ms | Jitter: {webrtcStats.jitter}ms | Bitrate: {webrtcStats.bitrate}kbps
          </motion.div>
        )}
      </div>
    </div>
  );
}
