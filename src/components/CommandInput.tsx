import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Play, Mic, Maximize2, Terminal } from 'lucide-react';
import { useI18n } from '../services/i18n';

interface CommandInputProps {
    onCommand: (cmd: string) => void;
    isMicActive: boolean;
    setIsMicActive: (active: boolean) => void;
}

export const CommandInput = forwardRef<HTMLTextAreaElement, CommandInputProps>(function CommandInput(
    { onCommand, isMicActive, setIsMicActive },
    forwardedRef
) {
    const { t } = useI18n();
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea height based on content (min 1 row, max 8 rows)
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 18;
        const maxHeight = lineHeight * 8;
        el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
        el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, [input]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onCommand(input);
            setInput('');
            // Reset height after clear
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim()) {
                onCommand(input);
                setInput('');
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                }
            }
        }
        // Shift+Enter: default textarea behaviour inserts \n (no override needed)
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error("Enabling fullscreen failed", err);
            });
        } else {
            document.exitFullscreen().catch((err) => {
                console.error("Exiting fullscreen failed", err);
            });
        }
    };

    return (
        <div className="flex flex-col font-mono text-[11px] select-none gap-3 relative mt-2 border border-cyan-950/60 bg-black/30 p-3.5">
            {/* HUD Bracket Corner Accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400"></div>

            <div className="text-cyan-500 tracking-widest border-b border-cyan-950/80 pb-2 mb-1.5 flex items-center justify-between opacity-95 uppercase">
                <div className="flex items-center font-bold">
                    <Terminal className="w-3.5 h-3.5 mr-2 text-cyan-400" />
                    Talk to Javis
                </div>
                <span className="text-[7.5px] text-cyan-600 tracking-[0.16em] font-semibold font-mono">workspace companion</span>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 relative items-end">
                <textarea
                    ref={(node) => {
                        textareaRef.current = node;
                        if (typeof forwardedRef === 'function') {
                            forwardedRef(node);
                        } else if (forwardedRef) {
                            forwardedRef.current = node;
                        }
                    }}
                    id="chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isMicActive ? 'I am listening. Speak naturally.' : 'Ask me what to do next, or describe the task in plain language.'}
                    rows={1}
                    style={{ resize: 'none', overflowY: 'hidden' }}
                    className="flex-1 bg-cyan-950/10 border border-cyan-900/60 px-3 py-2 text-cyan-100 placeholder:text-cyan-800/60 focus:outline-none focus:border-cyan-500/80 focus:bg-cyan-950/20 text-xs tracking-widest font-mono rounded-sm transition-all leading-[1.5] min-h-[36px]"
                />
                <button
                    type="submit"
                    className="border border-cyan-900/60 hover:border-cyan-400/80 px-4 text-cyan-500 hover:text-cyan-300 hover:bg-cyan-950/40 active:scale-95 transition-all flex items-center justify-center rounded-sm cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.05)] h-9 flex-shrink-0"
                    title="Send to Javis"
                >
                    <Play className="w-3.5 h-3.5 fill-cyan-500/85 hover:fill-cyan-400" />
                </button>
            </form>

            <div className="flex flex-col gap-2">
                {/* Voice Dispatch Channel */}
                <button
                    type="button"
                    onClick={() => setIsMicActive(!isMicActive)}
                    className={`flex items-center justify-center gap-3 py-2 border text-[10px] tracking-[0.2em] font-bold transition-all rounded-sm cursor-pointer active:scale-[0.98] ${
                        isMicActive
                          ? 'border-green-500/50 text-green-400 bg-green-950/20 shadow-[0_0_12px_rgba(34,197,94,0.30)] animate-pulse'
                          : 'border-cyan-950 hover:border-cyan-500/50 text-cyan-600 hover:text-cyan-400/90 bg-cyan-950/10'
                    }`}
                >
                    <Mic className={`w-3.5 h-3.5 ${isMicActive ? 'text-green-400' : 'text-cyan-600'}`} />
                    {isMicActive ? 'Listening now' : 'Open voice channel'}
                </button>

                {/* HTML5 Native Fullscreen Expansion */}
                <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="flex items-center justify-center gap-2 py-1 text-cyan-700 hover:text-cyan-400 tracking-widest hover:bg-cyan-950/15 border border-transparent hover:border-cyan-950/40 active:scale-95 transition-all w-full text-[9px] font-bold uppercase rounded"
                >
                    <Maximize2 className="w-3 h-3" /> {t.lblCinemediaExpanse}
                </button>

                {/* Hint */}
                <p className="text-[8px] text-cyan-800/90 text-center tracking-[0.08em]">A rough instruction is enough. I will help shape it into the next concrete move.</p>
            </div>
        </div>
    );
});
