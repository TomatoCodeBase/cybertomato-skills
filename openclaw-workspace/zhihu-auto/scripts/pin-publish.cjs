#!/usr/bin/env node

/**
 * 发布知乎想法
 * 基于改进的版本，包含错误处理和验证
 */

const fs = require('fs').promises;
const path = require('path');
const { 
  cdpRequest, 
  cdpEvalWithRetry, 
  clickButton, 
  ZhihuAutoError,
  ERROR_TYPES 
} = require('./utils/error-handler.cjs');

const TARGET_URL = 'https://www.zhihu.com/?writepin';

async function main() {
  console.log('📝 开始发布知乎想法...');
  
  try {
    // 步骤1: 打开编辑器页面
    console.log('步骤1: 打开想法编辑器...');
    const targetResponse = await cdpRequest('GET', `/new?url=${encodeURIComponent(TARGET_URL)}`);
    const targetId = targetResponse.targetId;
    console.log(`✅ 新建标签页: ${targetId}`);

    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 步骤2: 检查是否弹出编辑器
    console.log('步骤2: 检查编辑器弹窗...');
    const hasEditor = await cdpEvalWithRetry(targetId, `
      const editor = document.querySelector('.public-DraftEditor-content');
      const modal = document.querySelector('[role="dialog"]') || document.querySelector('.modal');
      return editor && modal;
    `);

    if (!hasEditor) {
      // 可能被搜索框遮挡，先关闭搜索框
      console.log('⚠️ 编辑器未找到，尝试关闭搜索框...');
      await cdpRequest('POST', `/eval?target=${targetId}`, `
        const searchBtn = document.querySelector('.Header-search') || 
                         document.querySelector('[data-za-extra-module="Search"]');
        if (searchBtn) searchBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      `);
      
      // 再检查
      const hasEditorAfterClose = await cdpEvalWithRetry(targetId, `
        const editor = document.querySelector('.public-DraftEditor-content');
        const modal = document.querySelector('[role="dialog"]') || document.querySelector('.modal');
        return editor && modal;
      `);
      
      if (!hasEditorAfterClose) {
        throw new ZhihuAutoError('编辑器未打开，可能是网络问题或页面异常', ERROR_TYPES.ELEMENT_NOT_FOUND);
      }
    }

    console.log('✅ 编辑器已打开');

    // 步骤3: 填入内容（从命令行参数或文件）
    let content = process.argv[2];
    if (!content) {
      // 尝试从文件读取
      const filePath = process.argv[3];
      if (filePath) {
        content = await fs.readFile(filePath, 'utf8');
      }
    }

    if (!content) {
      throw new ZhihuAutoError('未提供内容参数，使用: node pin-publish.cjs "你的内容" 或 node pin-publish.cjs <内容文件>');
    }

    console.log('步骤3: 填入内容...');
    await cdpRequest('POST', `/eval?target=${targetId}`, `
      const editor = document.querySelector('.public-DraftEditor-content');
      if (!editor) throw new Error('未找到编辑器');
      
      editor.focus();
      
      // 使用 ClipboardEvent 确保内容被正确写入
      const dt = new DataTransfer();
      dt.setData('text/plain', '${content.replace(/'/g, "\\'")}');
      dt.setData('text/html', '${content.replace(/'/g, "\\'").split('\n').map(l => \`<p>\${l || '<br>'}</p>\`).join('')}');
      const pe = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt });
      editor.dispatchEvent(pe);
      
      // 验证内容是否写入
      const hasContent = editor.innerText.length > 0;
      console.log('内容验证:', hasContent ? '✅ 成功' : '❌ 失败');
      
      return hasContent;
    `);

    // 步骤4: 发布
    console.log('步骤4: 发布想法...');
    const publishResult = await clickButton(targetId, [
      'button:contains("发布")',
      'button:contains("发送")',
      'button[data-za-extra-module="PinEditor"]'
    ], { method: 'click', maxRetries: 2 });

    if (!publishResult.success) {
      throw new ZhihuAutoError('发布按钮点击失败', ERROR_TYPES.ELEMENT_NOT_FOUND);
    }

    // 等待发布完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 步骤5: 验证发布成功
    console.log('步骤5: 验证发布...');
    const verification = await cdpEvalWithRetry(targetId, `
      // 检查页面是否有成功提示
      const successMsg = document.querySelector('.success-message') || 
                        document.querySelector('.publish-success') ||
                        document.querySelector('[data-za-extra-module="Message"]');
      
      // 检查是否还在编辑状态
      const stillEditing = document.querySelector('.public-DraftEditor-content')?.innerText;
      
      return {
        success: !!successMsg || !stillEditing,
        successMsg: successMsg?.textContent || '',
        stillEditing: !!stillEditing
      };
    `);

    if (verification.success) {
      console.log('✅ 发布成功！');
      
      // 导航到内容管理页验证
      console.log('步骤6: 跳转到内容管理页...');
      await cdpRequest('GET', `/navigate?target=${targetId}&url=https://www.zhihu.com/creator/manage/creation/pin`);
      
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 检查最新内容
      const finalVerification = await cdpEvalWithRetry(targetId, `
        const pins = Array.from(document.querySelectorAll('.PinItem, [data-za-extra-module="Pin"]'));
        const latestPin = pins[0];
        
        if (!latestPin) return { found: false };
        
        const title = latestPin.querySelector('h3, .title')?.textContent || '';
        const content = latestPin.querySelector('p, .content')?.textContent || '';
        const time = latestPin.querySelector('time, .time')?.textContent || '';
        
        return {
          found: true,
          title: title.substring(0, 30) + (title.length > 30 ? '...' : ''),
          content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          time: time
        };
      `);

      if (finalVerification.found) {
        console.log(`✅ 在内容管理页验证成功: ${finalVerification.title} ${finalVerification.time}`);
      } else {
        console.log('⚠️ 内容管理页未找到最新内容，但发布流程已完成');
      }
      
    } else {
      throw new ZhihuAutoError(`发布失败: ${verification.successMsg}`, ERROR_TYPES.VALIDATION_ERROR);
    }

    // 关闭标签页
    await cdpRequest('GET', `/close?target=${targetId}`);
    console.log('🎉 任务完成！');
    
  } catch (error) {
    console.error('❌ 任务失败:', error.message);
    console.error('错误类型:', error.type);
    if (error.details) {
      console.error('详细信息:', error.details);
    }
    process.exit(1);
  }
}

main().catch(console.error);