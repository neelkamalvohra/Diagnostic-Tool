// // Wrap the entire renderer.js code in an IIFE to create a private scope
// (function() {
//     // Access the exposed Electron API from the preload script
//     const electronAPI = window.electronAPI;

//     // Get DOM elements for main diagnostics
//     const internetStatusIndicator = document.getElementById('internet-status');
//     const websiteUrlInput = document.getElementById('website-url');
//     const runDiagnosticBtn = document.getElementById('run-diagnostic');
//     const stopDiagnosticBtn = document.getElementById('stop-diagnostic');
//     const diagnosticOutput = document.getElementById('diagnostic-output');
//     const copyDiagnosticOutputBtn = document.getElementById('copy-diagnostic-output');

//     const dnsIpCheckboxes = [
//         document.getElementById('dns1-checkbox'),
//         document.getElementById('dns2-checkbox'),
//         document.getElementById('dns3-checkbox'),
//         document.getElementById('dns4-checkbox')
//     ];
//     const dnsIpInputs = [
//         document.getElementById('dns1-ip'),
//         document.getElementById('dns2-ip'),
//         document.getElementById('dns3-ip'),
//         document.getElementById('dns4-ip')
//     ];

//     // Get DOM elements for single command execution
//     const singleCommandInput = document.getElementById('single-command-input');
//     const commandTypeSelect = document.getElementById('command-type-select');
//     const runSingleCommandBtn = document.getElementById('run-single-command');
//     const singleCommandOutput = document.getElementById('single-command-output');
//     const copySingleCommandOutputBtn = document.getElementById('copy-single-command-output');

//     // New DOM elements for internal browser
//     const internalBrowserSection = document.getElementById('internal-browser-section');
//     const internalBrowserWebview = document.getElementById('internal-browser-webview');
//     const internalBrowserUrlDisplay = document.getElementById('internal-browser-url-display');
//     const internalBrowserStatus = document.getElementById('internal-browser-status');
//     const openUrlInToolBtn = document.getElementById('open-url-in-tool-btn');

//     let currentWebviewWebContentsId = null; // To store the webContents ID of the webview


//     /**
//      * Updates the visual internet status indicator.
//      * @param {boolean} isConnected - True if internet is available, false otherwise.
//      */
//     function updateInternetStatus(isConnected) {
//         if (isConnected) {
//             internetStatusIndicator.classList.remove('red');
//             internetStatusIndicator.classList.add('green');
//             internetStatusIndicator.title = 'Internet Available';
//         } else {
//             internetStatusIndicator.classList.remove('green');
//             internetStatusIndicator.classList.add('red');
//             internetStatusIndicator.title = 'Internet Not Available';
//         }
//     }

//     /**
//      * Clears the diagnostic output area based on type.
//      * @param {'main'|'single'} type - Which output area to clear.
//      */
//     function clearOutput(type) {
//         if (type === 'main') {
//             diagnosticOutput.textContent = '';
//         } else if (type === 'single') {
//             singleCommandOutput.textContent = '';
//         }
//     }

//     /**
//      * Appends data to the diagnostic output area and scrolls to the bottom.
//      * @param {string} data - The text data to append.
//      * @param {'main'|'single'} type - Which output area to append to.
//      */
//     function appendOutput(data, type = 'main') {
//         const targetOutput = type === 'main' ? diagnosticOutput : singleCommandOutput;
//         targetOutput.textContent += data;
//         targetOutput.scrollTop = targetOutput.scrollHeight; // Auto-scroll
//     }

//     /**
//      * Handles the completion of main diagnostic tests.
//      * Enables Run button, disables Stop button, enables copy button.
//      */
//     function onDiagnosticCompleted() {
//         runDiagnosticBtn.disabled = false;
//         stopDiagnosticBtn.disabled = true;
//         copyDiagnosticOutputBtn.disabled = false;
//         // Optionally hide the webview after diagnostics
//         // internalBrowserSection.style.display = 'none'; // Keep webview visible for user if desired
//     }

//     /**
//      * Handles the completion of single command execution.
//      * Enables Run button, enables copy button.
//      */
//     function onSingleCommandCompleted() {
//         runSingleCommandBtn.disabled = false;
//         copySingleCommandOutputBtn.disabled = false;
//     }


//     // Initial internet check and periodic checks
//     async function checkInternetPeriodically() {
//         const isConnected = await electronAPI.checkInternet();
//         updateInternetStatus(isConnected);
//     }
//     checkInternetPeriodically();
//     setInterval(checkInternetPeriodically, 10000);

//     // HIGHLIGHT: Run Diagnostic button logic refactored to pass webContentsId and let main orchestrate
//     runDiagnosticBtn.addEventListener('click', async () => {
//         const websiteUrl = websiteUrlInput.value.trim();
//         if (!websiteUrl) {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'Input Required',
//                 message: 'Please enter a website URL (e.g., example.com).'
//             });
//             return;
//         }

//         // Get the webview's webContentsId. This ID is stable once the webview element is in the DOM.
//         // It's available immediately after the HTML is loaded, even if the webview hasn't loaded any content.
//         currentWebviewWebContentsId = internalBrowserWebview.getWebContentsId();
//         if (!currentWebviewWebContentsId) {
//              await electronAPI.showMessageBox({
//                 type: 'error',
//                 title: 'Internal Browser Error',
//                 message: 'Internal browser (webview) not ready or failed to initialize. Please restart the application if this persists.'
//             });
//             return;
//         }

//         // Disable Run button, enable Stop button, disable copy button
//         runDiagnosticBtn.disabled = true;
//         stopDiagnosticBtn.disabled = false;
//         copyDiagnosticOutputBtn.disabled = true;

//         clearOutput('main');
//         appendOutput('Starting full diagnostics...\n', 'main');

//         const selectedDnsServers = [];
//         for (let i = 0; i < dnsIpCheckboxes.length; i++) {
//             if (dnsIpCheckboxes[i].checked) {
//                 const ip = dnsIpInputs[i].value.trim();
//                 if (ip) {
//                     selectedDnsServers.push({ ip: ip, enabled: true });
//                 } else {
//                     await electronAPI.showMessageBox({
//                         type: 'warning',
//                         title: 'Invalid DNS IP',
//                         message: `DNS IP field ${i + 1} is checked but empty. Please provide a valid IP or uncheck it.`
//                     });
//                     runDiagnosticBtn.disabled = false;
//                     stopDiagnosticBtn.disabled = true;
//                     return;
//                 }
//             }
//         }

//         if (selectedDnsServers.length === 0) {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'No DNS Selected',
//                 message: 'Please select at least one DNS server for nslookup.'
//             });
//             runDiagnosticBtn.disabled = false;
//             stopDiagnosticBtn.disabled = true;
//             return;
//         }

//         // Pass the webContentsId to the main process. Main process will then instruct THIS webview to load.
//         await electronAPI.runDiagnostic(websiteUrl, selectedDnsServers, currentWebviewWebContentsId);
//     });

//     // Event listener for the "Stop Diagnostic" button
//     stopDiagnosticBtn.addEventListener('click', async () => {
//         await electronAPI.stopDiagnostic();
//     });

//     // Event listener for the "Copy Diagnostic Output" button
//     copyDiagnosticOutputBtn.addEventListener('click', async () => {
//         const textToCopy = diagnosticOutput.textContent;
//         if (textToCopy.trim()) {
//             await electronAPI.copyToClipboard(textToCopy);
//             await electronAPI.showMessageBox({
//                 type: 'info',
//                 title: 'Copied!',
//                 message: 'Diagnostic output copied to clipboard.'
//             });
//         } else {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'Nothing to Copy',
//                 message: 'Diagnostic output is empty.'
//             });
//         }
//     });

//     // Event listener for the "Run Command" button in the separate section
//     runSingleCommandBtn.addEventListener('click', async () => {
//         const target = singleCommandInput.value.trim();
//         const commandType = commandTypeSelect.value;

//         if (!target) {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'Input Required',
//                 message: 'Please enter a target (IP or hostname) for the command.'
//             });
//             return;
//         }

//         if (!commandType) {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'Selection Required',
//                 message: 'Please select a command type (ping, tracert, or nslookup).'
//             });
//             return;
//         }

//         runSingleCommandBtn.disabled = true;
//         copySingleCommandOutputBtn.disabled = true;
//         clearOutput('single');
//         appendOutput(`Running ${commandType} for ${target}...\n`, 'single');
//         await electronAPI.runSingleCommand(commandType, target);
//     });

//     // Event listener for the "Copy Single Command Output" button
//     copySingleCommandOutputBtn.addEventListener('click', async () => {
//         const textToCopy = singleCommandOutput.textContent;
//         if (textToCopy.trim()) {
//             await electronAPI.copyToClipboard(textToCopy);
//             await electronAPI.showMessageBox({
//                 type: 'info',
//                 title: 'Copied!',
//                 message: 'Command output copied to clipboard.'
//             });
//         } else {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'Nothing to Copy',
//                 message: 'Command output is empty.'
//             });
//         }
//     });

//     // Logic for the internal browser (webview) for manual preview
//     // This button remains for manual preview, independent of the main diagnostic flow.
//     openUrlInToolBtn.addEventListener('click', async () => {
//         const url = websiteUrlInput.value.trim();
//         if (!url) {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'Input Required',
//                 message: 'Please enter a website URL to open in the tool.'
//             });
//             return;
//         }

//         internalBrowserSection.style.display = 'block'; // Show the webview section
//         internalBrowserWebview.src = url;
//         internalBrowserUrlDisplay.textContent = `Loading: ${url}`;
//         internalBrowserStatus.textContent = 'Loading...';
//         internalBrowserStatus.style.color = 'orange';

//         // Open DevTools for webview if needed for debugging internal page behavior
//         // internalBrowserWebview.openDevTools();
//     });

//     // Webview events for status updates and UI display
//     internalBrowserWebview.addEventListener('did-start-loading', () => {
//         internalBrowserStatus.textContent = 'Loading...';
//         internalBrowserStatus.style.color = 'orange';
//     });

//     internalBrowserWebview.addEventListener('did-stop-loading', () => {
//         internalBrowserStatus.textContent = 'Loaded';
//         internalBrowserStatus.style.color = 'green';
//         internalBrowserUrlDisplay.textContent = `Current URL: ${internalBrowserWebview.getURL()}`;
//     });

//     internalBrowserWebview.addEventListener('did-fail-load', (event) => {
//         internalBrowserStatus.textContent = `Failed to load: ${event.errorCode} - ${event.errorDescription}`;
//         internalBrowserStatus.style.color = 'red';
//         internalBrowserUrlDisplay.textContent = `Error loading: ${event.validatedURL}`;
//         console.error('Webview load failed:', event);
//     });

//     // Handle new-window requests from webview (e.g., clicks on _blank links)
//     internalBrowserWebview.addEventListener('new-window', (e) => {
//         shell.openExternal(e.url); // Open external links in default system browser
//     });

//     // Register listeners for communication from main process
//     electronAPI.onDiagnosticOutput((data) => appendOutput(data, 'main'));
//     electronAPI.onClearOutput((type) => clearOutput(type));
//     electronAPI.onDiagnosticCompleted(onDiagnosticCompleted);
//     electronAPI.onSingleCommandOutput((data) => appendOutput(data, 'single'));
//     electronAPI.onSingleCommandCompleted(onSingleCommandCompleted);
//     // HIGHLIGHT: Listener for main process telling webview to load URL for diagnostics
//     electronAPI.onLoadUrlInInappBrowser(({ url, webContentsId }) => {
//         // Only load if it's for this webview's webContents
//         if (internalBrowserWebview.getWebContentsId() === webContentsId) {
//             internalBrowserSection.style.display = 'block'; // Ensure it's visible
//             internalBrowserWebview.src = url;
//             internalBrowserUrlDisplay.textContent = `Loading for diagnostics: ${url}`;
//             internalBrowserStatus.textContent = 'Loading... (Diagnostic)';
//             internalBrowserStatus.style.color = 'orange';
//         }
//     });


//     // Clean up listeners when the window is about to unload
//     window.addEventListener('unload', () => {
//         electronAPI.removeDiagnosticOutputListener((data) => appendOutput(data, 'main'));
//         electronAPI.removeClearOutputListener((type) => clearOutput(type));
//         electronAPI.removeDiagnosticCompletedListener(onDiagnosticCompleted);
//         electronAPI.removeSingleCommandOutputListener((data) => appendOutput(data, 'single'));
//         electronAPI.removeSingleCommandCompletedListener(onSingleCommandCompleted);
//         electronAPI.removeLoadUrlInInappBrowserListener(() => {});
//     });
// })();




// // Wrap the entire renderer.js code in an IIFE to create a private scope
// (function() {
//     // Access the exposed Electron API from the preload script
//     const electronAPI = window.electronAPI;

//     // Get DOM elements for main diagnostics
//     const internetStatusIndicator = document.getElementById('internet-status');
//     const websiteUrlInput = document.getElementById('website-url');
//     const runDiagnosticBtn = document.getElementById('run-diagnostic');
//     const stopDiagnosticBtn = document.getElementById('stop-diagnostic');
//     const diagnosticOutput = document.getElementById('diagnostic-output');
//     const copyDiagnosticOutputBtn = document.getElementById('copy-diagnostic-output');

//     const dnsIpCheckboxes = [
//         document.getElementById('dns1-checkbox'),
//         document.getElementById('dns2-checkbox'),
//         document.getElementById('dns3-checkbox'),
//         document.getElementById('dns4-checkbox')
//     ];
//     const dnsIpInputs = [
//         document.getElementById('dns1-ip'),
//         document.getElementById('dns2-ip'),
//         document.getElementById('dns3-ip'),
//         document.getElementById('dns4-ip')
//     ];

//     // Get DOM elements for single command execution
//     const singleCommandInput = document.getElementById('single-command-input');
//     const commandTypeSelect = document.getElementById('command-type-select');
//     const runSingleCommandBtn = document.getElementById('run-single-command');
//     const singleCommandOutput = document.getElementById('single-command-output');
//     const copySingleCommandOutputBtn = document.getElementById('copy-single-command-output');

//     // New DOM elements for internal browser
//     const internalBrowserSection = document.getElementById('internal-browser-section');
//     const internalBrowserWebview = document.getElementById('internal-browser-webview');
//     const internalBrowserUrlDisplay = document.getElementById('internal-browser-url-display');
//     const internalBrowserStatus = document.getElementById('internal-browser-status');
//     const openUrlInToolBtn = document.getElementById('open-url-in-tool-btn');

//     let currentWebviewWebContentsId = null; // To store the webContents ID of the webview


//     /**
//      * Updates the visual internet status indicator.
//      * @param {boolean} isConnected - True if internet is available, false otherwise.
//      */
//     function updateInternetStatus(isConnected) {
//         if (isConnected) {
//             internetStatusIndicator.classList.remove('red');
//             internetStatusIndicator.classList.add('green');
//             internetStatusIndicator.title = 'Internet Available';
//         } else {
//             internetStatusIndicator.classList.remove('green');
//             internetStatusIndicator.classList.add('red');
//             internetStatusIndicator.title = 'Internet Not Available';
//         }
//     }

//     /**
//      * Clears the diagnostic output area based on type.
//      * @param {'main'|'single'} type - Which output area to clear.
//      */
//     function clearOutput(type) {
//         if (type === 'main') {
//             diagnosticOutput.textContent = '';
//         } else if (type === 'single') {
//             singleCommandOutput.textContent = '';
//         }
//     }

//     /**
//      * Appends data to the diagnostic output area and scrolls to the bottom.
//      * @param {string} data - The text data to append.
//      * @param {'main'|'single'} type - Which output area to append to.
//      */
//     function appendOutput(data, type = 'main') {
//         const targetOutput = type === 'main' ? diagnosticOutput : singleCommandOutput;
//         targetOutput.textContent += data;
//         targetOutput.scrollTop = targetOutput.scrollHeight; // Auto-scroll
//     }

//     /**
//      * Handles the completion of main diagnostic tests.
//      * Enables Run button, disables Stop button, enables copy button.
//      */
//     function onDiagnosticCompleted() {
//         runDiagnosticBtn.disabled = false;
//         stopDiagnosticBtn.disabled = true;
//         copyDiagnosticOutputBtn.disabled = false;
//         // Optionally hide the webview after diagnostics
//         // internalBrowserSection.style.display = 'none'; // Keep webview visible for user if desired
//     }

//     /**
//      * Handles the completion of single command execution.
//      * Enables Run button, enables copy button.
//      */
//     function onSingleCommandCompleted() {
//         runSingleCommandBtn.disabled = false;
//         copySingleCommandOutputBtn.disabled = false;
//     }


//     // Initial internet check and periodic checks
//     async function checkInternetPeriodically() {
//         const isConnected = await electronAPI.checkInternet();
//         updateInternetStatus(isConnected);
//     }
//     checkInternetPeriodically();
//     setInterval(checkInternetPeriodically, 10000);

//     // HIGHLIGHT: Run Diagnostic button now orchestrates webview load first
//     runDiagnosticBtn.addEventListener('click', async () => {
//         const websiteUrl = websiteUrlInput.value.trim();
//         if (!websiteUrl) {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'Input Required',
//                 message: 'Please enter a website URL (e.g., example.com).'
//             });
//             return;
//         }

//         // Disable Run button, enable Stop button, disable copy button
//         runDiagnosticBtn.disabled = true;
//         stopDiagnosticBtn.disabled = false;
//         copyDiagnosticOutputBtn.disabled = true;

//         clearOutput('main');
//         appendOutput('Starting full diagnostics...\n', 'main');

//         // Step 1: Ensure webview is visible and get its webContentsId
//         internalBrowserSection.style.display = 'block';
//         currentWebviewWebContentsId = internalBrowserWebview.getWebContentsId();

//         if (!currentWebviewWebContentsId) {
//             await electronAPI.showMessageBox({
//                 type: 'error',
//                 title: 'Internal Browser Error',
//                 message: 'Internal browser (webview) not ready or failed to initialize. Please restart the application if this persists.'
//             });
//             runDiagnosticBtn.disabled = false;
//             stopDiagnosticBtn.disabled = true;
//             return;
//         }

//         // Step 2: Instruct webview to load URL and await its completion
//         internalBrowserUrlDisplay.textContent = `Loading: ${websiteUrl}`;
//         internalBrowserStatus.textContent = 'Loading...';
//         internalBrowserStatus.style.color = 'orange';
//         internalBrowserWebview.src = websiteUrl; // Trigger webview load

//         // HIGHLIGHT: Create a promise that resolves when webview loads or fails
//         const webviewLoadPromise = new Promise((resolve, reject) => {
//             const didStopLoadingHandler = () => {
//                 internalBrowserWebview.removeEventListener('did-stop-loading', didStopLoadingHandler);
//                 internalBrowserWebview.removeEventListener('did-fail-load', didFailLoadHandler);
//                 resolve(true); // Signal success
//             };
//             const didFailLoadHandler = (event) => {
//                 internalBrowserWebview.removeEventListener('did-stop-loading', didStopLoadingHandler);
//                 internalBrowserWebview.removeEventListener('did-fail-load', didFailLoadHandler);
//                 reject(new Error(`Webview failed to load: ${event.errorCode} - ${event.errorDescription}`)); // Signal failure
//             };

//             internalBrowserWebview.addEventListener('did-stop-loading', didStopLoadingHandler);
//             internalBrowserWebview.addEventListener('did-fail-load', didFailLoadHandler);

//             // Add a timeout for the webview itself, in case it never fires events
//             setTimeout(() => {
//                 internalBrowserWebview.removeEventListener('did-stop-loading', didStopLoadingHandler);
//                 internalBrowserWebview.removeEventListener('did-fail-load', didFailLoadHandler);
//                 reject(new Error('Webview loading timed out.'));
//             }, 20000); // 20 seconds timeout for webview to load
//         });

//         try {
//             await webviewLoadPromise;
//             internalBrowserStatus.textContent = 'Loaded';
//             internalBrowserStatus.style.color = 'green';
//             internalBrowserUrlDisplay.textContent = `Current URL: ${internalBrowserWebview.getURL()}`;
//             appendOutput(`Internal browser successfully loaded: ${websiteUrl}\n`, 'main');
//         } catch (error) {
//             internalBrowserStatus.textContent = `Load Failed: ${error.message}`;
//             internalBrowserStatus.style.color = 'red';
//             internalBrowserUrlDisplay.textContent = `Error loading: ${websiteUrl}`;
//             appendOutput(`Internal browser failed to load ${websiteUrl}: ${error.message}\n`, 'main');
//             await electronAPI.showMessageBox({
//                 type: 'error',
//                 title: 'Internal Browser Load Failed',
//                 message: `Failed to load URL in internal browser: ${error.message}. Cannot proceed with full diagnostics.`
//             });
//             runDiagnosticBtn.disabled = false;
//             stopDiagnosticBtn.disabled = true;
//             return;
//         }

//         // Step 3: Collect selected DNS servers (same as before)
//         const selectedDnsServers = [];
//         for (let i = 0; i < dnsIpCheckboxes.length; i++) {
//             if (dnsIpCheckboxes[i].checked) {
//                 const ip = dnsIpInputs[i].value.trim();
//                 if (ip) {
//                     selectedDnsServers.push({ ip: ip, enabled: true });
//                 } else {
//                     await electronAPI.showMessageBox({
//                         type: 'warning',
//                         title: 'Invalid DNS IP',
//                         message: `DNS IP field ${i + 1} is checked but empty. Please provide a valid IP or uncheck it.`
//                     });
//                     runDiagnosticBtn.disabled = false;
//                     stopDiagnosticBtn.disabled = true;
//                     return;
//                 }
//             }
//         }

//         if (selectedDnsServers.length === 0) {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'No DNS Selected',
//                 message: 'Please select at least one DNS server for nslookup.'
//             });
//             runDiagnosticBtn.disabled = false;
//             stopDiagnosticBtn.disabled = true;
//             return;
//         }

//         // Step 4: Trigger the full diagnostic sequence in main process
//         await electronAPI.runDiagnostic(websiteUrl, selectedDnsServers, currentWebviewWebContentsId);
//     });

//     // Event listener for the "Stop Diagnostic" button
//     stopDiagnosticBtn.addEventListener('click', async () => {
//         await electronAPI.stopDiagnostic();
//     });

//     // Event listener for the "Copy Diagnostic Output" button
//     copyDiagnosticOutputBtn.addEventListener('click', async () => {
//         const textToCopy = diagnosticOutput.textContent;
//         if (textToCopy.trim()) {
//             await electronAPI.copyToClipboard(textToCopy);
//             await electronAPI.showMessageBox({
//                 type: 'info',
//                 title: 'Copied!',
//                 message: 'Diagnostic output copied to clipboard.'
//             });
//         } else {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'Nothing to Copy',
//                 message: 'Diagnostic output is empty.'
//             });
//         }
//     });

//     // Event listener for the "Run Command" button in the separate section
//     runSingleCommandBtn.addEventListener('click', async () => {
//         const target = singleCommandInput.value.trim();
//         const commandType = commandTypeSelect.value;

//         if (!target) {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'Input Required',
//                 message: 'Please enter a target (IP or hostname) for the command.'
//             });
//             return;
//         }

//         if (!commandType) {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'Selection Required',
//                 message: 'Please select a command type (ping, tracert, or nslookup).'
//             });
//             return;
//         }

//         runSingleCommandBtn.disabled = true;
//         copySingleCommandOutputBtn.disabled = true;
//         clearOutput('single');
//         appendOutput(`Running ${commandType} for ${target}...\n`, 'single');
//         await electronAPI.runSingleCommand(commandType, target);
//     });

//     // Event listener for the "Copy Single Command Output" button
//     copySingleCommandOutputBtn.addEventListener('click', async () => {
//         const textToCopy = singleCommandOutput.textContent;
//         if (textToCopy.trim()) {
//             await electronAPI.copyToClipboard(textToCopy);
//             await electronAPI.showMessageBox({
//                 type: 'info',
//                 title: 'Copied!',
//                 message: 'Command output copied to clipboard.'
//             });
//         } else {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'Nothing to Copy',
//                 message: 'Command output is empty.'
//             });
//         }
//     });

//     // Logic for the internal browser (webview) for manual preview
//     // This button now ONLY handles manual preview, not part of the main diagnostic flow.
//     openUrlInToolBtn.addEventListener('click', async () => {
//         const url = websiteUrlInput.value.trim();
//         if (!url) {
//             await electronAPI.showMessageBox({
//                 type: 'warning',
//                 title: 'Input Required',
//                 message: 'Please enter a website URL to open in the tool.'
//             });
//             return;
//         }

//         internalBrowserSection.style.display = 'block'; // Show the webview section
//         internalBrowserWebview.src = url;
//         internalBrowserUrlDisplay.textContent = `Loading: ${url}`;
//         internalBrowserStatus.textContent = 'Loading...';
//         internalBrowserStatus.style.color = 'orange';

//         // Open DevTools for webview if needed for debugging internal page behavior
//         // internalBrowserWebview.openDevTools();
//     });

//     // Webview events for status updates and signaling to main process
//     internalBrowserWebview.addEventListener('did-start-loading', () => {
//         internalBrowserStatus.textContent = 'Loading...';
//         internalBrowserStatus.style.color = 'orange';
//     });

//     internalBrowserWebview.addEventListener('did-stop-loading', async () => {
//         internalBrowserStatus.textContent = 'Loaded';
//         internalBrowserStatus.style.color = 'green';
//         internalBrowserUrlDisplay.textContent = `Current URL: ${internalBrowserWebview.getURL()}`;

//         // HIGHLIGHT: Send success status back to main process
//         await electronAPI.sendWebviewLoadStatus('success', internalBrowserWebview.getURL(), null);
//     });

//     internalBrowserWebview.addEventListener('did-fail-load', async (event) => {
//         internalBrowserStatus.textContent = `Failed to load: ${event.errorCode} - ${event.errorDescription}`;
//         internalBrowserStatus.style.color = 'red';
//         internalBrowserUrlDisplay.textContent = `Error loading: ${event.validatedURL}`;
//         console.error('Webview load failed:', event);

//         // HIGHLIGHT: Send fail status back to main process
//         await electronAPI.sendWebviewLoadStatus('fail', event.validatedURL, `${event.errorCode} - ${event.errorDescription}`);
//     });

//     // Handle new-window requests from webview (e.g., clicks on _blank links)
//     internalBrowserWebview.addEventListener('new-window', (e) => {
//         shell.openExternal(e.url); // Open external links in default system browser
//     });

//     // Register listeners for communication from main process
//     electronAPI.onDiagnosticOutput((data) => appendOutput(data, 'main'));
//     electronAPI.onClearOutput((type) => clearOutput(type));
//     electronAPI.onDiagnosticCompleted(onDiagnosticCompleted);
//     electronAPI.onSingleCommandOutput((data) => appendOutput(data, 'single'));
//     electronAPI.onSingleCommandCompleted(onSingleCommandCompleted);
//     // HIGHLIGHT: New IPC from main to tell webview to load URL
//     electronAPI.onLoadUrlInInappBrowser(({ url, webContentsId }) => {
//         // Only load if it's for this webview's webContents
//         if (internalBrowserWebview.getWebContentsId() === webContentsId) {
//             internalBrowserSection.style.display = 'block'; // Ensure it's visible
//             internalBrowserWebview.src = url;
//             internalBrowserUrlDisplay.textContent = `Loading: ${url}`;
//             internalBrowserStatus.textContent = 'Loading...';
//             internalBrowserStatus.style.color = 'orange';
//         }
//     });


//     // Clean up listeners when the window is about to unload
//     window.addEventListener('unload', () => {
//         electronAPI.removeDiagnosticOutputListener((data) => appendOutput(data, 'main'));
//         electronAPI.removeClearOutputListener((type) => clearOutput(type));
//         electronAPI.removeDiagnosticCompletedListener(onDiagnosticCompleted);
//         electronAPI.removeSingleCommandOutputListener((data) => appendOutput(data, 'single'));
//         electronAPI.removeSingleCommandCompletedListener(onSingleCommandCompleted);
//         electronAPI.removeLoadUrlInInappBrowserListener(() => {});
//     });
// })();




// // // Wrap the entire renderer.js code in an IIFE to create a private scope
// // (function() {
// //     // Access the exposed Electron API from the preload script
// //     const electronAPI = window.electronAPI;

// //     // Get DOM elements for main diagnostics
// //     const internetStatusIndicator = document.getElementById('internet-status');
// //     const websiteUrlInput = document.getElementById('website-url');
// //     const runDiagnosticBtn = document.getElementById('run-diagnostic');
// //     const stopDiagnosticBtn = document.getElementById('stop-diagnostic');
// //     const diagnosticOutput = document.getElementById('diagnostic-output');
// //     const copyDiagnosticOutputBtn = document.getElementById('copy-diagnostic-output');

// //     const dnsIpCheckboxes = [
// //         document.getElementById('dns1-checkbox'),
// //         document.getElementById('dns2-checkbox'),
// //         document.getElementById('dns3-checkbox'),
// //         document.getElementById('dns4-checkbox')
// //     ];
// //     const dnsIpInputs = [
// //         document.getElementById('dns1-ip'),
// //         document.getElementById('dns2-ip'),
// //         document.getElementById('dns3-ip'),
// //         document.getElementById('dns4-ip')
// //     ];

// //     // Get DOM elements for single command execution
// //     const singleCommandInput = document.getElementById('single-command-input');
// //     const commandTypeSelect = document.getElementById('command-type-select');
// //     const runSingleCommandBtn = document.getElementById('run-single-command');
// //     const singleCommandOutput = document.getElementById('single-command-output');
// //     const copySingleCommandOutputBtn = document.getElementById('copy-single-command-output');

// //     // New DOM elements for internal browser
// //     const internalBrowserSection = document.getElementById('internal-browser-section');
// //     const internalBrowserWebview = document.getElementById('internal-browser-webview');
// //     const internalBrowserUrlDisplay = document.getElementById('internal-browser-url-display');
// //     const internalBrowserStatus = document.getElementById('internal-browser-status');
// //     const openUrlInToolBtn = document.getElementById('open-url-in-tool-btn');

// //     let currentWebviewWebContentsId = null; // To store the webContents ID of the webview


// //     /**
// //      * Updates the visual internet status indicator.
// //      * @param {boolean} isConnected - True if internet is available, false otherwise.
// //      */
// //     function updateInternetStatus(isConnected) {
// //         if (isConnected) {
// //             internetStatusIndicator.classList.remove('red');
// //             internetStatusIndicator.classList.add('green');
// //             internetStatusIndicator.title = 'Internet Available';
// //         } else {
// //             internetStatusIndicator.classList.remove('green');
// //             internetStatusIndicator.classList.add('red');
// //             internetStatusIndicator.title = 'Internet Not Available';
// //         }
// //     }

// //     /**
// //      * Clears the diagnostic output area based on type.
// //      * @param {'main'|'single'} type - Which output area to clear.
// //      */
// //     function clearOutput(type) {
// //         if (type === 'main') {
// //             diagnosticOutput.textContent = '';
// //         } else if (type === 'single') {
// //             singleCommandOutput.textContent = '';
// //         }
// //     }

// //     /**
// //      * Appends data to the diagnostic output area and scrolls to the bottom.
// //      * @param {string} data - The text data to append.
// //      * @param {'main'|'single'} type - Which output area to append to.
// //      */
// //     function appendOutput(data, type = 'main') {
// //         const targetOutput = type === 'main' ? diagnosticOutput : singleCommandOutput;
// //         targetOutput.textContent += data;
// //         targetOutput.scrollTop = targetOutput.scrollHeight; // Auto-scroll
// //     }

// //     /**
// //      * Handles the completion of main diagnostic tests.
// //      * Enables Run button, disables Stop button, enables copy button.
// //      */
// //     function onDiagnosticCompleted() {
// //         runDiagnosticBtn.disabled = false;
// //         stopDiagnosticBtn.disabled = true;
// //         copyDiagnosticOutputBtn.disabled = false;
// //         // Optionally hide the webview after diagnostics
// //         // internalBrowserSection.style.display = 'none'; // Keep webview visible for user if desired
// //     }

// //     /**
// //      * Handles the completion of single command execution.
// //      * Enables Run button, enables copy button.
// //      */
// //     function onSingleCommandCompleted() {
// //         runSingleCommandBtn.disabled = false;
// //         copySingleCommandOutputBtn.disabled = false;
// //     }


// //     // Initial internet check and periodic checks
// //     async function checkInternetPeriodically() {
// //         const isConnected = await electronAPI.checkInternet();
// //         updateInternetStatus(isConnected);
// //     }
// //     checkInternetPeriodically();
// //     setInterval(checkInternetPeriodically, 10000);

// //     // HIGHLIGHT: Run Diagnostic button now just initiates the sequence in main
// //     runDiagnosticBtn.addEventListener('click', async () => {
// //         const websiteUrl = websiteUrlInput.value.trim();
// //         if (!websiteUrl) {
// //             await electronAPI.showMessageBox({
// //                 type: 'warning',
// //                 title: 'Input Required',
// //                 message: 'Please enter a website URL (e.g., example.com).'
// //             });
// //             return;
// //         }

// //         // Get the webview's webContentsId BEFORE starting the diagnostic.
// //         // This ID is stable as long as the webview element exists.
// //         currentWebviewWebContentsId = internalBrowserWebview.getWebContentsId();
// //         if (!currentWebviewWebContentsId) {
// //              await electronAPI.showMessageBox({
// //                 type: 'error',
// //                 title: 'Internal Browser Error',
// //                 message: 'Internal browser (webview) not ready. Please restart the application if this persists.'
// //             });
// //             return;
// //         }


// //         // Disable Run button, enable Stop button, disable copy button
// //         runDiagnosticBtn.disabled = true;
// //         stopDiagnosticBtn.disabled = false;
// //         copyDiagnosticOutputBtn.disabled = true;

// //         const selectedDnsServers = [];
// //         for (let i = 0; i < dnsIpCheckboxes.length; i++) {
// //             if (dnsIpCheckboxes[i].checked) {
// //                 const ip = dnsIpInputs[i].value.trim();
// //                 if (ip) {
// //                     selectedDnsServers.push({ ip: ip, enabled: true });
// //                 } else {
// //                     await electronAPI.showMessageBox({
// //                         type: 'warning',
// //                         title: 'Invalid DNS IP',
// //                         message: `DNS IP field ${i + 1} is checked but empty. Please provide a valid IP or uncheck it.`
// //                     });
// //                     runDiagnosticBtn.disabled = false;
// //                     stopDiagnosticBtn.disabled = true;
// //                     return;
// //                 }
// //             }
// //         }

// //         if (selectedDnsServers.length === 0) {
// //             await electronAPI.showMessageBox({
// //                 type: 'warning',
// //                 title: 'No DNS Selected',
// //                 message: 'Please select at least one DNS server for nslookup.'
// //             });
// //             runDiagnosticBtn.disabled = false;
// //             stopDiagnosticBtn.disabled = true;
// //             return;
// //         }

// //         clearOutput('main');
// //         appendOutput('Starting full diagnostics...\n', 'main');
// //         // Pass the webContents ID to the main process
// //         await electronAPI.runDiagnostic(websiteUrl, selectedDnsServers, currentWebviewWebContentsId);
// //     });

// //     // Event listener for the "Stop Diagnostic" button
// //     stopDiagnosticBtn.addEventListener('click', async () => {
// //         await electronAPI.stopDiagnostic();
// //     });

// //     // Event listener for the "Copy Diagnostic Output" button
// //     copyDiagnosticOutputBtn.addEventListener('click', async () => {
// //         const textToCopy = diagnosticOutput.textContent;
// //         if (textToCopy.trim()) {
// //             await electronAPI.copyToClipboard(textToCopy);
// //             await electronAPI.showMessageBox({
// //                 type: 'info',
// //                 title: 'Copied!',
// //                 message: 'Diagnostic output copied to clipboard.'
// //             });
// //         } else {
// //             await electronAPI.showMessageBox({
// //                 type: 'warning',
// //                 title: 'Nothing to Copy',
// //                 message: 'Diagnostic output is empty.'
// //             });
// //         }
// //     });

// //     // Event listener for the "Run Command" button in the separate section
// //     runSingleCommandBtn.addEventListener('click', async () => {
// //         const target = singleCommandInput.value.trim();
// //         const commandType = commandTypeSelect.value;

// //         if (!target) {
// //             await electronAPI.showMessageBox({
// //                 type: 'warning',
// //                 title: 'Input Required',
// //                 message: 'Please enter a target (IP or hostname) for the command.'
// //             });
// //             return;
// //         }

// //         if (!commandType) {
// //             await electronAPI.showMessageBox({
// //                 type: 'warning',
// //                 title: 'Selection Required',
// //                 message: 'Please select a command type (ping, tracert, or nslookup).'
// //             });
// //             return;
// //         }

// //         runSingleCommandBtn.disabled = true;
// //         copySingleCommandOutputBtn.disabled = true;
// //         clearOutput('single');
// //         appendOutput(`Running ${commandType} for ${target}...\n`, 'single');
// //         await electronAPI.runSingleCommand(commandType, target);
// //     });

// //     // Event listener for the "Copy Single Command Output" button
// //     copySingleCommandOutputBtn.addEventListener('click', async () => {
// //         const textToCopy = singleCommandOutput.textContent;
// //         if (textToCopy.trim()) {
// //             await electronAPI.copyToClipboard(textToCopy);
// //             await electronAPI.showMessageBox({
// //                 type: 'info',
// //                 title: 'Copied!',
// //                 message: 'Command output copied to clipboard.'
// //             });
// //         } else {
// //             await electronAPI.showMessageBox({
// //                 type: 'warning',
// //                 title: 'Nothing to Copy',
// //                 message: 'Command output is empty.'
// //             });
// //         }
// //     });

// //     // HIGHLIGHT: Logic for the internal browser (webview)
// //     // This button now primarily for manual preview, not part of the main diagnostic flow.
// //     openUrlInToolBtn.addEventListener('click', async () => {
// //         const url = websiteUrlInput.value.trim();
// //         if (!url) {
// //             await electronAPI.showMessageBox({
// //                 type: 'warning',
// //                 title: 'Input Required',
// //                 message: 'Please enter a website URL to open in the tool.'
// //             });
// //             return;
// //         }

// //         internalBrowserSection.style.display = 'block'; // Show the webview section
// //         internalBrowserWebview.src = url;
// //         internalBrowserUrlDisplay.textContent = `Loading: ${url}`;
// //         internalBrowserStatus.textContent = 'Loading...';
// //         internalBrowserStatus.style.color = 'orange';

// //         // Open DevTools for webview if needed for debugging internal page behavior
// //         // internalBrowserWebview.openDevTools();
// //     });

// //     // HIGHLIGHT: New IPC listener from main to tell webview to load URL
// //     electronAPI.onLoadUrlInInappBrowser(({ url, webviewId }) => {
// //         if (internalBrowserWebview.getWebContentsId() === webviewId) {
// //             internalBrowserSection.style.display = 'block'; // Ensure visible
// //             internalBrowserWebview.src = url;
// //             internalBrowserUrlDisplay.textContent = `Loading: ${url}`;
// //             internalBrowserStatus.textContent = 'Loading...';
// //             internalBrowserStatus.style.color = 'orange';
// //         } else {
// //             console.error('Received load URL for mismatched webview ID.');
// //         }
// //     });


// //     // Webview events for status updates
// //     internalBrowserWebview.addEventListener('did-start-loading', () => {
// //         internalBrowserStatus.textContent = 'Loading...';
// //         internalBrowserStatus.style.color = 'orange';
// //     });

// //     internalBrowserWebview.addEventListener('did-stop-loading', async () => {
// //         internalBrowserStatus.textContent = 'Loaded';
// //         internalBrowserStatus.style.color = 'green';
// //         internalBrowserUrlDisplay.textContent = `Current URL: ${internalBrowserWebview.getURL()}`;

// //         // HIGHLIGHT: Send success status back to main process
// //         const webContentsId = internalBrowserWebview.getWebContentsId();
// //         const url = internalBrowserWebview.getURL();
// //         await electronAPI.sendWebviewLoadStatus('success', webContentsId, url, null);
// //     });

// //     internalBrowserWebview.addEventListener('did-fail-load', async (event) => {
// //         internalBrowserStatus.textContent = `Failed to load: ${event.errorCode} - ${event.errorDescription}`;
// //         internalBrowserStatus.style.color = 'red';
// //         internalBrowserUrlDisplay.textContent = `Error loading: ${event.validatedURL}`;
// //         console.error('Webview load failed:', event);

// //         // HIGHLIGHT: Send fail status back to main process
// //         const webContentsId = internalBrowserWebview.getWebContentsId();
// //         const url = internalBrowserWebview.getURL();
// //         await electronAPI.sendWebviewLoadStatus('fail', webContentsId, url, `${event.errorCode} - ${event.errorDescription}`);
// //     });

// //     // Handle new-window requests from webview (e.g., clicks on _blank links)
// //     internalBrowserWebview.addEventListener('new-window', (e) => {
// //         shell.openExternal(e.url); // Open external links in default system browser
// //     });

// //     // Register listeners for communication from main process
// //     electronAPI.onDiagnosticOutput((data) => appendOutput(data, 'main'));
// //     electronAPI.onClearOutput((type) => clearOutput(type));
// //     electronAPI.onDiagnosticCompleted(onDiagnosticCompleted);
// //     electronAPI.onSingleCommandOutput((data) => appendOutput(data, 'single'));
// //     electronAPI.onSingleCommandCompleted(onSingleCommandCompleted);
// //     electronAPI.onLoadUrlInInappBrowser((data) => { // HIGHLIGHT: Register new listener
// //         internalBrowserWebview.src = data.url;
// //         internalBrowserSection.style.display = 'block'; // Ensure webview section is visible
// //         internalBrowserUrlDisplay.textContent = `Loading: ${data.url}`;
// //         internalBrowserStatus.textContent = 'Loading...';
// //         internalBrowserStatus.style.color = 'orange';
// //     });


// //     // Clean up listeners when the window is about to unload
// //     window.addEventListener('unload', () => {
// //         electronAPI.removeDiagnosticOutputListener((data) => appendOutput(data, 'main'));
// //         electronAPI.removeClearOutputListener((type) => clearOutput(type));
// //         electronAPI.removeDiagnosticCompletedListener(onDiagnosticCompleted);
// //         electronAPI.removeSingleCommandOutputListener((data) => appendOutput(data, 'single'));
// //         electronAPI.removeSingleCommandCompletedListener(onSingleCommandCompleted);
// //         electronAPI.removeLoadUrlInInappBrowserListener(() => {}); // HIGHLIGHT: Remove new listener
// //     });
// // })();




// // // // Wrap the entire renderer.js code in an IIFE to create a private scope
// // // // Wrap the entire renderer.js code in an IIFE to create a private scope
// // // (function() {
// // //     // Access the exposed Electron API from the preload script
// // //     const electronAPI = window.electronAPI;

// // //     // Get DOM elements for main diagnostics
// // //     const internetStatusIndicator = document.getElementById('internet-status');
// // //     const websiteUrlInput = document.getElementById('website-url');
// // //     const runDiagnosticBtn = document.getElementById('run-diagnostic');
// // //     const stopDiagnosticBtn = document.getElementById('stop-diagnostic');
// // //     const diagnosticOutput = document.getElementById('diagnostic-output');
// // //     const copyDiagnosticOutputBtn = document.getElementById('copy-diagnostic-output');

// // //     const dnsIpCheckboxes = [
// // //         document.getElementById('dns1-checkbox'),
// // //         document.getElementById('dns2-checkbox'),
// // //         document.getElementById('dns3-checkbox'),
// // //         document.getElementById('dns4-checkbox')
// // //     ];
// // //     const dnsIpInputs = [
// // //         document.getElementById('dns1-ip'),
// // //         document.getElementById('dns2-ip'),
// // //         document.getElementById('dns3-ip'),
// // //         document.getElementById('dns4-ip')
// // //     ];

// // //     // Get DOM elements for single command execution
// // //     const singleCommandInput = document.getElementById('single-command-input');
// // //     const commandTypeSelect = document.getElementById('command-type-select');
// // //     const runSingleCommandBtn = document.getElementById('run-single-command');
// // //     const singleCommandOutput = document.getElementById('single-command-output');
// // //     const copySingleCommandOutputBtn = document.getElementById('copy-single-command-output');

// // //     // New DOM elements for internal browser
// // //     const internalBrowserSection = document.getElementById('internal-browser-section');
// // //     const internalBrowserWebview = document.getElementById('internal-browser-webview');
// // //     const internalBrowserUrlDisplay = document.getElementById('internal-browser-url-display');
// // //     const internalBrowserStatus = document.getElementById('internal-browser-status');
// // //     const openUrlInToolBtn = document.getElementById('open-url-in-tool-btn');

// // //     let webviewLoadResolver = null; // HIGHLIGHT: Resolver for the webview loading promise
// // //     let webviewLoadPromise = null;  // HIGHLIGHT: Promise that resolves when webview is loaded
// // //     let currentWebviewWebContentsId = null; // To store the webContents ID of the webview


// // //     /**
// // //      * Updates the visual internet status indicator.
// // //      * @param {boolean} isConnected - True if internet is available, false otherwise.
// // //      */
// // //     function updateInternetStatus(isConnected) {
// // //         if (isConnected) {
// // //             internetStatusIndicator.classList.remove('red');
// // //             internetStatusIndicator.classList.add('green');
// // //             internetStatusIndicator.title = 'Internet Available';
// // //         } else {
// // //             internetStatusIndicator.classList.remove('green');
// // //             internetStatusIndicator.classList.add('red');
// // //             internetStatusIndicator.title = 'Internet Not Available';
// // //         }
// // //     }

// // //     /**
// // //      * Clears the diagnostic output area based on type.
// // //      * @param {'main'|'single'} type - Which output area to clear.
// // //      */
// // //     function clearOutput(type) {
// // //         if (type === 'main') {
// // //             diagnosticOutput.textContent = '';
// // //         } else if (type === 'single') {
// // //             singleCommandOutput.textContent = '';
// // //         }
// // //     }

// // //     /**
// // //      * Appends data to the diagnostic output area and scrolls to the bottom.
// // //      * @param {string} data - The text data to append.
// // //      * @param {'main'|'single'} type - Which output area to append to.
// // //      */
// // //     function appendOutput(data, type = 'main') {
// // //         const targetOutput = type === 'main' ? diagnosticOutput : singleCommandOutput;
// // //         targetOutput.textContent += data;
// // //         targetOutput.scrollTop = targetOutput.scrollHeight; // Auto-scroll
// // //     }

// // //     /**
// // //      * Handles the completion of main diagnostic tests.
// // //      * Enables Run button, disables Stop button, enables copy button.
// // //      */
// // //     function onDiagnosticCompleted() {
// // //         runDiagnosticBtn.disabled = false;
// // //         stopDiagnosticBtn.disabled = true;
// // //         copyDiagnosticOutputBtn.disabled = false;
// // //         // Optionally hide the webview after diagnostics
// // //         // internalBrowserSection.style.display = 'none'; // Keep webview visible for user if desired
// // //     }

// // //     /**
// // //      * Handles the completion of single command execution.
// // //      * Enables Run button, enables copy button.
// // //      */
// // //     function onSingleCommandCompleted() {
// // //         runSingleCommandBtn.disabled = false;
// // //         copySingleCommandOutputBtn.disabled = false;
// // //     }


// // //     // Initial internet check and periodic checks
// // //     async function checkInternetPeriodically() {
// // //         const isConnected = await electronAPI.checkInternet();
// // //         updateInternetStatus(isConnected);
// // //     }
// // //     checkInternetPeriodically();
// // //     setInterval(checkInternetPeriodically, 10000);

// // //     // Event listener for the "Run Diagnostic" button
// // //     runDiagnosticBtn.addEventListener('click', async () => {
// // //         const websiteUrl = websiteUrlInput.value.trim();
// // //         if (!websiteUrl) {
// // //             await electronAPI.showMessageBox({
// // //                 type: 'warning',
// // //                 title: 'Input Required',
// // //                 message: 'Please enter a website URL (e.g., example.com).'
// // //             });
// // //             return;
// // //         }

// // //         // HIGHLIGHT: Ensure webview has loaded the correct URL and its webContentsId is available
// // //         if (!internalBrowserWebview.src || internalBrowserWebview.src !== websiteUrl) {
// // //             // If the URL in the input field is different from webview's current src,
// // //             // or if webview hasn't loaded anything yet, trigger loading and wait.
// // //             await electronAPI.showMessageBox({
// // //                 type: 'info',
// // //                 title: 'Loading URL',
// // //                 message: 'Opening URL in internal browser. Please wait until it finishes loading before running diagnostics.'
// // //             });
// // //             openUrlInToolBtn.click(); // Programmatically click to load the URL
// // //             // Wait for the webview to finish loading (webviewLoadPromise will resolve)
// // //             try {
// // //                 currentWebviewWebContentsId = await webviewLoadPromise; // Await the promise for current load
// // //             } catch (error) {
// // //                 await electronAPI.showMessageBox({
// // //                     type: 'error',
// // //                     title: 'Webview Load Failed',
// // //                     message: `Failed to load URL in internal browser: ${error.message}. Cannot proceed with diagnostics.`
// // //                 });
// // //                 runDiagnosticBtn.disabled = false;
// // //                 stopDiagnosticBtn.disabled = true;
// // //                 return;
// // //             }
// // //         } else if (!currentWebviewWebContentsId) {
// // //              // Edge case: URL is same, but for some reason webContentsId wasn't captured.
// // //              // Try to get it again, or wait for the existing load promise.
// // //              await electronAPI.showMessageBox({
// // //                 type: 'info',
// // //                 title: 'Webview Check',
// // //                 message: 'Ensuring internal browser is ready. Please wait...'
// // //             });
// // //             try {
// // //                 currentWebviewWebContentsId = internalBrowserWebview.getWebContentsId();
// // //                 if (!currentWebviewWebContentsId) {
// // //                     // Fallback if getWebContentsId() is still null
// // //                     currentWebviewWebContentsId = await webviewLoadPromise;
// // //                 }
// // //             } catch (error) {
// // //                  await electronAPI.showMessageBox({
// // //                     type: 'error',
// // //                     title: 'Webview Error',
// // //                     message: `Could not confirm internal browser readiness: ${error.message}. Cannot proceed.`
// // //                 });
// // //                 runDiagnosticBtn.disabled = false;
// // //                 stopDiagnosticBtn.disabled = true;
// // //                 return;
// // //             }
// // //         }


// // //         // Proceed only if webContentsId is confirmed
// // //         if (!currentWebviewWebContentsId) {
// // //             await electronAPI.showMessageBox({
// // //                 type: 'error',
// // //                 title: 'Internal Browser Not Ready',
// // //                 message: 'Internal browser is not ready for diagnostics. Please ensure the URL loads successfully after clicking "Open URL in Tool".'
// // //             });
// // //             runDiagnosticBtn.disabled = false;
// // //             stopDiagnosticBtn.disabled = true;
// // //             return;
// // //         }

// // //         // Disable Run button, enable Stop button, disable copy button
// // //         runDiagnosticBtn.disabled = true;
// // //         stopDiagnosticBtn.disabled = false;
// // //         copyDiagnosticOutputBtn.disabled = true;

// // //         const selectedDnsServers = [];
// // //         for (let i = 0; i < dnsIpCheckboxes.length; i++) {
// // //             if (dnsIpCheckboxes[i].checked) {
// // //                 const ip = dnsIpInputs[i].value.trim();
// // //                 if (ip) {
// // //                     selectedDnsServers.push({ ip: ip, enabled: true });
// // //                 } else {
// // //                     await electronAPI.showMessageBox({
// // //                         type: 'warning',
// // //                         title: 'Invalid DNS IP',
// // //                         message: `DNS IP field ${i + 1} is checked but empty. Please provide a valid IP or uncheck it.`
// // //                     });
// // //                     runDiagnosticBtn.disabled = false;
// // //                     stopDiagnosticBtn.disabled = true;
// // //                     return;
// // //                 }
// // //             }
// // //         }

// // //         if (selectedDnsServers.length === 0) {
// // //             await electronAPI.showMessageBox({
// // //                 type: 'warning',
// // //                 title: 'No DNS Selected',
// // //                 message: 'Please select at least one DNS server for nslookup.'
// // //             });
// // //             runDiagnosticBtn.disabled = false;
// // //             stopDiagnosticBtn.disabled = true;
// // //             return;
// // //         }

// // //         clearOutput('main');
// // //         appendOutput('Starting full diagnostics...\n', 'main');
// // //         await electronAPI.runDiagnostic(websiteUrl, selectedDnsServers, currentWebviewWebContentsId);
// // //     });

// // //     // Event listener for the "Stop Diagnostic" button
// // //     stopDiagnosticBtn.addEventListener('click', async () => {
// // //         await electronAPI.stopDiagnostic();
// // //     });

// // //     // Event listener for the "Copy Diagnostic Output" button
// // //     copyDiagnosticOutputBtn.addEventListener('click', async () => {
// // //         const textToCopy = diagnosticOutput.textContent;
// // //         if (textToCopy.trim()) {
// // //             await electronAPI.copyToClipboard(textToCopy);
// // //             await electronAPI.showMessageBox({
// // //                 type: 'info',
// // //                 title: 'Copied!',
// // //                 message: 'Diagnostic output copied to clipboard.'
// // //             });
// // //         } else {
// // //             await electronAPI.showMessageBox({
// // //                 type: 'warning',
// // //                 title: 'Nothing to Copy',
// // //                 message: 'Diagnostic output is empty.'
// // //             });
// // //         }
// // //     });

// // //     // Event listener for the "Run Command" button in the separate section
// // //     runSingleCommandBtn.addEventListener('click', async () => {
// // //         const target = singleCommandInput.value.trim();
// // //         const commandType = commandTypeSelect.value;

// // //         if (!target) {
// // //             await electronAPI.showMessageBox({
// // //                 type: 'warning',
// // //                 title: 'Input Required',
// // //                 message: 'Please enter a target (IP or hostname) for the command.'
// // //             });
// // //             return;
// // //         }

// // //         if (!commandType) {
// // //             await electronAPI.showMessageBox({
// // //                 type: 'warning',
// // //                 title: 'Selection Required',
// // //                 message: 'Please select a command type (ping, tracert, or nslookup).'
// // //             });
// // //             return;
// // //         }

// // //         runSingleCommandBtn.disabled = true;
// // //         copySingleCommandOutputBtn.disabled = true;
// // //         clearOutput('single');
// // //         appendOutput(`Running ${commandType} for ${target}...\n`, 'single');
// // //         await electronAPI.runSingleCommand(commandType, target);
// // //     });

// // //     // Event listener for the "Copy Single Command Output" button
// // //     copySingleCommandOutputBtn.addEventListener('click', async () => {
// // //         const textToCopy = singleCommandOutput.textContent;
// // //         if (textToCopy.trim()) {
// // //             await electronAPI.copyToClipboard(textToCopy);
// // //             await electronAPI.showMessageBox({
// // //                 type: 'info',
// // //                 title: 'Copied!',
// // //                 message: 'Command output copied to clipboard.'
// // //             });
// // //         } else {
// // //             await electronAPI.showMessageBox({
// // //                 type: 'warning',
// // //                 title: 'Nothing to Copy',
// // //                 message: 'Command output is empty.'
// // //             });
// // //         }
// // //     });

// // //     // Logic for the internal browser (webview)
// // //     openUrlInToolBtn.addEventListener('click', async () => {
// // //         const url = websiteUrlInput.value.trim();
// // //         if (!url) {
// // //             await electronAPI.showMessageBox({
// // //                 type: 'warning',
// // //                 title: 'Input Required',
// // //                 message: 'Please enter a website URL to open in the tool.'
// // //             });
// // //             return;
// // //         }

// // //         internalBrowserSection.style.display = 'block'; // Show the webview section
// // //         internalBrowserWebview.src = url;
// // //         internalBrowserUrlDisplay.textContent = `Loading: ${url}`;
// // //         internalBrowserStatus.textContent = 'Loading...';
// // //         internalBrowserStatus.style.color = 'orange';

// // //         // HIGHLIGHT: Reset and create a new promise for each load
// // //         webviewLoadPromise = new Promise(resolve => {
// // //             webviewLoadResolver = resolve;
// // //         });

// // //         // Open DevTools for webview if needed for debugging internal page behavior
// // //         // internalBrowserWebview.openDevTools();
// // //     });

// // //     // Webview events for status updates
// // //     internalBrowserWebview.addEventListener('did-start-loading', () => {
// // //         internalBrowserStatus.textContent = 'Loading...';
// // //         internalBrowserStatus.style.color = 'orange';
// // //         // Clear webContentsId until new content is loaded
// // //         currentWebviewWebContentsId = null;
// // //     });

// // //     internalBrowserWebview.addEventListener('did-stop-loading', async () => {
// // //         internalBrowserStatus.textContent = 'Loaded';
// // //         internalBrowserStatus.style.color = 'green';
// // //         internalBrowserUrlDisplay.textContent = `Current URL: ${internalBrowserWebview.getURL()}`;

// // //         // HIGHLIGHT: Set the webContents.id and resolve the promise
// // //         currentWebviewWebContentsId = internalBrowserWebview.getWebContentsId();
// // //         console.log(`Webview did-stop-loading, webContentsId: ${currentWebviewWebContentsId}`);
// // //         if (webviewLoadResolver) {
// // //             webviewLoadResolver(currentWebviewWebContentsId); // Resolve the promise
// // //             webviewLoadResolver = null; // Clear resolver
// // //         }
// // //     });

// // //     internalBrowserWebview.addEventListener('did-fail-load', (event) => {
// // //         internalBrowserStatus.textContent = `Failed to load: ${event.errorCode} - ${event.errorDescription}`;
// // //         internalBrowserStatus.style.color = 'red';
// // //         internalBrowserUrlDisplay.textContent = `Error loading: ${event.validatedURL}`;
// // //         console.error('Webview load failed:', event);
// // //         // HIGHLIGHT: Reject the promise on load failure
// // //         if (webviewLoadResolver) {
// // //             webviewLoadResolver(null); // Resolve with null or reject for failure
// // //             webviewLoadResolver = null;
// // //         }
// // //     });

// // //     // Handle new-window requests from webview (e.g., clicks on _blank links)
// // //     internalBrowserWebview.addEventListener('new-window', (e) => {
// // //         shell.openExternal(e.url); // Open external links in default system browser
// // //     });

// // //     // Register listeners for communication from main process
// // //     electronAPI.onDiagnosticOutput((data) => appendOutput(data, 'main'));
// // //     electronAPI.onClearOutput((type) => clearOutput(type));
// // //     electronAPI.onDiagnosticCompleted(onDiagnosticCompleted);
// // //     electronAPI.onSingleCommandOutput((data) => appendOutput(data, 'single'));
// // //     electronAPI.onSingleCommandCompleted(onSingleCommandCompleted);

// // //     // Clean up listeners when the window is about to unload
// // //     window.addEventListener('unload', () => {
// // //         electronAPI.removeDiagnosticOutputListener((data) => appendOutput(data, 'main'));
// // //         electronAPI.removeClearOutputListener((type) => clearOutput(type));
// // //         electronAPI.removeDiagnosticCompletedListener(onDiagnosticCompleted);
// // //         electronAPI.removeSingleCommandOutputListener((data) => appendOutput(data, 'single'));
// // //         electronAPI.removeSingleCommandCompletedListener(onSingleCommandCompleted);
// // //     });
// // // })();



// Wrap the entire renderer.js code in an IIFE to create a private scope
(function() {
    // Access the exposed Electron API from the preload script
    const electronAPI = window.electronAPI;

    // Get DOM elements for main diagnostics
    const internetStatusIndicator = document.getElementById('internet-status');
    const websiteUrlInput = document.getElementById('website-url');
    const runDiagnosticBtn = document.getElementById('run-diagnostic');
    const stopDiagnosticBtn = document.getElementById('stop-diagnostic');
    const diagnosticOutput = document.getElementById('diagnostic-output');
    const copyDiagnosticOutputBtn = document.getElementById('copy-diagnostic-output'); // HIGHLIGHT: New button

    const dnsIpCheckboxes = [
        document.getElementById('dns1-checkbox'),
        document.getElementById('dns2-checkbox'),
        document.getElementById('dns3-checkbox'),
        document.getElementById('dns4-checkbox')
    ];
    const dnsIpInputs = [
        document.getElementById('dns1-ip'),
        document.getElementById('dns2-ip'),
        document.getElementById('dns3-ip'),
        document.getElementById('dns4-ip')
    ];

    // Get DOM elements for single command execution // HIGHLIGHT: New elements for single command section
    const singleCommandInput = document.getElementById('single-command-input');
    const commandTypeSelect = document.getElementById('command-type-select');
    const runSingleCommandBtn = document.getElementById('run-single-command');
    const singleCommandOutput = document.getElementById('single-command-output');
    const copySingleCommandOutputBtn = document.getElementById('copy-single-command-output');

    /**
     * Updates the visual internet status indicator.
     * @param {boolean} isConnected - True if internet is available, false otherwise.
     */
    function updateInternetStatus(isConnected) {
        if (isConnected) {
            internetStatusIndicator.classList.remove('red');
            internetStatusIndicator.classList.add('green');
            internetStatusIndicator.title = 'Internet Available';
        } else {
            internetStatusIndicator.classList.remove('green');
            internetStatusIndicator.classList.add('red');
            internetStatusIndicator.title = 'Internet Not Available';
        }
    }

    /**
     * Clears the diagnostic output area based on type.
     * @param {'main'|'single'} type - Which output area to clear. // HIGHLIGHT: Added type parameter
     */
    function clearOutput(type) {
        if (type === 'main') {
            diagnosticOutput.textContent = '';
        } else if (type === 'single') {
            singleCommandOutput.textContent = '';
        }
    }

    /**
     * Appends data to the diagnostic output area and scrolls to the bottom.
     * @param {string} data - The text data to append.
     * @param {'main'|'single'} type - Which output area to append to. // HIGHLIGHT: Added type parameter
     */
    function appendOutput(data, type = 'main') { // HIGHLIGHT: Default to main for existing calls
        const targetOutput = type === 'main' ? diagnosticOutput : singleCommandOutput;
        targetOutput.textContent += data;
        targetOutput.scrollTop = targetOutput.scrollHeight; // Auto-scroll
    }

    /**
     * Handles the completion of main diagnostic tests.
     * Enables Run button, disables Stop button, enables copy button.
     */
    function onDiagnosticCompleted() {
        runDiagnosticBtn.disabled = false;
        stopDiagnosticBtn.disabled = true;
        copyDiagnosticOutputBtn.disabled = false; // HIGHLIGHT: Enable copy button
    }

    /**
     * Handles the completion of single command execution. // HIGHLIGHT: New function for single command completion
     * Enables Run button, enables copy button.
     */
    function onSingleCommandCompleted() {
        runSingleCommandBtn.disabled = false;
        copySingleCommandOutputBtn.disabled = false; // HIGHLIGHT: Enable copy button
    }


    // Initial internet check and periodic checks
    async function checkInternetPeriodically() {
        const isConnected = await electronAPI.checkInternet();
        updateInternetStatus(isConnected);
    }
    checkInternetPeriodically(); // Initial check
    setInterval(checkInternetPeriodically, 10000); // Check every 10 seconds

    // Event listener for the "Run Diagnostic" button
    runDiagnosticBtn.addEventListener('click', async () => {
        const websiteUrl = websiteUrlInput.value.trim();
        if (!websiteUrl) {
            await electronAPI.showMessageBox({
                type: 'warning',
                title: 'Input Required',
                message: 'Please enter a website URL (e.g., example.com).'
            });
            return;
        }

        // Disable Run button, enable Stop button, disable copy button
        runDiagnosticBtn.disabled = true;
        stopDiagnosticBtn.disabled = false;
        copyDiagnosticOutputBtn.disabled = true; // HIGHLIGHT: Disable copy button initially

        // Collect selected DNS servers
        const selectedDnsServers = [];
        for (let i = 0; i < dnsIpCheckboxes.length; i++) {
            if (dnsIpCheckboxes[i].checked) {
                const ip = dnsIpInputs[i].value.trim();
                if (ip) {
                    selectedDnsServers.push({ ip: ip, enabled: true });
                } else {
                    await electronAPI.showMessageBox({
                        type: 'warning',
                        title: 'Invalid DNS IP',
                        message: `DNS IP field ${i + 1} is checked but empty. Please provide a valid IP or uncheck it.`
                    });
                    runDiagnosticBtn.disabled = false;
                    stopDiagnosticBtn.disabled = true;
                    return;
                }
            }
        }

        if (selectedDnsServers.length === 0) {
            await electronAPI.showMessageBox({
                type: 'warning',
                title: 'No DNS Selected',
                message: 'Please select at least one DNS server for nslookup.'
            });
            runDiagnosticBtn.disabled = false;
            stopDiagnosticBtn.disabled = true;
            return;
        }

        // Clear previous output and start diagnostics
        clearOutput('main'); // HIGHLIGHT: Specify 'main' output
        appendOutput('Starting full diagnostics...\n', 'main'); // HIGHLIGHT: Specify 'main' output
        await electronAPI.runDiagnostic(websiteUrl, selectedDnsServers);
    });

    // Event listener for the "Stop Diagnostic" button
    stopDiagnosticBtn.addEventListener('click', async () => {
        await electronAPI.stopDiagnostic();
    });

    // Event listener for the "Copy Diagnostic Output" button // HIGHLIGHT: New event listener for copy button
    copyDiagnosticOutputBtn.addEventListener('click', async () => {
        const textToCopy = diagnosticOutput.textContent;
        if (textToCopy.trim()) {
            await electronAPI.copyToClipboard(textToCopy);
            await electronAPI.showMessageBox({
                type: 'info',
                title: 'Copied!',
                message: 'Diagnostic output copied to clipboard.'
            });
        } else {
            await electronAPI.showMessageBox({
                type: 'warning',
                title: 'Nothing to Copy',
                message: 'Diagnostic output is empty.'
            });
        }
    });

    // Event listener for the "Run Command" button in the separate section // HIGHLIGHT: New event listener for single command
    runSingleCommandBtn.addEventListener('click', async () => {
        const target = singleCommandInput.value.trim();
        const commandType = commandTypeSelect.value;

        if (!target) {
            await electronAPI.showMessageBox({
                type: 'warning',
                title: 'Input Required',
                message: 'Please enter a target (IP or hostname) for the command.'
            });
            return;
        }

        if (!commandType) {
            await electronAPI.showMessageBox({
                type: 'warning',
                title: 'Selection Required',
                message: 'Please select a command type (ping, tracert, or nslookup).'
            });
            return;
        }

        runSingleCommandBtn.disabled = true;
        copySingleCommandOutputBtn.disabled = true; // HIGHLIGHT: Disable copy button initially
        clearOutput('single'); // HIGHLIGHT: Clear single output
        appendOutput(`Running ${commandType} for ${target}...\n`, 'single'); // HIGHLIGHT: Append to single output
        await electronAPI.runSingleCommand(commandType, target);
    });

    // Event listener for the "Copy Single Command Output" button // HIGHLIGHT: New event listener for copy single command output
    copySingleCommandOutputBtn.addEventListener('click', async () => {
        const textToCopy = singleCommandOutput.textContent;
        if (textToCopy.trim()) {
            await electronAPI.copyToClipboard(textToCopy);
            await electronAPI.showMessageBox({
                type: 'info',
                title: 'Copied!',
                message: 'Command output copied to clipboard.'
            });
        } else {
            await electronAPI.showMessageBox({
                type: 'warning',
                title: 'Nothing to Copy',
                message: 'Command output is empty.'
            });
        }
    });

    // Register listeners for communication from main process
    electronAPI.onDiagnosticOutput((data) => appendOutput(data, 'main'));
    electronAPI.onClearOutput((type) => clearOutput(type)); // HIGHLIGHT: Pass type to clearOutput
    electronAPI.onDiagnosticCompleted(onDiagnosticCompleted);
    electronAPI.onSingleCommandOutput((data) => appendOutput(data, 'single')); // HIGHLIGHT: New
    electronAPI.onSingleCommandCompleted(onSingleCommandCompleted); // HIGHLIGHT: New


    // Clean up listeners when the window is about to unload
    window.addEventListener('unload', () => {
        electronAPI.removeDiagnosticOutputListener((data) => appendOutput(data, 'main'));
        electronAPI.removeClearOutputListener((type) => clearOutput(type));
        electronAPI.removeDiagnosticCompletedListener(onDiagnosticCompleted);
        electronAPI.removeSingleCommandOutputListener((data) => appendOutput(data, 'single'));
        electronAPI.removeSingleCommandCompletedListener(onSingleCommandCompleted);
    });
})(); // End of IIFE


// // // // // // Wrap the entire renderer.js code in an IIFE to create a private scope
// // // // // (function() {
// // // // //     // Access the exposed Electron API from the preload script
// // // // //     const electronAPI = window.electronAPI;

// // // // //     // Get DOM elements
// // // // //     const internetStatusIndicator = document.getElementById('internet-status');
// // // // //     const websiteUrlInput = document.getElementById('website-url');
// // // // //     const runDiagnosticBtn = document.getElementById('run-diagnostic');
// // // // //     const stopDiagnosticBtn = document.getElementById('stop-diagnostic');
// // // // //     const diagnosticOutput = document.getElementById('diagnostic-output');

// // // // //     const dnsIpCheckboxes = [
// // // // //         document.getElementById('dns1-checkbox'),
// // // // //         document.getElementById('dns2-checkbox'),
// // // // //         document.getElementById('dns3-checkbox'),
// // // // //         document.getElementById('dns4-checkbox')
// // // // //     ];
// // // // //     const dnsIpInputs = [
// // // // //         document.getElementById('dns1-ip'),
// // // // //         document.getElementById('dns2-ip'),
// // // // //         document.getElementById('dns3-ip'),
// // // // //         document.getElementById('dns4-ip')
// // // // //     ];

// // // // //     /**
// // // // //      * Updates the visual internet status indicator.
// // // // //      * @param {boolean} isConnected - True if internet is available, false otherwise.
// // // // //      */
// // // // //     function updateInternetStatus(isConnected) {
// // // // //         if (isConnected) {
// // // // //             internetStatusIndicator.classList.remove('red');
// // // // //             internetStatusIndicator.classList.add('green');
// // // // //             internetStatusIndicator.title = 'Internet Available';
// // // // //         } else {
// // // // //             internetStatusIndicator.classList.remove('green');
// // // // //             internetStatusIndicator.classList.add('red');
// // // // //             internetStatusIndicator.title = 'Internet Not Available';
// // // // //         }
// // // // //     }

// // // // //     /**
// // // // //      * Clears the diagnostic output area.
// // // // //      */
// // // // //     function clearOutput() {
// // // // //         diagnosticOutput.textContent = '';
// // // // //     }

// // // // //     /**
// // // // //      * Appends data to the diagnostic output area and scrolls to the bottom.
// // // // //      * @param {string} data - The text data to append.
// // // // //      */
// // // // //     function appendOutput(data) {
// // // // //         diagnosticOutput.textContent += data;
// // // // //         diagnosticOutput.scrollTop = diagnosticOutput.scrollHeight; // Auto-scroll
// // // // //     }

// // // // //     /**
// // // // //      * Handles the completion of diagnostic tests.
// // // // //      * Enables Run button, disables Stop button.
// // // // //      */
// // // // //     function onDiagnosticCompleted() {
// // // // //         runDiagnosticBtn.disabled = false;
// // // // //         stopDiagnosticBtn.disabled = true;
// // // // //     }

// // // // //     // Initial internet check and periodic checks
// // // // //     async function checkInternetPeriodically() {
// // // // //         const isConnected = await electronAPI.checkInternet();
// // // // //         updateInternetStatus(isConnected);
// // // // //     }
// // // // //     checkInternetPeriodically(); // Initial check
// // // // //     setInterval(checkInternetPeriodically, 10000); // Check every 10 seconds

// // // // //     // Event listener for the "Run Diagnostic" button
// // // // //     runDiagnosticBtn.addEventListener('click', async () => {
// // // // //         const websiteUrl = websiteUrlInput.value.trim();
// // // // //         if (!websiteUrl) {
// // // // //             await electronAPI.showMessageBox({
// // // // //                 type: 'warning',
// // // // //                 title: 'Input Required',
// // // // //                 message: 'Please enter a website URL (e.g., example.com).'
// // // // //             });
// // // // //             return;
// // // // //         }

// // // // //         // Disable Run button, enable Stop button
// // // // //         runDiagnosticBtn.disabled = true;
// // // // //         stopDiagnosticBtn.disabled = false;

// // // // //         // Collect selected DNS servers
// // // // //         const selectedDnsServers = [];
// // // // //         for (let i = 0; i < dnsIpCheckboxes.length; i++) {
// // // // //             if (dnsIpCheckboxes[i].checked) {
// // // // //                 const ip = dnsIpInputs[i].value.trim();
// // // // //                 if (ip) {
// // // // //                     selectedDnsServers.push({ ip: ip, enabled: true });
// // // // //                 } else {
// // // // //                     await electronAPI.showMessageBox({
// // // // //                         type: 'warning',
// // // // //                         title: 'Invalid DNS IP',
// // // // //                         message: `DNS IP field ${i + 1} is checked but empty. Please provide a valid IP or uncheck it.`
// // // // //                     });
// // // // //                     runDiagnosticBtn.disabled = false; // Re-enable if there's an input error
// // // // //                     stopDiagnosticBtn.disabled = true;
// // // // //                     return;
// // // // //                 }
// // // // //             }
// // // // //         }

// // // // //         if (selectedDnsServers.length === 0) {
// // // // //             await electronAPI.showMessageBox({
// // // // //                 type: 'warning',
// // // // //                 title: 'No DNS Selected',
// // // // //                 message: 'Please select at least one DNS server for nslookup.'
// // // // //             });
// // // // //             runDiagnosticBtn.disabled = false; // Re-enable if there's an input error
// // // // //             stopDiagnosticBtn.disabled = true;
// // // // //             return;
// // // // //         }


// // // // //         // Clear previous output and start diagnostics
// // // // //         clearOutput();
// // // // //         appendOutput('Starting diagnostics...\n');
// // // // //         await electronAPI.runDiagnostic(websiteUrl, selectedDnsServers);
// // // // //     });

// // // // //     // Event listener for the "Stop Diagnostic" button
// // // // //     stopDiagnosticBtn.addEventListener('click', async () => {
// // // // //         await electronAPI.stopDiagnostic();
// // // // //     });

// // // // //     // Register listeners for communication from main process
// // // // //     electronAPI.onDiagnosticOutput(appendOutput);
// // // // //     electronAPI.onClearOutput(clearOutput);
// // // // //     electronAPI.onDiagnosticCompleted(onDiagnosticCompleted);

// // // // //     // Clean up listeners when the window is about to unload
// // // // //     window.addEventListener('unload', () => {
// // // // //         electronAPI.removeDiagnosticOutputListener(appendOutput);
// // // // //         electronAPI.removeClearOutputListener(clearOutput);
// // // // //         electronAPI.removeDiagnosticCompletedListener(onDiagnosticCompleted);
// // // // //     });
// // // // // })(); // End of IIFE