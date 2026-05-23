import React from 'react';
import { motion } from 'motion/react';

export function CenterVisualizer({ isListening }: { isListening: boolean }) {
    return (
        <div className="flex-1 relative flex flex-col items-center justify-center border-l border-r border-cyan-900/40 px-6 mx-2 select-none h-full overflow-hidden">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-700/50"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-700/50"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-700/50"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-700/50"></div>

            <div className="relative w-[450px] h-[450px] flex items-center justify-center scale-[0.65] sm:scale-75 md:scale-90 lg:scale-100 transform origin-center">
                
                {/* Outer Ring */}
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border border-cyan-800/40"
                    style={{ borderStyle: 'dashed', borderWidth: '2px' }}
                />

                {/* Outer Ring 2 */}
                <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[15px] rounded-full border border-cyan-900/80"
                    style={{ borderStyle: 'dashed', borderWidth: '1px' }}
                />
                
                {/* Arc lines */}
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute inset-[30px] rounded-full border-t border-b border-cyan-700/60" />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="absolute inset-[40px] rounded-full border-l border-r border-cyan-800/40" />

                {/* Middle Ring */}
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[70px] rounded-full border border-cyan-700/30"
                    style={{ borderStyle: 'solid', borderWidth: '2px' }}
                />

                {/* Inner Ring */}
                <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[90px] rounded-full border border-cyan-600/20"
                />

                {/* Core Gradient */}
                <div className="absolute inset-[80px] rounded-full bg-[radial-gradient(circle,rgba(0,100,200,0.4)_0%,rgba(0,20,40,0.8)_60%,rgba(0,10,20,0.95)_100%)] flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full shadow-[inset_0_0_50px_rgba(0,150,255,0.15)]"></div>
                    <span className="text-cyan-400/90 tracking-[0.4em] text-lg font-mono drop-shadow-[0_0_15px_rgba(0,255,255,0.6)] relative z-10 w-full text-center">
                        J.A.R.V.I.S
                    </span>
                </div>
            </div>

            <div className="absolute bottom-[20%] flex flex-col items-center gap-4">
                 <div className="flex items-center gap-3 text-green-400 font-mono tracking-widest text-sm font-bold">
                    <div className={`w-2 h-2 rounded-full border border-green-500 bg-green-500 ${isListening ? 'animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'shadow-[0_0_5px_rgba(34,197,94,0.5)]'}`}></div>
                    {isListening ? 'LISTENING' : 'ONLINE'}
                 </div>
                 
                 {/* Audio visualizer bar placeholder */}
                 <div className="flex items-end justify-center gap-[3px] h-4 w-48 opacity-60">
                    {Array.from({ length: 40 }).map((_, i) => (
                        <motion.div 
                            key={i}
                            animate={{ height: isListening ? Math.random() * 16 + 2 : (i % 2 === 0 ? 3 : 2) }}
                            transition={{ duration: 0.15, repeat: isListening ? Infinity : 0, repeatType: 'reverse' }}
                            className="w-[3px] bg-cyan-600"
                        />
                    ))}
                 </div>
            </div>
        </div>
    );
}
