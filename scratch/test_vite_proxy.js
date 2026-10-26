import http from 'http';

function checkUrl(port, path) {
    return new Promise((resolve, reject) => {
        const req = http.get({ hostname: 'localhost', port, path }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, length: data.length }));
        });
        req.on('error', reject);
    });
}

async function testVite() {
    console.log('Testing Vite Port 3000...');
    try {
        const r1 = await checkUrl(3000, '/business');
        console.log('GET http://localhost:3000/business ->', r1.statusCode, `(${r1.length} bytes)`);
    } catch (e) {
        console.log('Vite 3000 /business error:', e.message);
    }

    try {
        const r2 = await checkUrl(3000, '/api/business/session');
        console.log('GET http://localhost:3000/api/business/session ->', r2.statusCode, `(${r2.length} bytes)`);
    } catch (e) {
        console.log('Vite 3000 /api error:', e.message);
    }
}

testVite();
