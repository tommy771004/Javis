import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, RefreshCw, Cpu, Activity, Zap } from 'lucide-react';
import { playCalibrationSynth } from '../services/audioSynth';
import { REBOOT_SEQUENCE_EVENT, resolveRebootProbePhase, type RebootSequencePhase, type RebootSequenceResponse } from '../services/rebootSequence';
import { resolveRebootProbeDelayMs } from '../services/truthfulCapabilityPolicies';

export function SpectrumRebootOverlay() {
  const [isRebooting, setIsRebooting] = useState(false);
  const [activeSkin, setActiveSkin] = useState('cyan');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [sensorData, setSensorData] = useState({ temp: 45, load: 1.21 });
  const [sequence, setSequence] = useState<RebootSequenceResponse | null>(null);

  const applyPhase = (phase: RebootSequencePhase | undefined) => {
    if (!phase) return;
    setProgress(phase.progress);
    setCurrentStep(phase.message);
  };

  useEffect(() => {
    const handleRebootRequested = (event: Event) => {
      const customEvent = event as CustomEvent<RebootSequenceResponse>;
      if (!customEvent.detail) return;

      const skin = localStorage.getItem('jarvis_active_skin') || 'cyan';
      setActiveSkin(skin);
      setSequence(customEvent.detail);
      setIsRebooting(true);
      applyPhase(customEvent.detail.phases.find(phase => phase.id === 'preflight'));
      
      playCalibrationSynth();
    };

    window.addEventListener(REBOOT_SEQUENCE_EVENT, handleRebootRequested as EventListener);
    return () => {
      window.removeEventListener(REBOOT_SEQUENCE_EVENT, handleRebootRequested as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isRebooting || !sequence) return;

    let isSubscribed = true;
    let hasSeenDisconnect = false;
    let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
    const probeDelayMs = resolveRebootProbeDelayMs(sequence.probeIntervalMs);

    const applyPhaseById = (phaseId: RebootSequencePhase['id']) => {
      applyPhase(sequence.phases.find(phase => phase.id === phaseId));
    };

    const pollForRecovery = async () => {
      applyPhaseById('awaiting-shutdown');
      watchdogTimer = setTimeout(() => {
        if (!isSubscribed) return;
        setCurrentStep('CTRL: RESTART ACKNOWLEDGED, BUT PROCESS HANDOFF HAS NOT BEEN OBSERVED YET. STILL WAITING FOR AN ACTUAL DISCONNECT/RECOVERY CYCLE.');
      }, Math.max(6000, sequence.shutdownDelayMs * 4));

      while (isSubscribed) {
        try {
          const statsRes = await fetch('/api/system/stats', { cache: 'no-store' });
          if (!statsRes.ok) {
            throw new Error(`HTTP ${statsRes.status}`);
          }

          const stats = await statsRes.json();
          if (!isSubscribed) return;

          setSensorData({
            temp: stats.gpuTemperature || 45,
            load: stats.osProcessCount ? parseFloat((stats.osProcessCount / 200).toFixed(2)) : 1.21
          });

          const nextState = resolveRebootProbePhase({
            hasSeenDisconnect,
            probeSucceeded: true,
          });
          hasSeenDisconnect = nextState.hasSeenDisconnect;

          if (nextState.phase === 'reconnected') {
            applyPhaseById('reconnect');
            const dbRes = await fetch('/api/system/database-health', { cache: 'no-store' });
            const dbHealth = dbRes.ok ? await dbRes.json() : null;
            if (!isSubscribed) return;

            applyPhase({
              id: 'complete',
              progress: 100,
              message: `CTRL: CONTROL PLANE ONLINE. UPTIME ${Math.floor(stats.uptime || 0)}s | SQLITE ${String(dbHealth?.integrityStatus || 'unknown').toUpperCase()} | MCP STATUS REACHABLE.`,
            });
            if (!isSubscribed) return;
            setIsRebooting(false);
            setSequence(null);
            return;
          }

          applyPhaseById('awaiting-shutdown');
        } catch (_error) {
          const nextState = resolveRebootProbePhase({
            hasSeenDisconnect,
            probeSucceeded: false,
          });
          hasSeenDisconnect = nextState.hasSeenDisconnect;
          applyPhaseById('offline');
        }

        await new Promise(resolve => setTimeout(resolve, probeDelayMs));
      }
    };

    pollForRecovery().catch((err: any) => {
      if (!isSubscribed) return;
      setProgress(100);
      setCurrentStep(`CTRL: RESTART MONITOR FAILED: ${err.message}`);
      setIsRebooting(false);
      setSequence(null);
    });

    return () => {
      isSubscribed = false;
      if (watchdogTimer) clearTimeout(watchdogTimer);
    };
  }, [isRebooting, sequence]);

  const getSkinData = () => {
    // Generate derived aesthetics from real hardware metrics
    const dynamicWavelength = (base: number) => `${base + Math.floor(sensorData.temp / 10)} nm`;

    switch (activeSkin) {
      case 'emerald':
        return {
          title: 'EMERALD MONITOR',
          wavelength: `${dynamicWavelength(530)} [Nominal thermal band]`,
          flux: `${sensorData.load} active load`,
          color: 'text-emerald-500',
          borderColor: 'border-emerald-500/55',
          glowColor: 'rgba(16, 185, 129, 0.25)',
          barColor: 'bg-emerald-500',
        };
      case 'amber':
        return {
          title: 'AMBER MONITOR',
          wavelength: `${dynamicWavelength(590)} [Elevated thermal band]`,
          flux: `${sensorData.load} active load`,
          color: 'text-amber-500',
          borderColor: 'border-amber-500/55',
          glowColor: 'rgba(245, 158, 11, 0.25)',
          barColor: 'bg-amber-500',
        };
      case 'red':
        return {
          title: 'RED MONITOR',
          wavelength: `${dynamicWavelength(650)} [High thermal band]`,
          flux: `${sensorData.load} active load [watch]`,
          color: 'text-red-500',
          borderColor: 'border-red-500/55',
          glowColor: 'rgba(239, 68, 68, 0.25)',
          barColor: 'bg-red-500',
        };
      case 'cyan':
      default:
        return {
          title: 'CYAN MONITOR',
          wavelength: `${dynamicWavelength(480)} [Nominal thermal band]`,
          flux: `${sensorData.load} active load`,
          color: 'text-cyan-500',
          borderColor: 'border-cyan-500/55',
          glowColor: 'rgba(6, 182, 212, 0.25)',
          barColor: 'bg-cyan-500',
        };
    }
  };

  const specs = getSkinData();

  return (
    <AnimatePresence>
      {isRebooting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center font-mono overflow-hidden"
        >
          {/* Neon Grid Scanline backdrop */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.04),_rgba(0,255,0,0.01),_rgba(0,0,255,0.04))] bg-[size:100%_4px,_6px_100%] pointer-events-none opacity-85" />
          
          {/* Holographic Glowing Scanner Overlay sweeping top-to-bottom */}
          <div className="absolute top-0 left-0 w-full h-1 bg-[linear-gradient(to_bottom,transparent,currentColor,transparent)] animate-[scanSweeper_1.5s_infinite_linear] opacity-40"
               style={{ color: activeSkin === 'cyan' ? '#06b6d4' : activeSkin === 'emerald' ? '#10b981' : activeSkin === 'amber' ? '#f59e0b' : '#ef4444' }} 
          />

          <style>{`
            @keyframes scanSweeper {
              0% { top: 0%; opacity: 0.8; }
              50% { opacity: 0.3; }
              100% { top: 100%; opacity: 0.8; }
            }
            @keyframes crtFlicker {
              0% { opacity: 0.96; }
              50% { opacity: 0.99; }
              100% { opacity: 0.95; }
            }
            .crt-flicker-matrix {
              animation: crtFlicker 0.15s infinite;
            }
          `}</style>

          {/* Glitch Overlay scanline band */}
          <div className="absolute top-1/3 left-0 w-full h-12 bg-white/5 pointer-events-none blur-sm mix-blend-overlay animate-pulse" />

          {/* Interactive Calibration Box */}
          <div className={`crt-flicker-matrix p-8 max-w-lg w-[90%] border bg-black/90 relative ${specs.borderColor}`}
               style={{ boxShadow: `0px 0px 40px ${specs.glowColor}` }}>
            
            {/* Tech details corner markings */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-current" style={{ color: specs.barColor.replace('bg-', '') }} />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-current" style={{ color: specs.barColor.replace('bg-', '') }} />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-current" style={{ color: specs.barColor.replace('bg-', '') }} />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-current" style={{ color: specs.barColor.replace('bg-', '') }} />

            {/* Title Block */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
              <RefreshCw className={`w-6 h-6 animate-spin ${specs.color}`} />
              <div>
                <h1 className={`text-sm sm:text-base font-black tracking-[0.2em] leading-tight ${specs.color}`}>
                  CONTROL PLANE RESTART
                </h1>
                <span className="text-[9px] text-white/40 tracking-widest uppercase">
                  LIVE RESTART MONITOR
                </span>
              </div>
            </div>

            {/* Info details grid */}
            <div className="grid grid-cols-2 gap-4 text-[10.5px] border-b border-white/5 pb-4 mb-4">
              <div className="space-y-1">
                <span className="text-white/45 block font-bold uppercase tracking-wider text-[8px]">
                  ACTIVE PROFILE
                </span>
                <span className="text-white font-extrabold block">
                  {specs.title}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-white/45 block font-bold uppercase tracking-wider text-[8px]">
                  THERMAL BAND
                </span>
                <span className="text-white block font-mono">
                  {specs.wavelength}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-white/45 block font-bold uppercase tracking-wider text-[8px]">
                  PROCESS LOAD
                </span>
                <span className="text-white font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {specs.flux}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-white/45 block font-bold uppercase tracking-wider text-[8px]">
                  CONTROL LINK
                </span>
                <span className="text-emerald-400 animate-pulse font-bold">
                  ● HEALTH PROBE ACTIVE
                </span>
              </div>
            </div>

            {/* Reboot Phase Load status log */}
            <div className="h-10 text-[9.5px] leading-relaxed select-none text-white/70 bg-white/5 border border-white/10 p-2 font-mono scrollbar-none overflow-hidden text-left">
              {currentStep}
            </div>

            {/* Sleek digital percentage indicator list */}
            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center text-[10.5px] font-bold">
                <span className={`${specs.color} animate-pulse tracking-widest`}>
                  OBSERVING PROCESS HANDOFF...
                </span>
                <span className="font-extrabold text-white text-right">
                  {progress}%
                </span>
              </div>
              
              {/* Load Bar */}
              <div className="h-2 w-full bg-slate-950/90 border border-white/10 p-0.5 rounded-sm">
                <div 
                  className={`h-full transition-all duration-75 ${specs.barColor}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center text-[8.5px] text-white/35 font-mono">
              <span>SECURITY LEVEL: HERMES_SYSTEM_SENSITIVE</span>
              <span>INDEX_REF: {activeSkin.toUpperCase()}_SPECTRA_RELOAD_05</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
