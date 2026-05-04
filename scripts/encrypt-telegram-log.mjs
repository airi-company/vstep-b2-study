import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const targetId = process.argv[2] || '8722611614';
const password = process.argv[3] || process.env.LOG_VIEWER_PASSWORD;

if (!password) {
  console.error('Usage: node scripts/encrypt-telegram-log.mjs <targetId> <password>');
  process.exit(1);
}

const workspace = process.cwd();
const inputFile = path.join(workspace, 'data', `telegram-${targetId}.json`);
const outputFile = path.join(workspace, 'data', `telegram-${targetId}.encrypted.json`);
const plaintext = fs.readFileSync(inputFile, 'utf8');

const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const iterations = 250000;
const key = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();

const payload = {
  targetId,
  alg: 'AES-256-GCM',
  kdf: 'PBKDF2-SHA256',
  iterations,
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  tag: tag.toString('base64'),
  ciphertext: encrypted.toString('base64'),
  encryptedAt: new Date().toISOString()
};

fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Encrypted ${inputFile} -> ${outputFile}`);
