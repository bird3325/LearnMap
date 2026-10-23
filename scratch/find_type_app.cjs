const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split('\n');

lines.forEach((l, i) => {
    if (l.includes("item.type === 'apt'") || l.includes("item.type === 'sh'") || l.includes("item.type === 'rh'") || l.includes("item.type === 'offi'") || l.includes("item.type ||") || l.includes("getTypeName") || l.includes("type_name")) {
        console.log(`Line ${i+1}: ${l.trim()}`);
    }
});
