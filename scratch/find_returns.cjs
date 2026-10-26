const fs = require('fs');

const content = fs.readFileSync('./server.js', 'utf8');
const lines = content.split('\n');

let loopStack = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('for (') || line.includes('for await (')) {
        loopStack.push({ lineNum: i + 1, text: line.trim() });
    }
    if (line.includes('function ') || line.includes('=> {')) {
        loopStack.push({ lineNum: i + 1, text: 'FUNC: ' + line.trim() });
    }
    
    // Check if line contains a return
    if (/\breturn\b/.test(line) && !line.includes('//')) {
        // find nearest enclosing
        const last = loopStack[loopStack.length - 1];
        if (last && !last.text.startsWith('FUNC')) {
            console.log(`MISPLACED RETURN at line ${i + 1} inside loop at line ${last.lineNum}:`);
            console.log(`   Loop: ${last.text}`);
            console.log(`   Line: ${line.trim()}`);
        }
    }

    // Rough check on closing braces
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    for (let b = 0; b < closeBraces - openBraces; b++) {
        if (loopStack.length > 0) loopStack.pop();
    }
}
