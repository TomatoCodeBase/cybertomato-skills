#!/usr/bin/env node
/**
 * screenshot.cjs - HTML截图工具（零依赖，使用系统Edge/Chrome）
 * 用法：node scripts/screenshot.cjs <html-path> [output-png] [width] [height]
 * 默认：1080x1440
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(process.argv[2]);
const outPath = process.argv[3] ? path.resolve(process.argv[3]) : htmlPath.replace(/\.html$/, '.png');
const width = parseInt(process.argv[4]) || 1080;
const height = parseInt(process.argv[5]) || 1440;

if (!fs.existsSync(htmlPath)) { console.error(`❌ ${htmlPath}`); process.exit(1); }

const edgePaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const exe = [...edgePaths, ...chromePaths].find(p => fs.existsSync(p));

if (!exe) { console.error('❌ 未找到Chrome/Edge'); process.exit(1); }

const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
console.log(`📸 截图中 ${width}x${height}...`);

try {
  execSync(
    `"${exe}" --headless=new --disable-gpu --no-sandbox --screenshot="${outPath}" --window-size=${width},${height} "${fileUrl}"`,
    { timeout: 30000, stdio: 'pipe' }
  );
} catch (e) {
  // Edge/Chrome截图后返回非零退出码，忽略
}

if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
  const size = fs.statSync(outPath).size;
  console.log(`✅ ${outPath} (${width}x${height}, ${(size / 1024).toFixed(0)}KB)`);
} else {
  console.error('❌ 截图失败');
  process.exit(1);
}
