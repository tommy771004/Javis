import re

with open("server.ts", "r", encoding="utf-8") as f:
    content = f.read()

new_func = """async function updateSystemSpeeds() {
    if (fs.existsSync('/proc/net/dev')) {
      try {
        const lines = fs.readFileSync('/proc/net/dev', 'utf8').split('\\n');
        for (const line of lines) {
          if (line.includes('eth0:') || line.includes('eth1:') || line.includes('en0:')) {
            const parts = line.split(':');
            if (parts.length > 1) {
              const stats = parts[1].trim().split(/\s+/);
              const rx = parseInt(stats[0], 10);
              const tx = parseInt(stats[8], 10);
              if (!isNaN(rx) && !isNaN(tx)) {
                if (lastNetRxBytes > 0) {
                  currentRxSpeed = rx - lastNetRxBytes;
                  currentTxSpeed = tx - lastNetTxBytes;
                }
                lastNetRxBytes = rx;
                lastNetTxBytes = tx;
              }
            }
            break;
          }
        }
      } catch (e) {}
    } else {
      try {
        const nets = await si.networkStats();
        if (nets && nets.length > 0) {
          let rx = 0; let tx = 0;
          nets.forEach(n => { rx += (n.rx_sec || 0); tx += (n.tx_sec || 0); });
          currentRxSpeed = rx;
          currentTxSpeed = tx;
        }
      } catch (e) {}
    }
    
    if (fs.existsSync('/proc/diskstats')) {
      try {
        const diskLines = fs.readFileSync('/proc/diskstats', 'utf8').split('\\n');
        for (const line of diskLines) {
          if (line.includes(' sda ') || line.includes(' vda ') || line.includes(' nvme0n1 ')) {
            const parts = line.trim().split(/\s+/);
            const readSectors = parseInt(parts[5], 10);
            const writeSectors = parseInt(parts[9], 10);
            
            if (!isNaN(readSectors) && !isNaN(writeSectors)) {
              if (lastDiskReadSectors > 0) {
                currentDiskReadSpeed = (readSectors - lastDiskReadSectors) * 512;
                currentDiskWriteSpeed = (writeSectors - lastDiskWriteSectors) * 512;
              }
              lastDiskReadSectors = readSectors;
              lastDiskWriteSectors = writeSectors;
            }
            break;
          }
        }
      } catch (e) {}
    } else {
      try {
        const fsStats = await si.fsStats();
        if (fsStats) {
          currentDiskReadSpeed = fsStats.rx_sec || 0;
          currentDiskWriteSpeed = fsStats.wx_sec || 0;
        }
      } catch (e) {}
    }
  }"""

pattern = re.compile(r"function updateSystemSpeeds\(\) \{.*?\}\n    \}\n  \}", re.DOTALL)
match = pattern.search(content)
if match:
    content = content[:match.start()] + new_func + content[match.end():]
    with open("server.ts", "w", encoding="utf-8") as f:
        f.write(content)
    print("updateSystemSpeeds replaced")
else:
    print("Failed to find updateSystemSpeeds")
