const https = require('https');
const fs = require('fs');

// OAuth配置 - 使用预注册的应用
const config = {
    clientId: 'YOUR_CLIENT_ID',
    baseUrl: 'https://openapi.biji.com'
};

// 存储授权状态
let authState = {
    code: null,
    verificationUri: null,
    userCode: null,
    expiresAt: null,
    polling: false
};

// 步骤1：申请授权码
async function requestDeviceCode() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            client_id: config.clientId
        });

        const options = {
            hostname: 'openapi.biji.com',
            port: 443,
            path: '/open/api/v1/oauth/device/code',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('授权码申请响应:', response);
                    
                    if (response.success && response.data) {
                        authState = {
                            ...authState,
                            code: response.data.code,
                            verificationUri: response.data.verification_uri,
                            userCode: response.data.user_code,
                            expiresAt: Date.now() + (response.data.expires_in * 1000)
                        };
                        resolve(response.data);
                    } else {
                        reject(new Error('申请失败: ' + JSON.stringify(response)));
                    }
                } catch (e) {
                    console.error('响应解析失败:', e);
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            console.error('请求错误:', e);
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

// 步骤3：轮询等待授权
async function pollForToken() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            grant_type: 'device_code',
            client_id: config.clientId,
            code: authState.code
        });

        const options = {
            hostname: 'openapi.biji.com',
            port: 443,
            path: '/open/api/v1/oauth/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('Token轮询响应:', response);
                    
                    if (response.success && response.data && response.data.access_token) {
                        resolve(response.data);
                    } else if (response.error && response.error.code === 1001) {
                        // 授权中，继续轮询
                        console.log('⏳ 等待用户授权...');
                        setTimeout(() => pollForToken().then(resolve).catch(reject), 5000);
                    } else {
                        reject(new Error('授权失败: ' + JSON.stringify(response)));
                    }
                } catch (e) {
                    console.error('响应解析失败:', e);
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            console.error('请求错误:', e);
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

// 步骤4：保存配置
function saveConfig(tokenData) {
    const configPath = 'D:\\OpenClaw\\workspace\\skills\\getnote\\.env';
    const configContent = `GETNOTE_CLIENT_ID=${config.clientId}
GETNOTE_API_KEY=${tokenData.access_token}
GETNOTE_OWNER_ID=`;

    fs.writeFileSync(configPath, configContent, 'utf8');
    console.log('配置已保存到:', configPath);
    return true;
}

// 主要流程
async function startOAuth() {
    console.log('🔧 开始OAuth授权流程...\n');
    
    try {
        // 步骤1：申请授权码
        console.log('📱 申请授权码...');
        const deviceCode = await requestDeviceCode();
        
        // 步骤2：展示授权信息
        console.log('\n✅ 授权码申请成功！');
        console.log('🔗 请点击以下链接完成授权：');
        console.log(deviceCode.verification_uri);
        console.log('\n⚠️ **请核对确认码**：', deviceCode.userCode);
        console.log('授权码 10 分钟内有效，请在授权页面确认码一致后点击授权。\n');
        
        // 步骤3：轮询等待授权
        console.log('🔄 开始轮询等待授权完成...');
        const tokenData = await pollForToken();
        
        // 步骤4：保存配置
        if (saveConfig(tokenData)) {
            console.log('🎉 OAuth授权完成！');
            console.log('✅ 配置已保存，现在可以使用Get笔记了');
            return true;
        }
        
    } catch (error) {
        console.error('❌ OAuth授权失败:', error.message);
        return false;
    }
}

// 导出函数供外部调用
module.exports = { startOAuth };

// 如果直接运行此文件，执行OAuth流程
if (require.main === module) {
    startOAuth();
}