import re

with open("src/components/SettingsModal.tsx", "r", encoding="utf-8") as f:
    c = f.read()

# 1. handleIdentityChange debounce
c = c.replace(
    "window.dispatchEvent(new Event('identity-updated'));\n  };",
    """window.dispatchEvent(new Event('identity-updated'));

    if (getattr(window, '_identitySyncTimer', None)) {
        // wait, I can just use string replace without generic getattr. Let's write valid TS.
    }"""
)
# Wait, I should do exact replace:
c = c.replace(
    "window.dispatchEvent(new Event('identity-updated'));\n  };",
    """window.dispatchEvent(new Event('identity-updated'));
    if ((window as any)._identitySyncTimer) clearTimeout((window as any)._identitySyncTimer);
    (window as any)._identitySyncTimer = setTimeout(() => {
      setSettings(prev => {
        const updated = { ...prev, [key]: val };
        saveSettings(updated);
        return updated;
      });
    }, 500);
  };"""
)

# 2. Add cmd and executionTemplate to CLIOption
c = c.replace(
    "version: string;\n}",
    "version: string;\n  cmd?: string;\n  executionTemplate?: string;\n}"
)

# 3. Add states
c = c.replace(
    "const [installingCli, setInstallingCli] = useState<string | null>(null);",
    "const [installingCli, setInstallingCli] = useState<string | null>(null);\n  const [editingCli, setEditingCli] = useState<Partial<CLIOption> | null>(null);\n  const [isSavingCli, setIsSavingCli] = useState<boolean>(false);"
)

# 4. Insert cliMappings menu button
mcp_server_btn = """<button onClick={() => setActiveMenu('mcpServer')} className={`w-full text-left px-3 py-1.5 cursor-pointer flex items-center gap-2 transition-all ${activeMenu === 'mcpServer' ? 'bg-cyan-950/40 border-r-[3px] border-cyan-400 text-cyan-300' : 'text-cyan-600/60 hover:text-cyan-500/80'}`}>
                <Server className={`w-3 h-3 ${activeMenu === 'mcpServer' ? 'text-cyan-400' : 'text-cyan-700'}`} />
                <span>{t.mcpServer}</span>
              </button>"""
cli_mappings_btn = """<button onClick={() => setActiveMenu('cliMappings')} className={`w-full text-left px-3 py-1.5 cursor-pointer flex items-center gap-2 transition-all ${activeMenu === 'cliMappings' ? 'bg-cyan-950/40 border-r-[3px] border-cyan-400 text-cyan-300' : 'text-cyan-600/60 hover:text-cyan-500/80'}`}>
                <Terminal className={`w-3 h-3 ${activeMenu === 'cliMappings' ? 'text-cyan-400' : 'text-cyan-700'}`} />
                <span>CLI Adaptors</span>
              </button>"""
c = c.replace(mcp_server_btn, mcp_server_btn + "\n              " + cli_mappings_btn)

# 5. Insert cliMappings tab content
mcp_server_tab_end = """          * Note: Embedded Jarvis Core will spawn authentic Node child_processes and handle stdio streams based on config.
                </div>
              </div>
            )}"""

cli_mappings_tab_content = """
            {/* CLI Mappings Panel */}
            {activeMenu === 'cliMappings' && (
              <div className="space-y-4">
                <div className="border-b border-cyan-950 pb-2 flex flex-col gap-1">
                  <span className="text-sm font-extrabold text-cyan-400 tracking-widest uppercase">CLI ADAPTORS</span>
                  <p className="text-[10px] text-cyan-600 tracking-wider">
                    Manage dynamic CLI adapters and execution templates.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="bg-slate-950/80 border border-cyan-900/60 rounded p-2 max-h-[400px] overflow-y-auto scrollbar-cyan">
                     {cliOptions.map(opt => (
                        <div key={opt.id} className="p-2 border-b border-cyan-900/30 flex justify-between items-center group transition-colors hover:bg-cyan-950/30">
                           <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded flex items-center justify-center ${opt.iconBg} border border-cyan-900/50`}>
                                {opt.iconText}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-[11px] text-cyan-300">{opt.name} <span className="text-cyan-700 text-[9px] ml-1">({opt.id})</span></span>
                                <div className="text-[9px] text-cyan-600 mt-0.5 truncate max-w-[300px]">{opt.cmd || "N/A"}</div>
                              </div>
                           </div>
                           <button 
                              onClick={() => setEditingCli(opt)}
                              className="px-3 py-1 bg-cyan-950/30 border border-cyan-800 rounded text-[9px] text-cyan-400 hover:bg-cyan-900 hover:text-cyan-300 transition-all opacity-0 group-hover:opacity-100"
                            >
                              EDIT
                           </button>
                        </div>
                     ))}
                  </div>
                  
                  <button 
                     onClick={() => setEditingCli({ id: '', name: '', cmd: '', executionTemplate: '', iconText: '🤖', iconBg: 'bg-cyan-950/40 border-cyan-500/30', statusColor: 'green' })}
                     className="w-full py-2 bg-cyan-950/30 border border-cyan-800/50 border-dashed rounded text-cyan-500 text-[10px] hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors uppercase tracking-widest font-bold flex items-center justify-center gap-2"
                  >
                     + ADD NEW ADAPTOR
                  </button>
                </div>

                {editingCli && (
                  <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-lg w-full max-w-lg overflow-hidden flex flex-col">
                      <div className="px-4 py-3 border-b border-cyan-900/50 bg-cyan-950/20 flex justify-between items-center">
                        <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase">
                          {editingCli.id ? 'EDIT ADAPTOR' : 'NEW ADAPTOR'}
                        </span>
                        <button onClick={() => setEditingCli(null)} className="text-cyan-600 hover:text-cyan-400"><X className="w-4 h-4" /></button>
                      </div>
                      
                      <div className="p-4 space-y-3 overflow-y-auto max-h-[70vh]">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] text-cyan-600 tracking-widest uppercase font-bold">ID (Internal)</label>
                            <input value={editingCli.id || ''} onChange={e => setEditingCli({...editingCli, id: e.target.value})} disabled={!!cliOptions.find(c => c.id === editingCli.id)} className="w-full bg-slate-950 border border-cyan-900/50 rounded px-2 py-1.5 text-[11px] text-cyan-300 focus:border-cyan-400 outline-none disabled:opacity-50" placeholder="e.g. custom-agent" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-cyan-600 tracking-widest uppercase font-bold">Display Name</label>
                            <input value={editingCli.name || ''} onChange={e => setEditingCli({...editingCli, name: e.target.value})} className="w-full bg-slate-950 border border-cyan-900/50 rounded px-2 py-1.5 text-[11px] text-cyan-300 focus:border-cyan-400 outline-none" placeholder="e.g. Custom Agent" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-cyan-600 tracking-widest uppercase font-bold">Base Command</label>
                          <input value={editingCli.cmd || ''} onChange={e => setEditingCli({...editingCli, cmd: e.target.value})} className="w-full bg-slate-950 border border-cyan-900/50 rounded px-2 py-1.5 text-[11px] text-cyan-300 focus:border-cyan-400 outline-none font-mono" placeholder="e.g. custom-cli" />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-cyan-600 tracking-widest uppercase font-bold">Execution Template</label>
                          <textarea value={editingCli.executionTemplate || ''} onChange={e => setEditingCli({...editingCli, executionTemplate: e.target.value})} className="w-full h-[80px] bg-slate-950 border border-cyan-900/50 rounded px-2 py-1.5 text-[11px] text-emerald-400 font-mono focus:border-cyan-400 outline-none resize-none" placeholder={'npx custom-cli run "{{prompt}}"'} />
                          <p className="text-[8px] text-cyan-700 italic">Use {{prompt}} as the injection point.</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] text-cyan-600 tracking-widest uppercase font-bold">Icon Emoji</label>
                            <input value={editingCli.iconText || ''} onChange={e => setEditingCli({...editingCli, iconText: e.target.value})} className="w-full bg-slate-950 border border-cyan-900/50 rounded px-2 py-1.5 text-[11px] text-cyan-300 focus:border-cyan-400 outline-none" />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <label className="text-[9px] text-cyan-600 tracking-widest uppercase font-bold">Icon Tailwind BG</label>
                            <input value={editingCli.iconBg || ''} onChange={e => setEditingCli({...editingCli, iconBg: e.target.value})} className="w-full bg-slate-950 border border-cyan-900/50 rounded px-2 py-1.5 text-[11px] text-cyan-300 focus:border-cyan-400 outline-none" placeholder="bg-cyan-950/40 border-cyan-500/30" />
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-3 border-t border-cyan-900/50 bg-cyan-950/20 flex justify-between items-center">
                        <button 
                           onClick={async () => {
                             if (!editingCli.id) return;
                             setIsSavingCli(true);
                             try {
                               const mappings = [...cliOptions];
                               const idx = mappings.findIndex(c => c.id === editingCli.id);
                               if (idx >= 0) {
                                 mappings[idx] = { ...mappings[idx], ...editingCli } as CLIOption;
                               } else {
                                 mappings.push({ ...editingCli, version: 'Checking...', isInstalled: false } as CLIOption);
                               }
                               const res = await fetch('/api/system/cli-mappings', {
                                 method: 'POST',
                                 headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify({ mappings })
                               });
                               if (res.ok) {
                                 setCliOptions(mappings);
                                 setEditingCli(null);
                               }
                             } finally {
                               setIsSavingCli(false);
                             }
                           }}
                           disabled={isSavingCli || !editingCli.id || !editingCli.name || !editingCli.executionTemplate}
                           className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900 disabled:text-cyan-700 text-slate-900 font-bold text-[10px] rounded uppercase tracking-widest transition-colors ml-auto"
                        >
                           {isSavingCli ? 'SAVING...' : 'SAVE ADAPTOR'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}"""

c = c.replace(mcp_server_tab_end, mcp_server_tab_end + "\n" + cli_mappings_tab_content)

with open("src/components/SettingsModal.tsx", "w", encoding="utf-8") as f:
    f.write(c)

print("Patched successfully")
