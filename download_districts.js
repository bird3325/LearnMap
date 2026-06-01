import fs from 'fs';
import https from 'https';

const url = 'https://raw.githubusercontent.com/cosmosfarm/korea-administrative-district/master/korea-administrative-district.json';
const dest = './src/data/korea-administrative-district.json';

https.get(url, (res) => {
    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });
    res.on('end', () => {
        try {
            const data = JSON.parse(body);
            console.log('Successfully downloaded JSON.');
            console.log('Keys count:', Object.keys(data).length);
            console.log('Sample keys:', Object.keys(data).slice(0, 5));
            
            // 처음 1개 키의 내용 출력
            const firstKey = Object.keys(data)[0];
            console.log(`Sample [${firstKey}]:`, JSON.stringify(data[firstKey]).substring(0, 300));
            
            fs.writeFileSync(dest, JSON.stringify(data, null, 2), 'utf8');
            console.log('Saved to', dest);
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Body snippet:', body.substring(0, 300));
        }
    });
}).on('error', (err) => {
    console.error('Error downloading:', err.message);
});
