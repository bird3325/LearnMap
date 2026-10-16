import fs from 'fs';
try {
    const data = JSON.parse(fs.readFileSync('./public/data/schools_seoul.json', 'utf8'));
    console.log('Public school count:', data.length);
} catch (e) {
    console.error('Error public:', e.message);
}
try {
    const data2 = JSON.parse(fs.readFileSync('./src/data/schools_seoul.json', 'utf8'));
    console.log('Src school count:', data2.length);
} catch (e) {
    console.error('Error src:', e.message);
}
