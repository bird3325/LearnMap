async function test() {
    const lat = 37.662692;
    const lng = 126.895255;
    const radius = 2000;
    const res = await fetch(`http://localhost:5000/api/academies/list?x=${lng}&y=${lat}&radius=${radius}`);
    const data = await res.json();
    console.log('Total items count:', data.items ? data.items.length : 0);
    console.log('Total count meta:', data.total_count);

    if (data.items) {
        // Find items near Changneung elementary (lat 37.6483, lng 126.8932)
        const changneungLat = 37.648317;
        const changneungLng = 126.893237;
        const nearChangneung = data.items.filter(item => {
            const dy = (parseFloat(item.y) - changneungLat) * 111000;
            const dx = (parseFloat(item.x) - changneungLng) * 88800;
            const dist = Math.sqrt(dx*dx + dy*dy);
            return dist < 600; // within 600m of Changneung elementary
        });
        console.log('Academies near Changneung elem (within 600m):', nearChangneung.length);
        nearChangneung.forEach(i => console.log(` - ${i.place_name} (${i.address_name}, dist from Ogeum: ${i.distance}m)`));
    }
}

test();
