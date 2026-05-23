import React, { useState } from 'react';
import { Play, Mic, Maximize } from 'lucide-react';

export function CommandInput({ onCommand, isMicActive, setIsMicActive }: { onCommand: (cmd: string) => void, isMicActive: boolean, setIsMicActive: (active: boolean) => void }) {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onCommand(input);
            setInput('');
        }
    };

    return (
        <div className="flex flex-col font-mono text-[11px]">
             <div className="text-cyan-500 tracking-widest border-b border-cyan-800/50 pb-2 mb-2 flex items-center opacity-80 uppercase">
                <span className="w-1.5 h-1.5 bg-cyan-500 mr-2 inline-block shadow-[0_0_5px_rgba(0,255,255,0.8)]"></span> COMMAND INPUT
            </div>
            
            <form onSubmit={handleSubmit} className="flex gap-2 mb-2 h-10">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a command or question..."
                    className="flex-1 bg-transparent border border-cyan-800/50 px-3 text-cyan-100 placeholder:text-cyan-700/60 focus:outline-none focus:border-cyan-500 tracking-widest font-mono"
                />
                <button type="submit" className="border border-cyan-800/50 px-4 text-cyan-500 hover:bg-cyan-900/30 hover:border-cyan-500 transition-colors flex items-center justify-center">
                    <Play className="w-3 h-3 fill-cyan-500 ml-1" />
                </button>
            </form>

            <button 
                type="button"
                onClick={() => setIsMicActive(!isMicActive)}
                className={`flex items-center justify-center gap-3 py-2.5 border tracking-[0.2em] transition-colors ${isMicActive ? 'border-green-500/50 text-green-400 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'border-cyan-800/50 text-cyan-700 hover:border-cyan-500 hover:text-cyan-400'}`}
            >
                <div className={`flex items-center justify-center ${isMicActive ? '' : 'opacity-60'}`}>
                    <Mic className="w-3.5 h-3.5" />
                </div>
                {isMicActive ? 'MICROPHONE ACTIVE' : 'MICROPHONE STANDBY'}
            </button>

            <button type="button" className="mt-2 flex items-center justify-center gap-2 p-1 text-cyan-700/60 hover:text-cyan-400 tracking-widest transition-colors w-full text-[10px]">
                <Maximize className="w-3 h-3" /> FULLSCREEN [F11]
            </button>
        </div>
    );
}
