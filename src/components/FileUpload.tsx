import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

export function FileUpload() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [statusText, setStatusText] = useState('No file loaded - drop or click above to upload');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const handleFile = async (file: File) => {
        setIsUploading(true);
        setUploadSuccess(false);
        setStatusText(`Reading ${file.name}...`);

        try {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                const content = e.target?.result as string;
                setStatusText(`Uploading and indexing ${file.name}...`);

                // Send upload transaction to server REST API
                const response = await fetch('/api/workspace/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: file.name,
                        content
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    setUploadSuccess(true);
                    setStatusText(`SUCCESS: ${file.name} saved inside ${data.filePath} and indexed.`);
                } else {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Server error');
                }
                setIsUploading(false);
            };

            reader.onerror = () => {
                throw new Error('Failed to read file on client');
            };

            // Read text files, source code, csv, json, logs
            reader.readAsText(file);

        } catch (err: any) {
            console.error(err);
            setUploadSuccess(false);
            setStatusText(`ERROR: Failed to upload file. ${err.message}`);
            setIsUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleClickArea = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="h-44 flex flex-col mb-4 font-mono text-[11px] select-none">
            <div className="text-cyan-500 tracking-widest border-b border-cyan-800/50 pb-2 mb-2 flex items-center opacity-80 uppercase">
                <span className="w-1.5 h-1.5 bg-cyan-500 mr-2 inline-block shadow-[0_0_5px_rgba(0,255,255,0.8)]"></span> FILE UPLOAD
            </div>

            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
            />
            
            <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleClickArea}
                className={`flex-1 border transition-all bg-cyan-950/10 flex flex-col items-center justify-center cursor-pointer relative group ${
                    isUploading 
                        ? 'border-amber-500/50 text-amber-500 bg-amber-950/5 cursor-wait'
                        : uploadSuccess
                            ? 'border-green-500/50 hover:border-green-400 text-green-500 bg-green-950/5'
                            : 'border-cyan-800/50 hover:border-cyan-500/50 text-cyan-600'
                }`}
            >
                <Upload className={`w-6 h-6 mb-3 transition-opacity ${
                    isUploading 
                        ? 'animate-bounce text-amber-500' 
                        : uploadSuccess 
                            ? 'text-green-400' 
                            : 'opacity-60 group-hover:opacity-100'
                }`} strokeWidth={1.5} />
                
                <div className="tracking-[0.15em] px-2 text-center text-[10px]">
                    {isUploading 
                        ? 'Processing Payload...' 
                        : uploadSuccess 
                            ? 'Upload Complete' 
                            : 'Drop file here or Click to Browse'
                    }
                </div>
                
                <div className="text-[8px] mt-2 opacity-40 tracking-widest flex gap-2">
                    <span>PDF</span>&middot;<span>Docs</span>&middot;<span>Code</span>&middot;<span>Data</span>&middot;<span>Logs</span>
                </div>
            </div>
            
            <div className={`mt-2 text-center tracking-widest text-[9px] truncate max-w-full px-1 ${
                uploadSuccess 
                    ? 'text-green-400' 
                    : isUploading 
                        ? 'text-amber-400' 
                        : 'text-cyan-700/60'
            }`}>
                {statusText}
            </div>
        </div>
    );
}
