const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const webhookHelper = `// --- Targeted Webhook Dispatcher ---
function triggerSpecificWebhooksFromText(text: string) {
  const webhookRegex = /\\[TRIGGER_WEBHOOK\\]:\\s*([^\\n\\]]+)/g;
  let match;
  while ((match = webhookRegex.exec(text)) !== null) {
    const webhookName = match[1].trim();
    const webhooks = serverDB.getMcpWebhooks();
    const target = webhooks.find(w => w.name.trim().toLowerCase() === webhookName.toLowerCase());
    
    if (target && target.active) {
      serverDB.addSystemLog('NET', 'INFO', \`Triggering targeted external Webhook: \${target.name}\`);
      fetch(target.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'LLM_TRIGGERED', content: text, timestamp: Date.now() })
      }).catch((e: any) => {
        serverDB.addSystemLog('NET', 'ERROR', \`Targeted Webhook \${target.name} failed: \${e.message}\`);
      });
    } else {
      serverDB.addSystemLog('NET', 'WARN', \`Targeted Webhook '\${webhookName}' not found or inactive.\`);
    }
  }
}

// --- MCP External Webhook Dispatcher ---`;

code = code.replace("// --- MCP External Webhook Dispatcher ---", webhookHelper);

const chatInjectionTarget = `broadcastMcpEvent('CHAT_COMPLETION', { userPrompt: message, botResponse: result.text, model: actualModel, costUsd: calculatedCost });`;
const chatInjectionReplacement = `broadcastMcpEvent('CHAT_COMPLETION', { userPrompt: message, botResponse: result.text, model: actualModel, costUsd: calculatedCost });

      triggerSpecificWebhooksFromText(result.text);`;
code = code.replace(chatInjectionTarget, chatInjectionReplacement);

const streamInjectionTarget = `broadcastMcpEvent('CHAT_MESSAGE', botMessage);

            res.write(\`data: [DONE]\\n\\n\`);`;
const streamInjectionReplacement = `broadcastMcpEvent('CHAT_MESSAGE', botMessage);
            triggerSpecificWebhooksFromText(botMessage.content);

            res.write(\`data: [DONE]\\n\\n\`);`;
code = code.replace(streamInjectionTarget, streamInjectionReplacement);

const taskInjectionTarget = `const data = parseAndRepairJSON(result.text);`;
const taskInjectionReplacement = `triggerSpecificWebhooksFromText(result.text);
        const data = parseAndRepairJSON(result.text);`;
code = code.replace(taskInjectionTarget, taskInjectionReplacement);

fs.writeFileSync('server.ts', code, 'utf8');
