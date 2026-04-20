const https = require('https');

// 测试获取访问token
const config = {
    apiKey: 'cli_aa03a5ba60a30273f0019eaa',
    clientId: 'YOUR_CLIENT_ID'
};

// 尝试不同的token获取方式
async function testTokenGrant() {
    const grantMethods = [
        {
            name: '客户端凭证模式',
            data: {
                client_id: config.clientId,
                client_secret: config.apiKey,
                grant_type: 'client_credentials'
            }
        },
        {
            name: '简化模式',
            data: {
                client_id: config.clientId,
                api_key: config.apiKey,
                grant_type: 'client_credentials'
            }
        }
    ];

    for (const method of grantMethods) {
        console.log(`\n🔧 尝试: ${method.name}`);
        
        return new Promise((resolve) => {
            const tokenData = JSON.stringify(method.data);
            
            const options = {
                hostname: 'openapi.biji.com',
                port: 443,
                path: '/open/api/v1/oauth/token',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(tokenData)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    console.log(`响应状态: ${res.statusCode}`);
                    try {
                        const response = JSON.parse(data);
                        console.log('Token响应:', response);
                        if (response.access_token) {
                            resolve({ success: true, accessToken: response.access_token });
                        } else {
                            resolve({ success: false, error: response });
                        }
                    } catch (e) {
                        console.log('响应解析失败:', data);
                        resolve({ success: false, error: data });
                    }
                });
            });

            req.on('error', (e) => {
                console.log('请求错误:', e.message);
                resolve({ success: false, error: e.message });
            });

            req.write(tokenData);
            req.end();
        });
    }
}

async function runTest() {
    console.log('🔧 测试获取访问Token');
    console.log('📡 API Key:', config.apiKey);
    console.log('📄 Client ID:', config.clientId);
    
    const tokenResult = await testTokenGrant();
    
    if (tokenResult.success) {
        console.log('✅ Token获取成功！');
        console.log('🔑 Access Token:', tokenResult.accessToken);
        console.log('📄 现在可以保存笔记了');
        
        // 保存文章
        await saveWithToken(tokenResult.accessToken);
    } else {
        console.log('❌ Token获取失败:', tokenResult.error);
    }
}

async function saveWithToken(accessToken) {
    const postData = JSON.stringify({
        note_type: 'link',
        title: '我用 OpenClaw 做后端开发：从 Stripe 支付到 AI 生成，全程不写一行代码',
        url: 'https://mp.weixin.qq.com/s/YkmLDqHmKuJdjXFvFJgT2w?scene=1&click_id=16',
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

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log(`保存状态: ${res.statusCode}`);
                try {
                    const response = JSON.parse(data);
                    console.log('保存响应:', response);
                    if (response.success && response.data && response.data.note_id) {
                        resolve({ success: true, noteId: response.data.note_id });
                    } else {
                        resolve({ success: false, error: response });
                    }
                } catch (e) {
                    console.error('响应解析失败:', e);
                    resolve({ success: false, error: e });
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

runTest();