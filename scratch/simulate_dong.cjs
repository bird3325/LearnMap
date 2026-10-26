const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const kakaoKey = config.kakao_app_key;
const headers = { 
    'Authorization': `KakaoAK ${kakaoKey}`,
    'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000'
};

function isValidBjdong(dong) {
    if (!dong || typeof dong !== 'string') return false;
    if (!/^[가-힣]{2,5}(?:동|읍|면|리)$/.test(dong)) return false;
    const invalidList = ['가동', '나동', '다동', '라동', '마동', '바동', '극동', '동호', '동구', '마을동'];
    if (invalidList.includes(dong)) return false;
    if (/(?:타운|빌리|하이츠|아파트|빌라|마을|전체|총괄|단지|상가)/.test(dong)) return false;
    return true;
}

async function simulateDongExtraction() {
    const sido = '경기도';
    const gu = '일산동구';
    const prefix = '경기도 고양시 일산동구';
    const queries = [
        `${prefix} 행정복지센터`,
        `${prefix} 주민센터`,
        `${prefix} 초등학교`,
        `${prefix} 아파트`
    ];
    
    const dongsInGu = new Set();
    for (const q of queries) {
        const centerRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=15`, { headers });
        if (centerRes.ok) {
            const cData = await centerRes.json();
            (cData.documents || []).forEach(doc => {
                if (doc.address_name && !doc.address_name.includes(gu)) return;
                const tokens = (doc.address_name || '').split(/\s+/);
                const t = tokens.find(tok => /^[가-힣0-9]+(?:동|읍|면|리|[0-9]가)$/.test(tok) && !/(?:시|군|구)$/.test(tok));
                if (t) {
                    let cleanDong = t.replace(/[0-9]+동$/, '동');
                    if (isValidBjdong(cleanDong)) {
                        dongsInGu.add(cleanDong);
                    }
                }
            });
        }
    }
    console.log('카카오 검색으로 추출된 동 목록:', Array.from(dongsInGu));
}

simulateDongExtraction();
