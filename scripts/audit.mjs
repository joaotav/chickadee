// Runs `npm audit` and fails on high or critical advisories, except the ones listed below.
// Part of `npm run check`.
import { spawnSync } from 'node:child_process';

// Advisories with no fixed version yet that don't affect the extension. Remove each one once
// a fix is released, so the audit can catch it again.
const IGNORED = [
  // picomatch through 4.0.7: crafted glob patterns can hang it. Only the build and test tools
  // use it, with the patterns in our own config, and it isn't part of the extension.
  'GHSA-fc5q-39xc-vjpf',
];

const { stdout } = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8' });
const report = JSON.parse(stdout);
// A failed audit, like one without a network, would otherwise look like a clean one.
if (report.error) {
  console.error(`npm audit failed: ${report.error.summary}`);
  process.exit(1);
}
const { vulnerabilities = {} } = report;

// Each package lists its own advisories as objects, and the packages that pull in a
// vulnerable one by name, so the objects alone cover every advisory.
const advisories = new Map();
for (const { via } of Object.values(vulnerabilities)) {
  for (const advisory of via) {
    if (typeof advisory === 'object') advisories.set(advisory.url, advisory);
  }
}

let failed = false;
for (const { url, name, title, severity } of advisories.values()) {
  const id = url.split('/').pop();
  const ignored = IGNORED.includes(id);
  if (!ignored && (severity === 'high' || severity === 'critical')) failed = true;
  console.log(`${ignored ? 'ignored' : severity}: ${name}: ${title} ${url}`);
}
process.exit(failed ? 1 : 0);
