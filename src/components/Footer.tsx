import React from 'react';
import { useI18n } from '../services/i18n';

export function Footer({ 
    isMuted = false, 
    onToggleMute = () => {} 
}: { 
    isMuted?: boolean; 
    onToggleMute?: () => void; 
}) {
    const { t } = useI18n();

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
        <footer className="w-full flex justify-between items-center text-[10px] font-mono text-cyan-700 tracking-widest pt-3 border-t border-cyan-950/40 select-none opacity-80 mt-2">
            <div className="space-x-4">
                <span onClick={onToggleMute} className="cursor-pointer hover:text-cyan-400 transition-colors">
                    {isMuted ? t.lblUnmute : t.lblMute}
                </span>
                <span onClick={toggleFullscreen} className="cursor-pointer hover:text-cyan-400 transition-colors">
                    {t.lblFullscreen}
                </span>
            </div>
            <div className="hidden md:block">
                {t.lblClassified}
            </div>
            <div>
                {t.lblCopyright}
            </div>
        </footer>
    );
}
