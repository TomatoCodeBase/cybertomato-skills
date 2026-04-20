/**
 * 番茄日记创建器
 * 
 * 用法：
 *   node create-diary.cjs [YYYY-MM-DD]
 * 
 * 无参数 → 创建今天的日记
 * 带日期 → 创建指定日期的日记（补建）
 * 
 * 依赖：Obsidian Local REST API（端口 27123）
 * 模板：D:\cybertomato\00-个人日记\番茄日记\番茄日记模板.md
 * 输出：D:\cybertomato\00-个人日记\番茄日记\{date}.md
 */

const http = require('http');
const fs = require('fs');

const API_HOST = 'localhost';
const API_PORT = 27123;
const API_KEY = process.env.OBSIDIAN_API_KEY;
const TEMPLATE_PATH = 'D:\\cybertomato\\00-个人日记\\番茄日记\\番茄日记模板.md';
const DIARY_DIR = '00-个人日记/番茄日记';

// --- Helpers ---

function obsidianRequest(method, path, body, contentType) {
  return new Promise((resolve, reject) => {
    const headers = { 'Authorization': 'Bearer ' + API_KEY };
    if (body) {
      headers['Content-Type'] = contentType || 'text/markdown; charset=utf-8';
    }
    const opts = { hostname: API_HOST, port: API_PORT, path, method, headers };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(Buffer.from(body, 'utf-8'));
    req.end();
  });
}

function now() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// --- Main ---

async function main() {
  // 1. Parse date (use Asia/Shanghai timezone)
  const dateArg = process.argv[2];
  const targetDate = dateArg || (() => {
    const d = new Date(Date.now() + 8 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  })();
  
  // Validate format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    console.error('ERROR: 日期格式错误，需要 YYYY-MM-DD');
    process.exit(1);
  }

  // 2. Check Obsidian API
  try {
    const ping = await obsidianRequest('GET', '/');
    if (ping.status >= 500) throw new Error('API不可用');
  } catch (e) {
    console.error('ERROR: Obsidian API 不可用（端口 27123）。请确认 Obsidian 已打开且 Local REST API 插件已启用。');
    process.exit(1);
  }

  // 3. Check if diary already exists
  const vaultPath = `/vault/${encodeURIComponent(DIARY_DIR + '/' + targetDate + '.md')}`;
  const check = await obsidianRequest('GET', vaultPath);
  if (check.status === 200) {
    console.log(`EXISTS: ${targetDate} 日记已存在，不覆盖`);
    console.log(`PATH: ${DIARY_DIR}/${targetDate}.md`);
    // Try to open it in Obsidian
    await obsidianRequest('POST', `/open/${encodeURIComponent(DIARY_DIR + '/' + targetDate + '.md')}`);
    console.log('OPENED: 已在 Obsidian 中打开');
    process.exit(0);
  }

  // 4. Read template from disk
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error('ERROR: 模板文件不存在: ' + TEMPLATE_PATH);
    process.exit(1);
  }
  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  // 5. Replace placeholders
  const content = template
    .replace(/日期: YYYY-MM-DD/g, '日期: ' + targetDate)
    .replace(/创建时间：YYYY-MM-DD HH:MM/g, '创建时间：' + now());

  // 6. Write to Obsidian
  const result = await obsidianRequest('PUT', vaultPath, content);
  if (result.status === 204 || result.status === 200) {
    console.log(`CREATED: ${DIARY_DIR}/${targetDate}.md`);
  } else {
    console.error(`ERROR: 写入失败 (HTTP ${result.status}): ${result.body}`);
    process.exit(1);
  }

  // 7. Open in Obsidian
  await obsidianRequest('POST', `/open/${encodeURIComponent(DIARY_DIR + '/' + targetDate + '.md')}`);
  console.log('OPENED: 已在 Obsidian 中打开');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
