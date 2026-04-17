#!/usr/bin/env node
/**
 * 内容工厂质量门控
 * 检查文章质量，决定是否通过
 * 用法: node quality-gate.cjs <markdown-file>
 * 输出: { passed: boolean, score: number, issues: string[] }
 */
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.log(JSON.stringify({ error: '用法: node quality-gate.cjs <markdown-file>' }));
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');

// 读取偏好（如果存在）
const prefsPath = path.join(__dirname, '..', '..', 'memory', 'content-factory-preferences.json');
let prefs = null;
try { prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8')); } catch(e) {}

const issues = [];
let score = 100;

// === 检查1: 禁止词 ===
const FORBIDDEN_WORDS = [
  '总而言之', '不可否认', '综上所述', '不难发现', '众所周知',
  '值得注意的是', '不言而喻', '在当今社会', '随着.*的发展',
];

FORBIDDEN_WORDS.forEach(word => {
  const regex = new RegExp(word, 'g');
  const matches = content.match(regex);
  if (matches) {
    score -= matches.length * 5;
    issues.push(`❌ 禁止词 "${word}" 出现 ${matches.length} 次`);
  }
});

// === 检查2: AI味句式 ===
const AI_PATTERNS = [
  { pattern: /首先.*?其次.*?最后/g, name: '首先...其次...最后' },
  { pattern: /(然而[^。]{0,20}。){3,}/g, name: '连续使用"然而"' },
  { pattern: /(此外[^。]{0,20}。){3,}/g, name: '连续使用"此外"' },
];

AI_PATTERNS.forEach(({ pattern, name }) => {
  if (pattern.test(content)) {
    score -= 5;
    issues.push(`⚠️ AI味句式: "${name}"`);
  }
});

// === 检查3: AI特征词频率 ===
const AI_WORDS_LIMITS = {
  '赋能': 1, '生态': 2, '矩阵': 1, '闭环': 1, '底层逻辑': 1,
  '赛道': 1, '抓手': 1, '颗粒度': 1, '链路': 1, '沉淀': 1,
};

Object.entries(AI_WORDS_LIMITS).forEach(([word, limit]) => {
  const count = (content.match(new RegExp(word, 'g')) || []).length;
  if (count > limit) {
    score -= 3;
    issues.push(`⚠️ "${word}" 出现 ${count} 次（限制 ${limit} 次）`);
  }
});

// === 检查4: 字数 ===
const bodyContent = content.replace(/^---[\s\S]*?---\s*/, '');
const chineseChars = (bodyContent.match(/[\u4e00-\u9fff]/g) || []).length;

if (chineseChars < 1200) {
  score -= 10;
  issues.push(`❌ 字数不足: ${chineseChars}字（最低1200字）`);
} else if (chineseChars > 4000) {
  score -= 5;
  issues.push(`⚠️ 字数过多: ${chineseChars}字（建议≤4000字）`);
}

// === 检查5: 开头入题 ===
const firstParagraph = bodyContent.replace(/\n/g, ' ').substring(0, 200);
if (firstParagraph.length > 150) {
  score -= 3;
  issues.push('⚠️ 开头铺垫过长（建议3句话入题）');
}

// === 检查6: 生活化比喻 ===
const metaphorKeywords = ['说白了', '打个比方', '就像', '好比', '相当于', '像...一样', '比如', '举个'];
const metaphorCount = metaphorKeywords.reduce((count, word) => {
  return count + (content.match(new RegExp(word, 'g')) || []).length;
}, 0);
if (metaphorCount < 2) {
  score -= 5;
  issues.push(`⚠️ 生活化比喻不足（当前${metaphorCount}处，建议≥2处）`);
}

// === 检查7: 结尾行动建议 ===
const last500 = bodyContent.slice(-500);
const actionKeywords = ['试试', '开始', '建议', '下一步', '马上', '现在就', '动手'];
const hasActionAdvice = actionKeywords.some(k => last500.includes(k));
if (!hasActionAdvice) {
  score -= 5;
  issues.push('⚠️ 结尾缺少行动建议');
}

// === 检查8: 标题吸引力 ===
let titleScore = 0;
const titleMatch = content.match(/^---\s*\n.*?标题:\s*(.+?)\s*\n/m);
const title = titleMatch ? titleMatch[1] : '';
if (!title) {
  score -= 10;
  issues.push('❌ 缺少标题（YAML标题字段）');
} else {
  if (/\d/.test(title)) titleScore += 10;
  if (/[?？]/.test(title)) titleScore += 10;
  if (title.includes('我')) titleScore += 5;
  if (/\d+%|\d+倍|\d+小时|\d+万/.test(title)) titleScore += 15;
  if (title.length >= 10 && title.length <= 25) titleScore += 10;
  if (/对比|vs|VS|为什么|凭什么/.test(title)) titleScore += 10;
  
  if (titleScore < 70) {
    score -= 5;
    issues.push(`⚠️ 标题吸引力不足: ${titleScore}/100 - "${title}"`);
  }
}

// === 检查9: 偏好匹配（加分） ===
if (prefs && prefs.topicPreference) {
  prefs.topicPreference.forEach(topic => {
    const keywords = {
      'AI工具': ['AI', 'OpenClaw', 'Claude', 'GPT'],
      '副业实操': ['副业', '赚钱', '变现'],
      '技术教程': ['教程', '指南', '安装'],
      '公众号运营': ['公众号', '排版', '写作'],
      '效率提升': ['效率', '自动化', '流水线'],
    };
    (keywords[topic] || []).forEach(k => {
      if (content.includes(k)) score += 2;
    });
  });
}

score = Math.max(0, Math.min(100, score));
const passed = score >= 60;

const result = {
  passed,
  score,
  wordCount: chineseChars,
  titleScore,
  issues,
  summary: passed 
    ? `✅ 通过质量门控 (${score}/100)`
    : `❌ 未通过质量门控 (${score}/100)，${issues.length}个问题`,
};

console.log(JSON.stringify(result, null, 2));
