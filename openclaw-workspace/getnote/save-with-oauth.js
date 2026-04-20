const https = require('https');

// 直接设置配置
const clientId = 'YOUR_CLIENT_ID';
const apiKey = 'YOUR_CLIENT_ID';

const baseUrl = 'https://openapi.biji.com';

// 检查Token并保存链接笔记
async function saveLinkWithToken(url) {
    // 首先尝试获取访问token
    const tokenData = JSON.stringify({
        client_id: clientId,
        client_secret: apiKey,
        grant_type: 'client_credentials'
    });

    const tokenOptions = {
        hostname: 'openapi.biji.com',
        port: 443,
        path: '/open/api/v1/oauth/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(tokenData)
        }
    };

    return new Promise((resolve, reject) => {
        const tokenReq = https.request(tokenOptions, (tokenRes) => {
            let tokenData = '';
            tokenRes.on('data', (chunk) => {
                tokenData += chunk;
            });
            tokenRes.on('end', () => {
                console.log('Token响应:', tokenData);
                try {
                    const tokenResponse = JSON.parse(tokenData);
                    if (tokenResponse.access_token) {
                        console.log('获取Token成功');
                        saveLinkWithAccessToken(url, tokenResponse.access_token, resolve);
                    } else {
                        console.error('Token获取失败:', tokenResponse);
                        reject(new Error('Token获取失败'));
                    }
                } catch (e) {
                    console.error('Token解析失败:', e);
                    reject(e);
                }
            });
        });

        tokenReq.on('error', (e) => {
            console.error('Token请求错误:', e);
            reject(e);
        });

        tokenReq.write(tokenData);
        tokenReq.end();
    });
}

function saveLinkWithAccessToken(url, accessToken, callback) {
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
            'Authorization': `Bearer ${accessToken}`,
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
                if (response.data && response.data.note_id) {
                    console.log('笔记保存成功，ID:', response.data.note_id);
                    console.log('任务ID:', response.data.task_id);
                    console.log('需要轮询任务进度');
                    callback({ success: true, noteId: response.data.note_id });
                } else {
                    console.error('保存失败:', response);
                    callback({ success: false, error: response });
                }
            } catch (e) {
                console.error('响应解析失败:', e);
                callback({ success: false, error: e });
            }
        });
    });

    req.on('error', (e) => {
        console.error('请求错误:', e);
        callback({ success: false, error: e });
    });

    req.write(postData);
    req.end();
}

// 执行保存
const url = 'https://mp.weixin.qq.com/s/YkmLDqHmKuJdjXFvFJgT2w?scene=1&click_id=16';
saveLinkWithToken(url).then(result => {
    console.log('最终结果:', result);
}).catch(error => {
    console.error('保存过程中出错:', error);
});