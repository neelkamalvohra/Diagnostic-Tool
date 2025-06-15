// const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, webContents } = require('electron');
// const path = require('path');
// const { exec } = require('child_process');
// const dns = require('dns');
// const fs = require('fs');
// const net = require('net');
// const archiver = require('archiver');

// let mainWindow;
// let currentDiagnosticProcess = null; // For `exec` commands
// let traceProcess = null; // For `netsh trace`
// let screenshotIntervalId = null; // For periodic screenshots
// let diagnosticTextFilePath = '';

// function createWindow() {
//     mainWindow = new BrowserWindow({
//         width: 1000,
//         height: 800,
//         minWidth: 800,
//         minHeight: 600,
//         webPreferences: {
//             preload: path.join(__dirname, 'preload.js'),
//             nodeIntegration: false,
//             contextIsolation: true,
//             partition: 'persist:mainwindow' // Keep for main window security
//         },
//         title: 'Website Diagnostic Tool'
//     });

//     mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
//     // mainWindow.webContents.openDevTools();
// }

// app.whenReady().then(() => {
//     createWindow();
//     app.on('activate', () => {
//         if (BrowserWindow.getAllWindows().length === 0) {
//             createWindow();
//         }
//     });
// });

// app.on('window-all-closed', () => {
//     if (process.platform !== 'darwin') {
//         app.quit();
//     }
// });

// /**
//  * Helper function to append output to both the renderer and the log file.
//  * This ensures diagnostic-output.txt is populated correctly.
//  * @param {string} data - The text data to append.
//  */
// const appendToDiagnosticOutput = (data) => {
//     mainWindow.webContents.send('diagnostic-output', data);
//     if (diagnosticTextFilePath) {
//         fs.appendFileSync(diagnosticTextFilePath, data);
//     }
// };

// /**
//  * IPC Handler for checking internet connectivity.
//  * Uses fetch to a reliable public endpoint to confirm actual HTTP connectivity.
//  */
// ipcMain.handle('check-internet', async () => {
//     try {
//         const response = await fetch('https://www.google.com/favicon.ico', { method: 'HEAD', timeout: 5000 });
//         return response.ok;
//     } catch (error) {
//         console.error('Main: Internet check failed (fetch error):', error.message);
//         return false;
//     }
// });

// /**
//  * Executes a command, streams its output, and captures it.
//  * @param {string} command - The command to execute.
//  * @param {string} label - A label for the output section.
//  * @param {string} [outputTarget='main'] - 'main' for main diagnostic output, 'single' for single command output.
//  * @returns {Promise<string>} - Resolves with the full stdout, rejects on error.
//  */
// const runCommandStream = (command, label, outputTarget = 'main') => {
//     return new Promise((resolve, reject) => {
//         const sendOutput = (data) => {
//             if (outputTarget === 'main') {
//                 appendToDiagnosticOutput(data);
//             } else {
//                 mainWindow.webContents.send('single-command-output', data);
//             }
//         };

//         sendOutput(`\n--- ${label} ---\n`);

//         currentDiagnosticProcess = exec(command, (error, stdout, stderr) => {
//             if (error) {
//                 if (error.killed) {
//                     resolve('');
//                     return;
//                 }
//                 sendOutput(`Error: ${error.message}\n`);
//                 reject(error);
//                 return;
//             }
//             if (stderr) {
//                 sendOutput(`Stderr: ${stderr}\n`);
//             }
//             resolve(stdout);
//         });

//         currentDiagnosticProcess.stdout.on('data', (data) => {
//             sendOutput(data.toString());
//         });

//         currentDiagnosticProcess.stderr.on('data', (data) => {
//             sendOutput(`Error: ${data.toString()}`);
//         });

//         currentDiagnosticProcess.on('close', (code) => {
//             if (code !== 0 && currentDiagnosticProcess) {
//                 reject(new Error(`Command exited with code ${code}`));
//             }
//             currentDiagnosticProcess = null;
//         });

//         currentDiagnosticProcess.on('error', (err) => {
//             if (err.killed) {
//                 resolve('');
//                 return;
//             }
//             sendOutput(`Failed to start command: ${err.message}\n`);
//             reject(err);
//         });
//     });
// };

// /**
//  * IPC Handler for running the full diagnostic sequence.
//  */
// ipcMain.handle('run-diagnostic', async (event, { url, dnsServers, webviewWebContentsId }) => {
//     mainWindow.webContents.send('clear-output', 'main');
//     let uniqueIPv4s = new Set();
//     let uniqueIPv6s = new Set();

//     const logDir = path.join(app.getPath('userData'), 'diagnostic-logs', `diag-${Date.now()}`);
//     diagnosticTextFilePath = path.join(logDir, 'diagnostic-output.txt');
//     const pcapTraceFilePath = path.join(logDir, 'network-trace.etl');
//     const screenshotsDir = path.join(logDir, 'screenshots');

//     try {
//         fs.mkdirSync(logDir, { recursive: true });
//         fs.mkdirSync(screenshotsDir, { recursive: true });
//         fs.writeFileSync(diagnosticTextFilePath, '');
//     } catch (err) {
//         appendToDiagnosticOutput(`Error creating log directories: ${err.message}\n`);
//         return;
//     }

//     const originalConsoleLog = console.log;
//     const originalConsoleError = console.error;
//     console.log = function(...args) {
//         originalConsoleLog(...args);
//         fs.appendFileSync(diagnosticTextFilePath, args.join(' ') + '\n');
//     };
//     console.error = function(...args) {
//         originalConsoleError(...args);
//         fs.appendFileSync(diagnosticTextFilePath, '[ERROR] ' + args.join(' ') + '\n');
//     };

//     try {
//         // Step 1: Public IPv4 & IPv6, nslookup, tracert, ping
//         appendToDiagnosticOutput('\n--- Public IPv4 & IPv6 ---\n');
//         try {
//             const ipv4Response = await fetch('https://api.ipify.org');
//             const ipv4 = await ipv4Response.text();
//             appendToDiagnosticOutput(`Public IPv4: ${ipv4.trim()}\n`);
//         } catch (err) {
//             appendToDiagnosticOutput(`Failed to get Public IPv4: ${err.message}\n`);
//         }

//         try {
//             const ipv6Response = await fetch('https://api6.ipify.org');
//             const ipv6 = await ipv6Response.text();
//             appendToDiagnosticOutput(`Public IPv6: ${ipv6.trim()}\n`);
//         } catch (err) {
//             appendToDiagnosticOutput(`Failed to get Public IPv6 (may not be configured): ${err.message}\n`);
//         }

//         for (const dns of dnsServers) {
//             if (dns.enabled) {
//                 try {
//                     const result = await runCommandStream(`nslookup ${url} ${dns.ip}`, `nslookup with DNS: ${dns.ip}`);
//                     const lines = result.split('\n');
//                     lines.forEach(line => {
//                         const ipMatch = line.match(/(?:Address(?:es)?:?\s*)([0-9a-fA-F.:]+)/);
//                         if (ipMatch && ipMatch[1]) {
//                             const potentialIp = ipMatch[1].trim();
//                             if (net.isIPv4(potentialIp)) {
//                                 uniqueIPv4s.add(potentialIp);
//                             } else if (net.isIPv6(potentialIp)) {
//                                 uniqueIPv6s.add(potentialIp);
//                             }
//                         }
//                     });

//                 } catch (error) {
//                     console.error(`nslookup with ${dns.ip} failed:`, error);
//                 }
//             }
//         }

//         if (uniqueIPv4s.size > 0 || uniqueIPv6s.size > 0) {
//             for (const ip of uniqueIPv4s) {
//                 try { await runCommandStream(`tracert ${ip}`, `tracert to IPv4: ${ip}`); } catch (error) { console.error(`tracert to IPv4 ${ip} failed:`, error); }
//                 try { await runCommandStream(`ping ${ip}`, `ping to IPv4: ${ip}`); } catch (error) { console.error(`ping to IPv4 ${ip} failed:`, error); }
//             }
//             for (const ip of uniqueIPv6s) {
//                 try { await runCommandStream(`tracert -6 ${ip}`, `tracert to IPv6: ${ip}`); } catch (error) { console.error(`tracert to IPv6 ${ip} failed:`, error); }
//                 try { await runCommandStream(`ping -6 ${ip}`, `ping to IPv6: ${ip}`); } catch (error) { console.error(`ping to IPv6 ${ip} failed:`, error); }
//             }
//         } else {
//             appendToDiagnosticOutput('\nNo unique IPv4 or IPv6 addresses found from nslookup for tracert/ping.\n');
//         }

//         // Step 2: Start PCAP trace
//         if (process.platform === 'win32') {
//             appendToDiagnosticOutput('\n--- Starting Network Trace (requires Admin privileges) ---\n');
//             const startTraceCommand = `netsh trace start capture=yes tracefile=${pcapTraceFilePath} maxsize=100mb overwrite=yes`;
//             try {
//                 traceProcess = exec(startTraceCommand);
//                 appendToDiagnosticOutput(`Network trace started. Saving to ${pcapTraceFilePath}\n`);
//             } catch (err) {
//                 appendToDiagnosticOutput(`Error starting network trace: ${err.message}\n`);
//                 console.error('Network trace start error:', err);
//                 traceProcess = null;
//             }
//         } else {
//             appendToDiagnosticOutput('\nNetwork trace (netsh) is only available on Windows.\n');
//         }

//         // HIGHLIGHT: Step 3: Instruct webview to load URL and wait for it to load
//         appendToDiagnosticOutput(`\n--- Opening URL in Internal Browser: ${url} ---\n`);
//         const webviewTargetWebContents = webContents.fromId(webviewWebContentsId);

//         if (webviewTargetWebContents) {
//             // HIGHLIGHT: Send message to renderer to load the URL in the webview
//             // This message now includes the webContentsId so renderer can verify it's the correct webview
//             mainWindow.webContents.send('load-url-in-inapp-browser', { url, webContentsId: webviewWebContentsId });

//             // HIGHLIGHT: Await webview loading directly in main process using webContents events
//             await new Promise((resolve, reject) => {
//                 const onDidStopLoading = () => {
//                     webviewTargetWebContents.removeListener('did-stop-loading', onDidStopLoading);
//                     webviewTargetWebContents.removeListener('did-fail-load', onDidFailLoad);
//                     resolve();
//                 };
//                 const onDidFailLoad = (event, errorCode, errorDescription) => {
//                     webviewTargetWebContents.removeListener('did-stop-loading', onDidStopLoading);
//                     webviewTargetWebContents.removeListener('did-fail-load', onDidFailLoad);
//                     reject(new Error(`Webview failed to load: ${errorCode} - ${errorDescription}`));
//                 };

//                 webviewTargetWebContents.once('did-stop-loading', onDidStopLoading);
//                 webviewTargetWebContents.once('did-fail-load', onDidFailLoad);

//                 // Add a timeout to prevent indefinite waiting
//                 setTimeout(() => {
//                     webviewTargetWebContents.removeListener('did-stop-loading', onDidStopLoading);
//                     webviewTargetWebContents.removeListener('did-fail-load', onDidFailLoad);
//                     reject(new Error('Timed out waiting for webview to load.'));
//                 }, 20000); // 20 seconds timeout for webview to load
//             });

//             appendToDiagnosticOutput(`Internal browser loaded URL: ${url}\n`);

//         } else {
//             const errorMessage = `Internal browser (webview) with ID ${webviewWebContentsId} not found. Cannot load URL or take screenshots.`;
//             appendToDiagnosticOutput(`Error: ${errorMessage}\n`);
//             console.error(errorMessage);
//             throw new Error(errorMessage);
//         }

//         // Step 4: Take 10 screenshots of the Webview content
//         appendToDiagnosticOutput('\n--- Taking Internal Browser Screenshots ---\n');
//         let screenshotCount = 0;
//         const totalScreenshots = 10;

//         await new Promise(resolve => {
//             screenshotIntervalId = setInterval(async () => {
//                 if (screenshotCount < totalScreenshots) {
//                     try {
//                         const image = await webviewTargetWebContents.capturePage(); // Capture from webview webContents
//                         const screenshotPath = path.join(screenshotsDir, `screenshot-${Date.now()}.png`);
//                         fs.writeFileSync(screenshotPath, image.toPNG());
//                         appendToDiagnosticOutput(`Screenshot ${screenshotCount + 1}/${totalScreenshots} saved to: ${screenshotPath}\n`);
//                         screenshotCount++;
//                     } catch (error) {
//                         appendToDiagnosticOutput(`Error taking screenshot ${screenshotCount + 1}: ${error.message}\n`);
//                         console.error('Screenshot error:', error);
//                         screenshotCount++;
//                     }
//                 } else {
//                     clearInterval(screenshotIntervalId);
//                     screenshotIntervalId = null;
//                     resolve();
//                 }
//             }, 1000); // 1 second interval
//         });


//     } catch (error) {
//         appendToDiagnosticOutput(`\nDiagnostics interrupted or failed unexpectedly: ${error.message}`);
//         console.error('Diagnostic sequence error:', error);
//     } finally {
//         // Restore original console methods
//         console.log = originalConsoleLog;
//         console.error = originalConsoleError;

//         // Step 5: Stop network trace if it was started
//         if (traceProcess) {
//             appendToDiagnosticOutput('\n--- Stopping Network Trace ---\n');
//             try {
//                 await new Promise((resolve, reject) => {
//                     exec('netsh trace stop', (error, stdout, stderr) => {
//                         if (error) {
//                             appendToDiagnosticOutput(`Error stopping trace: ${error.message}\n`);
//                             reject(error);
//                             return;
//                         }
//                         if (stderr) appendToDiagnosticOutput(`Stderr stopping trace: ${stderr}\n`);
//                         appendToDiagnosticOutput(`Network trace stopped. ${stdout}\n`);
//                         traceProcess = null;
//                         resolve();
//                     });
//                 });
//             } catch (err) {
//                 console.error('Error executing netsh trace stop:', err);
//                 appendToDiagnosticOutput(`Failed to stop network trace: ${err.message}\n`);
//             }
//         }

//         // Step 6: Zip all files
//         appendToDiagnosticOutput('\n--- Zipping Diagnostic Logs ---\n');
//         try {
//             const outputZipPath = path.join(app.getPath('userData'), `diagnostic-logs-${Date.now()}.zip`);
//             const archive = archiver('zip', { zlib: { level: 9 } });

//             const output = fs.createWriteStream(outputZipPath);

//             await new Promise((resolve, reject) => {
//                 output.on('close', () => {
//                     resolve();
//                 });
//                 output.on('error', (err) => {
//                     reject(err);
//                 });

//                 archive.pipe(output);

//                 archive.file(diagnosticTextFilePath, { name: 'diagnostic-output.txt' });
//                 archive.directory(screenshotsDir, 'screenshots');

//                 if (fs.existsSync(pcapTraceFilePath)) {
//                     archive.file(pcapTraceFilePath, { name: 'network-trace.etl' });
//                 }

//                 archive.finalize();
//             });

//             appendToDiagnosticOutput(`\nAll logs zipped to: ${outputZipPath}\n`);
//             await dialog.showMessageBox(mainWindow, {
//                 type: 'info',
//                 title: 'Diagnostics Complete',
//                 message: `Diagnostics finished! All logs are saved and zipped to:\n${outputZipPath}`
//             });
//         } catch (zipError) {
//             appendToDiagnosticOutput(`Error zipping logs: ${zipError.message}\n`);
//             console.error('Zip error:', zipError);
//         } finally {
//             diagnosticTextFilePath = '';
//         }

//         currentDiagnosticProcess = null;
//         mainWindow.webContents.send('diagnostic-completed');
//     }
// });

// /**
//  * IPC Handler for stopping the current diagnostic process.
//  */
// ipcMain.handle('stop-diagnostic', async () => {
//     if (currentDiagnosticProcess) {
//         currentDiagnosticProcess.kill();
//         currentDiagnosticProcess = null;
//     }
//     if (screenshotIntervalId) {
//         clearInterval(screenshotIntervalId);
//         screenshotIntervalId = null;
//     }
//     if (traceProcess) {
//         appendToDiagnosticOutput('\n--- Stopping Network Trace ---\n');
//         try {
//             await new Promise((resolve, reject) => {
//                 exec('netsh trace stop', (error, stdout, stderr) => {
//                     if (error) {
//                         appendToDiagnosticOutput(`Error stopping trace: ${error.message}\n`);
//                         reject(error);
//                         return;
//                     }
//                     if (stderr) appendToDiagnosticOutput(`Stderr stopping trace: ${stderr}\n`);
//                     appendToDiagnosticOutput(`Network trace stopped. ${stdout}\n`);
//                     traceProcess = null;
//                     resolve();
//                 });
//             });
//         } catch (err) {
//             console.error('Error executing netsh trace stop on stop-diagnostic:', err);
//             appendToDiagnosticOutput(`Failed to stop network trace: ${err.message}\n`);
//         }
//     }
//     appendToDiagnosticOutput('\n--- Diagnostic stopped by user ---');
//     mainWindow.webContents.send('diagnostic-completed');
// });

// /**
//  * IPC Handler for showing a native message box (replaces alert()).
//  */
// ipcMain.handle('show-message-box', async (event, options) => {
//     await dialog.showMessageBox(mainWindow, options);
// });

// /**
//  * IPC Handler for copying text to clipboard.
//  */
// ipcMain.handle('copy-to-clipboard', async (event, text) => {
//     clipboard.writeText(text);
// });

// /**
//  * IPC Handler for running single commands (ping, tracert, nslookup).
//  */
// ipcMain.handle('run-single-command', async (event, { commandType, target }) => {
//     let command = '';
//     let label = '';
//     let isIPv6 = net.isIPv6(target);

//     switch (commandType) {
//         case 'ping':
//             command = `ping ${isIPv6 ? '-6 ' : ''}${target}`;
//             label = `ping ${target}`;
//             break;
//         case 'tracert':
//             command = `tracert ${isIPv6 ? '-6 ' : ''}${target}`;
//             label = `tracert ${target}`;
//             break;
//         case 'nslookup':
//             command = `nslookup ${target}`;
//             label = `nslookup ${target}`;
//             break;
//         default:
//             mainWindow.webContents.send('single-command-output', 'Invalid command type selected.\n');
//             return;
//     }

//     try {
//         mainWindow.webContents.send('clear-output', 'single');
//         await runCommandStream(command, label, 'single');
//         mainWindow.webContents.send('single-command-completed');
//     } catch (error) {
//         console.error(`Single command (${commandType}) failed:`, error);
//         mainWindow.webContents.send('single-command-completed');
//     }
// });



// const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, webContents } = require('electron');
// const path = require('path');
// const { exec } = require('child_process');
// const dns = require('dns');
// const fs = require('fs');
// const net = require('net');
// const archiver = require('archiver');

// let mainWindow;
// let currentDiagnosticProcess = null; // For `exec` commands
// let traceProcess = null; // For `netsh trace`
// let screenshotIntervalId = null; // For periodic screenshots
// let diagnosticTextFilePath = '';

// function createWindow() {
//     mainWindow = new BrowserWindow({
//         width: 1000,
//         height: 800,
//         minWidth: 800,
//         minHeight: 600,
//         webPreferences: {
//             preload: path.join(__dirname, 'preload.js'),
//             nodeIntegration: false,
//             contextIsolation: true,
//             partition: 'persist:mainwindow' // Keep for main window security
//         },
//         title: 'Website Diagnostic Tool'
//     });

//     mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
//     // mainWindow.webContents.openDevTools();
// }

// app.whenReady().then(() => {
//     createWindow();
//     app.on('activate', () => {
//         if (BrowserWindow.getAllWindows().length === 0) {
//             createWindow();
//         }
//     });
// });

// app.on('window-all-closed', () => {
//     if (process.platform !== 'darwin') {
//         app.quit();
//     }
// });

// /**
//  * Helper function to append output to both the renderer and the log file.
//  * This ensures diagnostic-output.txt is populated correctly.
//  * @param {string} data - The text data to append.
//  */
// const appendToDiagnosticOutput = (data) => {
//     mainWindow.webContents.send('diagnostic-output', data);
//     if (diagnosticTextFilePath) {
//         fs.appendFileSync(diagnosticTextFilePath, data);
//     }
// };

// /**
//  * IPC Handler for checking internet connectivity.
//  * Uses fetch to a reliable public endpoint to confirm actual HTTP connectivity.
//  */
// ipcMain.handle('check-internet', async () => {
//     try {
//         const response = await fetch('https://www.google.com/favicon.ico', { method: 'HEAD', timeout: 5000 });
//         return response.ok;
//     } catch (error) {
//         console.error('Main: Internet check failed (fetch error):', error.message);
//         return false;
//     }
// });

// /**
//  * Executes a command, streams its output, and captures it.
//  * @param {string} command - The command to execute.
//  * @param {string} label - A label for the output section.
//  * @param {string} [outputTarget='main'] - 'main' for main diagnostic output, 'single' for single command output.
//  * @returns {Promise<string>} - Resolves with the full stdout, rejects on error.
//  */
// const runCommandStream = (command, label, outputTarget = 'main') => {
//     return new Promise((resolve, reject) => {
//         const sendOutput = (data) => {
//             if (outputTarget === 'main') {
//                 appendToDiagnosticOutput(data);
//             } else {
//                 mainWindow.webContents.send('single-command-output', data);
//             }
//         };

//         sendOutput(`\n--- ${label} ---\n`);

//         currentDiagnosticProcess = exec(command, (error, stdout, stderr) => {
//             if (error) {
//                 if (error.killed) {
//                     resolve('');
//                     return;
//                 }
//                 sendOutput(`Error: ${error.message}\n`);
//                 reject(error);
//                 return;
//             }
//             if (stderr) {
//                 sendOutput(`Stderr: ${stderr}\n`);
//             }
//             resolve(stdout);
//         });

//         currentDiagnosticProcess.stdout.on('data', (data) => {
//             sendOutput(data.toString());
//         });

//         currentDiagnosticProcess.stderr.on('data', (data) => {
//             sendOutput(`Error: ${data.toString()}`);
//         });

//         currentDiagnosticProcess.on('close', (code) => {
//             if (code !== 0 && currentDiagnosticProcess) {
//                 reject(new Error(`Command exited with code ${code}`));
//             }
//             currentDiagnosticProcess = null;
//         });

//         currentDiagnosticProcess.on('error', (err) => {
//             if (err.killed) {
//                 resolve('');
//                 return;
//             }
//             sendOutput(`Failed to start command: ${err.message}\n`);
//             reject(err);
//         });
//     });
// };

// /**
//  * IPC Handler for running the full diagnostic sequence.
//  */
// ipcMain.handle('run-diagnostic', async (event, { url, dnsServers, webviewWebContentsId }) => {
//     mainWindow.webContents.send('clear-output', 'main');
//     let uniqueIPv4s = new Set();
//     let uniqueIPv6s = new Set();

//     const logDir = path.join(app.getPath('userData'), 'diagnostic-logs', `diag-${Date.now()}`);
//     diagnosticTextFilePath = path.join(logDir, 'diagnostic-output.txt');
//     const pcapTraceFilePath = path.join(logDir, 'network-trace.etl');
//     const screenshotsDir = path.join(logDir, 'screenshots');

//     try {
//         fs.mkdirSync(logDir, { recursive: true });
//         fs.mkdirSync(screenshotsDir, { recursive: true });
//         fs.writeFileSync(diagnosticTextFilePath, '');
//     } catch (err) {
//         appendToDiagnosticOutput(`Error creating log directories: ${err.message}\n`);
//         return;
//     }

//     const originalConsoleLog = console.log;
//     const originalConsoleError = console.error;
//     console.log = function(...args) {
//         originalConsoleLog(...args);
//         fs.appendFileSync(diagnosticTextFilePath, args.join(' ') + '\n');
//     };
//     console.error = function(...args) {
//         originalConsoleError(...args);
//         fs.appendFileSync(diagnosticTextFilePath, '[ERROR] ' + args.join(' ') + '\n');
//     };

//     try {
//         // Step 1: Public IPv4 & IPv6, nslookup, tracert, ping
//         appendToDiagnosticOutput('\n--- Public IPv4 & IPv6 ---\n');
//         try {
//             const ipv4Response = await fetch('https://api.ipify.org');
//             const ipv4 = await ipv4Response.text();
//             appendToDiagnosticOutput(`Public IPv4: ${ipv4.trim()}\n`);
//         } catch (err) {
//             appendToDiagnosticOutput(`Failed to get Public IPv4: ${err.message}\n`);
//         }

//         try {
//             const ipv6Response = await fetch('https://api6.ipify.org');
//             const ipv6 = await ipv6Response.text();
//             appendToDiagnosticOutput(`Public IPv6: ${ipv6.trim()}\n`);
//         } catch (err) {
//             appendToDiagnosticOutput(`Failed to get Public IPv6 (may not be configured): ${err.message}\n`);
//         }

//         for (const dns of dnsServers) {
//             if (dns.enabled) {
//                 try {
//                     const result = await runCommandStream(`nslookup ${url} ${dns.ip}`, `nslookup with DNS: ${dns.ip}`);
//                     const lines = result.split('\n');
//                     lines.forEach(line => {
//                         const ipMatch = line.match(/(?:Address(?:es)?:?\s*)([0-9a-fA-F.:]+)/);
//                         if (ipMatch && ipMatch[1]) {
//                             const potentialIp = ipMatch[1].trim();
//                             if (net.isIPv4(potentialIp)) {
//                                 uniqueIPv4s.add(potentialIp);
//                             } else if (net.isIPv6(potentialIp)) {
//                                 uniqueIPv6s.add(potentialIp);
//                             }
//                         }
//                     });

//                 } catch (error) {
//                     console.error(`nslookup with ${dns.ip} failed:`, error);
//                 }
//             }
//         }

//         if (uniqueIPv4s.size > 0 || uniqueIPv6s.size > 0) {
//             for (const ip of uniqueIPv4s) {
//                 try { await runCommandStream(`tracert ${ip}`, `tracert to IPv4: ${ip}`); } catch (error) { console.error(`tracert to IPv4 ${ip} failed:`, error); }
//                 try { await runCommandStream(`ping ${ip}`, `ping to IPv4: ${ip}`); } catch (error) { console.error(`ping to IPv4 ${ip} failed:`, error); }
//             }
//             for (const ip of uniqueIPv6s) {
//                 try { await runCommandStream(`tracert -6 ${ip}`, `tracert to IPv6: ${ip}`); } catch (error) { console.error(`tracert to IPv6 ${ip} failed:`, error); }
//                 try { await runCommandStream(`ping -6 ${ip}`, `ping to IPv6: ${ip}`); } catch (error) { console.error(`ping to IPv6 ${ip} failed:`, error); }
//             }
//         } else {
//             appendToDiagnosticOutput('\nNo unique IPv4 or IPv6 addresses found from nslookup for tracert/ping.\n');
//         }

//         // HIGHLIGHT: Step 2: Start PCAP trace
//         if (process.platform === 'win32') {
//             appendToDiagnosticOutput('\n--- Starting Network Trace (requires Admin privileges) ---\n');
//             const startTraceCommand = `netsh trace start capture=yes tracefile=${pcapTraceFilePath} maxsize=100mb overwrite=yes`;
//             try {
//                 traceProcess = exec(startTraceCommand);
//                 appendToDiagnosticOutput(`Network trace started. Saving to ${pcapTraceFilePath}\n`);
//             } catch (err) {
//                 appendToDiagnosticOutput(`Error starting network trace: ${err.message}\n`);
//                 console.error('Network trace start error:', err);
//                 traceProcess = null;
//             }
//         } else {
//             appendToDiagnosticOutput('\nNetwork trace (netsh) is only available on Windows.\n');
//         }

//         // HIGHLIGHT: Step 3: Open URL in internal tool (webview)
//         appendToDiagnosticOutput(`\n--- Opening URL in Internal Browser: ${url} ---\n`);
//         const webviewTargetWebContents = webContents.fromId(webviewWebContentsId);

//         if (webviewTargetWebContents) {
//             // Instruct the renderer to load the URL in the webview
//             // Renderer will now manage loading and signaling its completion back to main implicitly
//             // by passing the webContentsId directly.
//             // We only need to ensure the URL is actually loaded here if it wasn't pre-loaded.
//             // But since renderer now explicitly loads it and awaits, this part in main is simpler.
//             // HIGHLIGHT: Send message to renderer to load the URL in the webview
//             mainWindow.webContents.send('load-url-in-inapp-browser', { url, webContentsId: webviewWebContentsId });

//             // HIGHLIGHT: Await confirmation from renderer that webview has loaded
//             const webviewLoadResult = await new Promise((resolve, reject) => {
//                 const loadHandler = (event, { status, error }) => {
//                     if (event.sender.id === mainWindow.webContents.id) { // Ensure it's from our main window
//                         if (status === 'success') {
//                             resolve(true);
//                         } else {
//                             reject(new Error(error));
//                         }
//                         ipcMain.removeListener('webview-load-status-from-renderer', loadHandler);
//                     }
//                 };
//                 ipcMain.on('webview-load-status-from-renderer', loadHandler);

//                 // Add a timeout in case webview never signals
//                 setTimeout(() => {
//                     ipcMain.removeListener('webview-load-status-from-renderer', loadHandler);
//                     reject(new Error('Timed out waiting for webview to load.'));
//                 }, 15000); // 15 seconds timeout
//             });

//             if (webviewLoadResult) {
//                 appendToDiagnosticOutput(`Internal browser loaded URL: ${url}\n`);
//             } else {
//                 throw new Error('Internal browser failed to load URL.');
//             }

//         } else {
//             const errorMessage = `Internal browser (webview) with ID ${webviewWebContentsId} not found. Cannot load URL or take screenshots.`;
//             appendToDiagnosticOutput(`Error: ${errorMessage}\n`);
//             console.error(errorMessage);
//             throw new Error(errorMessage);
//         }

//         // HIGHLIGHT: Step 4: Take 10 screenshots of the Webview content
//         appendToDiagnosticOutput('\n--- Taking Internal Browser Screenshots ---\n');
//         let screenshotCount = 0;
//         const totalScreenshots = 10;

//         await new Promise(resolve => {
//             screenshotIntervalId = setInterval(async () => {
//                 if (screenshotCount < totalScreenshots) {
//                     try {
//                         const image = await webviewTargetWebContents.capturePage(); // Capture from webview webContents
//                         const screenshotPath = path.join(screenshotsDir, `screenshot-${Date.now()}.png`);
//                         fs.writeFileSync(screenshotPath, image.toPNG());
//                         appendToDiagnosticOutput(`Screenshot ${screenshotCount + 1}/${totalScreenshots} saved to: ${screenshotPath}\n`);
//                         screenshotCount++;
//                     } catch (error) {
//                         appendToDiagnosticOutput(`Error taking screenshot ${screenshotCount + 1}: ${error.message}\n`);
//                         console.error('Screenshot error:', error);
//                         screenshotCount++;
//                     }
//                 } else {
//                     clearInterval(screenshotIntervalId);
//                     screenshotIntervalId = null;
//                     resolve();
//                 }
//             }, 1000); // 1 second interval
//         });


//     } catch (error) {
//         appendToDiagnosticOutput(`\nDiagnostics interrupted or failed unexpectedly: ${error.message}`);
//         console.error('Diagnostic sequence error:', error);
//     } finally {
//         // Restore original console methods
//         console.log = originalConsoleLog;
//         console.error = originalConsoleError;

//         // HIGHLIGHT: Step 5: Stop network trace if it was started
//         if (traceProcess) {
//             appendToDiagnosticOutput('\n--- Stopping Network Trace ---\n');
//             try {
//                 await new Promise((resolve, reject) => {
//                     exec('netsh trace stop', (error, stdout, stderr) => {
//                         if (error) {
//                             appendToDiagnosticOutput(`Error stopping trace: ${error.message}\n`);
//                             reject(error);
//                             return;
//                         }
//                         if (stderr) appendToDiagnosticOutput(`Stderr stopping trace: ${stderr}\n`);
//                         appendToDiagnosticOutput(`Network trace stopped. ${stdout}\n`);
//                         traceProcess = null;
//                         resolve();
//                     });
//                 });
//             } catch (err) {
//                 console.error('Error executing netsh trace stop:', err);
//                 appendToDiagnosticOutput(`Failed to stop network trace: ${err.message}\n`);
//             }
//         }

//         // HIGHLIGHT: Step 6: Zip all files
//         appendToDiagnosticOutput('\n--- Zipping Diagnostic Logs ---\n');
//         try {
//             const outputZipPath = path.join(app.getPath('userData'), `diagnostic-logs-${Date.now()}.zip`);
//             const archive = archiver('zip', { zlib: { level: 9 } });

//             const output = fs.createWriteStream(outputZipPath);

//             await new Promise((resolve, reject) => {
//                 output.on('close', () => {
//                     resolve();
//                 });
//                 output.on('error', (err) => {
//                     reject(err);
//                 });

//                 archive.pipe(output);

//                 archive.file(diagnosticTextFilePath, { name: 'diagnostic-output.txt' });
//                 archive.directory(screenshotsDir, 'screenshots');

//                 if (fs.existsSync(pcapTraceFilePath)) {
//                     archive.file(pcapTraceFilePath, { name: 'network-trace.etl' });
//                 }

//                 archive.finalize();
//             });

//             appendToDiagnosticOutput(`\nAll logs zipped to: ${outputZipPath}\n`);
//             await dialog.showMessageBox(mainWindow, {
//                 type: 'info',
//                 title: 'Diagnostics Complete',
//                 message: `Diagnostics finished! All logs are saved and zipped to:\n${outputZipPath}`
//             });
//         } catch (zipError) {
//             appendToDiagnosticOutput(`Error zipping logs: ${zipError.message}\n`);
//             console.error('Zip error:', zipError);
//         } finally {
//             diagnosticTextFilePath = '';
//         }

//         currentDiagnosticProcess = null;
//         mainWindow.webContents.send('diagnostic-completed');
//     }
// });

// /**
//  * IPC Handler for stopping the current diagnostic process.
//  */
// ipcMain.handle('stop-diagnostic', async () => {
//     if (currentDiagnosticProcess) {
//         currentDiagnosticProcess.kill();
//         currentDiagnosticProcess = null;
//     }
//     if (screenshotIntervalId) {
//         clearInterval(screenshotIntervalId);
//         screenshotIntervalId = null;
//     }
//     if (traceProcess) {
//         appendToDiagnosticOutput('\n--- Stopping Network Trace ---\n');
//         try {
//             await new Promise((resolve, reject) => {
//                 exec('netsh trace stop', (error, stdout, stderr) => {
//                     if (error) {
//                         appendToDiagnosticOutput(`Error stopping trace: ${error.message}\n`);
//                         reject(error);
//                         return;
//                     }
//                     if (stderr) appendToDiagnosticOutput(`Stderr stopping trace: ${stderr}\n`);
//                     appendToDiagnosticOutput(`Network trace stopped. ${stdout}\n`);
//                     traceProcess = null;
//                     resolve();
//                 });
//             });
//         } catch (err) {
//             console.error('Error executing netsh trace stop on stop-diagnostic:', err);
//             appendToDiagnosticOutput(`Failed to stop network trace: ${err.message}\n`);
//         }
//     }
//     appendToDiagnosticOutput('\n--- Diagnostic stopped by user ---');
//     mainWindow.webContents.send('diagnostic-completed');
// });

// /**
//  * IPC Handler for showing a native message box (replaces alert()).
//  */
// ipcMain.handle('show-message-box', async (event, options) => {
//     await dialog.showMessageBox(mainWindow, options);
// });

// /**
//  * IPC Handler for copying text to clipboard.
//  */
// ipcMain.handle('copy-to-clipboard', async (event, text) => {
//     clipboard.writeText(text);
// });

// /**
//  * IPC Handler for running single commands (ping, tracert, nslookup).
//  */
// ipcMain.handle('run-single-command', async (event, { commandType, target }) => {
//     let command = '';
//     let label = '';
//     let isIPv6 = net.isIPv6(target);

//     switch (commandType) {
//         case 'ping':
//             command = `ping ${isIPv6 ? '-6 ' : ''}${target}`;
//             label = `ping ${target}`;
//             break;
//         case 'tracert':
//             command = `tracert ${isIPv6 ? '-6 ' : ''}${target}`;
//             label = `tracert ${target}`;
//             break;
//         case 'nslookup':
//             command = `nslookup ${target}`;
//             label = `nslookup ${target}`;
//             break;
//         default:
//             mainWindow.webContents.send('single-command-output', 'Invalid command type selected.\n');
//             return;
//     }

//     try {
//         mainWindow.webContents.send('clear-output', 'single');
//         await runCommandStream(command, label, 'single');
//         mainWindow.webContents.send('single-command-completed');
//     } catch (error) {
//         console.error(`Single command (${commandType}) failed:`, error);
//         mainWindow.webContents.send('single-command-completed');
//     }
// });

// // HIGHLIGHT: New IPC listener from renderer to main to signal webview load status
// ipcMain.on('webview-load-status-from-renderer', (event, { status, url, error }) => {
//     // This handler will be responsible for resolving/rejecting the promise in `run-diagnostic`
//     // It's checked within the `run-diagnostic` function via an `ipcMain.on` listener.
// });



// // const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, webContents } = require('electron');
// // const path = require('path');
// // const { exec } = require('child_process');
// // const dns = require('dns');
// // const fs = require('fs');
// // const net = require('net');
// // const archiver = require('archiver');

// // let mainWindow;
// // let currentDiagnosticProcess = null; // For `exec` commands
// // let traceProcess = null; // For `netsh trace`
// // let screenshotIntervalId = null; // For periodic screenshots
// // let diagnosticTextFilePath = '';

// // // HIGHLIGHT: Resolver and Promise for waiting on webview load
// // let webviewLoadPromiseResolve = null;
// // let webviewLoadPromiseReject = null;
// // let webviewLoadPromise = null;

// // function createWindow() {
// //     mainWindow = new BrowserWindow({
// //         width: 1000,
// //         height: 800,
// //         minWidth: 800,
// //         minHeight: 600,
// //         webPreferences: {
// //             preload: path.join(__dirname, 'preload.js'),
// //             nodeIntegration: false,
// //             contextIsolation: true,
// //             partition: 'persist:mainwindow' // Keep for main window security
// //         },
// //         title: 'Website Diagnostic Tool'
// //     });

// //     mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
// //     // mainWindow.webContents.openDevTools();
// // }

// // app.whenReady().then(() => {
// //     createWindow();
// //     app.on('activate', () => {
// //         if (BrowserWindow.getAllWindows().length === 0) {
// //             createWindow();
// //         }
// //     });
// // });

// // app.on('window-all-closed', () => {
// //     if (process.platform !== 'darwin') {
// //         app.quit();
// //     }
// // });

// // /**
// //  * Helper function to append output to both the renderer and the log file.
// //  * This ensures diagnostic-output.txt is populated correctly.
// //  * @param {string} data - The text data to append.
// //  */
// // const appendToDiagnosticOutput = (data) => {
// //     mainWindow.webContents.send('diagnostic-output', data);
// //     if (diagnosticTextFilePath) {
// //         fs.appendFileSync(diagnosticTextFilePath, data);
// //     }
// // };

// // /**
// //  * IPC Handler for checking internet connectivity.
// //  * Uses fetch to a reliable public endpoint to confirm actual HTTP connectivity.
// //  */
// // ipcMain.handle('check-internet', async () => {
// //     try {
// //         const response = await fetch('https://www.google.com/favicon.ico', { method: 'HEAD', timeout: 5000 });
// //         return response.ok;
// //     } catch (error) {
// //         console.error('Main: Internet check failed (fetch error):', error.message);
// //         return false;
// //     }
// // });

// // /**
// //  * Executes a command, streams its output, and captures it.
// //  * @param {string} command - The command to execute.
// //  * @param {string} label - A label for the output section.
// //  * @param {string} [outputTarget='main'] - 'main' for main diagnostic output, 'single' for single command output.
// //  * @returns {Promise<string>} - Resolves with the full stdout, rejects on error.
// //  */
// // const runCommandStream = (command, label, outputTarget = 'main') => {
// //     return new Promise((resolve, reject) => {
// //         const sendOutput = (data) => {
// //             if (outputTarget === 'main') {
// //                 appendToDiagnosticOutput(data);
// //             } else {
// //                 mainWindow.webContents.send('single-command-output', data);
// //             }
// //         };

// //         sendOutput(`\n--- ${label} ---\n`);

// //         currentDiagnosticProcess = exec(command, (error, stdout, stderr) => {
// //             if (error) {
// //                 if (error.killed) {
// //                     resolve('');
// //                     return;
// //                 }
// //                 sendOutput(`Error: ${error.message}\n`);
// //                 reject(error);
// //                 return;
// //             }
// //             if (stderr) {
// //                 sendOutput(`Stderr: ${stderr}\n`);
// //             }
// //             resolve(stdout);
// //         });

// //         currentDiagnosticProcess.stdout.on('data', (data) => {
// //             sendOutput(data.toString());
// //         });

// //         currentDiagnosticProcess.stderr.on('data', (data) => {
// //             sendOutput(`Error: ${data.toString()}`);
// //         });

// //         currentDiagnosticProcess.on('close', (code) => {
// //             if (code !== 0 && currentDiagnosticProcess) {
// //                 reject(new Error(`Command exited with code ${code}`));
// //             }
// //             currentDiagnosticProcess = null;
// //         });

// //         currentDiagnosticProcess.on('error', (err) => {
// //             if (err.killed) {
// //                 resolve('');
// //                 return;
// //             }
// //             sendOutput(`Failed to start command: ${err.message}\n`);
// //             reject(err);
// //         });
// //     });
// // };

// // /**
// //  * IPC Handler for running the full diagnostic sequence.
// //  */
// // ipcMain.handle('run-diagnostic', async (event, { url, dnsServers, webviewWebContentsId }) => {
// //     mainWindow.webContents.send('clear-output', 'main');
// //     let uniqueIPv4s = new Set();
// //     let uniqueIPv6s = new Set();

// //     const logDir = path.join(app.getPath('userData'), 'diagnostic-logs', `diag-${Date.now()}`);
// //     diagnosticTextFilePath = path.join(logDir, 'diagnostic-output.txt');
// //     const pcapTraceFilePath = path.join(logDir, 'network-trace.etl');
// //     const screenshotsDir = path.join(logDir, 'screenshots');

// //     try {
// //         fs.mkdirSync(logDir, { recursive: true });
// //         fs.mkdirSync(screenshotsDir, { recursive: true });
// //         fs.writeFileSync(diagnosticTextFilePath, '');
// //     } catch (err) {
// //         appendToDiagnosticOutput(`Error creating log directories: ${err.message}\n`);
// //         return;
// //     }

// //     const originalConsoleLog = console.log;
// //     const originalConsoleError = console.error;
// //     console.log = function(...args) {
// //         originalConsoleLog(...args);
// //         fs.appendFileSync(diagnosticTextFilePath, args.join(' ') + '\n');
// //     };
// //     console.error = function(...args) {
// //         originalConsoleError(...args);
// //         fs.appendFileSync(diagnosticTextFilePath, '[ERROR] ' + args.join(' ') + '\n');
// //     };

// //     try {
// //         // HIGHLIGHT: Step 1: Public IPv4 & IPv6, nslookup, tracert, ping
// //         appendToDiagnosticOutput('\n--- Public IPv4 & IPv6 ---\n');
// //         try {
// //             const ipv4Response = await fetch('https://api.ipify.org');
// //             const ipv4 = await ipv4Response.text();
// //             appendToDiagnosticOutput(`Public IPv4: ${ipv4.trim()}\n`);
// //         } catch (err) {
// //             appendToDiagnosticOutput(`Failed to get Public IPv4: ${err.message}\n`);
// //         }

// //         try {
// //             const ipv6Response = await fetch('https://api6.ipify.org');
// //             const ipv6 = await ipv6Response.text();
// //             appendToDiagnosticOutput(`Public IPv6: ${ipv6.trim()}\n`);
// //         } catch (err) {
// //             appendToDiagnosticOutput(`Failed to get Public IPv6 (may not be configured): ${err.message}\n`);
// //         }

// //         for (const dns of dnsServers) {
// //             if (dns.enabled) {
// //                 try {
// //                     const result = await runCommandStream(`nslookup ${url} ${dns.ip}`, `nslookup with DNS: ${dns.ip}`);
// //                     const lines = result.split('\n');
// //                     lines.forEach(line => {
// //                         const ipMatch = line.match(/(?:Address(?:es)?:?\s*)([0-9a-fA-F.:]+)/);
// //                         if (ipMatch && ipMatch[1]) {
// //                             const potentialIp = ipMatch[1].trim();
// //                             if (net.isIPv4(potentialIp)) {
// //                                 uniqueIPv4s.add(potentialIp);
// //                             } else if (net.isIPv6(potentialIp)) {
// //                                 uniqueIPv6s.add(potentialIp);
// //                             }
// //                         }
// //                     });

// //                 } catch (error) {
// //                     console.error(`nslookup with ${dns.ip} failed:`, error);
// //                 }
// //             }
// //         }

// //         if (uniqueIPv4s.size > 0 || uniqueIPv6s.size > 0) {
// //             for (const ip of uniqueIPv4s) {
// //                 try { await runCommandStream(`tracert ${ip}`, `tracert to IPv4: ${ip}`); } catch (error) { console.error(`tracert to IPv4 ${ip} failed:`, error); }
// //                 try { await runCommandStream(`ping ${ip}`, `ping to IPv4: ${ip}`); } catch (error) { console.error(`ping to IPv4 ${ip} failed:`, error); }
// //             }
// //             for (const ip of uniqueIPv6s) {
// //                 try { await runCommandStream(`tracert -6 ${ip}`, `tracert to IPv6: ${ip}`); } catch (error) { console.error(`tracert to IPv6 ${ip} failed:`, error); }
// //                 try { await runCommandStream(`ping -6 ${ip}`, `ping to IPv6: ${ip}`); } catch (error) { console.error(`ping to IPv6 ${ip} failed:`, error); }
// //             }
// //         } else {
// //             appendToDiagnosticOutput('\nNo unique IPv4 or IPv6 addresses found from nslookup for tracert/ping.\n');
// //         }

// //         // HIGHLIGHT: Step 2: Start PCAP trace
// //         if (process.platform === 'win32') {
// //             appendToDiagnosticOutput('\n--- Starting Network Trace (requires Admin privileges) ---\n');
// //             const startTraceCommand = `netsh trace start capture=yes tracefile=${pcapTraceFilePath} maxsize=100mb overwrite=yes`;
// //             try {
// //                 traceProcess = exec(startTraceCommand);
// //                 appendToDiagnosticOutput(`Network trace started. Saving to ${pcapTraceFilePath}\n`);
// //             } catch (err) {
// //                 appendToDiagnosticOutput(`Error starting network trace: ${err.message}\n`);
// //                 console.error('Network trace start error:', err);
// //                 traceProcess = null;
// //             }
// //         } else {
// //             appendToDiagnosticOutput('\nNetwork trace (netsh) is only available on Windows.\n');
// //         }

// //         // HIGHLIGHT: Step 3: Open URL in internal tool and wait for it to load
// //         appendToDiagnosticOutput(`\n--- Opening URL in Internal Browser: ${url} ---\n`);
// //         const webviewTargetWebContents = webContents.fromId(webviewWebContentsId);

// //         if (webviewTargetWebContents) {
// //             // Setup a promise to wait for webview load
// //             webviewLoadPromise = new Promise((resolve, reject) => {
// //                 webviewLoadPromiseResolve = resolve;
// //                 webviewLoadPromiseReject = reject;
// //             });

// //             // Instruct the renderer to load the URL in the webview
// //             mainWindow.webContents.send('load-url-in-inapp-browser', { url, webviewId: webviewWebContentsId });
// //             appendToDiagnosticOutput(`Instructed internal browser to load: ${url}\n`);

// //             // Wait for the webview to signal completion
// //             try {
// //                 await webviewLoadPromise; // This will resolve or reject based on webview events
// //                 appendToDiagnosticOutput(`Internal browser loaded URL: ${url}\n`);
// //             } catch (error) {
// //                 appendToDiagnosticOutput(`Internal browser failed to load URL ${url}: ${error.message}\n`);
// //                 console.error(`Internal browser load error:`, error);
// //                 throw new Error('Internal browser load failed.'); // Propagate error
// //             } finally {
// //                 webviewLoadPromise = null;
// //                 webviewLoadPromiseResolve = null;
// //                 webviewLoadPromiseReject = null;
// //             }
// //         } else {
// //             const errorMessage = `Internal browser (webview) with ID ${webviewWebContentsId} not found. Cannot load URL or take screenshots.`;
// //             appendToDiagnosticOutput(`Error: ${errorMessage}\n`);
// //             console.error(errorMessage);
// //             throw new Error(errorMessage);
// //         }

// //         // HIGHLIGHT: Step 4: Take 10 screenshots of the Webview content
// //         appendToDiagnosticOutput('\n--- Taking Internal Browser Screenshots ---\n');
// //         let screenshotCount = 0;
// //         const totalScreenshots = 10;

// //         await new Promise(resolve => {
// //             screenshotIntervalId = setInterval(async () => {
// //                 if (screenshotCount < totalScreenshots) {
// //                     try {
// //                         const image = await webviewTargetWebContents.capturePage(); // Capture from webview webContents
// //                         const screenshotPath = path.join(screenshotsDir, `screenshot-${Date.now()}.png`);
// //                         fs.writeFileSync(screenshotPath, image.toPNG());
// //                         appendToDiagnosticOutput(`Screenshot ${screenshotCount + 1}/${totalScreenshots} saved to: ${screenshotPath}\n`);
// //                         screenshotCount++;
// //                     } catch (error) {
// //                         appendToDiagnosticOutput(`Error taking screenshot ${screenshotCount + 1}: ${error.message}\n`);
// //                         console.error('Screenshot error:', error);
// //                         screenshotCount++;
// //                     }
// //                 } else {
// //                     clearInterval(screenshotIntervalId);
// //                     screenshotIntervalId = null;
// //                     resolve();
// //                 }
// //             }, 1000); // 1 second interval
// //         });


// //     } catch (error) {
// //         appendToDiagnosticOutput(`\nDiagnostics interrupted or failed unexpectedly: ${error.message}`);
// //         console.error('Diagnostic sequence error:', error);
// //     } finally {
// //         // Restore original console methods
// //         console.log = originalConsoleLog;
// //         console.error = originalConsoleError;

// //         // HIGHLIGHT: Step 5: Stop network trace if it was started
// //         if (traceProcess) {
// //             appendToDiagnosticOutput('\n--- Stopping Network Trace ---\n');
// //             try {
// //                 await new Promise((resolve, reject) => {
// //                     exec('netsh trace stop', (error, stdout, stderr) => {
// //                         if (error) {
// //                             appendToDiagnosticOutput(`Error stopping trace: ${error.message}\n`);
// //                             reject(error);
// //                             return;
// //                         }
// //                         if (stderr) appendToDiagnosticOutput(`Stderr stopping trace: ${stderr}\n`);
// //                         appendToDiagnosticOutput(`Network trace stopped. ${stdout}\n`);
// //                         traceProcess = null;
// //                         resolve();
// //                     });
// //                 });
// //             } catch (err) {
// //                 console.error('Error executing netsh trace stop:', err);
// //                 appendToDiagnosticOutput(`Failed to stop network trace: ${err.message}\n`);
// //             }
// //         }

// //         // HIGHLIGHT: Step 6: Zip all files
// //         appendToDiagnosticOutput('\n--- Zipping Diagnostic Logs ---\n');
// //         try {
// //             const outputZipPath = path.join(app.getPath('userData'), `diagnostic-logs-${Date.now()}.zip`);
// //             const archive = archiver('zip', { zlib: { level: 9 } });

// //             const output = fs.createWriteStream(outputZipPath);

// //             await new Promise((resolve, reject) => {
// //                 output.on('close', () => {
// //                     resolve();
// //                 });
// //                 output.on('error', (err) => {
// //                     reject(err);
// //                 });

// //                 archive.pipe(output);

// //                 archive.file(diagnosticTextFilePath, { name: 'diagnostic-output.txt' });
// //                 archive.directory(screenshotsDir, 'screenshots');

// //                 if (fs.existsSync(pcapTraceFilePath)) {
// //                     archive.file(pcapTraceFilePath, { name: 'network-trace.etl' });
// //                 }

// //                 archive.finalize();
// //             });

// //             appendToDiagnosticOutput(`\nAll logs zipped to: ${outputZipPath}\n`);
// //             await dialog.showMessageBox(mainWindow, {
// //                 type: 'info',
// //                 title: 'Diagnostics Complete',
// //                 message: `Diagnostics finished! All logs are saved and zipped to:\n${outputZipPath}`
// //             });
// //         } catch (zipError) {
// //             appendToDiagnosticOutput(`Error zipping logs: ${zipError.message}\n`);
// //             console.error('Zip error:', zipError);
// //         } finally {
// //             diagnosticTextFilePath = '';
// //         }

// //         currentDiagnosticProcess = null;
// //         mainWindow.webContents.send('diagnostic-completed');
// //     }
// // });

// // /**
// //  * IPC Handler for stopping the current diagnostic process.
// //  */
// // ipcMain.handle('stop-diagnostic', async () => {
// //     if (currentDiagnosticProcess) {
// //         currentDiagnosticProcess.kill();
// //         currentDiagnosticProcess = null;
// //     }
// //     if (screenshotIntervalId) {
// //         clearInterval(screenshotIntervalId);
// //         screenshotIntervalId = null;
// //     }
// //     if (traceProcess) {
// //         appendToDiagnosticOutput('\n--- Stopping Network Trace ---\n');
// //         try {
// //             await new Promise((resolve, reject) => {
// //                 exec('netsh trace stop', (error, stdout, stderr) => {
// //                     if (error) {
// //                         appendToDiagnosticOutput(`Error stopping trace: ${error.message}\n`);
// //                         reject(error);
// //                         return;
// //                     }
// //                     if (stderr) appendToDiagnosticOutput(`Stderr stopping trace: ${stderr}\n`);
// //                     appendToDiagnosticOutput(`Network trace stopped. ${stdout}\n`);
// //                     traceProcess = null;
// //                     resolve();
// //                 });
// //             });
// //         } catch (err) {
// //             console.error('Error executing netsh trace stop on stop-diagnostic:', err);
// //             appendToDiagnosticOutput(`Failed to stop network trace: ${err.message}\n`);
// //         }
// //     }
// //     appendToDiagnosticOutput('\n--- Diagnostic stopped by user ---');
// //     mainWindow.webContents.send('diagnostic-completed');
// // });

// // /**
// //  * IPC Handler for showing a native message box (replaces alert()).
// //  */
// // ipcMain.handle('show-message-box', async (event, options) => {
// //     await dialog.showMessageBox(mainWindow, options);
// // });

// // /**
// //  * IPC Handler for copying text to clipboard.
// //  */
// // ipcMain.handle('copy-to-clipboard', async (event, text) => {
// //     clipboard.writeText(text);
// // });

// // /**
// //  * IPC Handler for running single commands (ping, tracert, nslookup).
// //  */
// // ipcMain.handle('run-single-command', async (event, { commandType, target }) => {
// //     let command = '';
// //     let label = '';
// //     let isIPv6 = net.isIPv6(target);

// //     switch (commandType) {
// //         case 'ping':
// //             command = `ping ${isIPv6 ? '-6 ' : ''}${target}`;
// //             label = `ping ${target}`;
// //             break;
// //         case 'tracert':
// //             command = `tracert ${isIPv6 ? '-6 ' : ''}${target}`;
// //             label = `tracert ${target}`;
// //             break;
// //         case 'nslookup':
// //             command = `nslookup ${target}`;
// //             label = `nslookup ${target}`;
// //             break;
// //         default:
// //             mainWindow.webContents.send('single-command-output', 'Invalid command type selected.\n');
// //             return;
// //     }

// //     try {
// //         mainWindow.webContents.send('clear-output', 'single');
// //         await runCommandStream(command, label, 'single');
// //         mainWindow.webContents.send('single-command-completed');
// //     } catch (error) {
// //         console.error(`Single command (${commandType}) failed:`, error);
// //         mainWindow.webContents.send('single-command-completed');
// //     }
// // });

// // // HIGHLIGHT: New IPC handlers for webview loading synchronization
// // ipcMain.handle('webview-load-status', (event, { status, webContentsId, url, error }) => {
// //     // Check if the webview being reported is the one we're waiting for in run-diagnostic
// //     if (webviewLoadPromiseResolve) {
// //         if (status === 'success') {
// //             webviewLoadPromiseResolve(webContentsId); // Resolve the promise with the webContentsId
// //         } else if (status === 'fail') {
// //             webviewLoadPromiseReject(new Error(`Webview failed to load ${url}: ${error}`)); // Reject with error
// //         }
// //     }
// // });




// // // const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, webContents } = require('electron'); // HIGHLIGHT: Added webContents for getting webview by ID
// // // const path = require('path');
// // // const { exec } = require('child_process');
// // // const dns = require('dns');
// // // const fs = require('fs');
// // // const net = require('net');
// // // const archiver = require('archiver');

// // // let mainWindow;
// // // let currentDiagnosticProcess = null; // For `exec` commands
// // // let traceProcess = null; // For `netsh trace`
// // // let screenshotIntervalId = null; // For periodic screenshots
// // // let diagnosticTextFilePath = '';

// // // function createWindow() {
// // //     mainWindow = new BrowserWindow({
// // //         width: 1000,
// // //         height: 800,
// // //         minWidth: 800,
// // //         minHeight: 600,
// // //         webPreferences: {
// // //             preload: path.join(__dirname, 'preload.js'),
// // //             nodeIntegration: false,
// // //             contextIsolation: true,
// // //             // HIGHLIGHT: partition is important for webview security and isolation.
// // //             // A unique partition for the main window prevents webview from inheriting its context.
// // //             partition: 'persist:mainwindow'
// // //         },
// // //         title: 'Website Diagnostic Tool'
// // //     });

// // //     mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
// // //     // mainWindow.webContents.openDevTools();
// // // }

// // // app.whenReady().then(() => {
// // //     createWindow();
// // //     app.on('activate', () => {
// // //         if (BrowserWindow.getAllWindows().length === 0) {
// // //             createWindow();
// // //         }
// // //     });
// // // });

// // // app.on('window-all-closed', () => {
// // //     if (process.platform !== 'darwin') {
// // //         app.quit();
// // //     }
// // // });

// // // /**
// // //  * Helper function to append output to both the renderer and the log file.
// // //  */
// // // const appendToDiagnosticOutput = (data) => {
// // //     mainWindow.webContents.send('diagnostic-output', data);
// // //     if (diagnosticTextFilePath) {
// // //         fs.appendFileSync(diagnosticTextFilePath, data);
// // //     }
// // // };

// // // /**
// // //  * IPC Handler for checking internet connectivity.
// // //  * Uses fetch to a reliable public endpoint to confirm actual HTTP connectivity.
// // //  */
// // // ipcMain.handle('check-internet', async () => {
// // //     try {
// // //         const response = await fetch('https://www.google.com/favicon.ico', { method: 'HEAD', timeout: 5000 });
// // //         return response.ok;
// // //     } catch (error) {
// // //         console.error('Main: Internet check failed (fetch error):', error.message);
// // //         return false;
// // //     }
// // // });

// // // /**
// // //  * Executes a command, streams its output, and captures it.
// // //  * @param {string} command - The command to execute.
// // //  * @param {string} label - A label for the output section.
// // //  * @param {string} [outputTarget='main'] - 'main' for main diagnostic output, 'single' for single command output.
// // //  * @returns {Promise<string>} - Resolves with the full stdout, rejects on error.
// // //  */
// // // const runCommandStream = (command, label, outputTarget = 'main') => {
// // //     return new Promise((resolve, reject) => {
// // //         const sendOutput = (data) => {
// // //             if (outputTarget === 'main') {
// // //                 appendToDiagnosticOutput(data);
// // //             } else {
// // //                 mainWindow.webContents.send('single-command-output', data);
// // //             }
// // //         };

// // //         sendOutput(`\n--- ${label} ---\n`);

// // //         currentDiagnosticProcess = exec(command, (error, stdout, stderr) => {
// // //             if (error) {
// // //                 if (error.killed) {
// // //                     resolve('');
// // //                     return;
// // //                 }
// // //                 sendOutput(`Error: ${error.message}\n`);
// // //                 reject(error);
// // //                 return;
// // //             }
// // //             if (stderr) {
// // //                 sendOutput(`Stderr: ${stderr}\n`);
// // //             }
// // //             resolve(stdout);
// // //         });

// // //         currentDiagnosticProcess.stdout.on('data', (data) => {
// // //             sendOutput(data.toString());
// // //         });

// // //         currentDiagnosticProcess.stderr.on('data', (data) => {
// // //             sendOutput(`Error: ${data.toString()}`);
// // //         });

// // //         currentDiagnosticProcess.on('close', (code) => {
// // //             if (code !== 0 && currentDiagnosticProcess) {
// // //                 reject(new Error(`Command exited with code ${code}`));
// // //             }
// // //             currentDiagnosticProcess = null;
// // //         });

// // //         currentDiagnosticProcess.on('error', (err) => {
// // //             if (err.killed) {
// // //                 resolve('');
// // //                 return;
// // //             }
// // //             sendOutput(`Failed to start command: ${err.message}\n`);
// // //             reject(err);
// // //         });
// // //     });
// // // };

// // // /**
// // //  * IPC Handler for running the full diagnostic sequence.
// // //  */
// // // ipcMain.handle('run-diagnostic', async (event, { url, dnsServers, webviewWebContentsId }) => { // HIGHLIGHT: Added webviewWebContentsId
// // //     mainWindow.webContents.send('clear-output', 'main');
// // //     let uniqueIPv4s = new Set();
// // //     let uniqueIPv6s = new Set();

// // //     const logDir = path.join(app.getPath('userData'), 'diagnostic-logs', `diag-${Date.now()}`);
// // //     diagnosticTextFilePath = path.join(logDir, 'diagnostic-output.txt');
// // //     const pcapTraceFilePath = path.join(logDir, 'network-trace.etl');
// // //     const screenshotsDir = path.join(logDir, 'screenshots');

// // //     try {
// // //         fs.mkdirSync(logDir, { recursive: true });
// // //         fs.mkdirSync(screenshotsDir, { recursive: true });
// // //         fs.writeFileSync(diagnosticTextFilePath, '');
// // //     } catch (err) {
// // //         appendToDiagnosticOutput(`Error creating log directories: ${err.message}\n`);
// // //         return;
// // //     }

// // //     const originalConsoleLog = console.log;
// // //     const originalConsoleError = console.error;
// // //     console.log = function(...args) {
// // //         originalConsoleLog(...args);
// // //         fs.appendFileSync(diagnosticTextFilePath, args.join(' ') + '\n');
// // //     };
// // //     console.error = function(...args) {
// // //         originalConsoleError(...args);
// // //         fs.appendFileSync(diagnosticTextFilePath, '[ERROR] ' + args.join(' ') + '\n');
// // //     };

// // //     try {
// // //         // 5a. Public IPv4 & IPv6
// // //         appendToDiagnosticOutput('\n--- Public IPv4 & IPv6 ---\n');
// // //         try {
// // //             const ipv4Response = await fetch('https://api.ipify.org');
// // //             const ipv4 = await ipv4Response.text();
// // //             appendToDiagnosticOutput(`Public IPv4: ${ipv4.trim()}\n`);
// // //         } catch (err) {
// // //             appendToDiagnosticOutput(`Failed to get Public IPv4: ${err.message}\n`);
// // //         }

// // //         try {
// // //             const ipv6Response = await fetch('https://api6.ipify.org');
// // //             const ipv6 = await ipv6Response.text();
// // //             appendToDiagnosticOutput(`Public IPv6: ${ipv6.trim()}\n`);
// // //         } catch (err) {
// // //             appendToDiagnosticOutput(`Failed to get Public IPv6 (may not be configured): ${err.message}\n`);
// // //         }

// // //         // 5b. nslookup with predefined DNS IPs
// // //         for (const dns of dnsServers) {
// // //             if (dns.enabled) {
// // //                 try {
// // //                     const result = await runCommandStream(`nslookup ${url} ${dns.ip}`, `nslookup with DNS: ${dns.ip}`);
// // //                     const lines = result.split('\n');
// // //                     lines.forEach(line => {
// // //                         const ipMatch = line.match(/(?:Address(?:es)?:?\s*)([0-9a-fA-F.:]+)/);
// // //                         if (ipMatch && ipMatch[1]) {
// // //                             const potentialIp = ipMatch[1].trim();
// // //                             if (net.isIPv4(potentialIp)) {
// // //                                 uniqueIPv4s.add(potentialIp);
// // //                             } else if (net.isIPv6(potentialIp)) {
// // //                                 uniqueIPv6s.add(potentialIp);
// // //                             }
// // //                         }
// // //                     });

// // //                 } catch (error) {
// // //                     console.error(`nslookup with ${dns.ip} failed:`, error);
// // //                 }
// // //             }
// // //         }

// // //         // 5c. tracert and 5d. ping for unique IPs
// // //         if (uniqueIPv4s.size > 0 || uniqueIPv6s.size > 0) {
// // //             for (const ip of uniqueIPv4s) {
// // //                 try { await runCommandStream(`tracert ${ip}`, `tracert to IPv4: ${ip}`); } catch (error) { console.error(`tracert to IPv4 ${ip} failed:`, error); }
// // //                 try { await runCommandStream(`ping ${ip}`, `ping to IPv4: ${ip}`); } catch (error) { console.error(`ping to IPv4 ${ip} failed:`, error); }
// // //             }
// // //             for (const ip of uniqueIPv6s) {
// // //                 try { await runCommandStream(`tracert -6 ${ip}`, `tracert to IPv6: ${ip}`); } catch (error) { console.error(`tracert to IPv6 ${ip} failed:`, error); }
// // //                 try { await runCommandStream(`ping -6 ${ip}`, `ping to IPv6: ${ip}`); } catch (error) { console.error(`ping to IPv6 ${ip} failed:`, error); }
// // //             }
// // //         } else {
// // //             appendToDiagnosticOutput('\nNo unique IPv4 or IPv6 addresses found from nslookup for tracert/ping.\n');
// // //         }

// // //         // 8. Capture pcap traces (netsh trace)
// // //         if (process.platform === 'win32') {
// // //             appendToDiagnosticOutput('\n--- Starting Network Trace (requires Admin privileges) ---\n');
// // //             const startTraceCommand = `netsh trace start capture=yes tracefile=${pcapTraceFilePath} maxsize=100mb overwrite=yes`;
// // //             try {
// // //                 traceProcess = exec(startTraceCommand);
// // //                 appendToDiagnosticOutput(`Network trace started. Saving to ${pcapTraceFilePath}\n`);
// // //             } catch (err) {
// // //                 appendToDiagnosticOutput(`Error starting network trace: ${err.message}\n`);
// // //                 console.error('Network trace start error:', err);
// // //                 traceProcess = null;
// // //             }
// // //         } else {
// // //             appendToDiagnosticOutput('\nNetwork trace (netsh) is only available on Windows.\n');
// // //         }

// // //         // HIGHLIGHT: Removed external browser launch. Now handled by webview.

// // //         // 3. Take 10 screenshots of the Webview content
// // //         appendToDiagnosticOutput('\n--- Taking Internal Browser Screenshots ---\n'); // HIGHLIGHT: Changed label
// // //         let currentWebContents = null;

// // //         if (webviewWebContentsId) { // HIGHLIGHT: Get webContents from the ID passed by renderer
// // //             currentWebContents = webContents.fromId(webviewWebContentsId);
// // //         }

// // //         if (currentWebContents) {
// // //             let screenshotCount = 0;
// // //             const totalScreenshots = 10;

// // //             await new Promise(resolve => {
// // //                 screenshotIntervalId = setInterval(async () => {
// // //                     if (screenshotCount < totalScreenshots) {
// // //                         try {
// // //                             const image = await currentWebContents.capturePage(); // HIGHLIGHT: Capture from webview webContents
// // //                             const screenshotPath = path.join(screenshotsDir, `screenshot-${Date.now()}.png`);
// // //                             fs.writeFileSync(screenshotPath, image.toPNG());
// // //                             appendToDiagnosticOutput(`Screenshot ${screenshotCount + 1}/${totalScreenshots} saved to: ${screenshotPath}\n`);
// // //                             screenshotCount++;
// // //                         } catch (error) {
// // //                             appendToDiagnosticOutput(`Error taking screenshot ${screenshotCount + 1}: ${error.message}\n`);
// // //                             console.error('Screenshot error:', error);
// // //                             screenshotCount++;
// // //                         }
// // //                     } else {
// // //                         clearInterval(screenshotIntervalId);
// // //                         screenshotIntervalId = null;
// // //                         resolve();
// // //                     }
// // //                 }, 1000); // 1 second interval
// // //             });
// // //         } else {
// // //             appendToDiagnosticOutput('\nFailed to get internal browser (webview) content for screenshots. Is the webview loaded?\n');
// // //             console.error('Webview webContents not found for screenshots.');
// // //         }


// // //     } catch (error) {
// // //         appendToDiagnosticOutput(`\nDiagnostics interrupted or failed unexpectedly: ${error.message}`);
// // //         console.error('Diagnostic sequence error:', error);
// // //     } finally {
// // //         // Restore original console methods
// // //         console.log = originalConsoleLog;
// // //         console.error = originalConsoleError;

// // //         // Stop network trace if it was started
// // //         if (traceProcess) {
// // //             appendToDiagnosticOutput('\n--- Stopping Network Trace ---\n');
// // //             try {
// // //                 await new Promise((resolve, reject) => {
// // //                     exec('netsh trace stop', (error, stdout, stderr) => {
// // //                         if (error) {
// // //                             appendToDiagnosticOutput(`Error stopping trace: ${error.message}\n`);
// // //                             reject(error);
// // //                             return;
// // //                         }
// // //                         if (stderr) appendToDiagnosticOutput(`Stderr stopping trace: ${stderr}\n`);
// // //                         appendToDiagnosticOutput(`Network trace stopped. ${stdout}\n`);
// // //                         traceProcess = null;
// // //                         resolve();
// // //                     });
// // //                 });
// // //             } catch (err) {
// // //                 console.error('Error executing netsh trace stop:', err);
// // //                 appendToDiagnosticOutput(`Failed to stop network trace: ${err.message}\n`);
// // //             }
// // //         }

// // //         // 5. Zip all files
// // //         appendToDiagnosticOutput('\n--- Zipping Diagnostic Logs ---\n');
// // //         try {
// // //             const outputZipPath = path.join(app.getPath('userData'), `diagnostic-logs-${Date.now()}.zip`);
// // //             const archive = archiver('zip', { zlib: { level: 9 } });

// // //             const output = fs.createWriteStream(outputZipPath);

// // //             await new Promise((resolve, reject) => {
// // //                 output.on('close', () => {
// // //                     resolve();
// // //                 });
// // //                 output.on('error', (err) => {
// // //                     reject(err);
// // //                 });

// // //                 archive.pipe(output);

// // //                 archive.file(diagnosticTextFilePath, { name: 'diagnostic-output.txt' });
// // //                 archive.directory(screenshotsDir, 'screenshots');

// // //                 if (fs.existsSync(pcapTraceFilePath)) {
// // //                     archive.file(pcapTraceFilePath, { name: 'network-trace.etl' });
// // //                 }

// // //                 archive.finalize();
// // //             });

// // //             appendToDiagnosticOutput(`\nAll logs zipped to: ${outputZipPath}\n`);
// // //             await dialog.showMessageBox(mainWindow, {
// // //                 type: 'info',
// // //                 title: 'Diagnostics Complete',
// // //                 message: `Diagnostics finished! All logs are saved and zipped to:\n${outputZipPath}`
// // //             });
// // //         } catch (zipError) {
// // //             appendToDiagnosticOutput(`Error zipping logs: ${zipError.message}\n`);
// // //             console.error('Zip error:', zipError);
// // //         } finally {
// // //             diagnosticTextFilePath = '';
// // //         }

// // //         currentDiagnosticProcess = null;
// // //         mainWindow.webContents.send('diagnostic-completed');
// // //     }
// // // });

// // // /**
// // //  * IPC Handler for stopping the current diagnostic process.
// // //  */
// // // ipcMain.handle('stop-diagnostic', async () => {
// // //     if (currentDiagnosticProcess) {
// // //         currentDiagnosticProcess.kill();
// // //         currentDiagnosticProcess = null;
// // //     }
// // //     if (screenshotIntervalId) {
// // //         clearInterval(screenshotIntervalId);
// // //         screenshotIntervalId = null;
// // //     }
// // //     if (traceProcess) {
// // //         appendToDiagnosticOutput('\n--- Stopping Network Trace ---\n');
// // //         try {
// // //             await new Promise((resolve, reject) => {
// // //                 exec('netsh trace stop', (error, stdout, stderr) => {
// // //                     if (error) {
// // //                         appendToDiagnosticOutput(`Error stopping trace: ${error.message}\n`);
// // //                         reject(error);
// // //                         return;
// // //                     }
// // //                     if (stderr) appendToDiagnosticOutput(`Stderr stopping trace: ${stderr}\n`);
// // //                     appendToDiagnosticOutput(`Network trace stopped. ${stdout}\n`);
// // //                     traceProcess = null;
// // //                     resolve();
// // //                 });
// // //             });
// // //         } catch (err) {
// // //             console.error('Error executing netsh trace stop on stop-diagnostic:', err);
// // //             appendToDiagnosticOutput(`Failed to stop network trace: ${err.message}\n`);
// // //         }
// // //     }
// // //     appendToDiagnosticOutput('\n--- Diagnostic stopped by user ---');
// // //     mainWindow.webContents.send('diagnostic-completed');
// // // });

// // // /**
// // //  * IPC Handler for showing a native message box (replaces alert()).
// // //  */
// // // ipcMain.handle('show-message-box', async (event, options) => {
// // //     await dialog.showMessageBox(mainWindow, options);
// // // });

// // // /**
// // //  * IPC Handler for copying text to clipboard.
// // //  */
// // // ipcMain.handle('copy-to-clipboard', async (event, text) => {
// // //     clipboard.writeText(text);
// // // });

// // // /**
// // //  * IPC Handler for running single commands (ping, tracert, nslookup).
// // //  */
// // // ipcMain.handle('run-single-command', async (event, { commandType, target }) => {
// // //     let command = '';
// // //     let label = '';
// // //     let isIPv6 = net.isIPv6(target);

// // //     switch (commandType) {
// // //         case 'ping':
// // //             command = `ping ${isIPv6 ? '-6 ' : ''}${target}`;
// // //             label = `ping ${target}`;
// // //             break;
// // //         case 'tracert':
// // //             command = `tracert ${isIPv6 ? '-6 ' : ''}${target}`;
// // //             label = `tracert ${target}`;
// // //             break;
// // //         case 'nslookup':
// // //             command = `nslookup ${target}`;
// // //             label = `nslookup ${target}`;
// // //             break;
// // //         default:
// // //             mainWindow.webContents.send('single-command-output', 'Invalid command type selected.\n');
// // //             return;
// // //     }

// // //     try {
// // //         mainWindow.webContents.send('clear-output', 'single');
// // //         await runCommandStream(command, label, 'single');
// // //         mainWindow.webContents.send('single-command-completed');
// // //     } catch (error) {
// // //         console.error(`Single command (${commandType}) failed:`, error);
// // //         mainWindow.webContents.send('single-command-completed');
// // //     }
// // // });

// // // // HIGHLIGHT: New IPC handler for loading URL in webview from renderer and starting screenshots
// // // ipcMain.handle('load-url-in-webview', async (event, { url, webviewId }) => {
// // //     try {
// // //         const webviewWebContents = webContents.fromId(webviewId); // Get webContents by ID
// // //         if (webviewWebContents) {
// // //             // HIGHLIGHT: Send the webContents ID back to the renderer so it can be passed to run-diagnostic
// // //             mainWindow.webContents.send('webview-loaded-for-diagnostic', webviewWebContents.id);
// // //         } else {
// // //             appendToDiagnosticOutput(`Error: webview not found for ID ${webviewId}\n`);
// // //             console.error(`Webview with ID ${webviewId} not found.`);
// // //         }
// // //     } catch (error) {
// // //         appendToDiagnosticOutput(`Error in load-url-in-webview: ${error.message}\n`);
// // //         console.error('load-url-in-webview handler error:', error);
// // //     }
// // // });




const { app, BrowserWindow, ipcMain, dialog, shell, clipboard } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const dns = require('dns');
const fs = require('fs');
const net = require('net');
const archiver = require('archiver');

let mainWindow;
let currentDiagnosticProcess = null; // For `exec` commands
let traceProcess = null; // For `netsh trace`
let screenshotIntervalId = null; // For periodic screenshots
let diagnosticTextFilePath = ''; // HIGHLIGHT: Global variable to store the current diagnostic log file path

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        title: 'Website Diagnostic Tool'
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

/**
 * HIGHLIGHT: New helper function to append output to both the renderer and the log file.
 * This ensures diagnostic-output.txt is populated correctly.
 * @param {string} data - The text data to append.
 */
const appendToDiagnosticOutput = (data) => {
    mainWindow.webContents.send('diagnostic-output', data);
    if (diagnosticTextFilePath) {
        fs.appendFileSync(diagnosticTextFilePath, data);
    }
};

/**
 * IPC Handler for checking internet connectivity.
 * Uses fetch to a reliable public endpoint to confirm actual HTTP connectivity.
 */
ipcMain.handle('check-internet', async () => {
    try {
        const response = await fetch('https://www.google.com/favicon.ico', { method: 'HEAD', timeout: 5000 });
        return response.ok;
    } catch (error) {
        console.error('Main: Internet check failed (fetch error):', error.message);
        return false;
    }
});

/**
 * Executes a command, streams its output, and captures it.
 * @param {string} command - The command to execute.
 * @param {string} label - A label for the output section.
 * @param {string} [outputTarget='main'] - 'main' for main diagnostic output, 'single' for single command output.
 * @returns {Promise<string>} - Resolves with the full stdout, rejects on error.
 */
const runCommandStream = (command, label, outputTarget = 'main') => {
    return new Promise((resolve, reject) => {
        const sendOutput = (data) => {
            if (outputTarget === 'main') {
                appendToDiagnosticOutput(data); // HIGHLIGHT: Use the new helper for main output
            } else {
                mainWindow.webContents.send('single-command-output', data);
            }
        };

        sendOutput(`\n--- ${label} ---\n`); // Send label to renderer

        currentDiagnosticProcess = exec(command, (error, stdout, stderr) => {
            if (error) {
                if (error.killed) {
                    resolve('');
                    return;
                }
                sendOutput(`Error: ${error.message}\n`);
                reject(error);
                return;
            }
            if (stderr) {
                sendOutput(`Stderr: ${stderr}\n`);
            }
            resolve(stdout);
        });

        currentDiagnosticProcess.stdout.on('data', (data) => {
            sendOutput(data.toString());
        });

        currentDiagnosticProcess.stderr.on('data', (data) => {
            sendOutput(`Error: ${data.toString()}`);
        });

        currentDiagnosticProcess.on('close', (code) => {
            if (code !== 0 && currentDiagnosticProcess) {
                reject(new Error(`Command exited with code ${code}`));
            }
            currentDiagnosticProcess = null;
        });

        currentDiagnosticProcess.on('error', (err) => {
            if (err.killed) {
                resolve('');
                return;
            }
            sendOutput(`Failed to start command: ${err.message}\n`);
            reject(err);
        });
    });
};

/**
 * IPC Handler for running the full diagnostic sequence.
 */
ipcMain.handle('run-diagnostic', async (event, { url, dnsServers }) => {
    mainWindow.webContents.send('clear-output', 'main');
    let uniqueIPv4s = new Set();
    let uniqueIPv6s = new Set();

    const logDir = path.join(app.getPath('userData'), 'diagnostic-logs', `diag-${Date.now()}`);
    diagnosticTextFilePath = path.join(logDir, 'diagnostic-output.txt'); // HIGHLIGHT: Set the global path here
    const pcapTraceFilePath = path.join(logDir, 'network-trace.etl');
    const screenshotsDir = path.join(logDir, 'screenshots');

    // Ensure log directories exist
    try {
        fs.mkdirSync(logDir, { recursive: true });
        fs.mkdirSync(screenshotsDir, { recursive: true });
        fs.writeFileSync(diagnosticTextFilePath, ''); // Create and clear the diagnostic text file
    } catch (err) {
        appendToDiagnosticOutput(`Error creating log directories: ${err.message}\n`); // HIGHLIGHT: Use helper
        return;
    }

    // Redirect console output to file as well. This captures *any* console.log/error from main process.
    // However, exec stdout/stderr are handled by runCommandStream, which also appends to the file.
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    console.log = function(...args) {
        originalConsoleLog(...args);
        fs.appendFileSync(diagnosticTextFilePath, args.join(' ') + '\n');
    };
    console.error = function(...args) {
        originalConsoleError(...args);
        fs.appendFileSync(diagnosticTextFilePath, '[ERROR] ' + args.join(' ') + '\n');
    };

    try {
        // 5a. Public IPv4 & IPv6
        appendToDiagnosticOutput('--- Start of logs collection ---\n'); // HIGHLIGHT: Use helper
        appendToDiagnosticOutput('\n--- Public IPv4 & IPv6 ---\n'); // HIGHLIGHT: Use helper
        try {
            const ipv4Response = await fetch('https://api.ipify.org');
            const ipv4 = await ipv4Response.text();
            appendToDiagnosticOutput(`Public IPv4: ${ipv4.trim()}\n`); // HIGHLIGHT: Use helper
        } catch (err) {
            appendToDiagnosticOutput(`Failed to get Public IPv4: ${err.message}\n`); // HIGHLIGHT: Use helper
        }

        try {
            const ipv6Response = await fetch('https://api6.ipify.org');
            const ipv6 = await ipv6Response.text();
            appendToDiagnosticOutput(`Public IPv6: ${ipv6.trim()}\n`); // HIGHLIGHT: Use helper
        } catch (err) {
            appendToDiagnosticOutput(`Failed to get Public IPv6 (may not be configured): ${err.message}\n`); // HIGHLIGHT: Use helper
        }

        // 5b. nslookup with predefined DNS IPs
        for (const dns of dnsServers) {
            if (dns.enabled) {
                try {
                    const result = await runCommandStream(`nslookup ${url} ${dns.ip}`, `nslookup with DNS: ${dns.ip}`);
                    const lines = result.split('\n');
                    lines.forEach(line => {
                        const ipMatch = line.match(/(?:Address(?:es)?:?\s*)([0-9a-fA-F.:]+)/);
                        if (ipMatch && ipMatch[1]) {
                            const potentialIp = ipMatch[1].trim();
                            if (net.isIPv4(potentialIp)) {
                                uniqueIPv4s.add(potentialIp);
                            } else if (net.isIPv6(potentialIp)) {
                                uniqueIPv6s.add(potentialIp);
                            }
                        }
                    });

                } catch (error) {
                    console.error(`nslookup with ${dns.ip} failed:`, error); // This is captured by console.error override
                }
            }
        }

        // 5c. tracert and 5d. ping for unique IPs
        if (uniqueIPv4s.size > 0 || uniqueIPv6s.size > 0) {
            for (const ip of uniqueIPv4s) {
                try { await runCommandStream(`tracert ${ip}`, `tracert to IPv4: ${ip}`); } catch (error) { console.error(`tracert to IPv4 ${ip} failed:`, error); }
                try { await runCommandStream(`ping ${ip}`, `ping to IPv4: ${ip}`); } catch (error) { console.error(`ping to IPv4 ${ip} failed:`, error); }
            }
            for (const ip of uniqueIPv6s) {
                try { await runCommandStream(`tracert -6 ${ip}`, `tracert to IPv6: ${ip}`); } catch (error) { console.error(`tracert to IPv6 ${ip} failed:`, error); }
                try { await runCommandStream(`ping -6 ${ip}`, `ping to IPv6: ${ip}`); } catch (error) { console.error(`ping to IPv6 ${ip} failed:`, error); }
            }
        } else {
            appendToDiagnosticOutput('\nNo unique IPv4 or IPv6 addresses found from nslookup for tracert/ping.\n'); // HIGHLIGHT: Use helper
        }

        // 8. Capture pcap traces (netsh trace)
        if (process.platform === 'win32') { // netsh trace is Windows-specific
            appendToDiagnosticOutput('\n--- Starting Network Trace (requires Admin privileges) ---\n'); // HIGHLIGHT: Use helper
            const startTraceCommand = `netsh trace start capture=yes tracefile=${pcapTraceFilePath} maxsize=100mb overwrite=yes`;
            try {
                traceProcess = exec(startTraceCommand);
                appendToDiagnosticOutput(`Network trace started. Saving to ${pcapTraceFilePath}\n`); // HIGHLIGHT: Use helper
            } catch (err) {
                appendToDiagnosticOutput(`Error starting network trace: ${err.message}\n`); // HIGHLIGHT: Use helper
                console.error('Network trace start error:', err);
                traceProcess = null;
            }
        } else {
            appendToDiagnosticOutput('\nNetwork trace (netsh) is only available on Windows.\n'); // HIGHLIGHT: Use helper
        }

        // HIGHLIGHT: 2. Open URL in Internet Explorer
        appendToDiagnosticOutput(`\n--- Opening URL in Internet Explorer: ${url} ---\n`);
        const iePaths = [
            'C:\\Program Files\\Internet Explorer\\iexplore.exe',
            'C:\\Program Files (x86)\\Internet Explorer\\iexplore.exe'
        ];
        let ieExecutable = null;

        for (const iePath of iePaths) {
            if (fs.existsSync(iePath)) {
                ieExecutable = iePath;
                break;
            }
        }

        if (ieExecutable) {
            try {
                await new Promise((res, rej) => {
                    // Use start "" to handle spaces in path, then double quotes for executable and URL
                    exec(`start "" "${ieExecutable}" "${url}"`, (error) => {
                        if (error) {
                            appendToDiagnosticOutput(`Error opening URL in Internet Explorer: ${error.message}\n`);
                            rej(error);
                            return;
                        }
                        appendToDiagnosticOutput(`URL opened in Internet Explorer: ${url}\n`);
                        res();
                    });
                });
            } catch (error) {
                console.error('Internet Explorer launch error:', error);
                appendToDiagnosticOutput(`Failed to launch Internet Explorer. Attempting to open URL with default browser as fallback.\n`);
                // Fallback to default browser if IE launch fails
                try {
                    await shell.openExternal(url);
                    appendToDiagnosticOutput(`URL opened in default browser: ${url}\n`);
                } catch (fallbackError) {
                    appendToDiagnosticOutput(`Failed to open URL in default browser: ${fallbackError.message}\n`);
                    console.error('Default browser fallback error:', fallbackError);
                }
            }
        } else {
            appendToDiagnosticOutput(`Internet Explorer executable not found. Attempting to open URL with default browser.\n`);
            try {
                await shell.openExternal(url);
                appendToDiagnosticOutput(`URL opened in default browser: ${url}\n`);
            } catch (error) {
                appendToDiagnosticOutput(`Failed to open URL in default browser: ${error.message}\n`);
                console.error('Default browser error:', error);
            }
        }
        // END HIGHLIGHT: IE Specific Launch

        // 3. Take 10 screenshots of the Electron window in a 1-second interval
        appendToDiagnosticOutput('\n--- Taking Electron Window Screenshots ---\n'); // HIGHLIGHT: Use helper
        let screenshotCount = 0;
        const totalScreenshots = 10;

        await new Promise(resolve => {
            screenshotIntervalId = setInterval(async () => {
                if (screenshotCount < totalScreenshots) {
                    try {
                        const image = await mainWindow.webContents.capturePage();
                        const screenshotPath = path.join(screenshotsDir, `screenshot-${Date.now()}.png`);
                        fs.writeFileSync(screenshotPath, image.toPNG());
                        appendToDiagnosticOutput(`Screenshot ${screenshotCount + 1}/${totalScreenshots} saved to: ${screenshotPath}\n`); // HIGHLIGHT: Use helper
                        screenshotCount++;
                    } catch (error) {
                        appendToDiagnosticOutput(`Error taking screenshot ${screenshotCount + 1}: ${error.message}\n`); // HIGHLIGHT: Use helper
                        console.error('Screenshot error:', error);
                        screenshotCount++;
                    }
                } else {
                    clearInterval(screenshotIntervalId);
                    screenshotIntervalId = null;
                    resolve();
                }
            }, 1000); // 1 second interval
        });


    } catch (error) {
        appendToDiagnosticOutput(`\nDiagnostics interrupted or failed unexpectedly: ${error.message}`); // HIGHLIGHT: Use helper
        console.error('Diagnostic sequence error:', error); // Captured by console.error override
    } finally {
        // Restore original console methods
        console.log = originalConsoleLog;
        console.error = originalConsoleError;

        // Stop network trace if it was started
        if (traceProcess) {
            appendToDiagnosticOutput('\n--- Stopping Network Trace ---\n'); // HIGHLIGHT: Use helper
            try {
                await new Promise((resolve, reject) => {
                    exec('netsh trace stop', (error, stdout, stderr) => {
                        if (error) {
                            appendToDiagnosticOutput(`Error stopping trace: ${error.message}\n`); // HIGHLIGHT: Use helper
                            reject(error);
                            return;
                        }
                        if (stderr) appendToDiagnosticOutput(`Stderr stopping trace: ${stderr}\n`); // HIGHLIGHT: Use helper
                        appendToDiagnosticOutput(`Network trace stopped. ${stdout}\n`); // HIGHLIGHT: Use helper
                        traceProcess = null;
                        resolve();
                    });
                });
            } catch (err) {
                console.error('Error executing netsh trace stop:', err); // Captured by console.error override
                appendToDiagnosticOutput(`Failed to stop network trace: ${err.message}\n`); // HIGHLIGHT: Use helper
            }
        }

        // 5. Zip all files
        appendToDiagnosticOutput('\n--- Zipping Diagnostic Logs ---\n'); // HIGHLIGHT: Use helper
        try {
            const outputZipPath = path.join(app.getPath('userData'), `diagnostic-logs-${Date.now()}.zip`);
            const archive = archiver('zip', { zlib: { level: 9 } }); // Set compression level

            const output = fs.createWriteStream(outputZipPath);

            // HIGHLIGHT: Handle 'close' event for the write stream to ensure it's complete before showing dialog
            await new Promise((resolve, reject) => {
                output.on('close', () => {
                    resolve();
                });
                output.on('error', (err) => {
                    reject(err);
                });

                archive.pipe(output);

                // Add diagnostic text file
                archive.file(diagnosticTextFilePath, { name: 'diagnostic-output.txt' });

                // Add screenshots directory
                archive.directory(screenshotsDir, 'screenshots');

                // Add network trace file if it exists
                if (fs.existsSync(pcapTraceFilePath)) {
                    archive.file(pcapTraceFilePath, { name: 'network-trace.etl' });
                }

                archive.finalize();
            });

            appendToDiagnosticOutput(`\nAll logs zipped to: ${outputZipPath}\n`); // HIGHLIGHT: Use helper
            await dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Diagnostics Complete',
                message: `Diagnostics finished! All logs are saved and zipped to:\n${outputZipPath}`
            });
        } catch (zipError) {
            appendToDiagnosticOutput(`Error zipping logs: ${zipError.message}\n`); // HIGHLIGHT: Use helper
            console.error('Zip error:', zipError); // Captured by console.error override
        } finally {
            // HIGHLIGHT: Reset diagnosticTextFilePath
            diagnosticTextFilePath = '';
        }

        currentDiagnosticProcess = null;
        mainWindow.webContents.send('diagnostic-completed');
    }
});

/**
 * IPC Handler for stopping the current diagnostic process.
 */
ipcMain.handle('stop-diagnostic', async () => {
    // Kill the current exec process
    if (currentDiagnosticProcess) {
        currentDiagnosticProcess.kill();
        currentDiagnosticProcess = null;
    }
    // Stop the screenshot interval
    if (screenshotIntervalId) {
        clearInterval(screenshotIntervalId);
        screenshotIntervalId = null;
    }
    // Stop network trace if it was started
    if (traceProcess) {
        appendToDiagnosticOutput('\n--- Stopping Network Trace ---\n'); // HIGHLIGHT: Use helper
        try {
            await new Promise((resolve, reject) => {
                exec('netsh trace stop', (error, stdout, stderr) => {
                    if (error) {
                        appendToDiagnosticOutput(`Error stopping trace: ${error.message}\n`); // HIGHLIGHT: Use helper
                        reject(error);
                        return;
                    }
                    if (stderr) appendToDiagnosticOutput(`Stderr stopping trace: ${stderr}\n`); // HIGHLIGHT: Use helper
                    appendToDiagnosticOutput(`Network trace stopped. ${stdout}\n`); // HIGHLIGHT: Use helper
                    traceProcess = null;
                    resolve();
                });
            });
        } catch (err) {
            console.error('Error executing netsh trace stop on stop-diagnostic:', err); // Captured by console.error override
            appendToDiagnosticOutput(`Failed to stop network trace: ${err.message}\n`); // HIGHLIGHT: Use helper
        }
    }
    appendToDiagnosticOutput('\n--- Diagnostic stopped by user ---'); // HIGHLIGHT: Use helper
    mainWindow.webContents.send('diagnostic-completed');
});

/**
 * IPC Handler for showing a native message box (replaces alert()).
 */
ipcMain.handle('show-message-box', async (event, options) => {
    await dialog.showMessageBox(mainWindow, options);
});

/**
 * IPC Handler for copying text to clipboard.
 */
ipcMain.handle('copy-to-clipboard', async (event, text) => {
    clipboard.writeText(text);
});

/**
 * IPC Handler for running single commands (ping, tracert, nslookup).
 */
ipcMain.handle('run-single-command', async (event, { commandType, target }) => {
    let command = '';
    let label = '';
    let isIPv6 = net.isIPv6(target);

    switch (commandType) {
        case 'ping':
            command = `ping ${isIPv6 ? '-6 ' : ''}${target}`;
            label = `ping ${target}`;
            break;
        case 'tracert':
            command = `tracert ${isIPv6 ? '-6 ' : ''}${target}`;
            label = `tracert ${target}`;
            break;
        case 'nslookup':
            command = `nslookup ${target}`;
            label = `nslookup ${target}`;
            break;
        default:
            mainWindow.webContents.send('single-command-output', 'Invalid command type selected.\n');
            return;
    }

    try {
        mainWindow.webContents.send('clear-output', 'single');
        await runCommandStream(command, label, 'single');
        mainWindow.webContents.send('single-command-completed');
    } catch (error) {
        console.error(`Single command (${commandType}) failed:`, error);
        mainWindow.webContents.send('single-command-completed');
    }
});




// // // // // const { app, BrowserWindow, ipcMain, dialog, shell, clipboard } = require('electron'); // HIGHLIGHT: Added shell and clipboard
// // // // // const path = require('path');
// // // // // const { exec } = require('child_process');
// // // // // const dns = require('dns');
// // // // // const fs = require('fs');
// // // // // const net = require('net');
// // // // // const archiver = require('archiver'); // HIGHLIGHT: Import archiver

// // // // // let mainWindow;
// // // // // let currentDiagnosticProcess = null; // For `exec` commands
// // // // // let traceProcess = null; // HIGHLIGHT: For `netsh trace`
// // // // // let screenshotIntervalId = null; // HIGHLIGHT: For periodic screenshots

// // // // // function createWindow() {
// // // // //     mainWindow = new BrowserWindow({
// // // // //         width: 1000,
// // // // //         height: 800,
// // // // //         minWidth: 800,
// // // // //         minHeight: 600,
// // // // //         webPreferences: {
// // // // //             preload: path.join(__dirname, 'preload.js'),
// // // // //             nodeIntegration: false,
// // // // //             contextIsolation: true
// // // // //         },
// // // // //         title: 'Website Diagnostic Tool'
// // // // //     });

// // // // //     mainWindow.loadFile(path.join(__dirname, 'renderer/index.html')); // HIGHLIGHT: User's updated path
// // // // //     // mainWindow.webContents.openDevTools();
// // // // // }

// // // // // app.whenReady().then(() => {
// // // // //     createWindow();
// // // // //     app.on('activate', () => {
// // // // //         if (BrowserWindow.getAllWindows().length === 0) {
// // // // //             createWindow();
// // // // //         }
// // // // //     });
// // // // // });

// // // // // app.on('window-all-closed', () => {
// // // // //     if (process.platform !== 'darwin') {
// // // // //         app.quit();
// // // // //     }
// // // // // });

// // // // // /**
// // // // //  * IPC Handler for checking internet connectivity.
// // // // //  * Uses fetch to a reliable public endpoint to confirm actual HTTP connectivity.
// // // // //  */
// // // // // ipcMain.handle('check-internet', async () => {
// // // // //     try {
// // // // //         const response = await fetch('https://www.google.com/favicon.ico', { method: 'HEAD', timeout: 5000 });
// // // // //         return response.ok;
// // // // //     } catch (error) {
// // // // //         console.error('Main: Internet check failed (fetch error):', error.message);
// // // // //         return false;
// // // // //     }
// // // // // });

// // // // // /**
// // // // //  * Executes a command, streams its output, and captures it.
// // // // //  * @param {string} command - The command to execute.
// // // // //  * @param {string} label - A label for the output section.
// // // // //  * @param {string} [outputTarget='main'] - 'main' for main diagnostic output, 'single' for single command output. // HIGHLIGHT: Added outputTarget
// // // // //  * @returns {Promise<string>} - Resolves with the full stdout, rejects on error.
// // // // //  */
// // // // // const runCommandStream = (command, label, outputTarget = 'main') => { // HIGHLIGHT: Added outputTarget parameter
// // // // //     return new Promise((resolve, reject) => {
// // // // //         const sendOutput = (data) => { // HIGHLIGHT: Function to send output to correct renderer area
// // // // //             if (outputTarget === 'main') {
// // // // //                 mainWindow.webContents.send('diagnostic-output', data);
// // // // //             } else {
// // // // //                 mainWindow.webContents.send('single-command-output', data);
// // // // //             }
// // // // //         };

// // // // //         sendOutput(`\n--- ${label} ---\n`); // Send label to renderer

// // // // //         currentDiagnosticProcess = exec(command, (error, stdout, stderr) => {
// // // // //             if (error) {
// // // // //                 if (error.killed) {
// // // // //                     resolve('');
// // // // //                     return;
// // // // //                 }
// // // // //                 sendOutput(`Error: ${error.message}\n`);
// // // // //                 reject(error);
// // // // //                 return;
// // // // //             }
// // // // //             if (stderr) {
// // // // //                 sendOutput(`Stderr: ${stderr}\n`);
// // // // //             }
// // // // //             resolve(stdout);
// // // // //         });

// // // // //         currentDiagnosticProcess.stdout.on('data', (data) => {
// // // // //             sendOutput(data.toString());
// // // // //         });

// // // // //         currentDiagnosticProcess.stderr.on('data', (data) => {
// // // // //             sendOutput(`Error: ${data.toString()}`);
// // // // //         });

// // // // //         currentDiagnosticProcess.on('close', (code) => {
// // // // //             if (code !== 0 && currentDiagnosticProcess) {
// // // // //                 reject(new Error(`Command exited with code ${code}`));
// // // // //             }
// // // // //             currentDiagnosticProcess = null;
// // // // //         });

// // // // //         currentDiagnosticProcess.on('error', (err) => {
// // // // //             if (err.killed) {
// // // // //                 resolve('');
// // // // //                 return;
// // // // //             }
// // // // //             sendOutput(`Failed to start command: ${err.message}\n`);
// // // // //             reject(err);
// // // // //         });
// // // // //     });
// // // // // };

// // // // // /**
// // // // //  * IPC Handler for running the full diagnostic sequence.
// // // // //  */
// // // // // ipcMain.handle('run-diagnostic', async (event, { url, dnsServers }) => {
// // // // //     mainWindow.webContents.send('clear-output', 'main'); // HIGHLIGHT: Clear main output in renderer
// // // // //     let uniqueIPv4s = new Set();
// // // // //     let uniqueIPv6s = new Set();
// // // // //     // HIGHLIGHT: Define paths for logs and screenshots
// // // // //     const logDir = path.join(app.getPath('userData'), 'diagnostic-logs', `diag-${Date.now()}`);
// // // // //     const diagnosticTextFilePath = path.join(logDir, 'diagnostic-output.txt');
// // // // //     const pcapTraceFilePath = path.join(logDir, 'network-trace.etl'); // .etl for netsh trace
// // // // //     const screenshotsDir = path.join(logDir, 'screenshots');
// // // // //     const screenshotPaths = []; // Not used directly in this final version, but good for tracking if needed for other purposes

// // // // //     // HIGHLIGHT: Ensure log directories exist
// // // // //     try {
// // // // //         fs.mkdirSync(logDir, { recursive: true });
// // // // //         fs.mkdirSync(screenshotsDir, { recursive: true });
// // // // //         fs.writeFileSync(diagnosticTextFilePath, ''); // Clear or create the diagnostic text file
// // // // //     } catch (err) {
// // // // //         mainWindow.webContents.send('diagnostic-output', `Error creating log directories: ${err.message}\n`);
// // // // //         return;
// // // // //     }

// // // // //     // HIGHLIGHT: Redirect console output to file as well
// // // // //     const originalConsoleLog = console.log;
// // // // //     const originalConsoleError = console.error;
// // // // //     console.log = function(...args) {
// // // // //         originalConsoleLog(...args);
// // // // //         fs.appendFileSync(diagnosticTextFilePath, args.join(' ') + '\n');
// // // // //     };
// // // // //     console.error = function(...args) {
// // // // //         originalConsoleError(...args);
// // // // //         fs.appendFileSync(diagnosticTextFilePath, '[ERROR] ' + args.join(' ') + '\n');
// // // // //     };

// // // // //     try {
// // // // //         // 5a. Public IPv4 & IPv6
// // // // //         mainWindow.webContents.send('diagnostic-output', '\n--- Public IPv4 & IPv6 ---\n');
// // // // //         try {
// // // // //             const ipv4Response = await fetch('https://api.ipify.org'); // HIGHLIGHT: User's chosen endpoint
// // // // //             const ipv4 = await ipv4Response.text();
// // // // //             mainWindow.webContents.send('diagnostic-output', `Public IPv4: ${ipv4.trim()}\n`);
// // // // //         } catch (err) {
// // // // //             mainWindow.webContents.send('diagnostic-output', `Failed to get Public IPv4: ${err.message}\n`);
// // // // //         }

// // // // //         try {
// // // // //             const ipv6Response = await fetch('https://api6.ipify.org'); // HIGHLIGHT: User's chosen endpoint
// // // // //             const ipv6 = await ipv6Response.text();
// // // // //             mainWindow.webContents.send('diagnostic-output', `Public IPv6: ${ipv6.trim()}\n`);
// // // // //         } catch (err) {
// // // // //             mainWindow.webContents.send('diagnostic-output', `Failed to get Public IPv6 (may not be configured): ${err.message}\n`);
// // // // //         }

// // // // //         // 5b. nslookup with predefined DNS IPs
// // // // //         for (const dns of dnsServers) {
// // // // //             if (dns.enabled) {
// // // // //                 try {
// // // // //                     const result = await runCommandStream(`nslookup ${url} ${dns.ip}`, `nslookup with DNS: ${dns.ip}`);
// // // // //                     const lines = result.split('\n');
// // // // //                     lines.forEach(line => {
// // // // //                         const ipMatch = line.match(/(?:Address(?:es)?:?\s*)([0-9a-fA-F.:]+)/);
// // // // //                         if (ipMatch && ipMatch[1]) {
// // // // //                             const potentialIp = ipMatch[1].trim();
// // // // //                             if (net.isIPv4(potentialIp)) {
// // // // //                                 uniqueIPv4s.add(potentialIp);
// // // // //                             } else if (net.isIPv6(potentialIp)) {
// // // // //                                 uniqueIPv6s.add(potentialIp);
// // // // //                             }
// // // // //                         }
// // // // //                     });
// // // // //                 } catch (error) {
// // // // //                     console.error(`nslookup with ${dns.ip} failed:`, error);
// // // // //                 }
// // // // //             }
// // // // //         }

// // // // //         // 5c. tracert and 5d. ping for unique IPs
// // // // //         if (uniqueIPv4s.size > 0 || uniqueIPv6s.size > 0) {
// // // // //             for (const ip of uniqueIPv4s) {
// // // // //                 try { await runCommandStream(`tracert ${ip}`, `tracert to IPv4: ${ip}`); } catch (error) { console.error(`tracert to IPv4 ${ip} failed:`, error); }
// // // // //                 try { await runCommandStream(`ping ${ip}`, `ping to IPv4: ${ip}`); } catch (error) { console.error(`ping to IPv4 ${ip} failed:`, error); }
// // // // //             }
// // // // //             for (const ip of uniqueIPv6s) {
// // // // //                 try { await runCommandStream(`tracert -6 ${ip}`, `tracert to IPv6: ${ip}`); } catch (error) { console.error(`tracert to IPv6 ${ip} failed:`, error); }
// // // // //                 try { await runCommandStream(`ping -6 ${ip}`, `ping to IPv6: ${ip}`); } catch (error) { console.error(`ping to IPv6 ${ip} failed:`, error); }
// // // // //             }
// // // // //         } else {
// // // // //             mainWindow.webContents.send('diagnostic-output', '\nNo unique IPv4 or IPv6 addresses found from nslookup for tracert/ping.\n');
// // // // //         }

// // // // //         // HIGHLIGHT: 8. Capture pcap traces (netsh trace)
// // // // //         if (process.platform === 'win32') { // netsh trace is Windows-specific
// // // // //             mainWindow.webContents.send('diagnostic-output', '\n--- Starting Network Trace (requires Admin privileges) ---\n');
// // // // //             const startTraceCommand = `netsh trace start capture=yes tracefile=${pcapTraceFilePath} maxsize=100mb overwrite=yes`;
// // // // //             try {
// // // // //                 // Use exec for netsh trace as it's a single command that runs in background
// // // // //                 traceProcess = exec(startTraceCommand);
// // // // //                 mainWindow.webContents.send('diagnostic-output', `Network trace started. Saving to ${pcapTraceFilePath}\n`);
// // // // //             } catch (err) {
// // // // //                 mainWindow.webContents.send('diagnostic-output', `Error starting network trace: ${err.message}\n`);
// // // // //                 console.error('Network trace start error:', err);
// // // // //                 traceProcess = null;
// // // // //             }
// // // // //         } else {
// // // // //             mainWindow.webContents.send('diagnostic-output', '\nNetwork trace (netsh) is only available on Windows.\n');
// // // // //         }

// // // // //         // HIGHLIGHT: 2. Open URL in system's default browser
// // // // //         mainWindow.webContents.send('diagnostic-output', `\n--- Opening URL in System Browser: ${url} ---\n`);
// // // // //         try {
// // // // //             await shell.openExternal(url);
// // // // //             mainWindow.webContents.send('diagnostic-output', `URL opened: ${url}\n`);
// // // // //         } catch (error) {
// // // // //             mainWindow.webContents.send('diagnostic-output', `Failed to open URL ${url}: ${error.message}\n`);
// // // // //             console.error('Open URL error:', error);
// // // // //         }

// // // // //         // HIGHLIGHT: 3. Take 10 screenshots of the Electron window in a 1-second interval
// // // // //         mainWindow.webContents.send('diagnostic-output', '\n--- Taking Electron Window Screenshots ---\n');
// // // // //         let screenshotCount = 0;
// // // // //         const totalScreenshots = 10;

// // // // //         await new Promise(resolve => {
// // // // //             screenshotIntervalId = setInterval(async () => {
// // // // //                 if (screenshotCount < totalScreenshots) {
// // // // //                     try {
// // // // //                         const image = await mainWindow.webContents.capturePage();
// // // // //                         const screenshotPath = path.join(screenshotsDir, `screenshot-${Date.now()}.png`);
// // // // //                         fs.writeFileSync(screenshotPath, image.toPNG());
// // // // //                         screenshotPaths.push(screenshotPath); // Store path if needed later
// // // // //                         mainWindow.webContents.send('diagnostic-output', `Screenshot ${screenshotCount + 1}/${totalScreenshots} saved to: ${screenshotPath}\n`);
// // // // //                         screenshotCount++;
// // // // //                     } catch (error) {
// // // // //                         mainWindow.webContents.send('diagnostic-output', `Error taking screenshot ${screenshotCount + 1}: ${error.message}\n`);
// // // // //                         console.error('Screenshot error:', error);
// // // // //                         screenshotCount++; // Still increment to avoid infinite loop on error
// // // // //                     }
// // // // //                 } else {
// // // // //                     clearInterval(screenshotIntervalId);
// // // // //                     screenshotIntervalId = null;
// // // // //                     resolve();
// // // // //                 }
// // // // //             }, 1000); // 1 second interval
// // // // //         });


// // // // //     } catch (error) {
// // // // //         mainWindow.webContents.send('diagnostic-output', `\nDiagnostics interrupted or failed unexpectedly: ${error.message}`);
// // // // //         console.error('Diagnostic sequence error:', error);
// // // // //     } finally {
// // // // //         // HIGHLIGHT: Restore original console methods
// // // // //         console.log = originalConsoleLog;
// // // // //         console.error = originalConsoleError;

// // // // //         // HIGHLIGHT: Stop network trace if it was started
// // // // //         if (traceProcess) {
// // // // //             mainWindow.webContents.send('diagnostic-output', '\n--- Stopping Network Trace ---\n');
// // // // //             try {
// // // // //                 // netsh trace stop command is synchronous on its own process
// // // // //                 await new Promise((resolve, reject) => {
// // // // //                     exec('netsh trace stop', (error, stdout, stderr) => {
// // // // //                         if (error) {
// // // // //                             mainWindow.webContents.send('diagnostic-output', `Error stopping trace: ${error.message}\n`);
// // // // //                             reject(error);
// // // // //                             return;
// // // // //                         }
// // // // //                         if (stderr) mainWindow.webContents.send('diagnostic-output', `Stderr stopping trace: ${stderr}\n`);
// // // // //                         mainWindow.webContents.send('diagnostic-output', `Network trace stopped. ${stdout}\n`);
// // // // //                         traceProcess = null;
// // // // //                         resolve();
// // // // //                     });
// // // // //                 });
// // // // //             } catch (err) {
// // // // //                 console.error('Error executing netsh trace stop:', err);
// // // // //                 mainWindow.webContents.send('diagnostic-output', `Failed to stop network trace: ${err.message}\n`);
// // // // //             }
// // // // //         }

// // // // //         // HIGHLIGHT: 5. Zip all files
// // // // //         mainWindow.webContents.send('diagnostic-output', '\n--- Zipping Diagnostic Logs ---\n');
// // // // //         try {
// // // // //             const outputZipPath = path.join(app.getPath('userData'), `diagnostic-logs-${Date.now()}.zip`);
// // // // //             const archive = archiver('zip', { zlib: { level: 9 } }); // Set compression level

// // // // //             const output = fs.createWriteStream(outputZipPath);
// // // // //             archive.pipe(output);

// // // // //             // Add diagnostic text file
// // // // //             archive.file(diagnosticTextFilePath, { name: 'diagnostic-output.txt' });

// // // // //             // Add screenshots directory
// // // // //             archive.directory(screenshotsDir, 'screenshots');

// // // // //             // Add network trace file if it exists
// // // // //             if (fs.existsSync(pcapTraceFilePath)) {
// // // // //                 archive.file(pcapTraceFilePath, { name: 'network-trace.etl' });
// // // // //             }

// // // // //             await archive.finalize();

// // // // //             mainWindow.webContents.send('diagnostic-output', `\nAll logs zipped to: ${outputZipPath}\n`);
// // // // //             await dialog.showMessageBox(mainWindow, {
// // // // //                 type: 'info',
// // // // //                 title: 'Diagnostics Complete',
// // // // //                 message: `Diagnostics finished! All logs are saved and zipped to:\n${outputZipPath}`
// // // // //             });
// // // // //         } catch (zipError) {
// // // // //             mainWindow.webContents.send('diagnostic-output', `Error zipping logs: ${zipError.message}\n`);
// // // // //             console.error('Zip error:', zipError);
// // // // //         }

// // // // //         currentDiagnosticProcess = null;
// // // // //         mainWindow.webContents.send('diagnostic-completed');
// // // // //     }
// // // // // });

// // // // // /**
// // // // //  * IPC Handler for stopping the current diagnostic process.
// // // // //  */
// // // // // ipcMain.handle('stop-diagnostic', async () => {
// // // // //     // Kill the current exec process
// // // // //     if (currentDiagnosticProcess) {
// // // // //         currentDiagnosticProcess.kill();
// // // // //         currentDiagnosticProcess = null;
// // // // //     }
// // // // //     // HIGHLIGHT: Stop the screenshot interval
// // // // //     if (screenshotIntervalId) {
// // // // //         clearInterval(screenshotIntervalId);
// // // // //         screenshotIntervalId = null;
// // // // //     }
// // // // //     // HIGHLIGHT: Stop network trace if it was started
// // // // //     if (traceProcess) {
// // // // //         mainWindow.webContents.send('diagnostic-output', '\n--- Stopping Network Trace ---\n');
// // // // //         try {
// // // // //             await new Promise((resolve, reject) => {
// // // // //                 exec('netsh trace stop', (error, stdout, stderr) => {
// // // // //                     if (error) {
// // // // //                         mainWindow.webContents.send('diagnostic-output', `Error stopping trace: ${error.message}\n`);
// // // // //                         reject(error);
// // // // //                         return;
// // // // //                     }
// // // // //                     if (stderr) mainWindow.webContents.send('diagnostic-output', `Stderr stopping trace: ${stderr}\n`);
// // // // //                     mainWindow.webContents.send('diagnostic-output', `Network trace stopped. ${stdout}\n`);
// // // // //                     traceProcess = null;
// // // // //                     resolve();
// // // // //                 });
// // // // //             });
// // // // //         } catch (err) {
// // // // //             console.error('Error executing netsh trace stop on stop-diagnostic:', err);
// // // // //             mainWindow.webContents.send('diagnostic-output', `Failed to stop network trace: ${err.message}\n`);
// // // // //         }
// // // // //     }
// // // // //     mainWindow.webContents.send('diagnostic-output', '\n--- Diagnostic stopped by user ---');
// // // // //     mainWindow.webContents.send('diagnostic-completed');
// // // // // });

// // // // // /**
// // // // //  * IPC Handler for showing a native message box (replaces alert()).
// // // // //  */
// // // // // ipcMain.handle('show-message-box', async (event, options) => {
// // // // //     await dialog.showMessageBox(mainWindow, options);
// // // // // });

// // // // // /**
// // // // //  * IPC Handler for copying text to clipboard. // HIGHLIGHT: New IPC for clipboard
// // // // //  */
// // // // // ipcMain.handle('copy-to-clipboard', async (event, text) => {
// // // // //     clipboard.writeText(text);
// // // // // });

// // // // // /**
// // // // //  * IPC Handler for running single commands (ping, tracert, nslookup). // HIGHLIGHT: New IPC for single commands
// // // // //  */
// // // // // ipcMain.handle('run-single-command', async (event, { commandType, target }) => {
// // // // //     let command = '';
// // // // //     let label = '';
// // // // //     let isIPv6 = net.isIPv6(target);

// // // // //     switch (commandType) {
// // // // //         case 'ping':
// // // // //             command = `ping ${isIPv6 ? '-6 ' : ''}${target}`;
// // // // //             label = `ping ${target}`;
// // // // //             break;
// // // // //         case 'tracert':
// // // // //             command = `tracert ${isIPv6 ? '-6 ' : ''}${target}`;
// // // // //             label = `tracert ${target}`;
// // // // //             break;
// // // // //         case 'nslookup':
// // // // //             command = `nslookup ${target}`;
// // // // //             label = `nslookup ${target}`;
// // // // //             break;
// // // // //         default:
// // // // //             mainWindow.webContents.send('single-command-output', 'Invalid command type selected.\n');
// // // // //             return;
// // // // //     }

// // // // //     try {
// // // // //         mainWindow.webContents.send('clear-output', 'single');
// // // // //         await runCommandStream(command, label, 'single');
// // // // //         mainWindow.webContents.send('single-command-completed'); // Notify renderer
// // // // //     } catch (error) {
// // // // //         console.error(`Single command (${commandType}) failed:`, error);
// // // // //         mainWindow.webContents.send('single-command-completed'); // Still notify completion
// // // // //     }
// // // // // });

// // // // // // const { app, BrowserWindow, ipcMain, dialog } = require('electron');
// // // // // // const path = require('path');
// // // // // // const { exec } = require('child_process');
// // // // // // const dns = require('dns'); // Still needed if you specifically want to test DNS resolution, but fetch is more comprehensive for "internet"
// // // // // // const fs = require('fs');
// // // // // // const net = require('net'); // Required for IP address validation

// // // // // // let mainWindow; // Global reference to the main window
// // // // // // let currentDiagnosticProcess = null; // To store the child process for stopping diagnostics

// // // // // // function createWindow() {
// // // // // //     mainWindow = new BrowserWindow({
// // // // // //         width: 1000,
// // // // // //         height: 800,
// // // // // //         minWidth: 800,
// // // // // //         minHeight: 600,
// // // // // //         webPreferences: {
// // // // // //             // Use a preload script for security and to expose necessary APIs
// // // // // //             preload: path.join(__dirname, 'preload.js'),
// // // // // //             nodeIntegration: false, // Keep false for security
// // // // // //             contextIsolation: true // Keep true for security
// // // // // //         },
// // // // // //         title: 'Website Diagnostic Tool' // Set window title
// // // // // //     });

// // // // // //     // Load the index.html of the app.
// // // // // //     mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

// // // // // //     // Open the DevTools (useful for debugging, remove in production).
// // // // // //     // mainWindow.webContents.openDevTools();
// // // // // // }

// // // // // // // When Electron is ready, create the window
// // // // // // app.whenReady().then(() => {
// // // // // //     createWindow();

// // // // // //     app.on('activate', () => {
// // // // // //         // On macOS it's common to re-create a window in the app when the
// // // // // //         // dock icon is clicked and there are no other windows open.
// // // // // //         if (BrowserWindow.getAllWindows().length === 0) {
// // // // // //             createWindow();
// // // // // //         }
// // // // // //     });
// // // // // // });

// // // // // // // Quit when all windows are closed, except on macOS.
// // // // // // app.on('window-all-closed', () => {
// // // // // //     if (process.platform !== 'darwin') {
// // // // // //         app.quit();
// // // // // //     }
// // // // // // });

// // // // // // /**
// // // // // //  * IPC Handler for checking internet connectivity.
// // // // // //  * Uses fetch to a reliable public endpoint to confirm actual HTTP connectivity.
// // // // // //  */
// // // // // // ipcMain.handle('check-internet', async () => {
// // // // // //     try {
// // // // // //         console.log('Main: Attempting internet connectivity check...');
// // // // // //         const response = await fetch('https://www.google.com/favicon.ico', { method: 'HEAD', timeout: 5000 });
// // // // // //         if (response.ok) {
// // // // // //             console.log('Main: Internet check successful (response.ok is true).');
// // // // // //             return true;
// // // // // //         } else {
// // // // // //             console.log(`Main: Internet check failed (response status: ${response.status}).`);
// // // // // //             return false;
// // // // // //         }
// // // // // //     } catch (error) {
// // // // // //         console.error('Main: Internet check failed (fetch error):', error.message);
// // // // // //         return false;
// // // // // //     }
// // // // // // });

// // // // // // /**
// // // // // //  * IPC Handler for running a command and streaming its output.
// // // // // //  * @param {string} command - The command to execute.
// // // // // //  * @param {string} label - A label for the output section.
// // // // // //  * @returns {Promise<string>} - Resolves with the full stdout, rejects on error.
// // // // // //  */
// // // // // // const runCommandStream = (command, label) => {
// // // // // //     return new Promise((resolve, reject) => {
// // // // // //         mainWindow.webContents.send('diagnostic-output', `\n--- ${label} ---\n`); // Send label to renderer
// // // // // //         currentDiagnosticProcess = exec(command, (error, stdout, stderr) => {
// // // // // //             if (error) {
// // // // // //                 // If the process was killed, it's not a real error we want to report as failure
// // // // // //                 if (error.killed) {
// // // // // //                     resolve(''); // Resolve silently if killed by stop button
// // // // // //                     return;
// // // // // //                 }
// // // // // //                 mainWindow.webContents.send('diagnostic-output', `Error: ${error.message}\n`);
// // // // // //                 reject(error);
// // // // // //                 return;
// // // // // //             }
// // // // // //             if (stderr) {
// // // // // //                 mainWindow.webContents.send('diagnostic-output', `Stderr: ${stderr}\n`);
// // // // // //             }
// // // // // //             resolve(stdout); // Resolve with full stdout after command finishes
// // // // // //         });

// // // // // //         // Stream stdout data to the renderer
// // // // // //         currentDiagnosticProcess.stdout.on('data', (data) => {
// // // // // //             mainWindow.webContents.send('diagnostic-output', data.toString());
// // // // // //         });

// // // // // //         // Stream stderr data to the renderer
// // // // // //         currentDiagnosticProcess.stderr.on('data', (data) => {
// // // // // //             mainWindow.webContents.send('diagnostic-output', `Error: ${data.toString()}`);
// // // // // //         });

// // // // // //         currentDiagnosticProcess.on('close', (code) => {
// // // // // //             if (code !== 0 && currentDiagnosticProcess) { // Check if not killed by user
// // // // // //                  // If the promise is still pending (not resolved/rejected by exec callback)
// // // // // //                  // This handles cases where stdout/stderr streams end, but exec callback hasn't fired yet for an error.
// // // // // //                 reject(new Error(`Command exited with code ${code}`));
// // // // // //             }
// // // // // //             currentDiagnosticProcess = null; // Clear process reference after it closes
// // // // // //         });

// // // // // //         currentDiagnosticProcess.on('error', (err) => {
// // // // // //             if (err.killed) {
// // // // // //                 resolve(''); // Resolve silently if killed by stop button
// // // // // //                 return;
// // // // // //             }
// // // // // //             mainWindow.webContents.send('diagnostic-output', `Failed to start command: ${err.message}\n`);
// // // // // //             reject(err);
// // // // // //         });
// // // // // //     });
// // // // // // };

// // // // // // /**
// // // // // //  * IPC Handler for running the full diagnostic sequence.
// // // // // //  */
// // // // // // ipcMain.handle('run-diagnostic', async (event, { url, dnsServers }) => {
// // // // // //     mainWindow.webContents.send('clear-output'); // Clear output in renderer
// // // // // //     let uniqueIPv4s = new Set(); // To store unique IPv4s for tracert and ping
// // // // // //     let uniqueIPv6s = new Set(); // To store unique IPv6s for tracert and ping

// // // // // //     try {
// // // // // //         // 5a. Public IPv4 & IPv6
// // // // // //         mainWindow.webContents.send('diagnostic-output', '\n--- Public IPv4 & IPv6 ---\n');
// // // // // //         try {
// // // // // //             const ipv4Response = await fetch('https://api.ipify.org'); // https://api.ipify.org          https://ifconfig.me/ip
// // // // // //             const ipv4 = await ipv4Response.text();
// // // // // //             mainWindow.webContents.send('diagnostic-output', `Public IPv4: ${ipv4.trim()}\n`);
// // // // // //         } catch (err) {
// // // // // //             mainWindow.webContents.send('diagnostic-output', `Failed to get Public IPv4: ${err.message}\n`);
// // // // // //         }

// // // // // //         try {
// // // // // //             const ipv6Response = await fetch('https://api6.ipify.org');           // https://ifconfig.me/ipv6
// // // // // //             const ipv6 = await ipv6Response.text();
// // // // // //             mainWindow.webContents.send('diagnostic-output', `Public IPv6: ${ipv6.trim()}\n`);
// // // // // //         } catch (err) {
// // // // // //             mainWindow.webContents.send('diagnostic-output', `Failed to get Public IPv6 (may not be configured): ${err.message}\n`);
// // // // // //         }

// // // // // //         // 5b. nslookup with predefined DNS IPs
// // // // // //         for (const dns of dnsServers) {
// // // // // //             if (dns.enabled) {
// // // // // //                 try {
// // // // // //                     const result = await runCommandStream(`nslookup ${url} ${dns.ip}`, `nslookup with DNS: ${dns.ip}`);
// // // // // //                     // Extract IPs from nslookup output for tracert/ping
// // // // // //                     // Parse output lines to find IP addresses (both IPv4 and IPv6)
// // // // // //                     const lines = result.split('\n');
// // // // // //                     lines.forEach(line => {
// // // // // //                         // Regex to find potential IP addresses in lines like "Address: X.X.X.X" or "Addresses: Y::Y"
// // // // // //                         const ipMatch = line.match(/(?:Address(?:es)?:?\s*)([0-9a-fA-F.:]+)/);
// // // // // //                         if (ipMatch && ipMatch[1]) {
// // // // // //                             const potentialIp = ipMatch[1].trim();
// // // // // //                             if (net.isIPv4(potentialIp)) {
// // // // // //                                 uniqueIPv4s.add(potentialIp);
// // // // // //                             } else if (net.isIPv6(potentialIp)) {
// // // // // //                                 uniqueIPv6s.add(potentialIp);
// // // // // //                             }
// // // // // //                         }
// // // // // //                     });

// // // // // //                 } catch (error) {
// // // // // //                     console.error(`nslookup with ${dns.ip} failed:`, error);
// // // // // //                     // Error message already sent by runCommandStream
// // // // // //                 }
// // // // // //             }
// // // // // //         }

// // // // // //         // 5c. tracert of all unique IPs (IPv4 and IPv6)
// // // // // //         // 5d. ping response of all unique IPs (IPv4 and IPv6)
// // // // // //         if (uniqueIPv4s.size > 0 || uniqueIPv6s.size > 0) {
// // // // // //             // IPv4 tracert and ping
// // // // // //             for (const ip of uniqueIPv4s) {
// // // // // //                 try {
// // // // // //                     await runCommandStream(`tracert ${ip}`, `tracert to IPv4: ${ip}`);
// // // // // //                 } catch (error) {
// // // // // //                     console.error(`tracert to IPv4 ${ip} failed:`, error);
// // // // // //                 }
// // // // // //                 try {
// // // // // //                     await runCommandStream(`ping ${ip}`, `ping to IPv4: ${ip}`);
// // // // // //                 } catch (error) {
// // // // // //                     console.error(`ping to IPv4 ${ip} failed:`, error);
// // // // // //                 }
// // // // // //             }

// // // // // //             // IPv6 tracert and ping
// // // // // //             for (const ip of uniqueIPv6s) {
// // // // // //                 try {
// // // // // //                     // tracert -6 is the command for IPv6 tracert on Windows
// // // // // //                     await runCommandStream(`tracert -6 ${ip}`, `tracert to IPv6: ${ip}`);
// // // // // //                 } catch (error) {
// // // // // //                     console.error(`tracert to IPv6 ${ip} failed:`, error);
// // // // // //                 }
// // // // // //                 try {
// // // // // //                     // ping -6 is the command for IPv6 ping on Windows
// // // // // //                     await runCommandStream(`ping -6 ${ip}`, `ping to IPv6: ${ip}`);
// // // // // //                 } catch (error) {
// // // // // //                     console.error(`ping to IPv6 ${ip} failed:`, error);
// // // // // //                 }
// // // // // //             }
// // // // // //         } else {
// // // // // //             mainWindow.webContents.send('diagnostic-output', '\nNo unique IPv4 or IPv6 addresses found from nslookup for tracert/ping.\n');
// // // // // //         }

// // // // // //         // 9. Take screenshot of the Electron window
// // // // // //         mainWindow.webContents.send('diagnostic-output', '\n--- Taking Screenshot ---\n');
// // // // // //         try {
// // // // // //             const image = await mainWindow.webContents.capturePage();
// // // // // //             // Define a directory to save logs (e.g., in user's AppData/Roaming on Windows)
// // // // // //             const logDir = path.join(app.getPath('userData'), 'diagnostic-logs');
// // // // // //             if (!fs.existsSync(logDir)) {
// // // // // //                 fs.mkdirSync(logDir, { recursive: true });
// // // // // //             }
// // // // // //             const screenshotPath = path.join(logDir, `screenshot-${Date.now()}.png`);
// // // // // //             fs.writeFileSync(screenshotPath, image.toPNG());
// // // // // //             mainWindow.webContents.send('diagnostic-output', `Screenshot saved to: ${screenshotPath}\n`);
// // // // // //         } catch (error) {
// // // // // //             mainWindow.webContents.send('diagnostic-output', `Error taking screenshot: ${error.message}\n`);
// // // // // //             console.error('Screenshot error:', error);
// // // // // //         }

// // // // // //         mainWindow.webContents.send('diagnostic-output', '\n--- Diagnostics Complete ---');
// // // // // //     } catch (error) {
// // // // // //         // This catch block handles errors that propagate up from runCommandStream if not handled internally
// // // // // //         mainWindow.webContents.send('diagnostic-output', `\nDiagnostics interrupted or failed unexpectedly: ${error.message}`);
// // // // // //     } finally {
// // // // // //         currentDiagnosticProcess = null; // Ensure process is cleared
// // // // // //         mainWindow.webContents.send('diagnostic-completed'); // Notify renderer that diagnostics are done
// // // // // //     }
// // // // // // });

// // // // // // /**
// // // // // //  * IPC Handler for stopping the current diagnostic process.
// // // // // //  */
// // // // // // ipcMain.handle('stop-diagnostic', () => {
// // // // // //     if (currentDiagnosticProcess) {
// // // // // //         currentDiagnosticProcess.kill(); // Kill the child process
// // // // // //         currentDiagnosticProcess = null; // Clear reference
// // // // // //         mainWindow.webContents.send('diagnostic-output', '\n--- Diagnostic stopped by user ---');
// // // // // //         mainWindow.webContents.send('diagnostic-completed'); // Notify renderer
// // // // // //     }
// // // // // // });

// // // // // // /**
// // // // // //  * IPC Handler for showing a native message box (replaces alert()).
// // // // // //  */
// // // // // // ipcMain.handle('show-message-box', async (event, options) => {
// // // // // //     await dialog.showMessageBox(mainWindow, options);
// // // // // // });