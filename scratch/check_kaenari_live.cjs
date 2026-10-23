async function check() {
    const res = await fetch('http://localhost:3000/api/realestate/stored');
    const data = await res.json();
    const kaenari = data.find(d => d.name === '개나리아파트');
    console.log('API response for 개나리아파트:');
    console.log(JSON.stringify(kaenari, null, 2));
}
check();
