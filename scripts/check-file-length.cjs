#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_LINES = 250;
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs']);

function getTrackedFiles() {
  try {
    return execSync('git ls-files', { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  } catch (e) {
    return [];
  }
}

const files = getTrackedFiles().filter(f => {
  if (f.startsWith('node_modules/') || f.startsWith('dist/') || f.startsWith('.husky/')) return false;
  const ext = path.extname(f);
  return exts.has(ext);
});

const offenders = [];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split(/\r?\n/).length;
  if (lines > MAX_LINES) offenders.push({ file: f, lines });
}

if (offenders.length) {
  console.error('\nCommit aborted: the following tracked source files exceed ' + MAX_LINES + ' lines:');
  for (const o of offenders) console.error(` - ${o.file}: ${o.lines} lines`);
  console.error('\nPlease split large files before committing.');
  process.exit(1);
}

process.exit(0);
