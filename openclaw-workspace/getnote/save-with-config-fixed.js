const https = require('https');

// 按照SKILL.md中的正确配置格式
const config = {
    apiKey: 'gk_live_cli_a1b2c3d4e5f6789012345678abcdef90',
    clientId: '1a2159965b2f6fbc'
};

const baseUrl = 'https://openapi.biji.com';

// 保存链接笔记 - 直接使用X-API-Key认证
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

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log('保存响应:', data);
            try {
                const response = JSON.parse(data);
                if (response.success && response.data && response.data.note_id) {
                    console.log('笔记保存成功，ID:', response.data.note_id);
                    console.log('任务ID:', response.data.task_id);
                    console.log('需要轮询任务进度');
                    return { success: true, noteId: response.data.note_id };
                } else {
                    console.error('保存失败:', response);
                    return { success: false, error: response };
                }
            } catch (e) {
                console.error('响应解析失败:', e);
                return { success: false, error: e };
            }
        });
    });

    req.on('error', (e) => {
        console.error('请求错误:', e);
        return { success: false, error: e };
    });

    req.write(postData);
    req.end();
}

// 执行保存
const url = 'https://mp.weixin.qq.com/s/YkmLDqHmKuJdjXFvFJgT2w?scene=1&click_id=16';

// 由于是同步操作，直接调用
console.log('尝试保存链接到Get笔记...');
saveLink(url);