// This preload script runs in the context of the webview itself, isolated from the main app's renderer process.
// It's intentionally empty for this use case, as we don't need to expose any Node.js APIs to the loaded website.
// Its presence is primarily for security best practices with `contextIsolation` and `sandbox`.