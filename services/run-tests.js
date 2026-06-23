#!/usr/bin/env node
import { glob } from 'node:glob';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Find all test files
const files = await glob('test/**/*.test.js', { cwd: __dirname });

if (files.length === 0) {
  console.error('No test files found');
  process.exit(1);
}

// Spawn node --test with the found files
const proc = spawn('node', ['--test', ...files], { stdio: 'inherit' });
proc.on('exit', (code) => process.exit(code));
