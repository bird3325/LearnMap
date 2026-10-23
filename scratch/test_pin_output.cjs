const http = require('http');

// Query pins near sam-song ipark (x: 126.88508, y: 37.66822)
http.get('http://localhost:5000/api/realestate/pins?lawd_cd=41281&x=126.88508&y=37.66822&radius=1000&type=all', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        const json = JSON.parse(d);
        console.log('Total pin items:', json.items?.length);
        const ipark = json.items?.find(it => it.name && it.name.includes('아이파크'));
        console.log('Sample ipark pin data:');
        console.log({
            name: ipark?.name,
            type: ipark?.type_name,
            short_price: ipark?.short_price,
            price_display: ipark?.price_display,
            price_amount: ipark?.price_amount
        });
    });
});
