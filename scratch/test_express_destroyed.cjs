const express = require('express');
const http = require('http');

const app = express();
app.use(express.json());

app.post('/test', (req, res) => {
    console.log('[EXPRESS TEST] Immediate check: req.destroyed =', req.destroyed, 'res.writableEnded =', res.writableEnded);
    
    req.on('close', () => {
        console.log('[EXPRESS TEST] req.on(close) FIRED! req.destroyed =', req.destroyed);
    });

    res.on('close', () => {
        console.log('[EXPRESS TEST] res.on(close) FIRED! res.writableEnded =', res.writableEnded);
    });

    res.setHeader('Content-Type', 'text/plain');
    res.write('Log 1\n');

    setTimeout(() => {
        console.log('[EXPRESS TEST] After 300ms: req.destroyed =', req.destroyed, 'res.destroyed =', res.destroyed);
        res.end('Done\n');
        server.close();
    }, 300);
});

const server = app.listen(5098, () => {
    const postData = JSON.stringify({ a: 1 });
    const clientReq = http.request({
        hostname: 'localhost',
        port: 5098,
        path: '/test',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, (res) => {
        res.on('data', chunk => console.log('Client received:', chunk.toString()));
    });
    clientReq.write(postData);
    clientReq.end();
});
