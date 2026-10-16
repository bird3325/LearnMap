const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '..', 'admin.js');
let rawCode = fs.readFileSync(adminPath, 'utf8');

// Determine line ending
const isCRLF = rawCode.includes('\r\n');
const eol = isCRLF ? '\r\n' : '\n';
let code = rawCode.replace(/\r\n/g, '\n');

// 1. Target Old Search Filter
const targetOldSearch = `    // Filter by Search Query (name or address, whitespace-tolerant)
    if (searchQuery !== '') {
        const cleanQuery = searchQuery.toLowerCase().replace(/\\s+/g, '');
        filtered = filtered.filter(item => {
            const nameClean = (item.name || '').toLowerCase().replace(/\\s+/g, '');
            const addrClean = (item.address || '').toLowerCase().replace(/\\s+/g, '');
            return nameClean.includes(cleanQuery) || addrClean.includes(cleanQuery);
        });
    }`;

const newSearch = `    // Filter by Search Query (name, address, or area, whitespace-tolerant)
    if (searchQuery !== '') {
        const cleanQuery = searchQuery.toLowerCase().replace(/\\s+/g, '');
        filtered = filtered.filter(item => {
            const nameClean = (item.name || '').toLowerCase().replace(/\\s+/g, '');
            const addrClean = (item.address || '').toLowerCase().replace(/\\s+/g, '');
            const singleAreaClean = (item.area || '').toLowerCase().replace(/\\s+/g, '');
            const areaMatches = Array.isArray(item.areaList) && item.areaList.some(a => {
                const aClean = (a.area || '').toLowerCase().replace(/\\s+/g, '');
                const pClean = (a.pyeong || '').toLowerCase().replace(/\\s+/g, '');
                return aClean.includes(cleanQuery) || pClean.includes(cleanQuery);
            });
            return nameClean.includes(cleanQuery) || addrClean.includes(cleanQuery) || singleAreaClean.includes(cleanQuery) || areaMatches;
        });
    }`;

if (!code.includes(targetOldSearch)) {
    console.error('Error: targetOldSearch not found');
    process.exit(1);
}

code = code.replace(targetOldSearch, newSearch);

// 2. Target Old Render
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

const newRender = `function isComplexRealEstate(item) {
    if (!item) return false;
    // 아파트(apt), 연립·다세대(rh), 오피스텔(offi)은 공동주택/단지형 주택
    if (item.type === 'apt' || item.type === 'rh' || item.type === 'offi') return true;
    // 명칭에 '단지' 또는 '아파트'가 포함된 경우
    if (item.name && (item.name.includes('단지') || item.name.includes('아파트'))) return true;
    // 2개 이상의 면적 타입을 보유한 경우
    if (Array.isArray(item.areaList) && item.areaList.length > 1) return true;
    return false;
}

function renderStoredRealEstateList() {
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

        // 단지 여부 판별 및 면적리스트 생성
        let areaListHtml = '';
        if (isComplexRealEstate(item)) {
            const rawAreas = Array.isArray(item.areaList) && item.areaList.length > 0
                ? item.areaList
                : (item.area && item.area !== '-' ? [{ area: item.area, price: item.price, tradeDate: item.tradeDate }] : []);

            if (rawAreas.length > 0) {
                const areaBadges = rawAreas.map(a => {
                    const areaVal = a.area || (a.rawArea ? \`\${a.rawArea}㎡\` : (typeof a === 'string' ? a : '-'));
                    const pyeongVal = a.pyeong || (parseFloat(String(areaVal).replace(/[^0-9.]/g, '')) ? \`\${(parseFloat(String(areaVal).replace(/[^0-9.]/g, '')) / 3.3058).toFixed(1)}평형\` : '');
                    
                    const details = [];
                    if (pyeongVal) details.push(pyeongVal);
                    if (a.householdCount && a.householdCount > 0) details.push(\`\${a.householdCount}세대\`);
                    if (a.price && a.price !== '기본 정보 구축 (실거래 대기)' && a.price !== '-' && a.price !== '시세 정보') {
                        details.push(\`<span style="color: #059669; font-weight: 700;">\${a.price}</span>\`);
                    }

                    const subInfo = details.length > 0 ? \` <span style="color: var(--text-muted); font-size: 10.5px;">(\${details.join(', ')})</span>\` : '';
                    const tooltip = a.tradeDate && a.tradeDate !== '-' ? \` title="기준/거래일: \${a.tradeDate}"\` : '';

                    return \`<span\${tooltip} style="display: inline-flex; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1.5px 6px; font-size: 11px; margin-right: 4px; margin-bottom: 2px;">
                        <strong style="color: #1e293b;">\${areaVal}</strong>\${subInfo}
                    </span>\`;
                }).join('');

                areaListHtml = \`
                    <div style="font-size: 11px; margin-top: 3px; display: flex; flex-wrap: wrap; align-items: center; line-height: 1.5;">
                        <span style="font-weight: 700; color: #2563eb; background: #eff6ff; border: 1px solid #dbeafe; padding: 1px 6px; border-radius: 4px; margin-right: 6px; margin-bottom: 2px; display: inline-flex; align-items: center; gap: 3px;">
                            📐 면적리스트 (\${rawAreas.length}개)
                        </span>
                        \${areaBadges}
                    </div>
                \`;
            }
        }

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
                    \${areaListHtml}
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

if (!code.includes(targetOldRender)) {
    console.error('Error: targetOldRender not found');
    process.exit(1);
}

code = code.replace(targetOldRender, newRender);

// Convert back to original line endings and write
const finalCode = isCRLF ? code.replace(/\n/g, '\r\n') : code;
fs.writeFileSync(adminPath, finalCode, 'utf8');
console.log('Successfully updated admin.js with area list logic!');
