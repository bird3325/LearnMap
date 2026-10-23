async function verify() {
    const res = await fetch('http://localhost:3000/api/realestate/stored');
    const data = await res.json();
    console.log('Stored items count:', data.length);
    const goyang = data.find(d => d.name && d.name.includes('고양동 103'));
    console.log('고양동 103번지 주택 exists?:', !!goyang);
    const hwaseong = data.find(d => d.name === '화성아파트');
    console.log('화성아파트 exists?:', !!hwaseong, hwaseong ? hwaseong.type : '');
    const suspicious = data.filter(d => d.type === 'apt' && (d.name.includes('주택') || d.name.includes('빌라')));
    console.log('Suspicious apt count:', suspicious.length);
}
verify();
