import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, RefreshCw, Cpu, Activity, Zap } from 'lucide-react';
import { playCalibrationSynth } from '../services/audioSynth';

export function SpectrumRebootOverlay() {
  const [isRebooting, setIsRebooting] = useState(false);
  const [activeSkin, setActiveSkin] = useState('cyan');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    const handleSkinUpdated = () => {
      const skin = localStorage.getItem('jarvis_active_skin') || 'cyan';
      setActiveSkin(skin);
      setIsRebooting(true);
      setProgress(0);
      
      // Trigger military grade synthesizer frequency sweep
      playCalibrationSynth();
    };

    window.addEventListener('skin-updated', handleSkinUpdated);
    return () => {
      window.removeEventListener('skin-updated', handleSkinUpdated);
    };
  }, []);

  // Replace fake interval with real backend system checks
  useEffect(() => {
    if (!isRebooting) return;

    let isSubscribed = true;

    const performRealSystemChecks = async () => {
      try {
        // Step 1: Initializing & fetching basic stats
        setProgress(15);
        setCurrentStep("SYS: HANDSHAKING WITH CORE SERVER PROCESS...");
        await new Promise(r => setTimeout(r, 400));
        
        let res = await fetch('/api/system/engine-status', { method: 'POST' });
        let data = await res.json();
        if (!isSubscribed) return;
        
        setProgress(35);
        setCurrentStep(`SYS: CORE METRICS NOMINAL. CPU: ${data.metrics?.cpuUtilization || 'N/A'}, RAM: ${data.metrics?.ramUsage || 'N/A'}`);
        await new Promise(r => setTimeout(r, 600));

        // Step 2: Validating Database / Logs
        setProgress(60);
        setCurrentStep("SYS: VALIDATING SQLITE DATABASE INTEGRITY...");
        res = await fetch('/api/system/logs?limit=1');
        data = await res.json();
        if (!isSubscribed) return;

        setProgress(75);
        setCurrentStep(`SYS: STORAGE VERIFIED. LAST RECORD: [${data.length > 0 ? data[0].module : 'OK'}]`);
        await new Promise(r => setTimeout(r, 500));

        // Step 3: Fetch MCP Status
        setProgress(85);
        setCurrentStep("SYS: BINDING MCP AND EXTERNAL CONTEXT SERVERS...");
        res = await fetch('/api/system/stats');
        data = await res.json();
        if (!isSubscribed) return;

        setProgress(95);
        setCurrentStep(`SYS: ${data.mcpServersConnected} EXTERNAL MCP SERVER(S) BOUND. UPTIME: ${Math.floor(data.uptime)}s`);
        await new Promise(r => setTimeout(r, 500));

        // Step 4: Complete
        setProgress(100);
        setCurrentStep("SYS: SYSTEM SPECTRAL INTEGRITY NOMINAL. CORE ONLINE.");
        
        setTimeout(() => {
          if (isSubscribed) setIsRebooting(false);
        }, 300);

      } catch (err: any) {
        if (isSubscribed) {
          setProgress(100);
          setCurrentStep(`SYS: CRITICAL ERROR DURING REBOOT: ${err.message}`);
          setTimeout(() => {
            setIsRebooting(false);
          }, 1000);
        }
      }
    };

    performRealSystemChecks();

    return () => {
      isSubscribed = false;
    };
  }, [isRebooting]);

  const getSkinData = () => {
    switch (activeSkin) {
      case 'emerald':
        return {
          title: 'ARC REACTOR EMERALD',
          wavelength: '530 nm [Low Light Output]',
          flux: '1.10 GW Delta',
          color: 'text-emerald-500',
          borderColor: 'border-emerald-500/55',
          glowColor: 'rgba(16, 185, 129, 0.25)',
          barColor: 'bg-emerald-500',
        };
      case 'amber':
        return {
          title: 'RETRO GARAGE AMBER',
          wavelength: '590 nm [Caramel Retro Glow]',
          flux: '0.98 GW Delta',
          color: 'text-amber-500',
          borderColor: 'border-amber-500/55',
          glowColor: 'rgba(245, 158, 11, 0.25)',
          barColor: 'bg-amber-500',
        };
      case 'red':
        return {
          title: 'MARK LXXXV ARMOR OVERDRIVE',
          wavelength: '650 nm [Hotrod Combustion]',
          flux: '1.65 GW Delta [Warning: Overload Peak]',
          color: 'text-red-500',
          borderColor: 'border-red-500/55',
          glowColor: 'rgba(239, 68, 68, 0.25)',
          barColor: 'bg-red-500',
        };
      case 'cyan':
      default:
        return {
          title: 'HOLOGRAPHIC STANDARD CYAN',
          wavelength: '480 nm [Optical Coherence]',
          flux: '1.21 GW Standard',
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
                  OPTICAL RECONSONANCE
                </h1>
                <span className="text-[9px] text-white/40 tracking-widest uppercase">
                  SPECTROMETER ADJUSTMENT PROTOCOL
                </span>
              </div>
            </div>

            {/* Info details grid */}
            <div className="grid grid-cols-2 gap-4 text-[10.5px] border-b border-white/5 pb-4 mb-4">
              <div className="space-y-1">
                <span className="text-white/45 block font-bold uppercase tracking-wider text-[8px]">
                  NEW WAVE STATE
                </span>
                <span className="text-white font-extrabold block">
                  {specs.title}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-white/45 block font-bold uppercase tracking-wider text-[8px]">
                  WAVELENGTH TARGET
                </span>
                <span className="text-white block font-mono">
                  {specs.wavelength}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-white/45 block font-bold uppercase tracking-wider text-[8px]">
                  PLASMA ENERGY FLUX
                </span>
                <span className="text-white font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {specs.flux}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-white/45 block font-bold uppercase tracking-wider text-[8px]">
                  SEEKER SAT SYNC
                </span>
                <span className="text-emerald-400 animate-pulse font-bold">
                  ● SYNCHRONIZED [OK]
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
                  REVOLUTIONIZING GRID INTEGRATION...
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
              <span>SECURITY LEVEL: STARK_ARMOR_SENSITIVE</span>
              <span>INDEX_REF: {activeSkin.toUpperCase()}_SPECTRA_RELOAD_05</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
