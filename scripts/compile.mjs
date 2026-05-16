/* eslint-disable no-console */
// Standalone solc-based compiler. Avoids Hardhat 2/3 plugin mismatch.
// Reads contracts/RitDefenseLeaderboard.sol + @openzeppelin imports, writes
// artifacts/RitDefenseLeaderboard.json with { abi, bytecode }.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const contractName = 'RitDefenseLeaderboard';
const sourcePath = path.join(root, 'contracts', `${contractName}.sol`);
const outDir = path.join(root, 'artifacts');

function readSource(p) {
  return fs.readFileSync(p, 'utf8');
}

function resolveImport(importPath) {
  // Resolve @openzeppelin/* and relative paths to absolute filesystem paths.
  if (importPath.startsWith('@')) {
    const candidate = path.join(root, 'node_modules', importPath);
    if (fs.existsSync(candidate)) {
      return { contents: readSource(candidate) };
    }
  }
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    // Hardhat-style imports relative to current source — we just look it up in contracts/.
    const candidate = path.join(root, 'contracts', importPath);
    if (fs.existsSync(candidate)) {
      return { contents: readSource(candidate) };
    }
  }
  // Last resort: try as absolute
  if (fs.existsSync(importPath)) {
    return { contents: readSource(importPath) };
  }
  return { error: `File not found: ${importPath}` };
}

const input = {
  language: 'Solidity',
  sources: {
    [`${contractName}.sol`]: { content: readSource(sourcePath) },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'],
      },
    },
  },
};

console.log(`[compile] Compiling ${contractName}...`);
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: resolveImport }));

if (output.errors && output.errors.length) {
  let hasError = false;
  for (const err of output.errors) {
    if (err.severity === 'error') hasError = true;
    console.log(err.formattedMessage);
  }
  if (hasError) {
    console.error('[compile] Compilation failed.');
    process.exit(1);
  }
}

const compiled = output.contracts[`${contractName}.sol`][contractName];
if (!compiled) {
  console.error('[compile] Could not find compiled artifact.');
  process.exit(1);
}

const artifact = {
  contractName,
  abi: compiled.abi,
  bytecode: '0x' + compiled.evm.bytecode.object,
  deployedBytecode: '0x' + compiled.evm.deployedBytecode.object,
};

fs.mkdirSync(outDir, { recursive: true });
const artifactPath = path.join(outDir, `${contractName}.json`);
fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
console.log(`[compile] Wrote ${artifactPath} (${artifact.bytecode.length / 2} bytes)`);
