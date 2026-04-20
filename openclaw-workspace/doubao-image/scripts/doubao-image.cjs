#!/usr/bin/env node
/**
 * 豆包图片生成脚本
 * 使用火山引擎豆包SeeDream模型生成图片
 */

const https = require('https');

const API_KEY = '22bd3215-baa4-4ab2-872b-a7e2e79d5603';
const API_HOST = 'ark.cn-beijing.volces.com';
const API_PATH = '/api/v3/images/generations';

/**
 * 生成图片
 * @param {string} prompt - 图片描述
 * @param {object} options - 可选参数
 * @returns {Promise<{url: string, data?: string}>}
 */
async function generateImage(prompt, options = {}) {
  const body = JSON.stringify({
    model: options.model || 'doubao-seedream-4-5-251128',
    prompt: prompt,
    sequential_image_generation: options.sequential_image_generation || 'disabled',
    response_format: options.response_format || 'url',
    size: options.size || '2K',
    stream: options.stream !== undefined ? options.stream : false,
    watermark: options.watermark !== undefined ? options.watermark : true
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: API_HOST,
      port: 443,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(`API错误 (${res.statusCode}): ${result.error?.message || data}`));
            return;
          }
          resolve({
            url: result.data?.[0]?.url || result.url,
            data: result.data
          });
        } catch (e) {
          reject(new Error(`解析响应失败: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * 查询配额使用情况
 * @returns {Promise<object>}
 */
async function getUsage() {
  return new Promise((resolve, reject) => {
    // 火山引擎暂无公开的配额查询API
    // 需要在控制台查看：https://console.volcengine.com/ark
    reject(new Error('火山引擎暂不支持API查询配额，请在控制台查看：https://console.volcengine.com/ark'));
  });
}

// CLI入口
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
豆包图片生成器

用法:
  node doubao-image.cjs <prompt> [options]
  node doubao-image.cjs -f <file> [options]

参数:
  prompt       图片描述文本
  -f <file>    从文件读取prompt（支持长文本）

选项:
  --size <size>          图片尺寸: 1024x1024, 2K, 4K (默认: 2K)
  --no-watermark         不添加水印
  --json                 输出完整JSON响应

配额查询:
  请在控制台查看: https://console.volcengine.com/ark

示例:
  node doubao-image.cjs "一只可爱的猫咪"
  node doubao-image.cjs -f prompt.txt --size 4K
  node doubao-image.cjs "星空" --no-watermark --json
`);
    process.exit(0);
  }

  let prompt = '';
  let size = '2K';
  let watermark = true;
  let outputJson = false;
  let i = 0;

  // 解析参数
  if (args[i] === '-f') {
    const fs = require('fs');
    const file = args[++i];
    if (!file) {
      console.error('错误: -f 需要指定文件路径');
      process.exit(1);
    }
    try {
      prompt = fs.readFileSync(file, 'utf-8').trim();
    } catch (e) {
      console.error(`错误: 无法读取文件 ${file}`);
      process.exit(1);
    }
    i++;
  } else {
    // 收集所有非选项参数作为prompt
    while (i < args.length && !args[i].startsWith('--')) {
      prompt += (prompt ? ' ' : '') + args[i];
      i++;
    }
  }

  // 解析选项
  while (i < args.length) {
    if (args[i] === '--size') {
      size = args[++i];
      i++;
    } else if (args[i] === '--no-watermark') {
      watermark = false;
      i++;
    } else if (args[i] === '--json') {
      outputJson = true;
      i++;
    } else {
      i++;
    }
  }

  if (!prompt) {
    console.error('错误: 请提供图片描述');
    process.exit(1);
  }

  generateImage(prompt, { size, watermark })
    .then(result => {
      if (outputJson) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('✅ 图片生成成功');
        console.log('图片URL:', result.url);
      }
    })
    .catch(err => {
      console.error('❌ 生成失败:', err.message);
      process.exit(1);
    });
}

module.exports = { generateImage, getUsage };
