import React, { useState, useEffect } from 'react';
import { Bell, Settings, Volume2, VolumeX } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { JarvisLogo } from './JarvisLogo';
import { buildPersonalGreeting } from '../services/personalAssistantPresentation';

export function Header({ 
  onOpenSettings, 
  isMuted = false, 
  onToggleMute = () => {} 
}: { 
  onOpenSettings: () => void; 
  isMuted?: boolean; 
  onToggleMute?: () => void;
}) {
  const [time, setTime] = useState(new Date());
  const { t } = useI18n();
  const [operatorName, setOperatorName] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateIdentity = () => {
      const saved = localStorage.getItem('jarvis_operator_name');
      if (saved) {
        setOperatorName(saved);
      } else {
        setOperatorName(t.tStark);
      }
    };
    
    updateIdentity();
    window.addEventListener('identity-updated', updateIdentity);
    return () => window.removeEventListener('identity-updated', updateIdentity);
  }, [t.tStark]);

  const greeting = buildPersonalGreeting(operatorName || t.tStark, time);

  return (
    <header className="flex justify-between items-center w-full text-cyan-500 font-mono p-4 pb-2 border-b border-cyan-950 select-none bg-black/40 backdrop-blur-sm">
      {/* Left: JARVIS Brand & Motto */}
      <div className="flex items-center gap-3">
        {/* Holographic Arc-Reactor Brand Logo Emblem */}
        <JarvisLogo size={32} />
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-[0.25em] text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{t.brandName}</span>
          <span className="text-[8px] tracking-[0.08em] text-cyan-500/90 font-semibold normal-case">{greeting}</span>
        </div>
      </div>

      {/* Center: System Status & Time */}
      <div className="hidden md:flex items-center gap-10 text-[10px] tracking-widest text-cyan-600">
        <div className="flex items-center gap-2 border border-cyan-950 bg-cyan-950/5 px-3 py-1 rounded">
          <span>{t.systemStatus}</span>
          <span className="flex items-center gap-1.5 font-bold text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
            </span>
            {t.statusOptimal}
          </span>
        </div>

        <div className="flex items-center gap-2 border border-cyan-950 bg-cyan-950/5 px-3 py-1 rounded">
          <span>{t.localTime}</span>
          <span className="font-bold text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,0.5)] tracking-wider">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>
      </div>

      {/* Right: Notification Cog and Stark Identification */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleMute}
          className="text-cyan-600 hover:text-cyan-400 hover:scale-105 active:scale-95 transition-all p-1.5 border border-transparent hover:border-cyan-900/30 rounded" 
          title={isMuted ? t.lblUnmute : t.lblMute}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-500/90 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
        </button>
        <button className="text-cyan-600 hover:text-cyan-400 hover:scale-105 active:scale-95 transition-all p-1.5 border border-transparent hover:border-cyan-900/30 rounded" title={t.alertNotifications}>
          <Bell className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={onOpenSettings}
          className="text-cyan-600 hover:text-cyan-400 hover:scale-105 active:scale-95 transition-all p-1.5 border border-transparent hover:border-cyan-900/30 rounded" 
          title={t.systemConfig}
        >
          <Settings className="w-3.5 h-3.5 animate-[spin_8s_linear_infinite]" />
        </button>
        
        {/* Glowing identity pod */}
        <div className="flex items-center gap-2 border border-cyan-800/40 bg-cyan-950/20 px-3.5 py-1.5 rounded-full text-cyan-300 font-bold tracking-[0.15em] text-[9px] select-none hover:border-cyan-500/60 hover:text-white transition-all cursor-pointer shadow-[inset_0_0_10px_rgba(0,255,255,0.05)]">
          <span>{operatorName || t.tStark}</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]"></span>
          </span>
        </div>
      </div>
    </header>
  );
}
