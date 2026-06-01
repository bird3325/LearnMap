import fs from 'fs';

const schoolsPath = './src/data/schools_seoul.json';
if (fs.existsSync(schoolsPath)) {
    const data = JSON.parse(fs.readFileSync(schoolsPath, 'utf8'));
    
    // 고양시에 위치한 학교 검색
    const goyangSchools = data.filter(s => s.address && s.address.includes('고양시'));
    console.log('Goyang schools count:', goyangSchools.length);
    
    // 신원동에 위치하거나 '신원'이 포함된 학교 검색
    const shinwonSchools = data.filter(s => s.school_name.includes('신원') || (s.address && s.address.includes('신원')));
    console.log('Shinwon schools count:', shinwonSchools.length);
    
    shinwonSchools.forEach(s => {
        console.log(`ID: ${s.school_id}, Name: ${s.school_name}, Region: ${s.region}, Address: ${s.address}, Lat: ${s.lat}, Lng: ${s.lng}`);
    });
} else {
    console.log('File not found');
}
