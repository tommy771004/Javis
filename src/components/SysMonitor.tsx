import React, { useState, useEffect } from 'react';

export function SysMonitor({ 
    isHermesActive = false, 
    onToggleHermes = () => {} 
}: { 
    isHermesActive?: boolean; 
    onToggleHermes?: () => void; 
}) {
    const [stats, setStats] = useState({
        cpu: 0,
        mem: 57,
        net: '0KB/s',
        gpu: 14,
        tmp: 'N/A'
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => ({
                ...prev,
                cpu: Math.floor(Math.random() * 20),
                mem: 50 + Math.floor(Math.random() * 20),
                gpu: 10 + Math.floor(Math.random() * 15),
            }));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const StatBar = ({ label, value, type = 'percent' }: { label: string, value: number | string, type?: 'percent' | 'text' }) => (
        <div className="mb-4 border border-cyan-900/50 p-2 relative bg-cyan-950/10">
            <div className="flex justify-between text-[10px] tracking-widest mb-2 opacity-80">
                <span>{label}</span>
                <span className={typeof value === 'number' && value > 50 ? 'text-amber-500' : 'text-cyan-500'}>
                    {value}{type === 'percent' ? '%' : ''}
                </span>
            </div>
            {type === 'percent' && (
                <div className="h-1 bg-cyan-950 w-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ${Number(value) > 50 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-cyan-500 shadow-[0_0_8px_rgba(0,255,255,0.5)]'}`} 
                        style={{ width: `${value}%` }}
                    />
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full flex lg:flex-col font-mono text-cyan-500 h-full select-none flex-col sm:flex-row lg:flex-col gap-4 lg:gap-0">
            <div className="flex-1 sm:w-1/2 lg:w-full flex flex-col h-full">
                <div className="text-[10px] tracking-widest border-b border-cyan-800/50 pb-2 mb-4 flex items-center">
                    <span className="w-1.5 h-1.5 bg-cyan-500 mr-2 shadow-[0_0_5px_rgba(0,255,255,0.8)]"></span> SYS MONITOR
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-cyan">
                    <StatBar label="CPU" value={stats.cpu} />
                    <StatBar label="MEM" value={stats.mem} />
                    <StatBar label="NET" value={stats.net} type="text" />
                    <StatBar label="GPU" value={stats.gpu} />
                    <StatBar label="TMP" value={stats.tmp} type="text" />
 
                    <div className="mt-2 border border-cyan-900/50 p-3 text-[10px] opacity-80 tracking-widest space-y-1">
                        <div className="flex"><span className="w-16">UP</span> <span className="text-green-400">00:49</span></div>
                        <div className="flex"><span className="w-16">PROC</span> <span>256</span></div>
                        <div className="flex"><span className="w-16">OS</span> <span>WIN</span></div>
                    </div>
                </div>
            </div>

            <div className="sm:w-1/2 lg:w-full mt-4 sm:mt-0 lg:mt-4 space-y-2 flex flex-col justify-end lg:justify-start pb-2">
                {isHermesActive ? (
                    <div 
                        onClick={onToggleHermes}
                        className="border border-emerald-500 bg-emerald-500/15 text-emerald-300 text-center py-2 text-[10px] tracking-[0.2em] cursor-pointer hover:bg-emerald-500/25 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse"
                    >
                        HERMES MATRIX<br/>ACTIVE
                    </div>
                ) : (
                    <div 
                        onClick={onToggleHermes}
                        className="border border-green-500/50 text-green-400 text-center py-2 text-[10px] tracking-[0.2em] cursor-pointer hover:bg-green-500/10 transition-colors"
                    >
                        AI CORE<br/>ACTIVE
                    </div>
                )}
                <div className="border border-cyan-800/50 text-center py-2 text-[10px] tracking-[0.2em] opacity-70 hover:opacity-100 hover:border-cyan-500 transition-all cursor-pointer">
                    SEC<br/>CLEARED
                </div>
                <div className="border border-cyan-800/50 text-center py-2 text-[10px] tracking-[0.2em] opacity-70 hover:opacity-100 hover:border-cyan-500 transition-all cursor-pointer">
                    PROTOCOL<br/>XXXVIII
                </div>
            </div>
        </div>
    );
}
