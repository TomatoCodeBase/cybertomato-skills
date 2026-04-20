#!/usr/bin/env node
/**
 * 内容工厂自动选题
 * 从灵感库+选题库扫描素材，AI评分排序，输出Top N选题推荐
 * 用法: node auto-topic-picker.cjs [--top N]
 */
const fs = require('fs');
const path = require('path');

const OBSIDIAN_VAULT = process.env.OBSIDIAN_VAULT || 'D:\\cybertomato';
const TOP_N = parseInt(process.argv[2] === '--top' ? process.argv[3] : '3') || 3;

const INSPIRATION_DIR = path.join(OBSIDIAN_VAULT, '01-灵感素材库', '1-日常灵感剪报');
const TOPIC_DIR = path.join(OBSIDIAN_VAULT, '02-选题仓库', '待写选题库');
const FRAGMENT_DIR = path.join(OBSIDIAN_VAULT, '01-灵感素材库', '2-爆款素材片段');

function parseYAML(content) {
  const yaml = {};
  const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!yamlMatch) return yaml;
  
  yamlMatch[1].split('\n').forEach(line => {
    const match = line.match(/^(\S+?)[：:]\s*(.+)$/);
    if (match) yaml[match[1]] = match[2].trim().replace(/^\[|\]$/g, '');
  });
  return yaml;
}

function extractScore(yaml) {
  // 从YAML中提取评分（30分制→100分制）
  const scoreStr = yaml['评分'] || '';
  const scoreMatch = scoreStr.match(/(\d+)/);
  if (scoreMatch) {
    const raw = parseInt(scoreMatch[0]);
    // 如果是30分制，转换为100分制
    return raw <= 30 ? Math.round(raw * 100 / 30) : raw;
  }
  
  // 从优先级推断分数（100分制）
  const priority = yaml['优先级'] || '';
  if (priority.includes('🔥')) return 93;
  if (priority.includes('⭐')) return 80;
  if (priority.includes('✅')) return 67;
  if (priority.includes('⚠️')) return 50;
  return 33;
}

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return [];
  
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8');
      const yaml = parseYAML(content);
      return {
        file: f,
        title: yaml['标题'] || f.replace(/\.md$/, ''),
        score: extractScore(yaml),
        source: dir.includes('灵感') ? '灵感库' : '选题库',
        date: f.substring(0, 8),
        stage: yaml['阶段'] || '未知',
        category: yaml['分类'] || '未分类',
        priority: yaml['优先级'] || '未评',
      };
    });
}

function main() {
  const inspirations = scanDirectory(INSPIRATION_DIR);
  const topics = scanDirectory(TOPIC_DIR);
  
  // 合并并排序
  const all = [...inspirations, ...topics].sort((a, b) => b.score - a.score);
  
  const result = {
    totalMaterials: all.length,
    inspirations: inspirations.length,
    topics: topics.length,
    topPicks: all.slice(0, TOP_N),
    all: all,
  };
  
  console.log(JSON.stringify(result, null, 2));
}

main();
