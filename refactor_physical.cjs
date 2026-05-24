const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Remove shieldActive memory spoofing
const memSpoofTarget = `      let finalMem = memUsage;
      if (shieldActive) {
        finalMem = Math.min(100, finalMem + 8);
      }`;
const memSpoofReplacement = `      let finalMem = memUsage;`;
code = code.replace(memSpoofTarget, memSpoofReplacement);

// 2. Remove satelliteLinked network spoofing
const netSpoofTarget = `      let finalNet = satelliteLinked ? "5.5 GB/s" : "0KB/s";
      if (currentRxSpeed > 0 || currentTxSpeed > 0) {
        finalNet = \`\${(currentRxSpeed / 1024).toFixed(1)} KB/s ↓ | \${(currentTxSpeed / 1024).toFixed(1)} KB/s ↑\`;
      }`;
const netSpoofReplacement = `      let finalNet = "0KB/s";
      if (currentRxSpeed > 0 || currentTxSpeed > 0) {
        finalNet = \`\${(currentRxSpeed / 1024).toFixed(1)} KB/s ↓ | \${(currentTxSpeed / 1024).toFixed(1)} KB/s ↑\`;
      }`;
code = code.replace(netSpoofTarget, netSpoofReplacement);

// 3. Insert firewall middleware for shieldActive
const middlewareTarget = `app.use(express.json());`;
const middlewareReplacement = `app.use(express.json());

// Physical Firewall Middleware (Tied to shieldActive)
app.use((req, res, next) => {
  if (shieldActive) {
    const ip = req.ip || req.connection?.remoteAddress || '';
    // Basic IP block: if not local or private LAN
    const isLocal = ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('192.168.') || ip.includes('10.');
    if (!isLocal) {
      serverDB.addSystemLog('SEC', 'WARN', \`Shield Firewall blocked external IP access: \${ip}\`);
      return res.status(403).json({ error: "Access Denied: Shield Firewall Active" });
    }
  }
  next();
});`;
code = code.replace(middlewareTarget, middlewareReplacement);

// 4. Block Chat API if satellite is not linked
const chatSatelliteTarget = `      serverDB.addSystemLog('HERMES', 'INFO', \`Routing request to model: \${model || 'Auto-Router'}\`);`;
const chatSatelliteReplacement = `      if (!satelliteLinked) {
        serverDB.addSystemLog('NET', 'ERROR', 'Satellite link offline. External LLM routing aborted.');
        const offlineMsg = "[OFFLINE MODE] Satellite link severed. Unable to reach external LLM via OpenRouter/Gemini.";
        if (req.body.stream) {
          res.write(\`data: \${JSON.stringify({ response: offlineMsg })}\\n\\n\`);
          res.write(\`data: [DONE]\\n\\n\`);
          res.end();
        } else {
          res.json({ response: offlineMsg });
        }
        return;
      }
      serverDB.addSystemLog('HERMES', 'INFO', \`Routing request to model: \${model || 'Auto-Router'}\`);`;
code = code.replace(chatSatelliteTarget, chatSatelliteReplacement);

// 5. Block Auto-Advance API if satellite is not linked
const autoAdvanceTarget = `      if (activeAutonomousTaskId !== taskId) {`;
const autoAdvanceReplacement = `      if (!satelliteLinked) {
        serverDB.addSystemLog('NET', 'ERROR', 'Satellite link offline. Autonomous auto-advance sequence aborted.');
        return { success: false, logMessage: "Offline Mode: Satellite severed.", newProgress: progress };
      }
      if (activeAutonomousTaskId !== taskId) {`;
code = code.replace(autoAdvanceTarget, autoAdvanceReplacement);

fs.writeFileSync('server.ts', code, 'utf8');
