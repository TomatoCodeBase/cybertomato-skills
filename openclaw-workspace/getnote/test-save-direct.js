const https = require('https');

// 使用新的API Key直接测试保存
const config = {
    apiKey: 'cli_aa03a5ba60a30273f0019eaa',
    clientId: '1a2159965b2f6fbc'
};

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
            'X-Client-ID': config.clientId,
            'X-API-Key': config.apiKey,
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log(`状态码: ${res.statusCode}`);
                try {
                    const response = JSON.parse(data);
                    console.log('保存响应:', response);
                    if (response.success && response.data && response.data.note_id) {
                        resolve({ success: true, noteId: response.data.note_id, taskId: response.data.task_id });
                    } else if (response.error) {
                        resolve({ success: false, error: response.error });
                    } else {
                        resolve({ success: false, error: response });
                    }
                } catch (e) {
                    console.error('响应解析失败:', e);
                    console.log('原始响应:', data);
                    resolve({ success: false, error: e, rawResponse: data });
                }
            });
        });

        req.on('error', (e) => {
            console.error('请求错误:', e);
            resolve({ success: false, error: e });
        });

        req.write(postData);
        req.end();
    });
}

async function runTest() {
    console.log('🔧 使用新API Key直接测试保存功能');
    console.log('📡 API Key:', config.apiKey);
    console.log('📄 尝试保存微信文章...\n');
    
    const url = 'https://mp.weixin.qq.com/s/YkmLDqHmKuJdjXFvFJgT2w?scene=1&click_id=16';
    const saveResult = await saveLink(url);
    
    if (saveResult.success) {
        console.log('🎉 文章保存成功！');
        console.log('📝 笔记ID:', saveResult.noteId);
        console.log('🔄 任务ID:', saveResult.taskId);
        console.log('⏳ 后续需要轮询任务进度');
    } else {
        console.log('❌ 保存失败:', saveResult.error);
        if (saveResult.rawResponse) {
            console.log('📡 原始响应:', saveResult.rawResponse);
        }
    }
}

runTest();