#!/usr/bin/env node
/**
 * 内容工厂 - 定时批量模式
 * cron 调用入口
 * 模式: batch | auto
 * 
 * batch: 从灵感库自动选题+成文+推草稿（需用户确认选题评分≥70）
 * auto: 采集热榜+自动决策+成文+质量门控+推草稿（≥80分全自动）
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const MODE = process.argv[2] || 'batch';
const SKILLS_DIR = path.join(__dirname);
const WORKSPACE = path.join(__dirname, '..', '..');

function log(msg) {
  const ts = new Date().toISOString().substring(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 60000, cwd: WORKSPACE });
  } catch (e) {
    log(`❌ 命令失败: ${cmd}`);
    log(`   ${e.message.substring(0, 200)}`);
    return null;
  }
}

async function main() {
  log(`🏭 内容工厂启动 [模式: ${MODE}]`);
  
  // Step 1: 扫描素材
  log('📋 Step 1: 扫描素材库...');
  const pickerOutput = run(`node "${SKILLS_DIR}/auto-topic-picker.cjs" --top 5`);
  if (!pickerOutput) { log('❌ 素材扫描失败，退出'); process.exit(1); }
  
  const materials = JSON.parse(pickerOutput);
  const topPicks = materials.topPicks.filter(p => p.score >= (MODE === 'auto' ? 80 : 70));
  
  if (topPicks.length === 0) {
    log('📭 无符合条件的选题，本次跳过');
    log('等待下一轮...');
    return;
  }
  
  log(`📊 发现 ${topPicks.length} 个高价值选题`);
  topPicks.forEach((p, i) => log(`  ${i+1}. [${p.score}分] ${p.title}`));
  
  // Step 2: 学习偏好（如果偏好文件存在或过期）
  const prefsFile = path.join(WORKSPACE, 'memory', 'content-factory-preferences.json');
  const prefsNeedUpdate = !fs.existsSync(prefsFile) || 
    (Date.now() - fs.statSync(prefsFile).mtime > 24 * 60 * 60 * 1000);
  
  if (prefsNeedUpdate) {
    log('🧠 更新偏好模型...');
    run(`node "${SKILLS_DIR}/preference-learner.cjs"`);
  }
  
  // Step 3: 输出选题给AI处理
  // 注意：实际成文需要AI介入（skill调用），这里输出JSON供主skill消费
  log('');
  log('=== 选题结果 ===');
  console.log(JSON.stringify({
    mode: MODE,
    timestamp: new Date().toISOString(),
    materialsScanned: materials.totalMaterials,
    selectedTopics: topPicks,
  }, null, 2));
  
  log('');
  log('💡 这些选题已准备就绪，请通过飞书通知用户');
}

main().catch(e => {
  log(`❌ 严重错误: ${e.message}`);
  process.exit(1);
});
