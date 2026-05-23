import React, { useEffect, useRef } from 'react';

export function ActivityLog({ logs }: { logs: string[] }) {
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="flex-1 flex flex-col mb-4 font-mono text-[11px] min-h-[200px]">
             <div className="text-cyan-500 tracking-widest border-b border-cyan-800/50 pb-2 mb-2 flex items-center opacity-80 uppercase">
                <span className="w-1.5 h-1.5 bg-cyan-500 mr-2 inline-block shadow-[0_0_5px_rgba(0,255,255,0.8)]"></span> ACTIVITY LOG
            </div>
            <div ref={logRef} className="flex-1 overflow-y-auto space-y-2 scrollbar-cyan pr-2 text-amber-500">
                {logs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap leading-relaxed max-w-full break-words">
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
}
