import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'config.json');
const realEstatePath = path.join(rootDir, 'src', 'data', 'realestate_seoul.json');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const kakaoKey = config.kakao_app_key;
const headers = {
    'Authorization': 'KakaoAK ' + kakaoKey,
    'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000'
};

const SUB_DISTRICT_MAP = {
    '고양시': ['덕양구', '일산동구', '일산서구'],
    '성남시': ['수정구', '중원구', '분당구'],
    '수원시': ['장안구', '권선구', '팔달구', '영통구'],
    '용인시': ['처인구', '기흥구', '수지구'],
    '안산시': ['상록구', '단원구'],
    '안양시': ['만안구', '동안구'],
    '부천시': ['원미구', '소사구', '오정구'],
    '청주시': ['상당구', '서원구', '흥덕구', '청원구'],
    '천안시': ['동남구', '서북구'],
    '전주시': ['완산구', '덕진구'],
    '포항시': ['남구', '북구'],
    '창원시': ['의창구', '성산구', '마산합포구', '마산회원구', '진해구']
};

function getParentCity(name) {
    for (const [p, subs] of Object.entries(SUB_DISTRICT_MAP)) {
        if (subs.includes(name)) return p;
    }
    return '';
}

function normalizeAddr(addr) {
    if (!addr) return '';
    for (const [p, subs] of Object.entries(SUB_DISTRICT_MAP)) {
        for (const sub of subs) {
            if (addr.includes(sub) && !addr.includes(p)) {
                return addr.replace(sub, p + ' ' + sub);
            }
        }
    }
    return addr;
}

async function geocodeAll() {
    const data = JSON.parse(fs.readFileSync(realEstatePath, 'utf8'));
    console.log('Total items to check:', data.length);
    let updated = 0;

    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // Normalize sigungu if missing parent city
        const parentCity = getParentCity(item.sigungu);
        if (parentCity && !item.address.includes(parentCity)) {
            item.address = normalizeAddr(item.address);
        }

        if (!item.x || !item.y || !item.lat || !item.lng) {
            const normAddress = normalizeAddr(item.address || '');
            const cleanName = (item.name || '').replace(/\(아파트\)|\(연립·다세대\)|\(단독·다가구\)|\(오피스텔\)|\(지번\)/g, '').trim();
            const parent = getParentCity(item.sigungu || '');
            
            const qList = [
                normAddress,
                `${item.sido || ''} ${parent} ${item.sigungu || ''} ${cleanName}`.trim(),
                `${item.sido || ''} ${cleanName}`.trim()
            ].filter(Boolean);

            let foundX = null, foundY = null;
            for (const q of qList) {
                try {
                    const u1 = 'https://dapi.kakao.com/v2/local/search/keyword.json?query=' + encodeURIComponent(q);
                    const r1 = await (await fetch(u1, { headers })).json();
                    if (r1.documents && r1.documents.length > 0) {
                        foundX = r1.documents[0].x;
                        foundY = r1.documents[0].y;
                        break;
                    }

                    const u2 = 'https://dapi.kakao.com/v2/local/search/address.json?query=' + encodeURIComponent(q);
                    const r2 = await (await fetch(u2, { headers })).json();
                    if (r2.documents && r2.documents.length > 0) {
                        foundX = r2.documents[0].x;
                        foundY = r2.documents[0].y;
                        break;
                    }
                } catch (e) {}
            }

            if (foundX && foundY) {
                item.x = foundX;
                item.y = foundY;
                item.lng = foundX;
                item.lat = foundY;
                updated++;
            }
        }

        if (i % 100 === 0 && i > 0) {
            console.log(`Processed ${i}/${data.length}, updated ${updated}`);
        }
    }

    fs.writeFileSync(realEstatePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Finished! Geocoded and saved coordinates for ${updated} items.`);
}

geocodeAll();
