import { execSync } from 'child_process';
import fs from 'fs';

// 1. Vite 프로세스 종료 (app.js 점유 해제)
try {
    execSync('taskkill /F /PID 27592');
    console.log('Killed Vite process');
} catch(e) {
    console.log('taskkill result:', e.message);
}

// 2. 잠시 대기 후 app.js 복사
setTimeout(() => {
    try {
        fs.copyFileSync('app.js.tmp', 'app.js');
        if (fs.existsSync('app.js.tmp')) fs.unlinkSync('app.js.tmp');
        console.log('Successfully updated app.js!');
    } catch(err) {
        console.log('Copy failed:', err.message);
    }
}, 500);
