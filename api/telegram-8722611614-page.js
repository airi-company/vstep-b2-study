function unauthorized(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Airi Log Viewer"');
  res.status(401).send('Authentication required');
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

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Airi Log Viewer · 8722611614</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b1020;
      --panel: #141a2e;
      --line: #28304d;
      --text: #edf2ff;
      --muted: #99a4c7;
      --user: #1e2a4f;
      --assistant: #10253a;
      --accent: #77a8ff;
      --warn: #ffd479;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(180deg, #0b1020 0%, #111936 100%);
      color: var(--text);
    }
    .wrap {
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 16px 48px;
    }
    .hero, .card, .msg {
      background: rgba(20, 26, 46, 0.92);
      border: 1px solid rgba(119, 168, 255, 0.14);
      border-radius: 18px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.22);
    }
    .hero {
      padding: 24px;
      margin-bottom: 18px;
    }
    h1 { margin: 0 0 10px; font-size: 28px; }
    p { margin: 0; color: var(--muted); line-height: 1.6; }
    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .card { padding: 16px; }
    .label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .value { margin-top: 6px; font-size: 15px; font-weight: 600; }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin: 18px 0;
      flex-wrap: wrap;
    }
    button {
      border: 0;
      border-radius: 999px;
      background: var(--accent);
      color: #081225;
      font-weight: 700;
      padding: 10px 14px;
      cursor: pointer;
    }
    button:hover { filter: brightness(1.05); }
    .note {
      color: var(--warn);
      font-size: 14px;
    }
    .list {
      display: grid;
      gap: 12px;
    }
    .msg {
      padding: 16px;
      border-color: rgba(255,255,255,0.08);
    }
    .msg.user { background: rgba(30,42,79,.92); }
    .msg.assistant { background: rgba(16,37,58,.92); }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .role {
      font-size: 12px;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #c7d4ff;
      font-weight: 700;
    }
    .time { color: var(--muted); font-size: 13px; }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font: inherit;
      line-height: 1.65;
    }
    .empty {
      padding: 22px;
      text-align: center;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <h1>Airi Log Viewer</h1>
      <p>Telegram log viewer for ID <strong>8722611614</strong>. Trang này đang được bảo vệ bằng xác thực cơ bản.</p>
      <div class="meta">
        <div class="card"><div class="label">Target ID</div><div class="value">8722611614</div></div>
        <div class="card"><div class="label">Refresh</div><div class="value">Manual + auto 15s</div></div>
        <div class="card"><div class="label">Source</div><div class="value">Exported OpenClaw session data</div></div>
      </div>
    </section>

    <div class="toolbar">
      <button id="refreshBtn">Refresh now</button>
      <div class="note" id="status">Loading…</div>
    </div>

    <section id="messages" class="list"></section>
  </main>

  <script>
    const statusEl = document.getElementById('status');
    const messagesEl = document.getElementById('messages');
    const refreshBtn = document.getElementById('refreshBtn');

    function fmtTime(value) {
      if (!value) return '—';
      const d = new Date(value);
      return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'Asia/Ho_Chi_Minh'
      }).format(d);
    }

    function escapeHtml(text) {
      return String(text || '').replace(/[&<>]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
      });
    }

    function render(data) {
      const messages = Array.isArray(data.messages) ? data.messages : [];
      statusEl.textContent = 'Có ' + messages.length + ' mục · cập nhật ' + fmtTime(data.exportedAt) + ' · session: ' + (data.hasSession ? 'đã có' : 'chưa có');
      if (!messages.length) {
        messagesEl.innerHTML = '<div class="card empty">Chưa có log chat nào được export cho ID này. Khi có tin nhắn thật, chỉ cần chạy lại script export là trang sẽ hiện.</div>';
        return;
      }

      messagesEl.innerHTML = messages.map(function (msg) {
        return '<article class="msg ' + (msg.role === 'assistant' ? 'assistant' : 'user') + '">' +
          '<div class="row">' +
            '<div class="role">' + escapeHtml(msg.role) + '</div>' +
            '<div class="time">' + escapeHtml(fmtTime(msg.timestamp)) + '</div>' +
          '</div>' +
          '<pre>' + escapeHtml(msg.text || '') + '</pre>' +
        '</article>';
      }).join('');
    }

    async function loadData() {
      try {
        statusEl.textContent = 'Đang tải…';
        const res = await fetch('/api/telegram-8722611614', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        render(data);
      } catch (err) {
        statusEl.textContent = 'Lỗi tải log: ' + err.message;
      }
    }

    refreshBtn.addEventListener('click', loadData);
    loadData();
    setInterval(loadData, 15000);
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};
