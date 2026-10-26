const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const kakaoKey = config.kakao_app_key;

async function run() {
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent('백석동')}`, {
        headers: { 
            'Authorization': `KakaoAK ${kakaoKey}`,
            'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000'
        }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Result:', JSON.stringify(data).substring(0, 500));
}

run();
