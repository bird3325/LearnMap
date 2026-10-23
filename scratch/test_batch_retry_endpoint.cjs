const http = require('http');

const postData = JSON.stringify({});

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/realestate/retry-missing-areas',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
}, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        console.log('Status code:', res.statusCode);
        console.log('Response body:', d);
    });
});

req.on('error', e => console.error(e));
req.write(postData);
req.end();
