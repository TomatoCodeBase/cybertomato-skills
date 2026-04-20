/**
 * zhihu-publish.cjs - 知乎想法发布脚本
 * 
 * 用法: node zhihu-publish.cjs "你的想法内容"
 * 
 * 前置: CDP Proxy 运行中 (localhost:3456)，Chrome 已登录知乎
 */
const http = require('http');

const CDP_HOST = 'localhost';
const CDP_PORT = 3456;

// 从命令行参数或环境变量获取 targetId
// 如果未指定，自动查找知乎 tab
let TARGET_ID = process.env.ZHIHU_TARGET;

function evalJS(js) {
  return new Promise((resolve, reject) => {
    const path = TARGET_ID 
      ? `/eval?target=${TARGET_ID}`
      : '/eval?target=';
    const req = http.request({
      hostname: CDP_HOST, port: CDP_PORT,
      path: path + (TARGET_ID ? '' : ''),
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve(d); }
      });
    });
    req.on('error', reject);
    req.end(js);
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: CDP_HOST, port: CDP_PORT,
      path, method: 'GET'
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve(d); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function findZhihuTarget() {
  const targets = await get('/targets');
  // 优先找 ?writepin 页面
  const writepin = targets.find(t => t.url?.includes('writepin'));
  if (writepin) return writepin.targetId;
  // 其次找知乎首页
  const zhihu = targets.find(t => t.url === 'https://www.zhihu.com' || t.url === 'https://www.zhihu.com/');
  if (zhihu) return zhihu.targetId;
  throw new Error('未找到知乎 tab，请先在 Chrome 中打开知乎');
}

async function openPinEditor(targetId) {
  await get(`/navigate?target=${targetId}&url=https://www.zhihu.com/?writepin`);
  // 等待弹窗加载
  await new Promise(r => setTimeout(r, 2000));
}

async function fillContent(text) {
  // 关闭可能出现的搜索弹窗
  await evalJS(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}))`);
  await new Promise(r => setTimeout(r, 500));

  // 检查编辑器是否存在
  const check = await evalJS(
    `(function(){var e=document.querySelector('.public-DraftEditor-content');return e?'found':'not found'})()`
  );
  if (check.value !== 'found') {
    throw new Error('想法编辑器未找到，弹窗可能未弹出');
  }

  // 用 ClipboardEvent paste 填入内容
  const htmlText = text.split('\n')
    .map(l => l ? `<p>${l}</p>` : '<p><br></p>')
    .join('');
  
  const result = await evalJS(`(function(){
    var editor = document.querySelector('.public-DraftEditor-content');
    editor.focus();
    var text = ${JSON.stringify(text)};
    var dt = new DataTransfer();
    dt.setData('text/plain', text);
    dt.setData('text/html', ${JSON.stringify(htmlText)});
    var pe = new ClipboardEvent('paste', {
      bubbles: true, cancelable: true, clipboardData: dt
    });
    editor.dispatchEvent(pe);
    var len = editor.innerText.length;
    return 'filled: ' + len + ' chars';
  })()`);

  if (!result.value?.includes('filled:')) {
    throw new Error('内容填入失败: ' + JSON.stringify(result));
  }
  console.log('✓ 内容填入成功:', result.value);
}

async function publish() {
  await new Promise(r => setTimeout(r, 500));
  const result = await evalJS(`(function(){
    var btns = [...document.querySelectorAll('button')];
    var pub = btns.find(b => /发布/.test(b.innerText) && !b.disabled);
    if (!pub) return 'error: 发布按钮未找到或已禁用';
    pub.click();
    return 'clicked';
  })()`);

  if (result.value === 'clicked') {
    console.log('✓ 已点击发布');
    await new Promise(r => setTimeout(r, 3000));
  } else {
    console.log('✗ 发布失败:', result.value);
  }
}

async function verify(targetId) {
  await get(`/navigate?target=${targetId}&url=https://www.zhihu.com/creator/manage/creation/pin`);
  await new Promise(r => setTimeout(r, 3000));
  console.log('✓ 请查看内容管理页确认发布结果');
}

async function main() {
  const text = process.argv[2];
  if (!text) {
    console.log('用法: node zhihu-publish.cjs "你的想法内容"');
    process.exit(1);
  }

  try {
    console.log('1. 查找知乎 tab...');
    TARGET_ID = await findZhihuTarget();
    console.log('✓ 找到:', TARGET_ID);

    console.log('2. 打开想法编辑器...');
    await openPinEditor(TARGET_ID);

    console.log('3. 填入内容...');
    await fillContent(text);

    console.log('4. 发布...');
    await publish();

    console.log('5. 验证...');
    await verify(TARGET_ID);

    console.log('\n✅ 完成！');
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

main();
