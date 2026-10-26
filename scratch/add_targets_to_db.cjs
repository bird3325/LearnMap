const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../public/data/realestate_seoul.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8') || '[]');

console.log('Current DB count:', data.length);

const targetsToAdd = [
    {
        name: '건우아파트',
        sido: '경기도',
        sigungu: '고양시 덕양구',
        dong: '행신동',
        bun: '644',
        ji: '37',
        address: '경기 고양시 덕양구 행신로143번길 136 (행신동, 건우아파트)',
        roadAddress: '경기 고양시 덕양구 행신로143번길 136',
        x: '126.82906321639867',
        y: '37.62467391250507',
        lat: 37.62467391250507,
        lng: 126.82906321639867,
        type: 'apt',
        type_name: '아파트',
        households: 19,
        floors: 7,
        builtYear: 1995,
        useAprDay: '1995-10-10',
        price: '기본 정보 구축 (실거래 대기)',
        updatedAt: new Date().toISOString()
    },
    {
        name: '장미7차아파트',
        sido: '경기도',
        sigungu: '고양시 덕양구',
        dong: '행신동',
        bun: '644',
        ji: '43',
        address: '경기 고양시 덕양구 행신로143번길 115 (행신동, 장미7차아파트)',
        roadAddress: '경기 고양시 덕양구 행신로143번길 115',
        x: '126.82895693470812',
        y: '37.62359798108842',
        lat: 37.62359798108842,
        lng: 126.82895693470812,
        type: 'apt',
        type_name: '아파트',
        households: 375,
        floors: 15,
        builtYear: 1991,
        useAprDay: '1991-12-05',
        price: '기본 정보 구축 (실거래 대기)',
        updatedAt: new Date().toISOString()
    },
    {
        name: '동문아파트',
        sido: '경기도',
        sigungu: '고양시 덕양구',
        dong: '행신동',
        bun: '643',
        ji: '4',
        address: '경기 고양시 덕양구 행신로143번길 107 (행신동, 동문아파트)',
        roadAddress: '경기 고양시 덕양구 행신로143번길 107',
        x: '126.8296907952453',
        y: '37.623672923428245',
        lat: 37.623672923428245,
        lng: 126.8296907952453,
        type: 'apt',
        type_name: '아파트',
        households: 19,
        floors: 7,
        builtYear: 1992,
        useAprDay: '1992-10-23',
        price: '기본 정보 구축 (실거래 대기)',
        updatedAt: new Date().toISOString()
    }
];

let added = 0;
targetsToAdd.forEach(target => {
    const exists = data.find(d => d.sigungu === target.sigungu && d.dong === target.dong && (d.name === target.name || (d.bun === target.bun && d.ji === target.ji)));
    if (!exists) {
        data.push(target);
        added++;
        console.log('Added:', target.name);
    } else {
        console.log('Already exists:', target.name);
    }
});

fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Successfully added ${added} items. Total count now: ${data.length}`);
