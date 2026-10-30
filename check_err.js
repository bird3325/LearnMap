import fs from 'fs';

const app = fs.readFileSync('app.js', 'utf8');
const pos = 1236349;
console.log(app.slice(pos - 150, pos + 150));
