#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('\n========================================');
console.log('Installing Jest (dev dependency)...');
console.log('========================================\n');

const installProcess = spawn('npm', ['install', 'jest', '--save-dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

installProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('\nError installing Jest');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('Running Tests...');
  console.log('========================================\n');

  const testProcess = spawn('npm', ['test'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  testProcess.on('close', (testCode) => {
    console.log('\n========================================');
    if (testCode === 0) {
      console.log('✅ Tests completed successfully!');
    } else {
      console.log('❌ Tests completed with issues');
    }
    console.log('========================================\n');
    process.exit(testCode);
  });
});
