import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Wifi, Shield, ShieldCheck, Zap, Power } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { isSystemStatsEvent, parseSystemStreamMessage, resolveStreamAgeMs } from '../services/systemStreamEvents';

export function SysMonitor({ 
    isHermesActive = false, 
    onToggleHermes = () => {} 
}: { 
    isHermesActive?: boolean; 
    onToggleHermes?: () => void; 
}) {
    const { t } = useI18n();

    const [stats, setStats] = useState({
        cpu: 0,
        mem: 0,
        net: '0KB/s',
        diskIo: '0.0 MB/s WAIT',
        gpu: 0,
        neuralSync: '99.55',
        rxSpeed: 0,
        txSpeed: 0,
        tmp: 'N/A',
        uptime: 0,
        processes: 0,
        os: 'WIN',
        secStatus: 'SEC_REQUIRED',
        powerDraw: 'N/A',
        fans: 'N/A',
        voltage: 'N/A'
    });

    const [satelliteName, setSatelliteName] = useState('LOCAL_SQLITE_DB');

    useEffect(() => {
        const updateSatellite = () => {
            const saved = localStorage.getItem('jarvis_satellite_name');
            if (saved) {
                setSatelliteName(saved);
            } else {
                setSatelliteName(t.lblStarkSat4);
            }
        };

        updateSatellite();
        window.addEventListener('identity-updated', updateSatellite);
        return () => window.removeEventListener('identity-updated', updateSatellite);
    }, [t.lblStarkSat4]);

    const [apiLatency, setApiLatency] = useState(0);

    useEffect(() => {
        let active = true;
        const stream = new EventSource('/api/system/stream');
        stream.onmessage = (event) => {
            if (!active) return;
            const parsed = parseSystemStreamMessage(event.data);
            if (isSystemStatsEvent(parsed)) {
                setStats(parsed.stats as any);
                setApiLatency(resolveStreamAgeMs(parsed.timestamp));
            }
        };
        stream.onerror = () => {
            console.warn("System stats stream disconnected");
        };
        return () => {
            active = false;
            stream.close();
        };
    }, []);



    const StatBar = ({ label, value, type = 'percent' }: { label: string, value: number | string, type?: 'percent' | 'text' }) => (
        <div className="mb-3 border border-cyan-950/60 p-2 relative bg-cyan-950/5 hover:bg-cyan-950/10 transition-colors">
            <div className="flex justify-between text-[9px] tracking-[0.2em] mb-1.5 opacity-85">
                <span>{label}</span>
                <span className={typeof value === 'number' && value > 75 ? 'text-amber-400 font-bold' : 'text-cyan-400 font-bold'}>
                    {value}{type === 'percent' ? '%' : ''}
                </span>
            </div>
            {type === 'percent' && (
                <div className="h-1 bg-black/50 w-full overflow-hidden border border-cyan-950/40 relative">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ type: "spring", stiffness: 40, damping: 12, mass: 0.8 }}
                        className={`h-full ${
                            Number(value) > 75 
                                ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
                                : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                        }`} 
                    />
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col font-mono text-cyan-500 select-none pr-1 scrollbar-cyan gap-5 overflow-y-auto">
            
            {/* PANEL 1: ASSISTANT WORKSPACE PULSE */}
            <div className="border border-cyan-950 bg-black/20 p-3.5 relative">
                {/* Visual corners */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400"></div>

                <div className="flex justify-between items-center text-[10px] tracking-widest border-b border-cyan-950 pb-2 mb-3">
                    <div className="flex items-center font-bold">
                        <span className="w-1.5 h-1.5 bg-cyan-400 mr-2 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.8)]"></span>
                        Assistant pulse
                    </div>
                    <span className="text-[8px] text-cyan-600 font-bold">LIVE LOCAL</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-cyan-600 tracking-wider">Workspace pulse</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-2xl font-bold font-sans text-cyan-300 tracking-tight transition-all duration-300">
                                {apiLatency || 'N/A'}
                            </span>
                            <span className="text-[8px] text-cyan-600 font-bold uppercase tracking-widest">ms</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center h-10 overflow-hidden relative border border-cyan-950/40 bg-black/30 rounded pr-1 mt-1">
                        <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                            <path d="M 0 15 H 100 M 0 5 H 100 M 0 25 H 100 M 20 0 V 30 M 40 0 V 30 M 60 0 V 30 M 80 0 V 30" stroke="rgba(0,103,120,0.06)" strokeWidth="0.5" />
                            <motion.path
                                d="M 0 15 L 15 15 L 20 5 L 23 25 L 26 15 L 45 15 L 50 15 L 55 5 L 58 25 L 61 15 L 85 15 L 100 15"
                                fill="transparent"
                                stroke="#22d3ee"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray="140"
                                animate={{
                                    strokeDashoffset: [140, 0]
                                }}
                                transition={{
                                    duration: apiLatency > 0 ? Math.min(3, Math.max(0.8, apiLatency / 180)) : 1.2,
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                            />
                            <div className="absolute top-1 right-1">
                                <Activity className="w-2.5 h-2.5 text-cyan-400" />
                            </div>
                        </svg>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-cyan-950/60 text-[10px]">
                    <div className="flex flex-col">
                        <span className="text-cyan-600 text-[8px] uppercase tracking-widest">Local processes</span>
                        <span className="text-cyan-300 font-bold mt-0.5">{stats.processes || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-cyan-600 text-[8px] uppercase tracking-widest">Stream age</span>
                        <span className="text-green-400 font-bold mt-0.5 animate-pulse">{apiLatency} ms</span>
                    </div>
                </div>
            </div>

            {/* PANEL 2: SYSTEM // RT-MONITOR */}
            <div className="border border-cyan-950 bg-black/20 p-3.5 relative">
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400"></div>

                <div className="flex justify-between items-center text-[10px] tracking-widest border-b border-cyan-950 pb-2 mb-3">
                    <div className="flex items-center font-bold">
                        <span className="w-1.5 h-1.5 bg-cyan-400 mr-2 shadow-[0_0_6px_rgba(34,211,238,0.8)]"></span>
                        {t.lblSystemAutomation}
                    </div>
                    <span className="text-[8px] text-cyan-600 font-bold">{t.lblRtMonitor}</span>
                </div>

                {/* Circular Gauge for CPU LOAD */}
                <div className="mb-4 border border-cyan-950/60 p-3 bg-cyan-950/5 hover:bg-cyan-950/10 transition-colors flex flex-col items-center justify-center relative">
                    <div className="text-[9px] tracking-[0.2em] mb-3 opacity-85 self-start uppercase font-bold text-cyan-500/80">
                        {t.lblCpuLoad}
                    </div>
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            {/* Background track circle */}
                            <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                className="stroke-cyan-950/60" 
                                strokeWidth="6" 
                                fill="transparent" 
                            />
                            {/* Level dynamic progress circle */}
                            <motion.circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                className={stats.cpu > 75 ? "stroke-amber-400" : "stroke-cyan-400"} 
                                strokeWidth="6" 
                                fill="transparent" 
                                strokeDasharray="251.2"
                                animate={{
                                    strokeDashoffset: 251.2 - (251.2 * Math.min(100, Math.max(0, stats.cpu))) / 100
                                }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                strokeLinecap="round"
                                style={{
                                    filter: stats.cpu > 75 ? "drop-shadow(0 0 4px rgba(245, 158, 11, 0.6))" : "drop-shadow(0 0 4px rgba(34, 211, 238, 0.6))"
                                }}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                            <span className={`text-base font-bold font-sans tracking-tight ${stats.cpu > 75 ? 'text-amber-400' : 'text-cyan-300'}`}>
                                {stats.cpu}%
                            </span>
                            <span className="text-[7px] text-cyan-600 font-bold uppercase tracking-widest">UTILI</span>
                        </div>
                    </div>
                </div>

                <StatBar label={t.lblRamMemory} value={stats.mem} />
                <StatBar label={t.lblGpuCore} value={stats.gpu} />
                
                <div className="mt-3 border-t border-cyan-950/60 pt-3 grid grid-cols-2 gap-x-2 gap-y-2 text-[10px] tracking-wider text-cyan-600/90 font-mono">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-cyan-600 uppercase tracking-widest">{t.lblNetSpeed}</span>
                        <span className="text-cyan-300 font-bold mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{stats.net}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[8px] text-cyan-600 uppercase tracking-widest">{t.lblSysTemp}</span>
                        <span className="text-cyan-300 font-bold mt-0.5">{stats.tmp}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] text-cyan-600 uppercase tracking-widest">POWER DRAW</span>
                        <span className="text-cyan-300 font-bold mt-0.5">{stats.powerDraw}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[8px] text-cyan-600 uppercase tracking-widest">FAN SPEED</span>
                        <span className="text-cyan-300 font-bold mt-0.5">{stats.fans}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] text-cyan-600 uppercase tracking-widest">CPU VOLTAGE</span>
                        <span className="text-cyan-300 font-bold mt-0.5">{stats.voltage}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[8px] text-cyan-600 uppercase tracking-widest">DISK I/O</span>
                        <span className="text-cyan-300 font-bold mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{stats.diskIo || '0.0 MB/s WAIT'}</span>
                    </div>
                </div>
            </div>

            {/* PANEL 3: SYSTEM // UP-LINK SATELLITE SYSTEM */}
            <div className="border border-cyan-950 bg-black/20 p-3.5 relative flex flex-col items-center">
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400"></div>

                <div className="w-full flex justify-between items-center text-[10px] tracking-widest border-b border-cyan-950 pb-2 mb-3">
                    <div className="flex items-center font-bold">
                        <span className="w-1.5 h-1.5 bg-cyan-400 mr-2 shadow-[0_0_6px_rgba(34,211,238,0.8)]"></span>
                        {t.lblSystemUplink}
                    </div>
                    <span className="text-[8px] text-cyan-600 font-bold">{satelliteName.toUpperCase()}</span>
                </div>

                {/* Rotating Cryptographic Radar Graphic matching the user design */}
                <div className="w-24 h-24 rounded-full border border-cyan-900/40 relative flex items-center justify-center my-2 select-none overflow-hidden bg-cyan-950/5">
                    {/* Sweep radar ray */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_65%,rgba(34,211,238,0.45)_100%)] rounded-full origin-center"
                    />
                    
                    {/* Orbit lines & lock indicator */}
                    <div className="absolute w-[80%] h-[80%] rounded-full border border-cyan-950 border-dashed animate-[spin_10s_linear_infinite]" />
                    <div className="absolute w-[55%] h-[55%] rounded-full border border-cyan-900/30 flex items-center justify-center">
                        <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Shield className="w-4 h-4 text-cyan-400 fill-cyan-400/10 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
                        </motion.div>
                    </div>

                    {/* Encrypted link beacon */}
                    <div className="absolute top-1 left-2 pl-0.5 text-[7px] text-cyan-400 animate-pulse font-bold">ENCRYPTED</div>
                </div>

                {/* Satellite Connection description */}
                <div className="text-center font-mono text-[9px] tracking-widest mt-1 uppercase text-cyan-400/80">
                    <span className="text-cyan-500 font-bold">{t.lblSignalSecure}:</span> {satelliteName} ({stats.net || '5.5 GB/s'})
                </div>
            </div>

            {/* BUTTONS MATRIX IN HUD */}
            <div className="space-y-2 mt-1">
                {isHermesActive ? (
                    <button 
                        onClick={onToggleHermes}
                        className="w-full border border-emerald-500 bg-emerald-500/15 text-emerald-300 py-2.5 text-[9px] tracking-[0.2em] font-bold cursor-pointer hover:bg-emerald-500/25 transition-all shadow-[0_0_12px_rgba(16,185,129,0.30)] flex items-center justify-center gap-2"
                    >
                        <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400/30 animate-pulse" />
                        {t.lblHermesCoreActive}
                    </button>
                ) : (
                    <button 
                        onClick={onToggleHermes}
                        className="w-full border border-cyan-500/50 text-cyan-400 py-2.5 text-[9px] tracking-[0.2em] font-bold cursor-pointer hover:bg-cyan-500/10 transition-colors flex items-center justify-center gap-2"
                    >
                        <Power className="w-3 h-3 text-cyan-400 animate-spin" />
                        {t.lblActivateCognitive}
                    </button>
                )}

                {stats.secStatus === 'SEC_CLEARED' ? (
                    <div className="border border-green-500/40 bg-green-950/10 text-green-400 text-center py-2.5 text-[9px] font-bold tracking-[0.2em] flex items-center justify-center gap-1.5 opacity-90">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                        {t.lblSecurityCleared}
                    </div>
                ) : (
                    <div className="border border-amber-500/60 bg-amber-950/10 text-amber-500 text-center py-2.5 text-[9px] font-bold tracking-[0.2em] flex items-center justify-center gap-1.5 animate-pulse">
                        <Shield className="w-3.5 h-3.5 text-amber-500" />
                        {t.lblAuthProtocol}
                    </div>
                )}
            </div>
        </div>
    );
}
