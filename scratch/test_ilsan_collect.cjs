const http = require('http');

async function testIlsanCollect() {
    console.log('Testing collect-master for 일산동구...');

    const postData = JSON.stringify({
        sido: '경기도',
        sigungu: '일산동구',
        stream: true
    });

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/realestate/collect-master',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        console.log('Status:', res.statusCode);
        let buffer = '';
        res.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line.trim());
                    if (parsed.type === 'log') {
                        // 주요 로그 출력
                        if (parsed.message.includes('법정동 확인') || 
                            parsed.message.includes('🏢') || 
                            parsed.message.includes('🏬') || 
                            parsed.message.includes('공공 실거래 단지 흡수') ||
                            parsed.message.includes('1단계 주택 마스터 DB 구축 완료')) {
                            console.log(`[LOG ${parsed.percent || ''}%] ${parsed.message}`);
                        }
                    } else if (parsed.type === 'done') {
                        console.log('[DONE]', parsed);
                    }
                } catch (e) {}
            }
        });

        res.on('end', () => {
            console.log('Stream finished.');
        });
    });

    req.on('error', (e) => {
        console.error('Request error:', e);
    });

    req.write(postData);
    req.end();
}

testIlsanCollect();
