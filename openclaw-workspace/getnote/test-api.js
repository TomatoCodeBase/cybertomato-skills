const https = require('https');

// 测试不同的API Key格式
const testConfigs = [
    {
        name: '原始格式',
        apiKey: 'YOUR_API_KEY',
        clientId: 'YOUR_CLIENT_ID'
    },
    {
        name: 'gk_live前缀',
        apiKey: 'YOUR_API_KEY',
        clientId: 'YOUR_CLIENT_ID'
    },
    {
        name: 'gk_live_开头',
        apiKey: 'YOUR_API_KEY',
        clientId: 'YOUR_CLIENT_ID'
    }
];

function testAuth(config) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'openapi.biji.com',
            port: 443,
            path: '/open/api/v1/oauth/verify',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Client-ID': config.clientId,
                'X-API-Key': config.apiKey
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
                    console.log(`${config.name}:`, response);
                    resolve({ config, success: response.success || (response.data !== null), response });
                } catch (e) {
                    console.log(`${config.name}: 解析失败`, data);
                    resolve({ config, success: false, response: data });
                }
            });
        });

        req.on('error', (e) => {
            console.log(`${config.name}: 请求错误`, e.message);
            resolve({ config, success: false, error: e.message });
        });

        req.end();
    });
}

async function runTests() {
    console.log('开始测试不同的API Key格式...\n');
    
    const results = [];
    for (const config of testConfigs) {
        console.log(`测试: ${config.name}`);
        const result = await testAuth(config);
        results.push(result);
        console.log('---\n');
    }

    console.log('测试结果汇总:');
    const successful = results.filter(r => r.success);
    if (successful.length > 0) {
        console.log('✅ 成功的配置:');
        successful.forEach(r => console.log(`  - ${r.config.name}`));
    } else {
        console.log('❌ 所有配置都失败，需要重新检查API Key和Client ID');
    }
}

runTests();