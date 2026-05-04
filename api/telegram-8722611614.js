const fs = require('fs');
const path = require('path');

function unauthorized(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Airi Log Viewer"');
  res.status(401).json({ error: 'Authentication required' });
}

function authorized(req) {
  const expectedUser = process.env.LOG_VIEWER_USER;
  const expectedPass = process.env.LOG_VIEWER_PASS;
  if (!expectedUser || !expectedPass) return false;

  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;

  const encoded = header.slice(6);
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const idx = decoded.indexOf(':');
  if (idx === -1) return false;

  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);
  return user === expectedUser && pass === expectedPass;
}

module.exports = (req, res) => {
  if (!authorized(req)) return unauthorized(res);

  const file = path.join(process.cwd(), 'data', 'telegram-8722611614.json');
  const raw = fs.readFileSync(file, 'utf8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).send(raw);
};
