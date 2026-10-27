const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SOURCE_FILE = path.join(ROOT_DIR, 'src', 'data', 'realestate_seoul.json');

const TARGET_DIRS = [
    path.join(ROOT_DIR, 'src', 'data', 'realestate'),
    path.join(ROOT_DIR, 'public', 'data', 'realestate'),
    path.join(ROOT_DIR, 'public', 'src', 'data', 'realestate')
];

const INDEX_PATHS = [
    path.join(ROOT_DIR, 'src', 'data', 'realestate_regions.json'),
    path.join(ROOT_DIR, 'public', 'data', 'realestate_regions.json'),
    path.join(ROOT_DIR, 'public', 'src', 'data', 'realestate_regions.json')
];

console.log('1. 원본 데이터 로딩 중:', SOURCE_FILE);
const raw = fs.readFileSync(SOURCE_FILE, 'utf8');
const allItems = JSON.parse(raw);
console.log(`총 ${allItems.length.toLocaleString()}건 로드 완료`);

// 타겟 디렉터리 생성
TARGET_DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 시군구별 / 법정동코드별 그룹화
const regionMap = new Map();

for (const item of allItems) {
    let sido = (item.sido || '경기도').trim();
    let sigungu = (item.sigungu || '기타').trim();
    let lawdCd = (item.lawdCd || '').trim();

    // 2건의 '고양시 덕양구' 예외 정규화
    if (sigungu === '고양시 덕양구') {
        sigungu = '덕양구';
        lawdCd = '41281';
        item.sigungu = '덕양구';
        item.lawdCd = '41281';
    }

    if (!lawdCd && item.pnu && item.pnu.length === 19) {
        lawdCd = item.pnu.substring(0, 5);
        item.lawdCd = lawdCd;
    }

    // 고유 키: sido + sigungu
    const groupKey = `${sido}_${sigungu}`;
    if (!regionMap.has(groupKey)) {
        regionMap.set(groupKey, {
            sido,
            sigungu,
            lawdCd: lawdCd || 'unknown',
            items: []
        });
    }

    const group = regionMap.get(groupKey);
    if ((group.lawdCd === 'unknown' || !group.lawdCd) && lawdCd) {
        group.lawdCd = lawdCd;
    }
    group.items.push(item);
}

console.log(`2. 총 ${regionMap.size}개 지역으로 분류 완료.`);

const indexList = [];

for (const [groupKey, group] of regionMap.entries()) {
    const code = group.lawdCd !== 'unknown' ? group.lawdCd : group.sigungu;
    const fileName = `${code}.json`;

    indexList.push({
        sido: group.sido,
        sigungu: group.sigungu,
        lawdCd: group.lawdCd,
        fileName: fileName,
        count: group.items.length
    });

    const jsonStr = JSON.stringify(group.items, null, 2);

    TARGET_DIRS.forEach(dir => {
        const filePath = path.join(dir, fileName);
        fs.writeFileSync(filePath, jsonStr, 'utf8');
    });

    const sizeMB = (Buffer.byteLength(jsonStr, 'utf8') / 1024 / 1024).toFixed(2);
    console.log(` - [${group.sido} ${group.sigungu}] 코드:${code} | ${group.items.length.toLocaleString()}건 (${sizeMB} MB) -> ${fileName}`);
}

// 인덱스 파일 저장 (가나다 순 정렬)
indexList.sort((a, b) => a.sigungu.localeCompare(b.sigungu, 'ko'));
const indexJson = JSON.stringify(indexList, null, 2);

INDEX_PATHS.forEach(idxPath => {
    if (!fs.existsSync(path.dirname(idxPath))) {
        fs.mkdirSync(path.dirname(idxPath), { recursive: true });
    }
    fs.writeFileSync(idxPath, indexJson, 'utf8');
});

console.log(`\n3. 인덱스 파일(${INDEX_PATHS[0]}) 생성 완료 (총 ${indexList.length}개 지역 등록)`);
