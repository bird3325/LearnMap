async function testKeywords() {
    const appkey = "a1395655b7d4904b57ff20a90998c001";
    const cleanOrigin = "http://localhost:3000";
    const headers = {
        'Authorization': `KakaoAK ${appkey}`,
        'KA': `sdk/1.25.3 os/javascript lang/en-US device/Win32 origin/${encodeURIComponent(cleanOrigin)}`
    };
    const x = "126.895255";
    const y = "37.662692";
    const radius = 2000;

    const queries = ['학원', '교습소', '수학', '영어', '음악', '미술', '태권도'];

    for (const q of queries) {
        const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&x=${x}&y=${y}&radius=${radius}&size=15&page=1`;
        const r = await fetch(url, { headers });
        const d = await r.json();
        console.log(`Query '${q}': total=${d.meta ? d.meta.total_count : 0}`);
        if (d.documents && d.documents.length > 0) {
            const distances = d.documents.map(item => parseInt(item.distance));
            console.log(`  Min dist: ${Math.min(...distances)}m, Max dist (page 1): ${Math.max(...distances)}m`);
        }
    }
}

testKeywords();
