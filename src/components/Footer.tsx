import React from 'react';

export function Footer() {
    return (
        <footer className="w-full flex justify-between items-center text-[10px] font-mono text-cyan-700 tracking-widest pt-3 border-t border-cyan-900/40 select-none opacity-80 mt-2">
            <div className="space-x-4">
                <span className="cursor-pointer hover:text-cyan-400 transition-colors">[F4] Mute</span>
                <span className="cursor-pointer hover:text-cyan-400 transition-colors">[F11] Fullscreen</span>
            </div>
            <div>
                FatihMakes Industries - MARK XXXIX - CLASSIFIED
            </div>
            <div>
                © FATIHMAKES
            </div>
        </footer>
    );
}
