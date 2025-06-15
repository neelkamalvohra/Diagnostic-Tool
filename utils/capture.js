// File: utils/capture.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const screenshot = require('screenshot-desktop');

exports.performCapture = async ({ url }) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const folder = path.join(__dirname, '..', 'captures');

  if (!fs.existsSync(folder)) fs.mkdirSync(folder);

  let result = `Capturing for: ${url}\n`;

  try {
    const filePath = path.join(folder, `screenshot-${timestamp}.png`);
    await screenshot({ filename: filePath });
    result += `✅ Screenshot saved at ${filePath}\n`;
  } catch (err) {
    result += `❌ Screenshot failed: ${err.message}\n`;
  }

  try {
    const harFile = path.join(folder, `capture-${timestamp}.har`);
    const chromeCmd = `start chrome --headless --dump-dom --disable-gpu --virtual-time-budget=3000 --output=${harFile} ${url}`;
    await exec(chromeCmd);
    result += `✅ HAR file attempt done (check manually).\n`;
  } catch (err) {
    result += `❌ HAR capture failed: ${err.message}\n`;
  }

  return result;
};
