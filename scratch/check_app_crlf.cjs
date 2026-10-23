const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

const target1 = `const priceStr = primaryPlace.short_price || primaryPlace.price_display || '';
                                floatingLabelEl.innerHTML = \`<div><strong>\${propName}</strong> <span style="color:#94a3b8; font-size:11px; font-weight:normal;">(\${typeName})</span> \${priceStr ? \`<span style="color:#fde047; font-size:11.5px; margin-left:4px;">\${priceStr}</span>\` : ''}</div>\`;`;

const target1CRLF = target1.replace(/\n/g, '\r\n');

console.log('Includes target1?', content.includes(target1));
console.log('Includes target1CRLF?', content.includes(target1CRLF));
