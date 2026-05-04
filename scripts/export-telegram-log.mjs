import fs from 'fs';
import path from 'path';

const targetId = process.argv[2] || '8722611614';
const workspace = process.cwd();
const sessionsPath = '/home/azureuser/.openclaw/agents/main/sessions/sessions.json';
const outFile = path.join(workspace, 'data', `telegram-${targetId}.json`);

function stripEnvelope(text) {
  if (!text) return '';
  return text
    .replace(/^Conversation info \(untrusted metadata\):[\s\S]*?```\n\nSender \(untrusted metadata\):[\s\S]*?```\n\n/, '')
    .trim();
}

function extractText(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter((item) => item && item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n\n')
    .trim();
}

function writeOutput(payload) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

const sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
const sessionKey = `agent:main:telegram:direct:${targetId}`;
const sessionMeta = sessions[sessionKey];

if (!sessionMeta || !sessionMeta.sessionFile || !fs.existsSync(sessionMeta.sessionFile)) {
  writeOutput({
    targetId,
    hasSession: false,
    exportedAt: new Date().toISOString(),
    sourceSessionKey: sessionKey,
    note: 'No OpenClaw direct session found yet for this Telegram ID.',
    messages: []
  });
  console.log(`No session found for ${targetId}; wrote empty export to ${outFile}`);
  process.exit(0);
}

const lines = fs.readFileSync(sessionMeta.sessionFile, 'utf8').split('\n').filter(Boolean);
const messages = [];

for (const line of lines) {
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    continue;
  }

  if (row.type !== 'message' || !row.message) continue;
  const msg = row.message;
  if (msg.role !== 'user' && msg.role !== 'assistant') continue;

  const text = stripEnvelope(extractText(msg.content));
  if (!text) continue;
  messages.push({
    role: msg.role,
    text,
    timestamp: msg.timestamp || row.timestamp || null
  });
}

writeOutput({
  targetId,
  hasSession: true,
  exportedAt: new Date().toISOString(),
  sourceSessionKey: sessionKey,
  sourceSessionFile: sessionMeta.sessionFile,
  messageCount: messages.length,
  messages
});

console.log(`Exported ${messages.length} messages for ${targetId} -> ${outFile}`);
