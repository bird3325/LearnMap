const http = require('http');

const postData = JSON.stringify({ id: 'master-hub-apt-1792721516386-22aq8' });

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/realestate/fetch-single-area',
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
