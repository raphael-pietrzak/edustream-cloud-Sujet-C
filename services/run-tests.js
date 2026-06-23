#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

// Recursively find all .test.js files
function findTestFiles(dir) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Use current working directory (where npm is running)
const testDir = join(process.cwd(), 'test');
const files = findTestFiles(testDir);

if (files.length === 0) {
  console.error('No test files found');
  process.exit(1);
}

// Spawn node --test with the found files
const proc = spawn('node', ['--test', ...files], { stdio: 'inherit' });
proc.on('exit', (code) => process.exit(code));
