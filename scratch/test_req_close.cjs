const http = require('http');

const server = http.createServer((req, res) => {
    let wasStopped = false;
    req.on('close', () => {
        console.log('[DEBUG] req emitted close! req.destroyed =', req.destroyed);
        wasStopped = true;
    });

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('Start\n');

    setTimeout(() => {
        console.log('[DEBUG] After 500ms: wasStopped =', wasStopped, 'req.destroyed =', req.destroyed);
        res.end('Done\n');
        server.close();
    }, 500);
});

server.listen(5099, () => {
    const postData = JSON.stringify({ test: 1 });
    const clientReq = http.request({
        hostname: 'localhost',
        port: 5099,
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
