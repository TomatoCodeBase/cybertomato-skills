#!/usr/bin/env node
// ziliu-publish.cjs - 字流发布工具
const API_KEY = 'ziliu_sk_988d4115bd6d68c44b6f1cbb55c7b0f08656a025d1c1d887';
const BASE = 'https://ziliu.online/api';

async function request(path, method = 'POST', body = null, isForm = false) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${API_KEY}` },
  };
  if (isForm) {
    // multipart/form-data for file upload
    const FormData = (await import('undici')).FormData;
    const fd = new FormData();
    for (const [k, v] of Object.entries(body)) fd.append(k, v);
    opts.body = fd;
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function createArticle(title, content) {
  const data = await request('/articles', 'POST', { title, content, status: 'draft' });
  if (data.success && data.data) {
    return {
      id: data.data.id,
      preview: `https://ziliu.online/api/articles/${data.data.id}?format=inline`,
    };
  }
  throw new Error(JSON.stringify(data));
}

async function uploadImage(filePath) {
  const fs = await import('fs');
  const FormData = (await import('undici')).FormData;
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(filePath)]), filePath.split(/[\\/]/).pop());
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

// CLI
const args = process.argv.slice(2);
const cmd = args[0];

(async () => {
  try {
    if (cmd === 'publish' || cmd === 'push') {
      const title = args[1];
      let content = '';
      if (!title) { console.error('Usage: ziliu-publish.cjs publish <title> [content.md]'); process.exit(1); }
      if (args[2]) {
        const fs = await import('fs');
        content = fs.readFileSync(args[2], 'utf-8');
      } else {
        console.error('Usage: ziliu-publish.cjs publish <title> <content.md>'); process.exit(1);
      }
      const result = await createArticle(title, content);
      console.log(JSON.stringify(result, null, 2));
    } else if (cmd === 'upload') {
      const filePath = args[1];
      if (!filePath) { console.error('Usage: ziliu-publish.cjs upload <image_path>'); process.exit(1); }
      const result = await uploadImage(filePath);
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('字流发布工具');
      console.log('  publish <title> <file.md>  推送草稿');
      console.log('  upload <image>             上传图片');
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
