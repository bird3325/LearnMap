async function debug() {
    const appkey = "a1395655b7d4904b57ff20a90998c001";
    const cleanOrigin = "http://localhost:3000";
    const headers = {
        'Authorization': `KakaoAK ${appkey}`,
        'KA': `sdk/1.25.3 os/javascript lang/en-US device/Win32 origin/${encodeURIComponent(cleanOrigin)}`
    };
    const x = "126.895255";
    const y = "37.662692";
    const radius = 2000;

    const url1 = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=AC5&x=${x}&y=${y}&radius=${radius}&size=15&page=1`;
    console.log('Fetching:', url1);
    const r1 = await fetch(url1, { headers });
    const d1 = await r1.json();
    console.log('R1 total_count:', d1.meta ? d1.meta.total_count : 0);
    console.log('R1 docs length:', d1.documents ? d1.documents.length : 0);

    if (d1.documents && d1.documents.length > 0) {
        console.log('First 3 docs:');
        d1.documents.slice(0, 3).forEach(doc => {
            console.log(` - ${doc.place_name} (${doc.address_name}, distance: ${doc.distance}m)`);
        });
    }

    // Now test fetch all pages up to page 15 or until end
    const pageCount = Math.min(Math.ceil((d1.meta ? d1.meta.total_count : 0) / 15), 15);
    console.log(`Total pages available: ${Math.ceil((d1.meta ? d1.meta.total_count : 0) / 15)}, fetching up to page ${pageCount}`);

    let allDocs = [...(d1.documents || [])];
    const pageReqs = [];
    for (let p = 2; p <= pageCount; p++) {
        const pageUrl = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=AC5&x=${x}&y=${y}&radius=${radius}&size=15&page=${p}`;
        pageReqs.push(fetch(pageUrl, { headers }).then(r => r.json()).catch(() => ({ documents: [] })));
    }
    const pagesRes = await Promise.all(pageReqs);
    pagesRes.forEach(p => {
        if (p.documents) allDocs = allDocs.concat(p.documents);
    });

    console.log('Total AC5 docs fetched:', allDocs.length);

    // Check docs near Changneung elem (lat 37.648317, lng 126.893237)
    const changneungLat = 37.648317;
    const changneungLng = 126.893237;
    const nearChangneung = allDocs.filter(item => {
        const dy = (parseFloat(item.y) - changneungLat) * 111000;
        const dx = (parseFloat(item.x) - changneungLng) * 88800;
        const dist = Math.sqrt(dx*dx + dy*dy);
        return dist < 600;
    });
    console.log('AC5 Academies near Changneung elem (within 600m):', nearChangneung.length);
    nearChangneung.forEach(i => console.log(` - ${i.place_name} (${i.address_name}, dist from Ogeum: ${i.distance}m)`));

    // Sort allDocs by distance
    allDocs.sort((a,b) => parseInt(a.distance) - parseInt(b.distance));
    console.log('Max distance returned in allDocs:', allDocs.length > 0 ? allDocs[allDocs.length - 1].distance : 0, 'm');
}

debug();
