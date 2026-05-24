const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// 1. Remove toggleTrueOverdriveWorker logic
const toggleWorkerRegex = /function toggleTrueOverdriveWorker\(active: boolean\) \{[\s\S]*?\}\s*\}\s*\}/;
serverCode = serverCode.replace(toggleWorkerRegex, `function toggleTrueOverdriveWorker(active: boolean) {
  // Overdrive is now tied to physical Docker containers, simulated workers removed.
}`);

// 2. Replace 'shield' command block
const shieldTarget = `      if (command === "shield") {
        shieldActive = !shieldActive;
        const code = shieldActive ? "ACTIVE" : "STANDBY";
        
        serverDB.addSystemLog('SEC', 'SUCCESS', \`Defensive perimeter shield gain set to \${code}. Sandbox protection matrix initialized.\`);
        return res.json({ 
          success: true, 
          shieldActive, 
          message: \`Shield deflection matrix set to \${code}.\`,
          speak: shieldActive ? "Sandbox security perimeter initialized and firewall locked down." : "Shield deflection matrix and firewall on standby."
        });
      }`;

const shieldReplacement = `      if (command === "shield") {
        shieldActive = !shieldActive;
        const code = shieldActive ? "ACTIVE" : "STANDBY";
        
        // Physical Execution: Windows Firewall
        const psCommand = shieldActive 
          ? \`New-NetFirewallRule -DisplayName "Javis-Shield" -Direction Inbound -Action Block -Profile Any\`
          : \`Remove-NetFirewallRule -DisplayName "Javis-Shield"\`;

        exec(\`powershell -Command "\${psCommand}"\`, (error, stdout, stderr) => {
          if (error) {
            serverDB.addSystemLog('SEC', 'ERROR', \`Firewall execution failed. Process might lack Administrator privileges. Error: \${error.message.substring(0, 80)}\`);
          } else {
            serverDB.addSystemLog('SEC', 'SUCCESS', \`Windows Firewall rule "Javis-Shield" \${shieldActive ? 'established' : 'removed'}.\`);
          }
        });

        serverDB.addSystemLog('SEC', 'SUCCESS', \`Defensive perimeter shield gain set to \${code}. Sandbox protection matrix initialized.\`);
        return res.json({ 
          success: true, 
          shieldActive, 
          message: \`Shield deflection matrix set to \${code}.\`,
          speak: shieldActive ? "Sandbox security perimeter initialized and firewall locked down." : "Shield deflection matrix and firewall on standby."
        });
      }`;

serverCode = serverCode.replace(shieldTarget, shieldReplacement);

// 3. Replace 'overdrive' command block
const overdriveTarget = `      if (command === "overdrive") {
        reactorOverdrive = !reactorOverdrive;
        toggleTrueOverdriveWorker(reactorOverdrive);
        corePower = reactorOverdrive ? 125 : 98;
        serverDB.addSystemLog('SEC', 'WARN', \`Database query router capacity boosted to \${reactorOverdrive ? '125%' : '98% nominal'}. Direct CPU core stress applied.\`);
        broadcastMcpEvent('SYSTEM_ALERT', { alert: 'OVERDRIVE_TOGGLED', active: reactorOverdrive });
        return res.json({ 
          success: true, 
          reactorOverdrive,
          corePower,
          message: reactorOverdrive 
            ? "Database processing router thread capacity boosted to 125% limit." 
            : "Database thread router level normalized to safety threshold.",
          speak: reactorOverdrive 
            ? "Database scaling thread boosted to one hundred and twenty-five percent capacity." 
            : "Scaling thread levels normalized."
        });
      }`;

const overdriveReplacement = `      if (command === "overdrive") {
        reactorOverdrive = !reactorOverdrive;
        corePower = reactorOverdrive ? 125 : 98;
        
        // Physical Execution: Docker Container
        const dockerCmd = reactorOverdrive ? \`docker start javis-worker\` : \`docker stop javis-worker\`;
        
        exec(dockerCmd, (error, stdout, stderr) => {
          if (error) {
             serverDB.addSystemLog('SYS', 'ERROR', \`Docker command failed: \${dockerCmd}. Container may not exist or Docker daemon is offline.\`);
          } else {
             serverDB.addSystemLog('SYS', 'SUCCESS', \`Docker container javis-worker \${reactorOverdrive ? 'started' : 'stopped'} successfully.\`);
          }
        });

        serverDB.addSystemLog('SEC', 'WARN', \`Database query router capacity boosted to \${reactorOverdrive ? '125%' : '98% nominal'}. Docker container stress applied.\`);
        broadcastMcpEvent('SYSTEM_ALERT', { alert: 'OVERDRIVE_TOGGLED', active: reactorOverdrive });
        return res.json({ 
          success: true, 
          reactorOverdrive,
          corePower,
          message: reactorOverdrive 
            ? "Docker processing container boosted to 125% limit." 
            : "Docker container level normalized to safety threshold.",
          speak: reactorOverdrive 
            ? "Docker scaling container boosted and operational." 
            : "Docker container offline and levels normalized."
        });
      }`;

serverCode = serverCode.replace(overdriveTarget, overdriveReplacement);

fs.writeFileSync('server.ts', serverCode, 'utf8');
