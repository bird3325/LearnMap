import fs from 'fs';

let html = fs.readFileSync('index.html', 'utf8');

const sIdx = html.indexOf('id="showRealEstateMapCheckbox"');
if (sIdx !== -1 && !html.includes('id="showEduCultureMapCheckbox"')) {
    const rowEnd = html.indexOf('</div>', sIdx);
    const insertPos = rowEnd + 6;

    const newRow = `

                                <!-- 지도상 교육·문화 자원 노출 (기본값: 체크 해제, 필터에서 선택해야 지도에 노출) -->
                                <div class="filter-row" style="border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                                    <div style="display: flex; flex-direction: column; gap: 1px;">
                                        <span>교육·문화 자원</span>
                                        <span style="font-size: 9.5px; color: #2563eb;">도서관·청소년·체육 핀 표시</span>
                                    </div>
                                    <label class="custom-switch-toggle">
                                        <input type="checkbox" id="showEduCultureMapCheckbox">
                                        <span class="slider-track"></span>
                                    </label>
                                </div>`;

    html = html.substring(0, insertPos) + newRow + html.substring(insertPos);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('Successfully inserted showEduCultureMapCheckbox');
} else {
    console.log('Already inserted or not found');
}
