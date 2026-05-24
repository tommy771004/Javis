import React, { useState, useRef } from 'react';
import { Upload, FileText, FileJson, FileCode, FileImage, FileArchive, File as FileIcon } from 'lucide-react';
import { useI18n } from '../services/i18n';

export function FileUpload() {
    const { locale, t } = useI18n();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [statusText, setStatusText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    // Advanced local document query states

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [aiAnswer, setAiAnswer] = useState('');

    // Dynamic initial status text update based on locale change
    React.useEffect(() => {
        if (!uploadSuccess && !isUploading) {
            setStatusText(t.lblNoFileLoaded);
        }
    }, [t, uploadSuccess, isUploading]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setAiAnswer('');
        setSearchResults([]);

        try {
            const resp = await fetch('/api/workspace/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery })
            });

            if (resp.ok) {
                const data = await resp.json();
                setSearchResults(data.results || []);
                setAiAnswer(data.aiAnswer || '');
            } else {
                throw new Error('Search request failed');
            }
        } catch (e: any) {
            console.error(e);
            setAiAnswer(locale === 'zh-TW' 
                ? '系統檢索回傳異常，無法連線。' 
                : 'System query telemetry returned offline status.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleFile = async (file: File) => {
        setIsUploading(true);
        setUploadSuccess(false);
        setUploadedFile(null);
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
                    setUploadedFile(file);
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
            setUploadedFile(null);
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

    const renderIcon = () => {
        const baseClass = `w-5 h-5 mb-1.5 transition-opacity ${
            isUploading 
                ? 'animate-bounce text-amber-500' 
                : uploadSuccess 
                    ? 'text-green-400' 
                    : 'opacity-60 group-hover:opacity-100'
        }`;
        
        if (uploadSuccess && uploadedFile) {
            const ext = uploadedFile.name.split('.').pop()?.toLowerCase() || '';
            if (['js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css'].includes(ext)) {
                return <FileCode className={baseClass} strokeWidth={1.5} />;
            } else if (['json'].includes(ext)) {
                return <FileJson className={baseClass} strokeWidth={1.5} />;
            } else if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext)) {
                return <FileImage className={baseClass} strokeWidth={1.5} />;
            } else if (['zip', 'tar', 'gz', 'rar'].includes(ext)) {
                return <FileArchive className={baseClass} strokeWidth={1.5} />;
            } else if (['txt', 'md', 'csv', 'pdf', 'doc', 'docx'].includes(ext)) {
                return <FileText className={baseClass} strokeWidth={1.5} />;
            } else {
                return <FileIcon className={baseClass} strokeWidth={1.5} />;
            }
        }
        
        return <Upload className={baseClass} strokeWidth={1.5} />;
    };

    return (
        <div className="flex flex-col mb-4 font-mono text-[11px] select-none space-y-3">
            <div className="text-cyan-500 tracking-widest border-b border-cyan-800/50 pb-2 mb-2 flex items-center opacity-80 uppercase">
                <span className="w-1.5 h-1.5 bg-cyan-500 mr-2 inline-block shadow-[0_0_5px_rgba(0,255,255,0.8)]"></span> {t.lblFileUpload}
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
                className={`h-24 border transition-all bg-cyan-950/10 flex flex-col items-center justify-center cursor-pointer relative group rounded ${
                    isUploading 
                        ? 'border-amber-500/50 text-amber-500 bg-amber-950/5 cursor-wait'
                        : uploadSuccess
                            ? 'border-green-500/50 hover:border-green-400 text-green-500 bg-green-950/5'
                            : 'border-cyan-800/50 hover:border-cyan-500/50 text-cyan-600'
                }`}
            >
                {renderIcon()}
                
                <div className="tracking-[0.12em] px-2 text-center text-[9.5px]">
                    {isUploading 
                        ? 'Processing Payload...' 
                        : uploadSuccess 
                            ? t.lblUploadComplete
                            : t.lblDropOrClick
                    }
                </div>
                
                <div className="text-[7.5px] mt-1 opacity-45 tracking-wider flex gap-1.5">
                    <span>PDF</span>&middot;<span>Docs</span>&middot;<span>Code</span>&middot;<span>Logs</span>
                </div>
            </div>
            
            <div className={`text-center tracking-widest text-[9px] truncate max-w-full px-1 ${
                uploadSuccess 
                    ? 'text-green-400' 
                    : isUploading 
                        ? 'text-amber-400' 
                        : 'text-cyan-700/60'
            }`}>
                {statusText}
            </div>

            {/* Real Semantic Query Panel */}
            <div className="border border-cyan-950 bg-cyan-950/20 p-3 rounded space-y-2 text-left">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold tracking-widest text-cyan-400 uppercase">
                        {locale === 'zh-TW' ? '工作區即時語意索引查詢' : 'WORKSPACE SEMANTIC SYSTEM'}
                    </span>
                    <span className="text-[7px] font-mono text-cyan-500/80 bg-cyan-950/50 px-1 py-0.5 rounded border border-cyan-900/40">
                        INTELLIGENT RAG
                    </span>
                </div>

                <div className="flex gap-1.5">
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder={locale === 'zh-TW' ? '輸入關鍵字或日誌進行語意檢索...' : 'Search logs, code or transcripts...'}
                        className="flex-1 bg-slate-950/80 border border-cyan-900/60 rounded px-2.5 py-1 text-[10px] text-cyan-300 font-mono tracking-wide focus:outline-none focus:border-cyan-400"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="bg-cyan-950 hover:bg-cyan-950/80 border border-cyan-900 text-cyan-400 px-3 py-1 text-[9px] font-extrabold rounded cursor-pointer select-none transition-colors disabled:opacity-50"
                    >
                        {isSearching ? '...' : (locale === 'zh-TW' ? '檢索' : 'QUERY')}
                    </button>
                </div>

                {isSearching && (
                    <div className="text-[8px] text-amber-500 font-mono tracking-widest animate-pulse">
                        SCANNING DOCUMENT COMPILER & EMBEDDING INDEX...
                    </div>
                )}

                {searchResults.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {searchResults.map((res, idx) => (
                            <div key={idx} className="bg-slate-950/80 border border-cyan-900/40 p-2 rounded text-[9px] leading-normal font-mono">
                                <div className="flex justify-between text-[8px] font-bold text-cyan-400/80 border-b border-cyan-950 pb-1 mb-1 items-center">
                                    <span className="truncate max-w-[70%]">📄 {res.fileName} (Chunk #{res.chunkIndex})</span>
                                    <span className="text-amber-500 px-1 rounded border border-amber-950 bg-amber-950/10">
                                        {res.scoreLabel || `Score ${res.score}`}
                                    </span>
                                </div>
                                <div className="text-cyan-300/90 whitespace-pre-wrap">{res.content}</div>
                            </div>
                        ))}
                    </div>
                )}

                {aiAnswer && (
                    <div className="bg-emerald-950/20 border border-emerald-900/40 p-2 rounded text-[9px] text-emerald-400 space-y-1">
                        <div className="font-bold text-[8px] uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 border-b border-emerald-950 pb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            {locale === 'zh-TW' ? 'JARVIS 智慧彙整成果' : 'JARVIS COGNITIVE SYNTHESIS'}
                        </div>
                        <div className="leading-relaxed font-mono whitespace-pre-wrap text-emerald-300/90 italic">{aiAnswer}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
