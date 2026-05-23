import React, { useEffect, useRef, useState } from 'react';
import { Shield, Zap, BarChart2, Power, Terminal } from 'lucide-react';
import { useI18n } from '../services/i18n';

export function ActivityLog({ logs }: { logs: string[] }) {
    const logRef = useRef<HTMLDivElement>(null);
    const { t } = useI18n();
    const [shieldActive, setShieldActive] = useState(false);
    const [overloaded, setOverloaded] = useState(false);
    const [corePower, setCorePower] = useState(98);
    const [structural, setStructural] = useState(100);
    const [armorModel, setArmorModel] = useState('Mark LXXXV');

    useEffect(() => {
        const updateArmor = () => {
            const saved = localStorage.getItem('jarvis_armor_model');
            if (saved) {
                setArmorModel(saved);
            } else {
                setArmorModel('Mark LXXXV');
            }
        };

        updateArmor();
        window.addEventListener('identity-updated', updateArmor);
        return () => window.removeEventListener('identity-updated', updateArmor);
    }, []);

    // Sync armor status with server-side system stats periodically
    useEffect(() => {
        let active = true;
        const fetchVitals = async () => {
            try {
                const res = await fetch('/api/system/stats');
                if (res.ok && active) {
                    const data = await res.json();
                    if (data.shieldActive !== undefined) setShieldActive(data.shieldActive);
                    if (data.reactorOverdrive !== undefined) setOverloaded(data.reactorOverdrive);
                    if (data.corePower !== undefined) setCorePower(data.corePower);
                    if (data.structural !== undefined) setStructural(data.structural);
                }
            } catch (err) {
                console.warn("Failed to fetch server system vitals", err);
            }
        };

        fetchVitals();
        const interval = setInterval(fetchVitals, 2000);
        return () => {
            active = false;
            interval && clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);

    // Format logs with simulated military hours:minutes:seconds
    const getFormattedTimestamp = (index: number) => {
        const d = new Date();
        // Slightly offset times based on position for a realistic past log history
        const offsetSeconds = (logs.length - 1 - index) * 12;
        d.setSeconds(d.getSeconds() - offsetSeconds);
        return d.toLocaleTimeString('en-US', { hour12: false });
    };

    // Button event dispatchers calling backend command endpoints
    const handleShieldToggle = async () => {
        try {
            const res = await fetch("/api/system/control", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command: 'shield' })
            });
            if (res.ok) {
                const data = await res.json();
                setShieldActive(data.shieldActive);
                
                window.dispatchEvent(new CustomEvent('append-sys-log', {
                    detail: {
                        message: `SYS: DEFENSE PERIMETER SHIELD GAIN MATRIX ${data.shieldActive ? 'ACTIVE' : 'STANDBY'} (100% INTENSITY).`,
                        speak: data.speak
                    }
                }));
            }
        } catch (err) {
            console.error("Shield toggle API error", err);
        }
    };

    const handleOverdrivePower = async () => {
        try {
            const res = await fetch("/api/system/control", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command: 'overdrive' })
            });
            if (res.ok) {
                const data = await res.json();
                setOverloaded(data.reactorOverdrive);
                setCorePower(data.corePower);
                
                window.dispatchEvent(new CustomEvent('append-sys-log', {
                    detail: {
                        message: data.reactorOverdrive 
                          ? "SYS: ARC REACTOR CONVERSION MATRIX OVERCHARGED TO 125% FORCE." 
                          : "SYS: ARC REACTOR OUTPUT CALIBRATED TO NOMINAL 98%.",
                        speak: data.speak
                    }
                }));
            }
        } catch (err) {
            console.error("Reactor overdrive API error", err);
        }
    };

    const handleSatPing = async () => {
        try {
            const res = await fetch("/api/system/control", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command: 'satlink' })
            });
            if (res.ok) {
                const data = await res.json();
                
                window.dispatchEvent(new CustomEvent('append-sys-log', {
                    detail: {
                        message: "SYS: STARK-7 TRANSCEIVER ORBIT PING SUCCESSFUL. SAT-LINK ESTABLISHED.",
                        speak: data.speak
                    }
                }));
            }
        } catch (err) {
            console.error("Satellite sync API error", err);
        }
    };

    const handleVitalsRecalibrate = async () => {
        try {
            const res = await fetch("/api/system/control", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command: 'recalibrate' })
            });
            if (res.ok) {
                const data = await res.json();
                setStructural(data.structural);
                
                window.dispatchEvent(new CustomEvent('append-sys-log', {
                    detail: {
                        message: "SYS: NEURAL MAPPING RECALIBRATED. ARMOR DIAGNOSTICS CLEAN.",
                        speak: data.speak
                    }
                }));
            }
        } catch (err) {
            console.error("Vitals recalibrate API error", err);
        }
    };

    return (
        <div className="flex-1 flex flex-col mb-4 font-mono text-[11px] min-h-[280px] select-none gap-4">
            
            {/* SUB-PANEL 1: SYSTEM // ARMOR STATUS */}
            <div className="border border-cyan-950 bg-black/20 p-3.5 relative">
                {/* Visual corners */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400"></div>

                <div className="flex justify-between items-center text-[10px] tracking-widest border-b border-cyan-950 pb-2 mb-3">
                    <div className="flex items-center font-bold">
                        <span className="w-1.5 h-1.5 bg-cyan-400 mr-2 shadow-[0_0_6px_rgba(34,211,238,0.8)]"></span>
                        {t.lblArmorStatus}
                    </div>
                    <span className="text-[8px] text-cyan-600 font-bold">{armorModel.toUpperCase()}</span>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-2.5">
                    <div>
                        <div className="flex justify-between text-[8px] tracking-[0.2em] uppercase mb-1.5 text-cyan-500/80">
                            <span>{t.lblPowerCore}</span>
                            <span className={`${overloaded ? 'text-amber-400 animate-pulse font-bold' : 'text-cyan-400 font-bold'}`}>
                                {corePower}%
                            </span>
                        </div>
                        <div className="h-1 bg-black/50 w-full overflow-hidden border border-cyan-950/40">
                            <div 
                                className={`h-full transition-all duration-700 ${overloaded ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]' : 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]'}`}
                                style={{ width: `${Math.min(100, corePower)}%` }}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-[8px] tracking-[0.2em] uppercase mb-1.5 text-cyan-500/80">
                            <span>{t.lblStructuralIntegrity}</span>
                            <span className="text-cyan-400 font-bold">{structural}%</span>
                        </div>
                        <div className="h-1 bg-black/50 w-full overflow-hidden border border-cyan-950/40">
                            <div 
                                className="h-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)] transition-all duration-700" 
                                style={{ width: `${structural}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* DEFENSE SYSTEMS BUTTONS */}
                <div className="mt-4">
                    <div className="text-[8px] text-cyan-600 tracking-widest font-bold uppercase mb-2">{t.lblSystemInteraction}</div>
                    <div className="grid grid-cols-4 gap-2">
                        {/* Shield Toggle */}
                        <button 
                            onClick={handleShieldToggle}
                            className={`p-2 border flex flex-col items-center justify-center gap-1.5 hover:bg-cyan-950/20 active:scale-95 transition-all rounded cursor-pointer ${shieldActive ? 'border-green-500/50 bg-green-950/15 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.35)]' : 'border-cyan-950/70 text-cyan-500 hover:border-cyan-600'}`}
                            title="Deflection Shields Toggle"
                        >
                            <Shield className={`w-4 h-4 ${shieldActive ? 'animate-pulse' : ''}`} />
                            <span className="text-[6.5px] uppercase font-bold tracking-wider">{t.lblShield}</span>
                        </button>
                        
                        {/* Core Overdrive */}
                        <button 
                            onClick={handleOverdrivePower}
                            className={`p-2 border flex flex-col items-center justify-center gap-1.5 hover:bg-cyan-950/20 active:scale-95 transition-all rounded cursor-pointer ${overloaded ? 'border-amber-500/50 bg-amber-950/15 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.35)]' : 'border-cyan-950/70 text-cyan-500 hover:border-cyan-600'}`}
                            title="Arc Reactor Overcharge"
                        >
                            <Zap className="w-4 h-4" />
                            <span className="text-[6.5px] uppercase font-bold tracking-wider">{t.lblCorePow}</span>
                        </button>

                        {/* Satellite link sync */}
                        <button 
                            onClick={handleSatPing}
                            className="p-2 border border-cyan-950/70 text-cyan-500 hover:border-cyan-500 hover:bg-cyan-950/20 active:scale-95 transition-all rounded cursor-pointer"
                            title="Sync Stark Satellites Link"
                        >
                            <BarChart2 className="w-4 h-4" />
                            <span className="text-[6.5px] uppercase font-bold tracking-wider">{t.lblSatLink}</span>
                        </button>

                        {/* Recalibration diagnostics */}
                        <button 
                            onClick={handleVitalsRecalibrate}
                            className="p-2 border border-cyan-950/70 text-cyan-500 hover:border-cyan-500 hover:bg-cyan-950/20 active:scale-95 transition-all rounded cursor-pointer"
                            title="Recalibrate System Diagnostics"
                        >
                            <Power className="w-4 h-4" />
                            <span className="text-[6.5px] uppercase font-bold tracking-wider">{t.lblCalibrate}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* SUB-PANEL 2: SYSTEM // RT-LOG */}
            <div className="flex-1 flex flex-col border border-cyan-950 bg-black/20 p-3.5 relative min-h-[160px]">
                {/* Visual corners */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400"></div>

                <div className="text-cyan-500 tracking-widest border-b border-cyan-950 pb-2 mb-2.5 flex items-center justify-between opacity-95">
                    <div className="flex items-center font-bold">
                        <Terminal className="w-3.5 h-3.5 mr-2 text-cyan-400 inline-block" />
                        {t.lblRtLog}
                    </div>
                </div>

                <div ref={logRef} className="flex-1 overflow-y-auto space-y-1.5 scrollbar-cyan pr-2 text-cyan-400/90 leading-tight">
                    {logs.map((log, i) => {
                        const isError = log.includes("ERROR") || log.toLowerCase().includes("fail") || log.toLowerCase().includes("warning");
                        const isUser = log.startsWith("USER:");
                        const isSys = log.startsWith("SYS:");
                        
                        // Clean clean labels
                        let content = log;
                        if (log.startsWith("USER: ")) content = log.substring(6);
                        else if (log.startsWith("SYS: ")) content = log.substring(5);

                        return (
                            <div key={i} className={`whitespace-pre-wrap tracking-wide leading-relaxed max-w-full break-words border-b border-cyan-950/10 pb-0.5 flex gap-1.5 ${
                                isError ? 'text-red-400 font-bold' : isUser ? 'text-cyan-200' : isSys ? 'text-amber-400/90' : 'text-cyan-400/80'
                            }`}>
                                <span className="text-[9px] text-cyan-600 font-semibold flex-shrink-0">
                                    [{getFormattedTimestamp(i)}]
                                </span>
                                <span className="flex-1 text-[10.5px]">
                                    {isUser ? <strong className="text-cyan-300 font-bold mr-1">T_STARK // </strong> : ''}
                                    {content}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
