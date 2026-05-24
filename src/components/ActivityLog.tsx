import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';
import { useI18n } from '../services/i18n';

export function ActivityLog({ logs }: { logs: string[] }) {
    const logRef = useRef<HTMLDivElement>(null);
    const { t } = useI18n();
    const [corePower, setCorePower] = useState(98);
    const [heapHeadroom, setHeapHeadroom] = useState(100);
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

        const updateSkinSpecs = () => {
            const skin = localStorage.getItem('jarvis_active_skin') || 'cyan';
            if (skin === 'cyan') {
                // No-op for now
            } else if (skin === 'emerald') {
            } else if (skin === 'amber') {
            } else if (skin === 'red') {
            }
        };

        updateArmor();
        updateSkinSpecs();
        window.addEventListener('identity-updated', updateArmor);
        window.addEventListener('skin-updated', updateSkinSpecs);
        return () => {
            window.removeEventListener('identity-updated', updateArmor);
            window.removeEventListener('skin-updated', updateSkinSpecs);
        };
    }, []);

    // Sync armor status with server-side system stats periodically
    useEffect(() => {
        let active = true;
        const fetchVitals = async () => {
            try {
                const res = await fetch('/api/system/stats');
                if (res.ok && active) {
                    const data = await res.json();
                    if (data.corePower !== undefined) setCorePower(data.corePower);
                    if (data.heapHeadroom !== undefined) setHeapHeadroom(data.heapHeadroom);
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

    // Formatting for log lines

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
                            <span className="text-cyan-400 font-bold">
                                {corePower}%
                            </span>
                        </div>
                        <div className="h-1 bg-black/50 w-full overflow-hidden border border-cyan-950/40">
                            <div 
                                className="h-full transition-all duration-700 bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                                style={{ width: `${Math.min(100, corePower)}%` }}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-[8px] tracking-[0.2em] uppercase mb-1.5 text-cyan-500/80">
                            <span>{t.lblHeapHeadroom}</span>
                            <span className="text-cyan-400 font-bold">{heapHeadroom}%</span>
                        </div>
                        <div className="h-1 bg-black/50 w-full overflow-hidden border border-cyan-950/40">
                            <div 
                                className="h-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)] transition-all duration-700" 
                                style={{ width: `${heapHeadroom}%` }}
                            />
                        </div>
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
                                    {isUser ? <strong className="text-cyan-300 font-bold mr-1">OPERATOR // </strong> : ''}
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
