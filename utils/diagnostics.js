const { exec } = require('child_process');

function execCommand(cmd, signal) {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(null);
    exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
      if (signal.aborted) return resolve(null);
      resolve(`> ${cmd}\n${stdout || stderr || error.message}`);
    });
  });
}

exports.runDiagnostics = async function* ({ url, dnsServers }, signal) {
  yield 'Checking internet connectivity...';
  yield await execCommand('ping -n 1 8.8.8.8', signal);

  yield 'Fetching Public IPv4...';
  yield await execCommand('curl -s https://api.ipify.org', signal);

  yield 'Fetching Public IPv6...';
  yield await execCommand('curl -s https://api6.ipify.org', signal);

  let resolvedIPs = new Set();

  for (const dns of dnsServers) {
    const nsCmd = `nslookup ${url} ${dns}`;
    const nsResult = await execCommand(nsCmd, signal);
    yield nsResult;
    const ips = nsResult.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
    if (ips) ips.forEach(ip => resolvedIPs.add(ip));
    if (signal.aborted) break;
  }

  for (const ip of resolvedIPs) {
    yield await execCommand(`tracert ${ip}`, signal);
    yield await execCommand(`ping -n 4 ${ip}`, signal);
    if (signal.aborted) break;
  }
};
