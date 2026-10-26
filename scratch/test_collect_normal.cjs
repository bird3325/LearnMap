const http = require('http');

async function test() {
    console.log('Testing collect-master normal run without stopping...');
    const postData = JSON.stringify({ sido: '경기도', sigungu: '과천시', stream: true });

    const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/realestate/collect-master',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, (res) => {
        console.log('HTTP Status:', res.statusCode);
        let gotStopped = false;
        let gotDone = false;

        res.on('data', (chunk) => {
            const text = chunk.toString();
            text.split('\n').filter(Boolean).forEach(line => {
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.type === 'log') {
                        console.log('LOG:', parsed.message);
                    } else if (parsed.type === 'stopped') {
                        console.log('ERROR: GOT STOPPED EVENT UNEXPECTEDLY!', parsed);
                        gotStopped = true;
                    } else if (parsed.type === 'done') {
                        console.log('SUCCESS: GOT DONE EVENT!', parsed);
                        gotDone = true;
                    }
                } catch (e) {}
            });
        });

        res.on('end', () => {
            console.log('Stream ended. Result:', { gotDone, gotStopped });
        });
    });

    req.write(postData);
    req.end();
}

test().catch(console.error);
