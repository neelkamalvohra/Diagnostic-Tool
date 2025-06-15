// const { contextBridge, ipcRenderer } = require('electron');

// // Expose a limited set of IPC methods to the renderer process
// contextBridge.exposeInMainWorld('electronAPI', {
//     // Invoke methods (one-time call with a response)
//     checkInternet: () => ipcRenderer.invoke('check-internet'),
//     // runDiagnostic now expects webviewWebContentsId from renderer
//     runDiagnostic: (url, dnsServers, webviewWebContentsId) => ipcRenderer.invoke('run-diagnostic', { url, dnsServers, webviewWebContentsId }),
//     stopDiagnostic: () => ipcRenderer.invoke('stop-diagnostic'),
//     showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
//     copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
//     runSingleCommand: (commandType, target) => ipcRenderer.invoke('run-single-command', { commandType, target }),


//     // On methods (for receiving messages from main process)
//     onDiagnosticOutput: (callback) => ipcRenderer.on('diagnostic-output', (event, data) => callback(data)),
//     onClearOutput: (callback) => ipcRenderer.on('clear-output', (event, type) => callback(type)),
//     onDiagnosticCompleted: (callback) => ipcRenderer.on('diagnostic-completed', () => callback()),
//     onSingleCommandOutput: (callback) => ipcRenderer.on('single-command-output', (event, data) => callback(data)),
//     onSingleCommandCompleted: (callback) => ipcRenderer.on('single-command-completed', () => callback()),
//     // HIGHLIGHT: New IPC from main TO renderer to instruct webview to load URL
//     onLoadUrlInInappBrowser: (callback) => ipcRenderer.on('load-url-in-inapp-browser', (event, data) => callback(data)),


//     // Remove listeners when done (important for preventing memory leaks)
//     removeDiagnosticOutputListener: (callback) => ipcRenderer.removeListener('diagnostic-output', callback),
//     removeClearOutputListener: (callback) => ipcRenderer.removeListener('clear-output', callback),
//     removeDiagnosticCompletedListener: (callback) => ipcRenderer.removeListener('diagnostic-completed', callback),
//     removeSingleCommandOutputListener: (callback) => ipcRenderer.removeListener('single-command-output', callback),
//     removeSingleCommandCompletedListener: (callback) => ipcRenderer.removeListener('single-command-completed', callback),
//     removeLoadUrlInInappBrowserListener: (callback) => ipcRenderer.removeListener('load-url-in-inapp-browser', callback) // HIGHLIGHT: Add remove listener
// });




// const { contextBridge, ipcRenderer } = require('electron');

// // Expose a limited set of IPC methods to the renderer process
// contextBridge.exposeInMainWorld('electronAPI', {
//     // Invoke methods (one-time call with a response)
//     checkInternet: () => ipcRenderer.invoke('check-internet'),
//     // runDiagnostic now expects webviewWebContentsId from renderer
//     runDiagnostic: (url, dnsServers, webviewWebContentsId) => ipcRenderer.invoke('run-diagnostic', { url, dnsServers, webviewWebContentsId }),
//     stopDiagnostic: () => ipcRenderer.invoke('stop-diagnostic'),
//     showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
//     copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
//     runSingleCommand: (commandType, target) => ipcRenderer.invoke('run-single-command', { commandType, target }),
//     // HIGHLIGHT: New IPC from renderer to main to signal webview load status
//     sendWebviewLoadStatus: (status, url, error) => ipcRenderer.send('webview-load-status-from-renderer', { status, url, error }),


//     // On methods (for receiving messages from main process)
//     onDiagnosticOutput: (callback) => ipcRenderer.on('diagnostic-output', (event, data) => callback(data)),
//     onClearOutput: (callback) => ipcRenderer.on('clear-output', (event, type) => callback(type)),
//     onDiagnosticCompleted: (callback) => ipcRenderer.on('diagnostic-completed', () => callback()),
//     onSingleCommandOutput: (callback) => ipcRenderer.on('single-command-output', (event, data) => callback(data)),
//     onSingleCommandCompleted: (callback) => ipcRenderer.on('single-command-completed', () => callback()),
//     // HIGHLIGHT: New IPC from main TO renderer to instruct webview to load URL
//     onLoadUrlInInappBrowser: (callback) => ipcRenderer.on('load-url-in-inapp-browser', (event, data) => callback(data)),


//     // Remove listeners when done (important for preventing memory leaks)
//     removeDiagnosticOutputListener: (callback) => ipcRenderer.removeListener('diagnostic-output', callback),
//     removeClearOutputListener: (callback) => ipcRenderer.removeListener('clear-output', callback),
//     removeDiagnosticCompletedListener: (callback) => ipcRenderer.removeListener('diagnostic-completed', callback),
//     removeSingleCommandOutputListener: (callback) => ipcRenderer.removeListener('single-command-output', callback),
//     removeSingleCommandCompletedListener: (callback) => ipcRenderer.removeListener('single-command-completed', callback),
//     removeLoadUrlInInappBrowserListener: (callback) => ipcRenderer.removeListener('load-url-in-inapp-browser', callback)
// });





// // const { contextBridge, ipcRenderer } = require('electron');

// // // Expose a limited set of IPC methods to the renderer process
// // contextBridge.exposeInMainWorld('electronAPI', {
// //     // Invoke methods (one-time call with a response)
// //     checkInternet: () => ipcRenderer.invoke('check-internet'),
// //     // runDiagnostic now explicitly waits for webview load, so it takes webviewWebContentsId
// //     runDiagnostic: (url, dnsServers, webviewWebContentsId) => ipcRenderer.invoke('run-diagnostic', { url, dnsServers, webviewWebContentsId }),
// //     stopDiagnostic: () => ipcRenderer.invoke('stop-diagnostic'),
// //     showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
// //     copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
// //     runSingleCommand: (commandType, target) => ipcRenderer.invoke('run-single-command', { commandType, target }),
// //     // HIGHLIGHT: New IPC to send webview load status FROM renderer TO main
// //     sendWebviewLoadStatus: (status, webContentsId, url, error) => ipcRenderer.invoke('webview-load-status', { status, webContentsId, url, error }),


// //     // On methods (for receiving messages from main process)
// //     onDiagnosticOutput: (callback) => ipcRenderer.on('diagnostic-output', (event, data) => callback(data)),
// //     onClearOutput: (callback) => ipcRenderer.on('clear-output', (event, type) => callback(type)),
// //     onDiagnosticCompleted: (callback) => ipcRenderer.on('diagnostic-completed', () => callback()),
// //     onSingleCommandOutput: (callback) => ipcRenderer.on('single-command-output', (event, data) => callback(data)),
// //     onSingleCommandCompleted: (callback) => ipcRenderer.on('single-command-completed', () => callback()),
// //     // HIGHLIGHT: New IPC from main TO renderer to instruct webview to load URL
// //     onLoadUrlInInappBrowser: (callback) => ipcRenderer.on('load-url-in-inapp-browser', (event, data) => callback(data)),


// //     // Remove listeners when done (important for preventing memory leaks)
// //     removeDiagnosticOutputListener: (callback) => ipcRenderer.removeListener('diagnostic-output', callback),
// //     removeClearOutputListener: (callback) => ipcRenderer.removeListener('clear-output', callback),
// //     removeDiagnosticCompletedListener: (callback) => ipcRenderer.removeListener('diagnostic-completed', callback),
// //     removeSingleCommandOutputListener: (callback) => ipcRenderer.removeListener('single-command-output', callback),
// //     removeSingleCommandCompletedListener: (callback) => ipcRenderer.removeListener('single-command-completed', callback),
// //     removeLoadUrlInInappBrowserListener: (callback) => ipcRenderer.removeListener('load-url-in-inapp-browser', callback) // HIGHLIGHT: New
// // });





// // // const { contextBridge, ipcRenderer } = require('electron');

// // // // Expose a limited set of IPC methods to the renderer process
// // // contextBridge.exposeInMainWorld('electronAPI', {
// // //     // Invoke methods (one-time call with a response)
// // //     checkInternet: () => ipcRenderer.invoke('check-internet'),
// // //     // HIGHLIGHT: runDiagnostic now also expects webviewWebContentsId
// // //     runDiagnostic: (url, dnsServers, webviewWebContentsId) => ipcRenderer.invoke('run-diagnostic', { url, dnsServers, webviewWebContentsId }),
// // //     stopDiagnostic: () => ipcRenderer.invoke('stop-diagnostic'),
// // //     showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
// // //     copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
// // //     runSingleCommand: (commandType, target) => ipcRenderer.invoke('run-single-command', { commandType, target }),
// // //     // HIGHLIGHT: New IPC for loading URL in webview and getting its ID
// // //     loadUrlInWebview: (url, webviewId) => ipcRenderer.invoke('load-url-in-webview', { url, webviewId }),

// // //     // On methods (for receiving messages from main process)
// // //     onDiagnosticOutput: (callback) => ipcRenderer.on('diagnostic-output', (event, data) => callback(data)),
// // //     onClearOutput: (callback) => ipcRenderer.on('clear-output', (event, type) => callback(type)),
// // //     onDiagnosticCompleted: (callback) => ipcRenderer.on('diagnostic-completed', () => callback()),
// // //     onSingleCommandOutput: (callback) => ipcRenderer.on('single-command-output', (event, data) => callback(data)),
// // //     onSingleCommandCompleted: (callback) => ipcRenderer.on('single-command-completed', () => callback()),
// // //     // HIGHLIGHT: New event from main to renderer, signaling webview is loaded and its webContentsId is ready
// // //     onWebviewLoadedForDiagnostic: (callback) => ipcRenderer.on('webview-loaded-for-diagnostic', (event, webContentsId) => callback(webContentsId)),

// // //     // Remove listeners when done (important for preventing memory leaks)
// // //     removeDiagnosticOutputListener: (callback) => ipcRenderer.removeListener('diagnostic-output', callback),
// // //     removeClearOutputListener: (callback) => ipcRenderer.removeListener('clear-output', callback),
// // //     removeDiagnosticCompletedListener: (callback) => ipcRenderer.removeListener('diagnostic-completed', callback),
// // //     removeSingleCommandOutputListener: (callback) => ipcRenderer.removeListener('single-command-output', callback),
// // //     removeSingleCommandCompletedListener: (callback) => ipcRenderer.removeListener('single-command-completed', callback),
// // //     removeWebviewLoadedForDiagnosticListener: (callback) => ipcRenderer.removeListener('webview-loaded-for-diagnostic', callback) // HIGHLIGHT: New
// // // });




const { contextBridge, ipcRenderer } = require('electron');

// Expose a limited set of IPC methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Invoke methods (one-time call with a response)
    checkInternet: () => ipcRenderer.invoke('check-internet'),
    runDiagnostic: (url, dnsServers) => ipcRenderer.invoke('run-diagnostic', { url, dnsServers }),
    stopDiagnostic: () => ipcRenderer.invoke('stop-diagnostic'),
    showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
    copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text), // HIGHLIGHT: New
    runSingleCommand: (commandType, target) => ipcRenderer.invoke('run-single-command', { commandType, target }), // HIGHLIGHT: New

    // On methods (for receiving messages from main process)
    onDiagnosticOutput: (callback) => ipcRenderer.on('diagnostic-output', (event, data) => callback(data)),
    onClearOutput: (callback) => ipcRenderer.on('clear-output', (event, type) => callback(type)), // HIGHLIGHT: Modified to pass type
    onDiagnosticCompleted: (callback) => ipcRenderer.on('diagnostic-completed', () => callback()),
    onSingleCommandOutput: (callback) => ipcRenderer.on('single-command-output', (event, data) => callback(data)), // HIGHLIGHT: New
    onSingleCommandCompleted: (callback) => ipcRenderer.on('single-command-completed', () => callback()), // HIGHLIGHT: New


    // Remove listeners when done (important for preventing memory leaks)
    removeDiagnosticOutputListener: (callback) => ipcRenderer.removeListener('diagnostic-output', callback),
    removeClearOutputListener: (callback) => ipcRenderer.removeListener('clear-output', callback),
    removeDiagnosticCompletedListener: (callback) => ipcRenderer.removeListener('diagnostic-completed', callback),
    removeSingleCommandOutputListener: (callback) => ipcRenderer.removeListener('single-command-output', callback), // HIGHLIGHT: New
    removeSingleCommandCompletedListener: (callback) => ipcRenderer.removeListener('single-command-completed', callback) // HIGHLIGHT: New
});

// // // // // const { contextBridge, ipcRenderer } = require('electron');

// // // // // // Expose a limited set of IPC methods to the renderer process
// // // // // contextBridge.exposeInMainWorld('electronAPI', {
// // // // //     // Invoke methods (one-time call with a response)
// // // // //     checkInternet: () => ipcRenderer.invoke('check-internet'),
// // // // //     runDiagnostic: (url, dnsServers) => ipcRenderer.invoke('run-diagnostic', { url, dnsServers }),
// // // // //     stopDiagnostic: () => ipcRenderer.invoke('stop-diagnostic'),
// // // // //     showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),

// // // // //     // On methods (for receiving messages from main process)
// // // // //     onDiagnosticOutput: (callback) => ipcRenderer.on('diagnostic-output', (event, data) => callback(data)),
// // // // //     onClearOutput: (callback) => ipcRenderer.on('clear-output', () => callback()),
// // // // //     onDiagnosticCompleted: (callback) => ipcRenderer.on('diagnostic-completed', () => callback()),

// // // // //     // Remove listeners when done (important for preventing memory leaks)
// // // // //     removeDiagnosticOutputListener: (callback) => ipcRenderer.removeListener('diagnostic-output', callback),
// // // // //     removeClearOutputListener: (callback) => ipcRenderer.removeListener('clear-output', callback),
// // // // //     removeDiagnosticCompletedListener: (callback) => ipcRenderer.removeListener('diagnostic-completed', callback)
// // // // // });