const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '..', 'admin.js');
let code = fs.readFileSync(adminPath, 'utf8');

const targetOldRender = `function renderStoredRealEstateList() {
    if (!storedRealEstateListContainer || !storedRealEstateCount) return;

    const filtered = getFilteredRealEstates();
    storedRealEstateCount.innerText = filtered.length;

    if (filtered.length === 0) {
        storedRealEstateListContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px 0;">조건에 해당하는 주택 데이터가 없습니다.</div>';
        return;
    }

    const html = filtered.map((item, index) => {
        const itemKey = item.id ? item.id : \`\${item.sido || ''}_\${item.sigungu || ''}_\${item.name || ''}\`;
        const latVal = item.lat || item.y;
        const lngVal = item.lng || item.x;
        const coordText = (latVal && lngVal && !isNaN(parseFloat(latVal)) && !isNaN(parseFloat(lngVal)))
            ? \`좌표: (\${parseFloat(latVal).toFixed(5)}, \${parseFloat(lngVal).toFixed(5)})\`
            : '좌표: 미등록';

        return \`
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.05); padding: 8px 4px;">
                <div style="flex: 1; padding-right: 10px;">
                    <div>
                        <strong style="color: var(--deep-blue); font-size: 13px;">\${index + 1}. \${item.name}</strong>
                        <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">(\${getTypeName(item.type)})</span>
                        <span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 6px; font-size: 10px;">\${item.source || '마스터 DB'}</span>
                    </div>
                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 3px;">
                        주소: \${item.address} | 전용면적: \${item.area || '-'} | \${coordText}
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                        📅 등록일: \${item.createdAt || '-'} | 🔄 수정일: \${item.updatedAt || item.createdAt || '-'}
                    </div>
                </div>
                <div style="text-align: right; min-width: 140px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    <div style="font-weight: 700; color: #059669; font-size: 12.5px;">\${item.price || '시세 정보'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">\${item.tradeDate ? '기준/거래: ' + item.tradeDate : ''}</div>
                    <button class="btn-delete-single-estate" data-key="\${encodeURIComponent(itemKey)}" data-name="\${encodeURIComponent(item.name || '')}" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 2px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 600; margin-top: 2px;">🗑️ 삭제</button>
                </div>
            </div>
        \`;
    }).join('');

    storedRealEstateListContainer.innerHTML = html;
}`;

// Normalize CRLF to LF for comparison
const codeLF = code.replace(/\r\n/g, '\n');
const targetLF = targetOldRender.replace(/\r\n/g, '\n');

console.log('Includes targetOldRender:', codeLF.includes(targetLF));
