const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');
lines.forEach((l, i) => {
    if (l.includes('function httpsGet') || l.includes('const httpsGet')) {
        console.log(`Line ${i+1}:`);
        for (let j = Math.max(0, i-5); j < Math.min(lines.length, i+30); j++) {
            console.log(`${j+1}: ${lines[j]}`);
        }
    }
});
