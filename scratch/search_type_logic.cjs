const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');

lines.forEach((line, idx) => {
    if (line.includes('housingType') || line.includes('type =') || line.includes("type: 'apt'") || line.includes("type: 'rh'") || line.includes("type: 'sh'") || line.includes("type: 'offi'") || line.includes("item.type =") || line.includes("estate.type =")) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
