#!/usr/bin/env node

/**
 * Zhihu Auto 错误处理与重试工具
 */

const http = require('http');

// CDP API 调用包装器
async function cdpRequest(method, endpoint, data = null) {
  const options = {
    hostname: 'localhost',
    port: 3456,
    path: endpoint,
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode === 200) {
            resolve(result);
          } else {
            reject(new Error(`CDP API error: ${res.statusCode} - ${result.error || body}`));
          }
        } catch (e) {
          reject(new Error(`Response parse error: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 带重试的 CDP eval
async function cdpEvalWithRetry(targetId, js, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await cdpRequest('POST', `/eval?target=${targetId}`, js);
      return result.value;
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒重试
      }
    }
  }
  
  throw new Error(`CDP eval 失败 (${maxRetries}次重试): ${lastError.message}`);
}

// 选择器查找（带多级备用）
async function findElement(targetId, selectors) {
  if (typeof selectors === 'string') {
    selectors = [selectors];
  }

  for (const selector of selectors) {
    try {
      const result = await cdpEvalWithRetry(targetId, 
        `document.querySelector('${selector.replace(/'/g, "\\'")}')`
      );
      if (result) {
        return { element: result, selector };
      }
    } catch (e) {
      // 继续尝试下一个选择器
    }
  }
  
  throw new Error(`未找到元素，尝试选择器: ${selectors.join(', ')}`);
}

// 按钮点击（带多种点击方式）
async function clickButton(targetId, selectors, options = {}) {
  const { method = 'click', maxRetries = 2 } = options;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { element, selector } = await findElement(targetId, selectors);
      
      if (method === 'clickAt') {
        // 真实鼠标点击
        await cdpRequest('POST', `/clickAt?target=${targetId}`, 
          JSON.stringify({ selector, x: 10, y: 10 })
        );
      } else {
        // 普通点击
        await cdpRequest('POST', `/click?target=${targetId}`, selector);
      }
      
      return { success: true, selector, method };
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw new Error(`点击失败 (${maxRetries}次尝试): ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// 错误分类
class ZhihuAutoError extends Error {
  constructor(message, type = 'GENERAL', details = {}) {
    super(message);
    this.name = 'ZhihuAutoError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// 错误类型映射
const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT', 
  ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
  CDP_ERROR: 'CDP_ERROR',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  RATE_LIMIT: 'RATE_LIMIT',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

// 状态保存
class StateManager {
  constructor(skillPath) {
    this.stateFile = `${skillPath}/state.json`;
    this.state = {};
  }

  async load() {
    try {
      const fs = require('fs').promises;
      const data = await fs.readFile(this.stateFile, 'utf8');
      this.state = JSON.parse(data);
    } catch (e) {
      this.state = {};
    }
  }

  async save() {
    try {
      const fs = require('fs').promises;
      await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (e) {
      console.warn('状态保存失败:', e.message);
    }
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    this.state[key] = value;
  }
}

module.exports = {
  cdpRequest,
  cdpEvalWithRetry,
  findElement,
  clickButton,
  ZhihuAutoError,
  ERROR_TYPES,
  StateManager
};