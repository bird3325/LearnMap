const http = require('http');

function post(path, body) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(body || {});
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function test() {
    console.log('Testing sync-trades and stopping it halfway...');
    const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/realestate/sync-trades',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }, (res) => {
        console.log('sync-trades stream response status:', res.statusCode);
        res.on('data', (chunk) => {
            const text = chunk.toString();
            text.split('\n').filter(Boolean).forEach(line => {
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.type === 'log') {
                        console.log('STREAM LOG:', parsed.message);
                    } else if (parsed.type === 'stopped') {
                        console.log('SUCCESS: RECEIVED STOPPED EVENT:', parsed);
                    } else if (parsed.type === 'done') {
                        console.log('DONE EVENT:', parsed);
                    }
                } catch (e) {}
            });
        });
        res.on('end', () => {
            console.log('sync-trades stream ended.');
        });
    });

    req.write(JSON.stringify({ sido: '서울특별시', sigungu: 'all', housingType: 'all', monthsCount: 12, stream: true }));
    req.end();

    // 1.5초 후 정지 요청 발송
    setTimeout(async () => {
        console.log('\n>>> Sending stop-collect signal to sync-trades now!');
        const sRes = await post('/api/realestate/stop-collect', {});
        console.log('>>> Stop signal result:', sRes.body);
    }, 1500);
}

test().catch(console.error);
