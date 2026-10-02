async function testGrid() {
    const appkey = "a1395655b7d4904b57ff20a90998c001";
    const cleanOrigin = "http://localhost:3000";
    const headers = {
        'Authorization': `KakaoAK ${appkey}`,
        'KA': `sdk/1.25.3 os/javascript lang/en-US device/Win32 origin/${encodeURIComponent(cleanOrigin)}`
    };
    const sLat = 37.662692;
    const sLng = 126.895255;
    const radius = 2000;

    // Grid points: Center + North, South, East, West offsets (by radius * 0.5)
    const dLat = (radius * 0.55) / 111000;
    const dLng = (radius * 0.55) / 88800;

    const points = [
        { x: sLng, y: sLat },
        { x: sLng, y: sLat + dLat }, // North
        { x: sLng, y: sLat - dLat }, // South (towards Changneung)
        { x: sLng + dLng, y: sLat }, // East
        { x: sLng - dLng, y: sLat }, // West
    ];

    const uniqueMap = new Map();

    for (const pt of points) {
        const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=AC5&x=${pt.x}&y=${pt.y}&radius=1000&size=15&page=1`;
        const r = await fetch(url, { headers });
        const d = await r.json();
        const docs = d.documents || [];
        docs.forEach(doc => uniqueMap.set(doc.id, doc));
    }

    const allItems = Array.from(uniqueMap.values());
    console.log('Total unique AC5 items collected across 5 grid points:', allItems.length);

    // Calculate distance from original school (sLat, sLng)
    const changneungLat = 37.648317;
    const changneungLng = 126.893237;

    const nearChangneung = allItems.filter(item => {
        const dy = (parseFloat(item.y) - changneungLat) * 111000;
        const dx = (parseFloat(item.x) - changneungLng) * 88800;
        const distFromChangneung = Math.sqrt(dx*dx + dy*dy);

        // Distance from Ogeum school
        const sDy = (parseFloat(item.y) - sLat) * 111000;
        const sDx = (parseFloat(item.x) - sLng) * 88800;
        const distFromOgeum = Math.sqrt(sDx*sDx + sDy*sDy);

        return distFromChangneung < 600 && distFromOgeum <= radius;
    });

    console.log(`Academies near Changneung elem (within 600m & within Ogeum 2000m radius): ${nearChangneung.length}`);
    nearChangneung.forEach(i => console.log(` - ${i.place_name} (${i.address_name}, dist from Ogeum: ${Math.round(Math.sqrt(Math.pow((parseFloat(i.y)-sLat)*111000, 2) + Math.pow((parseFloat(i.x)-sLng)*88800, 2)))}m)`));
}

testGrid();
