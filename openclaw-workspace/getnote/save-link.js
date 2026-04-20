const https = require('https');
const fs = require('fs');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const clientId = process.env.GETNOTE_CLIENT_ID;
const apiKey = process.env.GETNOTE_API_KEY;

const baseUrl = 'https://openapi.biji.com';

if (!clientId || !apiKey) {
    console.error('缺少Client ID或API Key，请检查环境变量配置');
    process.exit(1);
}

// 保存链接笔记
function saveLink(url) {
    const postData = JSON.stringify({
        note_type: 'link',
        title: '我用 OpenClaw 做后端开发：从 Stripe 支付到 AI 生成，全程不写一行代码',
        url: url,
        source: '微信公众号'
    });

    const options = {
        hostname: 'openapi.biji.com',
        port: 443,
        path: '/open/api/v1/resource/note/save',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Client-ID': clientId,
            'X-API-Key': apiKey,
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log('保存响应:', data);
            const response = JSON.parse(data);
            if (response.data && response.data.note_id) {
                console.log('笔记保存成功，ID:', response.data.note_id);
                console.log('任务ID:', response.data.task_id);
                console.log('需要轮询任务进度');
            } else {
                console.error('保存失败:', response);
            }
        });
    });

    req.on('error', (e) => {
        console.error('请求错误:', e);
    });

    req.write(postData);
    req.end();
}

// 执行保存
const url = 'https://mp.weixin.qq.com/s/YkmLDqHmKuJdjXFvFJgT2w?scene=1&click_id=16';
saveLink(url);