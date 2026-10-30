const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. 라인 6173 손상 복구
const corrupted = 'styapp.js?v=20261030_edupin03er: none; font-size: 24px; cursor: pointer; color: var(--text-muted); padding: 0; line-height: 1; transition: color 0.2s;"';
const restored = 'style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-muted); padding: 0; line-height: 1; transition: color 0.2s;"';

if (html.includes(corrupted)) {
    html = html.replace(corrupted, restored);
    console.log('Restored line 6173 successfully!');
} else {
    console.warn('Corrupted string not found! Checking fallback...');
    html = html.replace('styapp.js?v=20261030_edupin03er:', 'style="background: none; border:');
}

// 2. 라인 7529 실제 script 태그 버전 갱신
const oldScript = '<script type="module" src="app.js?v=20261030_iconpin1"></script>';
const newScript = '<script type="module" src="app.js?v=20261030_edupin03"></script>';

if (html.includes(oldScript)) {
    html = html.replace(oldScript, newScript);
    console.log('Updated script tag to edupin03 successfully!');
} else {
    console.log('Script tag already updated or using different version');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html successfully written!');

