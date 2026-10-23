const fs = require('fs');

let content = fs.readFileSync('app.js', 'utf8');

function replaceWithCRLF(fileText, target, replacement) {
    const targetCRLF = target.replace(/\r?\n/g, '\r\n');
    const replacementCRLF = replacement.replace(/\r?\n/g, '\r\n');
    if (!fileText.includes(targetCRLF)) {
        console.error('Target not found:', target.substring(0, 60));
        return fileText;
    }
    console.log('Successfully found and replaced:', target.substring(0, 40));
    return fileText.replace(targetCRLF, replacementCRLF);
}

const target1 = `                                const propName = primaryPlace.name || '주택 단지';
                                const typeName = primaryPlace.type_name || '주택';
                                const priceStr = primaryPlace.short_price || primaryPlace.price_display || '';
                                floatingLabelEl.innerHTML = \`<div><strong>\${propName}</strong> <span style="color:#94a3b8; font-size:11px; font-weight:normal;">(\${typeName})</span> \${priceStr ? \`<span style="color:#fde047; font-size:11.5px; margin-left:4px;">\${priceStr}</span>\` : ''}</div>\`;`;

const repl1 = `                                const propName = primaryPlace.name || '주택 단지';
                                const typeName = primaryPlace.type_name || '주택';
                                const rawPrice = primaryPlace.short_price || primaryPlace.price_display || '';
                                const hasPrice = rawPrice && rawPrice !== '기본정보' && !rawPrice.includes('기본 정보') && !rawPrice.includes('실거래 대기');
                                const priceStr = hasPrice ? rawPrice : '';
                                floatingLabelEl.innerHTML = \`<div><strong>\${propName}</strong> <span style="color:#94a3b8; font-size:11px; font-weight:normal;">(\${typeName})</span> \${priceStr ? \`<span style="color:#fde047; font-size:11.5px; margin-left:4px;">\${priceStr}</span>\` : ''}</div>\`;`;

const target2 = `                                    const pPrice = place.short_price || place.price_display || '';`;
const repl2 = `                                    const rawPPrice = place.short_price || place.price_display || '';
                                    const pPrice = (rawPPrice && rawPPrice !== '기본정보' && !rawPPrice.includes('기본 정보') && !rawPPrice.includes('실거래 대기')) ? rawPPrice : '';`;

const target3 = `    const priceDisplay = (place && place.price_display) || '실거래 대기';
    const shortPrice = (place && place.short_price) || (place && place.price_amount > 0 ? \`\${(place.price_amount / 10000).toFixed(1)}억\` : '기본정보');`;

const repl3 = `    const priceDisplay = (place && place.price_display && !place.price_display.includes('기본 정보')) ? place.price_display : '실거래 대기';
    const shortPrice = (place && place.short_price && place.short_price !== '기본정보') ? place.short_price : (place && place.price_amount > 0 ? \`\${(place.price_amount / 10000).toFixed(1)}억\` : '');`;

const target4 = `    const shortPrice = place.short_price || (place.price_amount > 0 ? \`\${(place.price_amount / 10000).toFixed(1)}억\` : '기본정보');`;
const repl4 = `    const shortPrice = (place.short_price && place.short_price !== '기본정보') ? place.short_price : (place.price_amount > 0 ? \`\${(place.price_amount / 10000).toFixed(1)}억\` : '');`;

const target5 = `            <span style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px;">
                💰 \${shortPrice}
            </span>`;

const repl5 = `            \${shortPrice ? \`
            <span style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px;">
                💰 \${shortPrice}
            </span>\` : ''}`;

content = replaceWithCRLF(content, target1, repl1);
content = replaceWithCRLF(content, target2, repl2);
content = replaceWithCRLF(content, target3, repl3);
content = replaceWithCRLF(content, target4, repl4);
content = replaceWithCRLF(content, target5, repl5);

fs.writeFileSync('app.js', content, 'utf8');
console.log('Finished updating app.js');
