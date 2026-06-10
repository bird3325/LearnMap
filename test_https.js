process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import http from 'http';
import https from 'https';

function fetchImageBuffer(urlStr) {
    return new Promise((resolve, reject) => {
        const client = urlStr.startsWith('https') ? https : http;
        client.get(urlStr, {
            rejectUnauthorized: false,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let redirectUrl = res.headers.location;
                if (redirectUrl.startsWith('/')) {
                    const parsed = new URL(urlStr);
                    redirectUrl = parsed.origin + redirectUrl;
                }
                return fetchImageBuffer(redirectUrl).then(resolve).catch(reject);
            }
            if (res.statusCode >= 400) {
                return reject(new Error(`HTTP Error: ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                resolve({
                    buffer: Buffer.concat(chunks),
                    contentType: res.headers['content-type']
                });
            });
        }).on('error', reject);
    });
}

const wmsUrlHttps = `https://safemap.go.kr/openapi2/IF_0087_WMS?serviceKey=8N7ELUCO-8N7E-8N7E-8N7E-8N7ELUCOQY&srs=EPSG:4326&bbox=127.0033,37.4851,127.0519,37.5107&format=image/png&width=1075&height=711&transparent=TRUE`;

console.log("Fetching: " + wmsUrlHttps);
fetchImageBuffer(wmsUrlHttps).then(({buffer, contentType}) => {
    console.log('Success:', contentType, buffer.length);
}).catch(console.error);
