/* eslint-disable no-console */
// Deploys RitDefenseLeaderboard to Ritual Chain (id 1979) using
// DEPLOYER_PRIVATE_KEY from .env. The deployer address is also set as the
// initial relayer (the only address allowed to call submitScore).
//
// On success the deployed address is appended to .env as
// NEXT_PUBLIC_LEADERBOARD_ADDRESS=<address> (existing entry overwritten).

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function normalizePk(raw) {
  if (!raw) return null;
  let pk = raw.trim();
  if (!pk.startsWith('0x')) pk = '0x' + pk;
  if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    throw new Error('DEPLOYER_PRIVATE_KEY must be a 32-byte hex string');
  }
  return pk;
}

const ritual = defineChain({
  id: 1979,
  name: 'Ritual',
  nativeCurrency: { name: 'RITUAL', symbol: 'RITUAL', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RITUAL_RPC_URL || 'https://rpc.ritualfoundation.org'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.ritualfoundation.org' },
  },
});

const pk = normalizePk(process.env.DEPLOYER_PRIVATE_KEY);
if (!pk) {
  console.error('[deploy] Missing DEPLOYER_PRIVATE_KEY in .env');
  process.exit(1);
}

const account = privateKeyToAccount(pk);
console.log('[deploy] Deployer:', account.address);

const publicClient = createPublicClient({ chain: ritual, transport: http() });
const walletClient = createWalletClient({ account, chain: ritual, transport: http() });

const balance = await publicClient.getBalance({ address: account.address });
console.log('[deploy] Balance:', balance.toString(), 'wei');
if (balance === 0n) {
  console.error('[deploy] Deployer has 0 RITUAL — cannot pay for deployment.');
  process.exit(1);
}

const artifactPath = path.join(root, 'artifacts', 'RitDefenseLeaderboard.json');
if (!fs.existsSync(artifactPath)) {
  console.error('[deploy] Artifact missing. Run `node scripts/compile.mjs` first.');
  process.exit(1);
}
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

console.log('[deploy] Submitting deployment tx...');
const hash = await walletClient.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode,
  args: [account.address], // initial relayer = deployer
});
console.log('[deploy] tx hash:', hash);
console.log('[deploy] explorer:', `https://explorer.ritualfoundation.org/tx/${hash}`);

const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (!receipt.contractAddress) {
  console.error('[deploy] Deployment failed (no contract address in receipt).');
  console.error(receipt);
  process.exit(1);
}

console.log('[deploy] ✓ Deployed at', receipt.contractAddress);
console.log('[deploy]   gasUsed:', receipt.gasUsed.toString());

// Persist address into .env (idempotent — replaces existing entry if present).
const envPath = path.join(root, '.env');
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const line = `NEXT_PUBLIC_LEADERBOARD_ADDRESS=${receipt.contractAddress}`;
if (envContent.match(/^NEXT_PUBLIC_LEADERBOARD_ADDRESS=.*$/m)) {
  envContent = envContent.replace(/^NEXT_PUBLIC_LEADERBOARD_ADDRESS=.*$/m, line);
} else {
  if (envContent.length && !envContent.endsWith('\n')) envContent += '\n';
  envContent += `\n# Leaderboard contract deployed by scripts/deploy.mjs\n${line}\n`;
}
fs.writeFileSync(envPath, envContent);
console.log('[deploy] Wrote NEXT_PUBLIC_LEADERBOARD_ADDRESS to .env');

// Also write a small JSON sidecar for the frontend / API to import.
const deployedJson = {
  address: receipt.contractAddress,
  deployer: account.address,
  relayer: account.address,
  chainId: 1979,
  txHash: hash,
  blockNumber: Number(receipt.blockNumber),
};
const sidecarPath = path.join(root, 'lib', 'leaderboard-deployed.json');
fs.mkdirSync(path.dirname(sidecarPath), { recursive: true });
fs.writeFileSync(sidecarPath, JSON.stringify(deployedJson, null, 2));
console.log('[deploy] Wrote', sidecarPath);
