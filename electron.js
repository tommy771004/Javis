const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let serverProcess = null;

// Spawns and manages our Node.js server inside the Electron app context
function startBackendServer() {
  const serverPath = path.join(__dirname, 'dist', 'server.cjs');
  
  // Start server using node in production mode
  serverProcess = spawn('node', [serverPath], {
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      PORT: '3000'
    }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Express Server]: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Express Server Error]: ${data}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false, // Frameless window for high-tech Jarvis HUD overlay feel!
    transparent: true, // Transparent backdrops
    hasShadow: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
    }
  });

  // Load our Express server portal
  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle triggers
app.on('ready', () => {
  console.log('Bootstrapping desktop Javis environment...');
  
  // 1. Spawns our backend SQLite-like REST server
  startBackendServer();
  
  // 2. Wait a moment for server port binding before creating frameless window
  setTimeout(createWindow, 1500);
});

app.on('window-all-closed', () => {
  // Gracefully terminate the Node backend server
  if (serverProcess) {
    console.log('Terminating background Express server...');
    serverProcess.kill('SIGTERM');
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
