/**
 * 内容裂变引擎 - 从源文章生成各平台裂变产物
 * 
 * 输入：源文章 Markdown 内容
 * 输出：裂变产物 JSON（微头条/知乎/小红书/星球/金句）
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// 裂变规则引擎
// ============================================================

/**
 * 从源文章提取元数据
 */
function extractMetadata(content, title) {
  const lines = content.split('\n').filter(l => l.trim());
  
  // 提取金句：包含数据、观点、对比的句子
  const goldenQuotes = [];
  const quotePatterns = [
    /\d+%/,           // 包含百分比
    /\d+倍/,           // 包含倍数
    /\d{4,}/,          // 包含大数字
    /关键是|核心是|本质是|说白了|实际上/,  // 观点句
    /不是.*而是/,      // 转折句
    /相比之下|反过来/,  // 对比句
  ];
  
  for (const line of lines) {
    const text = line.replace(/^#+\s*/, '').replace(/[*_`#]/g, '').trim();
    if (text.length < 15 || text.length > 80) continue;
    if (quotePatterns.some(p => p.test(text))) {
      goldenQuotes.push(text);
    }
  }
  
  // 提取分论点（H2/H3标题）
  const subPoints = [];
  for (const line of lines) {
    if (/^#{2,3}\s/.test(line)) {
      subPoints.push(line.replace(/^#+\s*/, '').trim());
    }
  }
  
  // 统计
  const wordCount = content.replace(/[#*_`\[\]()>|~-]/g, '').length;
  
  return {
    title,
    wordCount,
    subPoints: subPoints.slice(0, 5),
    goldenQuotes: goldenQuotes.slice(0, 8),
    corePoint: subPoints[0] || title,
  };
}

/**
 * 裂变策略1：微头条（3条）
 * 规则：每条50-150字，口语化，带话题，有钩子引回公众号
 */
function fissionWeitoutiao(meta) {
  const results = [];
  const { title, subPoints, goldenQuotes, corePoint } = meta;
  
  // 第1条：核心观点 + 金句
  if (goldenQuotes.length > 0) {
    results.push({
      type: 'weitoutiao',
      label: '观点型微头条',
      content: goldenQuotes[0] + '\n\n' + 
        '完整分析见我公众号「赛博番茄」，搜索「' + title + '」阅读全文。',
      topics: ['AI实用派', '赛博番茄'],
      wordCount: 0,
    });
    results[0].wordCount = results[0].content.length;
  }
  
  // 第2条：分论点展开
  if (subPoints.length > 1) {
    const point = subPoints[Math.min(1, subPoints.length - 1)];
    results.push({
      type: 'weitoutiao',
      label: '分论点微头条',
      content: point + '\n\n' + 
        (goldenQuotes.length > 1 ? goldenQuotes[1] + '\n\n' : '') +
        '更多深度内容→公众号「赛博番茄」',
      topics: ['AI实用派'],
      wordCount: 0,
    });
    results[results.length - 1].wordCount = results[results.length - 1].content.length;
  }
  
  // 第3条：提问互动型
  results.push({
    type: 'weitoutiao',
    label: '互动型微头条',
    content: '今天聊个话题：' + corePoint + '。\n\n' + 
      '你觉得呢？评论区聊聊。\n\n' +
      '我写了一篇完整分析，公众号「赛博番茄」搜「' + title + '」。',
    topics: ['AI实用派'],
    wordCount: 0,
  });
  results[results.length - 1].wordCount = results[results.length - 1].content.length;
  
  return results.filter(r => r.wordCount >= 30);
}

/**
 * 裂变策略2：知乎回答（1-2条）
 * 规则：200-500字，专业调性，引用数据，带公众号签名
 */
function fissionZhihu(meta) {
  const results = [];
  const { title, subPoints, goldenQuotes } = meta;
  
  // 找到一个适合回答的话题
  const questionAngle = subPoints.length > 0 
    ? subPoints[0] 
    : title;
  
  // 构建知乎回答
  let content = '**' + title + '**\n\n';
  content += '直接给结论：' + (meta.corePoint || '这是一个值得深入分析的问题') + '。\n\n';
  
  // 加入1-2个分论点
  for (let i = 0; i < Math.min(2, subPoints.length); i++) {
    content += '### ' + subPoints[i] + '\n\n';
    if (goldenQuotes[i]) {
      content += goldenQuotes[i] + '\n\n';
    }
  }
  
  content += '---\n\n';
  content += '*更多深度分析，欢迎关注公众号「赛博番茄」，专注AI+副业+投资实战。*';
  
  results.push({
    type: 'zhihu',
    label: '知乎回答',
    question: questionAngle.endsWith('？') ? questionAngle : questionAngle + '？你怎么看？',
    content,
    wordCount: content.replace(/[#*_`]/g, '').length,
  });
  
  return results;
}

/**
 * 裂变策略3：小红书图文（1条）
 * 规则：标题吸睛，正文150-300字，emoji丰富，标签齐全
 */
function fissionXiaohongshu(meta) {
  const { title, subPoints, goldenQuotes } = meta;
  
  // 小红书标题：加emoji，控制在20字内
  let xhsTitle = title;
  if (xhsTitle.length > 18) {
    xhsTitle = xhsTitle.substring(0, 18) + '...';
  }
  xhsTitle = '💡' + xhsTitle;
  
  // 正文
  let content = '姐妹们/兄弟们！今天分享一个超实用的发现 👇\n\n';
  if (goldenQuotes.length > 0) {
    content += '🔥 ' + goldenQuotes[0] + '\n\n';
  }
  if (subPoints.length > 0) {
    content += '📌 关键点：\n';
    for (let i = 0; i < Math.min(3, subPoints.length); i++) {
      content += (i + 1) + '. ' + subPoints[i] + '\n';
    }
    content += '\n';
  }
  content += '💬 详细分析我放在公众号「赛博番茄」了，感兴趣可以去看看～\n\n';
  content += '#AI工具 #副业收入 #效率提升 #干货分享 #赛博番茄';
  
  return [{
    type: 'xiaohongshu',
    label: '小红书图文',
    title: xhsTitle,
    content,
    tags: ['AI工具', '副业收入', '效率提升', '干货分享'],
    wordCount: content.replace(/[#*_`💡🔥📌💬👇]/gu, '').length,
  }];
}

/**
 * 裂变策略4：知识星球精华帖（1条）
 * 规则：更深度，200-400字，带独家洞察感，引导讨论
 */
function fissionZsxq(meta) {
  const { title, subPoints, goldenQuotes } = meta;
  
  let content = '## ' + title + '\n\n';
  content += '**星球专属 | 深度拆解**\n\n';
  
  for (let i = 0; i < Math.min(3, subPoints.length); i++) {
    content += '**' + subPoints[i] + '**\n\n';
    if (goldenQuotes[i]) {
      content += '> ' + goldenQuotes[i] + '\n\n';
    }
  }
  
  content += '---\n\n';
  content += '💡 **互动问题**：你在实际操作中遇到过类似问题吗？评论区聊聊你的经验。';
  
  return [{
    type: 'zsxq',
    label: '星球精华帖',
    content,
    wordCount: content.replace(/[#*_`>💡]/g, '').length,
  }];
}

/**
 * 裂变策略5：金句打卡（每日幸运签/春日打卡）
 * 规则：50字以内，一句话+一个感悟，带话题
 */
function fissionDailyCheckin(meta) {
  const { goldenQuotes } = meta;
  
  if (goldenQuotes.length === 0) {
    return [];
  }
  
  const quote = goldenQuotes[Math.floor(Math.random() * goldenQuotes.length)];
  
  let content = quote + '\n\n';
  content += '——今天的一点小感悟，共勉。';
  
  return [{
    type: 'daily_checkin',
    label: '每日打卡金句',
    content,
    topics: ['每日幸运签', '春日生活打卡季'],
    wordCount: content.length,
  }];
}

// ============================================================
// 主入口
// ============================================================

function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'all'; // all / weitoutiao / zhihu / xhs / zsxq / checkin
  
  // 读取源文章
  let sourceFile = args[1];
  let content, title;
  
  if (!sourceFile) {
    // 尝试从 stdin 读取
    console.error('Usage: node fission-engine.cjs <mode> <source-file>');
    console.error('Modes: all / weitoutiao / zhihu / xhs / zsxq / checkin');
    process.exit(1);
  }
  
  const filePath = path.resolve(sourceFile);
  if (!fs.existsSync(filePath)) {
    console.error('File not found: ' + filePath);
    process.exit(1);
  }
  
  content = fs.readFileSync(filePath, 'utf-8');
  
  // 从内容提取标题
  const titleMatch = content.match(/^#\s+(.+)$/m);
  title = titleMatch ? titleMatch[1].trim() : path.basename(filePath, '.md');
  
  // 提取元数据
  const meta = extractMetadata(content, title);
  
  console.log('=== 内容裂变引擎 ===');
  console.log('源文章: ' + title);
  console.log('字数: ' + meta.wordCount);
  console.log('分论点: ' + meta.subPoints.length);
  console.log('金句: ' + meta.goldenQuotes.length);
  console.log('');
  
  // 生成裂变产物
  const outputs = [];
  
  if (mode === 'all' || mode === 'weitoutiao') {
    outputs.push(...fissionWeitoutiao(meta));
  }
  if (mode === 'all' || mode === 'zhihu') {
    outputs.push(...fissionZhihu(meta));
  }
  if (mode === 'all' || mode === 'xhs') {
    outputs.push(...fissionXiaohongshu(meta));
  }
  if (mode === 'all' || mode === 'zsxq') {
    outputs.push(...fissionZsxq(meta));
  }
  if (mode === 'all' || mode === 'checkin') {
    outputs.push(...fissionDailyCheckin(meta));
  }
  
  // 输出结果
  console.log('=== 裂变产物 ===');
  console.log('总计: ' + outputs.length + ' 个产物');
  console.log('');
  
  for (const item of outputs) {
    console.log('--- ' + item.label + ' (' + item.type + ') ---');
    console.log('字数: ' + item.wordCount);
    if (item.topics) console.log('话题: ' + item.topics.join(', '));
    if (item.question) console.log('问题: ' + item.question);
    if (item.title) console.log('标题: ' + item.title);
    if (item.tags) console.log('标签: ' + item.tags.join(', '));
    console.log('');
    console.log(item.content);
    console.log('');
  }
  
  // 保存结果 JSON
  const resultPath = path.join(path.dirname(filePath), 'fission-output.json');
  const result = {
    source: title,
    sourceFile: filePath,
    createdAt: new Date().toISOString(),
    metadata: meta,
    outputs,
  };
  
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log('裂变结果已保存: ' + resultPath);
  
  return result;
}

main();
