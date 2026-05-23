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
  // Map cognitive state to colors
  const getColorClasses = () => {
    if (isMicActive) {
      return {
        glow: 'rgba(34,197,94,0.6)',
        text: 'text-green-400 drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]',
        border: 'border-green-800/40',
        borderDash: 'border-green-500/60',
        gradient: 'bg-[radial-gradient(circle,rgba(20,83,45,0.45)_0%,rgba(6,78,59,0.8)_60%,rgba(2,20,10,0.95)_100%)]',
        shadow: 'shadow-[inset_0_0_50px_rgba(34,197,94,0.25)]',
        barColor: 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]'
      };
    }

    switch (cognitiveState) {
      case 'thinking':
        return {
          glow: 'rgba(245,158,11,0.5)',
          text: 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]',
          border: 'border-amber-800/40',
          borderDash: 'border-amber-700/60',
          gradient: 'bg-[radial-gradient(circle,rgba(180,83,9,0.4)_0%,rgba(69,26,3,0.8)_60%,rgba(20,4,0,0.95)_100%)]',
          shadow: 'shadow-[inset_0_0_50px_rgba(245,158,11,0.15)]',
          barColor: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
        };
      case 'searching':
        return {
          glow: 'rgba(16,185,129,0.5)',
          text: 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]',
          border: 'border-emerald-800/40',
          borderDash: 'border-emerald-700/60',
          gradient: 'bg-[radial-gradient(circle,rgba(6,95,70,0.4)_0%,rgba(6,78,59,0.8)_60%,rgba(2,40,20,0.95)_100%)]',
          shadow: 'shadow-[inset_0_0_50px_rgba(16,185,129,0.15)]',
          barColor: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
        };
      case 'speaking':
        return {
          glow: 'rgba(59,130,246,0.6)',
          text: 'text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]',
          border: 'border-blue-700/40',
          borderDash: 'border-blue-500/60',
          gradient: 'bg-[radial-gradient(circle,rgba(29,78,216,0.45)_0%,rgba(30,58,138,0.8)_60%,rgba(3,7,18,0.95)_100%)]',
          shadow: 'shadow-[inset_0_0_50px_rgba(59,130,246,0.25)]',
          barColor: 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
        };
      case 'idle':
      default:
        return {
          glow: 'rgba(0,255,255,0.5)',
          text: 'text-cyan-400/90 drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]',
          border: 'border-cyan-800/40',
          borderDash: 'border-cyan-700/60',
          gradient: 'bg-[radial-gradient(circle,rgba(0,100,200,0.4)_0%,rgba(0,20,40,0.8)_60%,rgba(0,10,20,0.95)_100%)]',
          shadow: 'shadow-[inset_0_0_50px_rgba(0,150,255,0.15)]',
          barColor: 'bg-cyan-600 shadow-[0_0_4px_rgba(6,182,212,0.4)]'
        };
    }
  };

  const theme = getColorClasses();

  // Map state to speed/duration coefficients
  const getDurations = () => {
    if (isMicActive) {
      return { outer: 12, outer2: -10, inner: 4 };
    }

    switch (cognitiveState) {
      case 'thinking':
        return { outer: 8, outer2: 6, inner: 3 };
      case 'searching':
        return { outer: 12, outer2: -10, inner: 5 };
      case 'speaking':
        return { outer: 25, outer2: -20, inner: 8 };
      case 'idle':
      default:
        return { outer: 60, outer2: -50, inner: 15 };
    }
  };

  const speed = getDurations();

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
        return 'J.A.R.V.I.S';
    }
  };

  return (
    <div className="flex-1 relative flex flex-col items-center justify-center border-l border-r border-cyan-900/40 px-6 mx-2 select-none h-full overflow-hidden transition-all duration-500">
      {/* HUD Outer Corner brackets */}
      <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 transition-colors duration-500 ${isMicActive ? 'border-green-700/50' : cognitiveState === 'thinking' ? 'border-amber-700/50' : cognitiveState === 'searching' ? 'border-emerald-700/50' : 'border-cyan-700/50'}`}></div>
      <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 transition-colors duration-500 ${isMicActive ? 'border-green-700/50' : cognitiveState === 'thinking' ? 'border-amber-700/50' : cognitiveState === 'searching' ? 'border-emerald-700/50' : 'border-cyan-700/50'}`}></div>
      <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 transition-colors duration-500 ${isMicActive ? 'border-green-700/50' : cognitiveState === 'thinking' ? 'border-amber-700/50' : cognitiveState === 'searching' ? 'border-emerald-700/50' : 'border-cyan-700/50'}`}></div>
      <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 transition-colors duration-500 ${isMicActive ? 'border-green-700/50' : cognitiveState === 'thinking' ? 'border-amber-700/50' : cognitiveState === 'searching' ? 'border-emerald-700/50' : 'border-cyan-700/50'}`}></div>

      {/* Main Core Graphic */}
      <div className="relative w-[450px] h-[450px] flex items-center justify-center scale-[0.65] sm:scale-75 md:scale-90 lg:scale-100 transform origin-center">
        
        {/* Outer Ring */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: speed.outer, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 rounded-full border transition-colors duration-500 ${theme.border}`}
          style={{ borderStyle: 'dashed', borderWidth: '2px' }}
        />

        {/* Outer Ring 2 */}
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: speed.outer2, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-[15px] rounded-full border transition-colors duration-500 ${theme.border}`}
          style={{ borderStyle: 'dashed', borderWidth: '1px' }}
        />
        
        {/* Arc lines */}
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: speed.inner * 2, repeat: Infinity, ease: "linear" }} 
          className={`absolute inset-[30px] rounded-full border-t border-b transition-colors duration-500 ${theme.borderDash}`} 
        />
        <motion.div 
          animate={{ rotate: -360 }} 
          transition={{ duration: speed.inner * 2.5, repeat: Infinity, ease: "linear" }} 
          className={`absolute inset-[40px] rounded-full border-l border-r transition-colors duration-500 ${theme.border}`} 
        />

        {/* Middle Ring */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: speed.inner, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-[70px] rounded-full border transition-colors duration-500 ${theme.borderDash}`}
          style={{ borderStyle: 'solid', borderWidth: '2px' }}
        />

        {/* Inner Ring */}
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: speed.inner / 1.5, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-[90px] rounded-full border transition-colors duration-500 ${theme.border}`}
          style={{ borderWidth: '1px' }}
        />

        {/* Dynamic Core Sphere */}
        <motion.div 
          animate={{ 
            scale: (isMicActive || cognitiveState === 'speaking') ? [1, 1.06, 1] : [1, 1.02, 1],
            boxShadow: (isMicActive || cognitiveState === 'speaking')
              ? [`0 0 35px ${theme.glow}`, `0 0 55px ${theme.glow}`, `0 0 35px ${theme.glow}`]
              : [`0 0 20px ${theme.glow}`, `0 0 30px ${theme.glow}`, `0 0 20px ${theme.glow}`]
          }}
          transition={{ duration: (isMicActive || cognitiveState === 'speaking') ? 0.25 : 3, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute inset-[80px] rounded-full transition-all duration-500 ${theme.gradient} flex items-center justify-center`}
        >
          <div className={`absolute inset-0 rounded-full transition-all duration-500 ${theme.shadow}`}></div>
          <span className={`tracking-[0.4em] text-lg font-mono relative z-10 w-full text-center transition-all duration-500 ${theme.text}`}>
            {getCoreText()}
          </span>
        </motion.div>
      </div>

      {/* Spoken visualizer Waveform hud */}
      <div className="absolute bottom-[16%] flex flex-col items-center gap-4">
        <div className="flex items-center gap-3 font-mono tracking-widest text-sm font-bold">
          <div className={`w-2 h-2 rounded-full border transition-all duration-500 ${
            isMicActive
              ? 'border-green-500 bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]'
              : cognitiveState === 'speaking'
                ? 'border-blue-500 bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]'
                : cognitiveState === 'thinking'
                  ? 'border-amber-500 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                  : cognitiveState === 'searching'
                    ? 'border-emerald-500 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                    : 'border-cyan-500 bg-cyan-500 shadow-[0_0_5px_rgba(0,255,255,0.5)]'
          }`}></div>
          <span className={`transition-all duration-500 uppercase ${
            isMicActive
              ? 'text-green-400 font-bold tracking-[0.25em]'
              : cognitiveState === 'speaking'
                ? 'text-blue-400'
                : cognitiveState === 'thinking'
                  ? 'text-amber-400 animate-pulse'
                  : cognitiveState === 'searching'
                    ? 'text-emerald-400 animate-pulse'
                    : 'text-cyan-400'
          }`}>
            {isMicActive ? (webrtcStats?.state === 'connected' ? 'VOIP ACTIVE' : 'NEGOTIATING...') : (cognitiveState === 'idle' ? 'ONLINE' : cognitiveState)}
          </span>
        </div>
         
        {/* Responsive Audio Waveform bars */}
        <div className="flex items-end justify-center gap-[3px] h-4 w-48 opacity-75">
          {Array.from({ length: 40 }).map((_, i) => {
            // Compute real heights dynamically
            let animateHeight = 2;
            if (isMicActive) {
              // Real mic capture volume! Bounces dynamically based on physical voice amplitude
              animateHeight = Math.random() * (voiceAmplitude / 2.5) + 2;
            } else if (cognitiveState === 'speaking') {
              animateHeight = Math.random() * (voiceAmplitude / 4) + 2;
            } else if (cognitiveState === 'thinking') {
              animateHeight = Math.random() * 8 + 2;
            } else if (cognitiveState === 'searching') {
              const waveVal = Math.sin((Date.now() / 150) - (i * 0.4)) * 6 + 8;
              animateHeight = Math.max(2, waveVal);
            } else {
              animateHeight = i % 2 === 0 ? 3 : 2;
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

        {/* Dynamic network metrics when WebRTC VoIP is live */}
        {isMicActive && webrtcStats && webrtcStats.state === 'connected' && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[9px] text-green-400 font-mono tracking-widest uppercase text-center mt-2 border border-green-800/30 px-3 py-1 bg-green-950/20 shadow-[inset_0_0_8px_rgba(34,197,94,0.1)] rounded-sm"
          >
            RTT: {webrtcStats.rtt}ms | Jitter: {webrtcStats.jitter}ms | Bitrate: {webrtcStats.bitrate}kbps
          </motion.div>
        )}
      </div>
    </div>
  );
}
