#!/usr/bin/env node
/**
 * 内容工厂偏好学习器
 * 从历史文章中提取写作偏好特征
 * 输出: memory/content-factory-preferences.json
 */
const fs = require('fs');
const path = require('path');

const OBSIDIAN_VAULT = process.env.OBSIDIAN_VAULT || 'D:\\cybertomato';
const ARCHIVE_PATH = path.join(OBSIDIAN_VAULT, '04-发布归档', '公众号已发布');
const PREFS_FILE = path.join(__dirname, '..', '..', 'memory', 'content-factory-preferences.json');

// 话题关键词映射
const TOPIC_KEYWORDS = {
  'AI工具': ['AI', 'OpenClaw', 'Claude', 'GPT', 'agent', '智能体', 'AI工具'],
  '副业实操': ['副业', '赚钱', '收入', '变现', '项目', '100万'],
  '技术教程': ['教程', '指南', '安装', '配置', '部署', '脚本'],
  '公众号运营': ['公众号', '排版', '写作', '涨粉', '阅读量', '爆款'],
  '效率提升': ['效率', '自动化', '流水线', '省时', '批量'],
  '思维认知': ['认知', '思维', '底层', '逻辑', '方法论'],
};

// 标题模式提取
const TITLE_PATTERNS = [
  { pattern: /^我用.+\d+/, name: '我用...+数据' },
  { pattern: /\d+个.*错误/, name: 'X个错误' },
  { pattern: /AI时代/, name: 'AI时代+X' },
  { pattern: /为什么.+\?/, name: '为什么疑问' },
  { pattern: /如何.+\?/, name: '如何疑问' },
  { pattern: /^\d+分钟/, name: 'X分钟+承诺' },
];

function extractPreferences(articles) {
  const topicCounts = {};
  const titlePatterns = {};
  const wordCounts = [];
  const structures = [];
  
  Object.entries(TOPIC_KEYWORDS).forEach(t => topicCounts[t] = 0);
  TITLE_PATTERNS.forEach(t => titlePatterns[t.name] = 0);

  articles.forEach(article => {
    const text = article.title + ' ' + article.content;
    
    // 话题分布
    Object.entries(TOPIC_KEYWORDS).forEach(([topic, keywords]) => {
      if (keywords.some(k => text.toLowerCase().includes(k.toLowerCase()))) {
        topicCounts[topic]++;
      }
    });
    
    // 标题模式
    TITLE_PATTERNS.forEach(({ pattern, name }) => {
      if (pattern.test(article.title)) titlePatterns[name]++;
    });
    
    // 字数
    wordCounts.push(article.wordCount);
    
    // 结构（简单检测）
    if (text.includes('痛点') || text.includes('问题')) structures.push('痛点→方法');
    else if (text.includes('步骤') || text.includes('Step')) structures.push('步骤教程');
    else structures.push('其他');
  });

  // 排序取Top 3话题
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);
  
  // 排序取Top 2标题模式
  const topTitlePatterns = Object.entries(titlePatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([p]) => p);
  
  // 字数范围
  const avgWordCount = wordCounts.length > 0 
    ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length) 
    : 2000;
  const minWordCount = wordCounts.length > 0 ? Math.min(...wordCounts) : 1500;
  const maxWordCount = wordCounts.length > 0 ? Math.max(...wordCounts) : 3000;

  return {
    topicPreference: topTopics,
    titlePattern: topTitlePatterns,
    wordCountRange: [minWordCount, maxWordCount],
    avgWordCount,
    structurePreference: structures.length > 0 
      ? structures.sort((a, b) => 
          structures.filter(s => s === b).length - structures.filter(s => s === a).length
        )[0]
      : '痛点→方法',
    articleCount: articles.length,
    lastUpdated: new Date().toISOString(),
  };
}

// 主函数
function main() {
  // 读取已发布文章
  if (!fs.existsSync(ARCHIVE_PATH)) {
    console.log(JSON.stringify({ error: '归档目录不存在: ' + ARCHIVE_PATH }));
    process.exit(1);
  }

  const files = fs.readdirSync(ARCHIVE_PATH).filter(f => f.endsWith('.md'));
  
  if (files.length === 0) {
    // 无历史数据，输出默认偏好
    const defaultPrefs = {
      topicPreference: ['AI工具', '副业实操', '技术教程'],
      titlePattern: ['我用...+数据', 'X个错误'],
      wordCountRange: [1500, 2500],
      avgWordCount: 2000,
      structurePreference: '痛点→方法',
      articleCount: 0,
      lastUpdated: new Date().toISOString(),
    };
    
    fs.writeFileSync(PREFS_FILE, JSON.stringify(defaultPrefs, null, 2), 'utf-8');
    console.log(JSON.stringify(defaultPrefs));
    return;
  }

  // 解析文章（简单提取，不读全部内容以节省token）
  const articles = files.map(f => {
    const filePath = path.join(ARCHIVE_PATH, f);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 提取YAML标题
    const titleMatch = content.match(/^---\s*\n.*?标题:\s*(.+?)\s*\n/m);
    const title = titleMatch ? titleMatch[1] : f.replace(/\.md$/, '');
    
    // 字数（粗略统计中文字符）
    const bodyContent = content.replace(/^---[\s\S]*?---\s*/, '');
    const chineseChars = (bodyContent.match(/[\u4e00-\u9fff]/g) || []).length;
    
    return { title, content: bodyContent, wordCount: chineseChars };
  });

  const preferences = extractPreferences(articles);
  
  // 确保目录存在
  const dir = path.dirname(PREFS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  fs.writeFileSync(PREFS_FILE, JSON.stringify(preferences, null, 2), 'utf-8');
  console.log(JSON.stringify(preferences, null, 2));
}

main();
