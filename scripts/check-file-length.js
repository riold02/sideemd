#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_LINES = 250;
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs']);

function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
    return out.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    return [];
  }
}

const staged = getStagedFiles();
const offenders = [];
for (const f of staged) {
  const ext = path.extname(f);
  if (!exts.has(ext)) continue;
  if (!fs.existsSync(f)) continue;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split(/\r?\n/).length;
  if (lines > MAX_LINES) offenders.push({ file: f, lines });
}

if (offenders.length) {
  console.error('\nCommit aborted: the following staged source files exceed ' + MAX_LINES + ' lines:');
  for (const o of offenders) console.error(` - ${o.file}: ${o.lines} lines`);
  console.error('\nPlease split large files or remove them from the commit.');
  process.exit(1);
}

process.exit(0);
