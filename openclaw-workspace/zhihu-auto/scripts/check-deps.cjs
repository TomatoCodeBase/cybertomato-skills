#!/usr/bin/env node

/**
 * 检查 Zhihu Auto 依赖项
 * 与 web-access skill 保持一致的检查逻辑
 */

const http = require('http');
const https = require('https');

// 检查 Node.js 版本
const NODE_VERSION = process.version;
const NODE_VERSION_MIN = '20.0.0';
if (NODE_VERSION < NODE_VERSION_MIN) {
  console.error(`❌ Node.js 版本过低: ${NODE_VERSION} (需要 >= ${NODE_VERSION_MIN})`);
  process.exit(1);
}

// 检查 CDP Proxy 状态
function checkCDPProxy() {
  return new Promise((resolve) => {
    const req = http.request('http://localhost:3456/targets', { timeout: 3000 }, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    req.on('error', () => resolve(false));
    req.end();
  });
}

// 检查 Chrome 远程调试端口
function checkChrome() {
  return new Promise((resolve) => {
    const req = http.request('http://localhost:9222/json', { timeout: 3000 }, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function main() {
  console.log('🔍 检查 Zhihu Auto 依赖项...');
  
  let allOk = true;
  
  // Node.js 检查
  console.log(`✅ Node.js: ${NODE_VERSION}`);
  
  // Chrome CDP 检查
  const chromeOk = await checkChrome();
  if (chromeOk) {
    console.log('✅ Chrome CDP: 已启用远程调试');
  } else {
    console.log('❌ Chrome CDP: 未启用');
    console.log('   解决方案:');
    console.log('   1. 打开 Chrome');
    console.log('   2. 地址栏输入: chrome://inspect/#remote-debugging');
    console.log('   3. 勾选 "Allow remote debugging for this browser instance"');
    console.log('   4. 可能需要重启 Chrome');
    allOk = false;
  }
  
  // CDP Proxy 检查
  const proxyOk = await checkCDPProxy();
  if (proxyOk) {
    console.log('✅ CDP Proxy: 已启动');
  } else {
    console.log('❌ CDP Proxy: 未启动');
    console.log('   解决方案: 运行 node "D:\\OpenClaw\\workspace\\skills\\web-access-original\\scripts\\start-proxy.mjs" 启动代理');
    allOk = false;
  }
  
  if (allOk) {
    console.log('🎉 所有依赖检查通过，可以运行 zhihu-auto');
    process.exit(0);
  } else {
    console.log('⚠️ 部分依赖未就绪，请按提示解决后再试');
    process.exit(1);
  }
}

main().catch(console.error);