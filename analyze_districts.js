import fs from 'fs';

const filePath = './src/data/korea-administrative-district.json';
if (fs.existsSync(filePath)) {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const data = json.data;
    
    // 경기도 찾기
    const gyeonggiItem = data.find(item => Object.keys(item)[0] === '경기도');
    if (gyeonggiItem) {
        console.log('Gyeonggi guguns:', gyeonggiItem['경기도']);
    } else {
        console.log('Gyeonggi not found');
    }
} else {
    console.log('File not found');
}
