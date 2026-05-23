import React from 'react';
import { Upload } from 'lucide-react';

export function FileUpload() {
    return (
        <div className="h-44 flex flex-col mb-4 font-mono text-[11px]">
            <div className="text-cyan-500 tracking-widest border-b border-cyan-800/50 pb-2 mb-2 flex items-center opacity-80 uppercase">
                <span className="w-1.5 h-1.5 bg-cyan-500 mr-2 inline-block shadow-[0_0_5px_rgba(0,255,255,0.8)]"></span> FILE UPLOAD
            </div>
            
            <div className="flex-1 border border-cyan-800/50 hover:border-cyan-500/50 transition-colors bg-cyan-950/10 flex flex-col items-center justify-center cursor-pointer relative group text-cyan-600">
                <Upload className="w-6 h-6 mb-3 opacity-60 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                <div className="tracking-[0.15em]">Drop file here <span className="opacity-50 mx-1">or</span> Click to Browse</div>
                <div className="text-[9px] mt-3 opacity-40 tracking-widest flex gap-2">
                    <span>Images</span>&middot;<span>Video</span>&middot;<span>Audio</span>&middot;<span>PDF</span>&middot;<span>Docs</span>&middot;<span>Code</span>&middot;<span>Data</span>
                </div>
            </div>
            <div className="mt-2 text-cyan-700/60 text-center tracking-widest text-[9px]">
                No file loaded - drop or click above to upload
            </div>
        </div>
    );
}
