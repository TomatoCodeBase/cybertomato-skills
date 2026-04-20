#!/usr/bin/env node
/**
 * daily-card.cjs - AI日报信息图卡片生成器
 * 从日报markdown自动生成小红书风格HTML卡片
 * 
 * 用法：node scripts/daily-card.cjs [YYYY-MM-DD]
 * 产物：D:\cybertomato\03-内容工厂\AI热点日报\{date}-卡片.html
 */
const fs = require('fs');
const path = require('path');

const REPORT_DIR = 'D:\\cybertomato\\03-内容工厂\\AI热点日报';
const today = new Date().toISOString().slice(0, 10);

const date = process.argv.slice(2).find(a => /^\d{4}-\d{2}-\d{2}$/.test(a)) || today;

const filePath = path.join(REPORT_DIR, `${date}-番茄AI热点日报.md`);
if (!fs.existsSync(filePath)) { console.error(`❌ ${filePath}`); process.exit(1); }
const content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');

// 按行解析
const lines = content.split('\n');
let title = '';
let dateStr = '';
let currentLevel = null;
const sections = { s: [], a: [], b: [], c: [] };
let currentSection = [];
let lastHeadline = '';

function pushSection() {
  if (currentLevel && lastHeadline) {
    const body = currentSection.join(' ').trim()
      .replace(/- 来源.*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
    sections[currentLevel].push({ headline: lastHeadline, summary: body });
    lastHeadline = '';
  }
  currentSection = [];
}

function getLevel(line) {
  if (line.includes('今日重点')) return 's';
  if (line.includes('格局变化')) return 'a';
  if (line.includes('产品与技术')) return 'b';
  if (line.includes('动态与观点')) return 'c';
  return null;
}

function getLevelFromHeader(line) {
  if (line.includes('安全与监管') || line.includes('模型竞赛')) return 's';
  if (line.includes('大厂博弈') || line.includes('Agent')) return 'a';
  if (line.includes('产品上新') || line.includes('硬件') || line.includes('开发者')) return 'b';
  if (line.includes('社会观察') || line.includes('融资') || line.includes('知识') || line.includes('其他')) return 'c';
  return null;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.startsWith('# ') && !title) { title = line.slice(2).trim(); continue; }
  if (line.includes('日期') && line.includes('：')) {
    const m = line.match(/日期[：:]\s*(.+)/);
    if (m) dateStr = m[1].trim();
    continue;
  }
  
  // ## 级别标题
  if (line.startsWith('## ')) {
    const lvl = getLevel(line);
    if (lvl) { pushSection(); currentLevel = lvl; continue; }
    // 子标题（###），继承当前级别
    if (line.startsWith('### ') && currentLevel) {
      const subLvl = getLevelFromHeader(line);
      if (subLvl) currentLevel = subLvl;
      continue;
    }
  }
  
  // 来源行，跳过
  if (line.startsWith('- 来源')) { pushSection(); continue; }
  // 采集时间等结尾行
  if (line.startsWith('*采集') || line.startsWith('*融合') || line.startsWith('*数据')) { pushSection(); continue; }
  
  // **新闻标题**
  const hlMatch = line.match(/^\*\*(.+?)\*\*$/);
  if (hlMatch && currentLevel) {
    pushSection();
    lastHeadline = hlMatch[1].trim();
    continue;
  }
  
  // 正文行
  if (currentLevel && lastHeadline && line.trim() && !line.startsWith('---')) {
    currentSection.push(line.trim());
  }
}
pushSection();

// 限制条数
const limits = { s: 3, a: 5, b: 6, c: 3 };
for (const k of Object.keys(sections)) sections[k] = sections[k].slice(0, limits[k]);

console.log(`📰 ${date} | S:${sections.s.length} A:${sections.a.length} B:${sections.b.length} C:${sections.c.length}`);

function esc(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// 提取标题高亮词
const titleParts = title.split(/[，,]/);
const hlWord = titleParts.length > 1 ? titleParts[0].trim() : '';

const sCards = sections.s.map(it => `
      <div class="news-item">
        <div class="news-headline">${esc(it.headline)}</div>
        <div class="news-summary">${esc(it.summary)}</div>
      </div>`).join('\n');

function compact(items, dot) {
  return items.map(it => `
        <div class="compact-item">
          <div class="compact-dot ${dot}"></div>
          <div class="compact-text"><strong>${esc(it.headline)}</strong>，${esc(it.summary.replace(/[。！？]$/, ''))}</div>
        </div>`).join('\n');
}

const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;background:#0a0a0a;display:flex;justify-content:center;padding:40px 0}
  .card{width:1080px;min-height:1440px;background:linear-gradient(165deg,#0f0f0f 0%,#1a0a0a 40%,#0a0f1a 100%);border-radius:24px;overflow:hidden;position:relative}
  .card::before{content:'';position:absolute;top:-100px;right:-100px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(255,60,60,.12) 0%,transparent 70%)}
  .card::after{content:'';position:absolute;bottom:-80px;left:-80px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(60,100,255,.08) 0%,transparent 70%)}
  .header{padding:56px 56px 40px;position:relative;z-index:1;border-bottom:1px solid rgba(255,255,255,.06)}
  .brand{display:flex;align-items:center;gap:14px;margin-bottom:24px}
  .brand-icon{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#ff3c3c,#ff6b35);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;font-weight:900}
  .brand-name{color:#fff;font-size:20px;font-weight:700;letter-spacing:2px}
  .brand-tag{margin-left:auto;padding:6px 16px;border-radius:20px;background:rgba(255,255,255,.06);color:rgba(255,255,255,.5);font-size:13px;font-weight:500}
  .title{font-size:38px;font-weight:900;color:#fff;line-height:1.35;letter-spacing:1px}
  .hl{color:#ff5252}
  .subtitle{margin-top:12px;color:rgba(255,255,255,.35);font-size:15px}
  .content{padding:36px 56px 56px;position:relative;z-index:1}
  .section{margin-bottom:36px}.section:last-child{margin-bottom:0}
  .section-header{display:flex;align-items:center;gap:10px;margin-bottom:18px}
  .section-badge{padding:5px 14px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:1px}
  .badge-s{background:linear-gradient(135deg,#ff3c3c,#ff5252);color:#fff}
  .badge-a{background:linear-gradient(135deg,#ff9800,#ffb74d);color:#1a1a1a}
  .badge-b{background:linear-gradient(135deg,#448aff,#64b5f6);color:#fff}
  .badge-c{background:rgba(255,255,255,.08);color:rgba(255,255,255,.5)}
  .section-title{color:rgba(255,255,255,.6);font-size:14px;font-weight:500}
  .news-item{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:22px 24px;margin-bottom:14px}
  .news-item:last-child{margin-bottom:0}
  .news-headline{font-size:17px;font-weight:700;color:#fff;line-height:1.5;margin-bottom:8px}
  .news-summary{font-size:14px;color:rgba(255,255,255,.45);line-height:1.65;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .compact-list{display:flex;flex-direction:column;gap:10px}
  .compact-item{display:flex;align-items:flex-start;gap:14px;padding:14px 18px;border-radius:12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04)}
  .compact-dot{width:6px;height:6px;border-radius:50%;background:#ff5252;margin-top:8px;flex-shrink:0}
  .compact-dot.orange{background:#ff9800}.compact-dot.blue{background:#448aff}
  .compact-text{font-size:14px;color:rgba(255,255,255,.6);line-height:1.5;font-weight:500}
  .compact-text strong{color:#fff;font-weight:700}
  .footer{padding:0 56px 48px;position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,.04);padding-top:28px}
  .footer-left{color:rgba(255,255,255,.2);font-size:12px;line-height:1.8}
  .footer-right{color:rgba(255,255,255,.15);font-size:12px;text-align:right;line-height:1.8}
  .qr-placeholder{width:80px;height:80px;border-radius:12px;margin-top:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.15);font-size:11px}
</style></head>
<body>
<div class="card">
  <div class="header">
    <div class="brand">
      <div class="brand-icon">🍅</div>
      <span class="brand-name">赛博番茄</span>
      <span class="brand-tag">每日AI</span>
    </div>
    <div class="title">${title.includes('，') ? esc(title.split('，')[0]) + '<span class="hl">' + esc(title.split('，').slice(1).join('，')) + '</span>' : esc(title)}</div>
    <div class="subtitle">${esc(dateStr)} · AI行业热点速递</div>
  </div>
  <div class="content">
${sCards ? `    <div class="section">
      <div class="section-header"><span class="section-badge badge-s">S</span><span class="section-title">今日重点</span></div>
${sCards}
    </div>` : ''}
${sections.a.length ? `    <div class="section">
      <div class="section-header"><span class="section-badge badge-a">A</span><span class="section-title">格局变化</span></div>
      <div class="compact-list">${compact(sections.a, 'orange')}</div>
    </div>` : ''}
${sections.b.length ? `    <div class="section">
      <div class="section-header"><span class="section-badge badge-b">B</span><span class="section-title">产品与技术</span></div>
      <div class="compact-list">${compact(sections.b, 'blue')}</div>
    </div>` : ''}
${sections.c.length ? `    <div class="section">
      <div class="section-header"><span class="section-badge badge-c">C</span><span class="section-title">值得一看</span></div>
      <div class="compact-list">${compact(sections.c, '')}</div>
    </div>` : ''}
  </div>
  <div class="footer">
    <div class="footer-left">🍅 赛博番茄 · 每日AI早报<br>关注我，每天3分钟掌握AI前沿</div>
    <div><div class="footer-right">数据：AIbase · 36氪 · 通往AGI<br>${esc(dateStr)}</div>
      <div class="qr-placeholder">公众号二维码</div></div>
  </div>
</div></body></html>`;

const outPath = path.join(REPORT_DIR, `${date}-卡片.html`);
fs.writeFileSync(outPath, html, 'utf-8');
console.log(`✅ ${outPath}`);

// --screenshot 参数自动截图
if (process.argv.includes('--screenshot')) {
  const screenshotPath = outPath.replace(/\.html$/, '.png');
  const screenshotScript = path.join(__dirname, 'screenshot.cjs');
  console.log('📸 自动截图...');
  try {
    execSync(`node "${screenshotScript}" "${outPath}" "${screenshotPath}" 1080 1440`, { timeout: 30000, stdio: 'inherit' });
  } catch (e) {
    console.error('截图失败，请手动运行：');
    console.error(`  node scripts/screenshot.cjs "${outPath}"`);
  }
}
