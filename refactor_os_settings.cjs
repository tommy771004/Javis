const fs = require('fs');

// 1. Modify SettingsModal.tsx
let settingsCode = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

const toggleTarget = `  const handleDesktopToggle = (type: 'always-on-top' | 'startup', enabled: boolean) => {
    if (type === 'always-on-top') {
      setAlwaysOnTop(enabled);
      localStorage.setItem('jarvis_always_on_top', enabled ? 'true' : 'false');
      triggerLog(\`SYS: UI OVERLAY PREFERENCE SET TO \${enabled ? 'LOCKED' : 'UNLOCKED'}\`, \`Overlay preference is \${enabled ? 'active' : 'disabled'} for this session.\`);
    } else {
      setLaunchOnStartup(enabled);
      localStorage.setItem('jarvis_launch_on_startup', enabled ? 'true' : 'false');
      triggerLog(\`SYS: SIMULATED BOOT SEQUENCE SET TO \${enabled ? 'ACTIVE' : 'INACTIVE'}\`, \`Core system boot preference updated.\`);
    }
  };`;

const toggleReplacement = `  const handleDesktopToggle = async (type: 'always-on-top' | 'startup', enabled: boolean) => {
    if (type === 'always-on-top') {
      setAlwaysOnTop(enabled);
      localStorage.setItem('jarvis_always_on_top', enabled ? 'true' : 'false');
      triggerLog(\`SYS: OS DESKTOP OVERLAY SET TO \${enabled ? 'LOCKED' : 'UNLOCKED'}\`, \`Overlay preference is \${enabled ? 'active' : 'disabled'} for this session.\`);
      
      await fetch('/api/system/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'always-on-top', enabled })
      });
    } else {
      setLaunchOnStartup(enabled);
      localStorage.setItem('jarvis_launch_on_startup', enabled ? 'true' : 'false');
      triggerLog(\`SYS: OS BOOT SEQUENCE REGISTRY SET TO \${enabled ? 'ACTIVE' : 'INACTIVE'}\`, \`Core system boot preference updated.\`);
      
      await fetch('/api/system/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'startup', enabled })
      });
    }
  };`;

settingsCode = settingsCode.replace(toggleTarget, toggleReplacement);

const textTarget = `{locale === 'zh-TW' ? '模擬開機自啟動設定，無實際系統開機影響' : 'Simulated boot preference (No actual system impact)'}`;
const textReplacement = `{locale === 'zh-TW' ? '寫入 Windows 登錄檔實現開機自動啟動' : 'Write to Windows Registry for automatic boot on startup'}`;
settingsCode = settingsCode.replace(textTarget, textReplacement);

fs.writeFileSync('src/components/SettingsModal.tsx', settingsCode, 'utf8');

// 2. Modify server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');

const controlEndpointInsertion = `
      if (command === "always-on-top") {
        const { enabled } = req.body;
        // Physical Execution: Windows API (via PowerShell) to set TopMost
        const topMostVal = enabled ? -1 : -2;
        const psCommand = \`
          Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            public class Win32 {
              [DllImport("user32.dll")]
              [return: MarshalAs(UnmanagedType.Bool)]
              public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
              
              [DllImport("user32.dll", SetLastError = true)]
              public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
            }
"@
          $HWND_TARGET = New-Object IntPtr \${topMostVal}
          $SWP_NOSIZE = 0x0001
          $SWP_NOMOVE = 0x0002
          $process = Get-Process | Where-Object { $_.MainWindowTitle -match "My Google AI Studio App" -or $_.MainWindowTitle -match "HERMES" } | Select-Object -First 1
          if ($process) {
            [Win32]::SetWindowPos($process.MainWindowHandle, $HWND_TARGET, 0, 0, 0, 0, $SWP_NOMOVE -bor $SWP_NOSIZE)
          }
        \`;
        exec(\`powershell -Command "\${psCommand.replace(/\\n/g, ';')}"\`, (error) => {
          if (error) {
            serverDB.addSystemLog('SYS', 'ERROR', \`Always On Top failed: \${error.message.substring(0, 50)}\`);
          } else {
            serverDB.addSystemLog('SYS', 'SUCCESS', \`Windows TopMost property set to \${enabled}.\`);
          }
        });
        return res.json({ success: true, enabled });
      }

      if (command === "startup") {
        const { enabled } = req.body;
        const nodePath = process.execPath; // Path to node.exe
        const scriptPath = require('path').resolve(__dirname, 'dist/server.cjs');
        
        // Physical Execution: Windows Registry
        const psCommand = enabled
          ? \`New-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "JavisServer" -Value "\\"\${nodePath}\\" \\"\${scriptPath}\\"" -PropertyType String -Force\`
          : \`Remove-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "JavisServer" -ErrorAction SilentlyContinue\`;
          
        exec(\`powershell -Command "\${psCommand}"\`, (error) => {
          if (error) {
            serverDB.addSystemLog('SYS', 'ERROR', \`Registry update failed: \${error.message.substring(0, 50)}\`);
          } else {
            serverDB.addSystemLog('SYS', 'SUCCESS', \`Windows Startup Registry \${enabled ? 'added' : 'removed'}.\`);
          }
        });
        return res.json({ success: true, enabled });
      }
`;

// Insert after: const { command } = req.body;
serverCode = serverCode.replace(/(const \{ command \} = req\.body;)/, `$1${controlEndpointInsertion}`);

fs.writeFileSync('server.ts', serverCode, 'utf8');
