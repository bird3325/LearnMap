import fs from 'fs';
import https from 'https';

const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';
const SCHOOLS_PATH = './src/data/schools_seoul.json';

async function readConfig() {
    let config = { kakao_app_key: '' };
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/api_configs?id=eq.1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                config.kakao_app_key = data[0].kakao_app_key || '';
            }
        }
    } catch (e) {
        console.error('Error config:', e);
    }
    return config;
}

function httpsGet(url, headers) {
    return new Promise((resolve, reject) => {
        const options = { headers, rejectUnauthorized: false };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    const config = await readConfig();
    const appkey = config.kakao_app_key;
    if (!appkey) {
        console.error('Kakao app key is empty!');
        return;
    }
    console.log('Kakao App Key Loaded successfully.');

    if (!fs.existsSync(SCHOOLS_PATH)) {
        console.error('Schools file not found');
        return;
    }

    const schools = JSON.parse(fs.readFileSync(SCHOOLS_PATH, 'utf8'));
    console.log('Total schools in DB:', schools.length);

    const sample = schools.find(s => s.school_name === '신원초등학교' && s.region === '경기도');
    if (sample) {
        console.log('Target sample school:', sample.school_name, sample.lat, sample.lng);
        const url = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${sample.lng}&y=${sample.lat}`;
        const headers = { 
            'Authorization': `KakaoAK ${appkey}`,
            'KA': 'sdk/1.25.3 os/javascript lang/en-US device/Win32 origin/http%3A%2F%2Flocalhost%3A5173'
        };
        try {
            const res = await httpsGet(url, headers);
            console.log('API Response:', JSON.stringify(res, null, 2));
            const bRegion = res.documents.find(r => r.region_type === 'B');
            console.log('Extracted Legal Dong:', bRegion ? bRegion.region_3depth_name : 'None');
        } catch (e) {
            console.error('API Test Fail:', e.message);
        }
    } else {
        console.log('Sample school not found');
    }
}

run();
