import subprocess

original_html = subprocess.check_output(['git', 'show', 'HEAD:index.html']).decode('utf-8')
current_html = open('index.html', 'r', encoding='utf-8').read()

split_marker = '<div class="compare-grid" id="compareGrid">'

orig_parts = original_html.split(split_marker)
curr_parts = current_html.split(split_marker)

if len(orig_parts) == 2 and len(curr_parts) >= 2:
    bottom_orig = orig_parts[1]
    
    review_modal = '''    <!-- Add Review Modal -->
    <div id="reviewModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 99999; justify-content: center; align-items: center;">
        <div style="background: white; border-radius: 12px; width: 400px; max-width: 90%; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                <h3 style="margin: 0; color: var(--deep-blue); font-size: 16px;">학원 후기 남기기</h3>
                <button onclick="document.getElementById('reviewModal').style.display='none'" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-muted);">&times;</button>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">학원명</label>
                <div id="reviewModalAcademyName" style="font-weight: bold; font-size: 14px; color: var(--text-main);">학원명</div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">별점</label>
                <select id="reviewRating" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; outline: none; font-size: 14px;">
                    <option value="5">⭐⭐⭐⭐⭐ (5점 - 아주 만족해요)</option>
                    <option value="4">⭐⭐⭐⭐ (4점 - 만족해요)</option>
                    <option value="3">⭐⭐⭐ (3점 - 보통이에요)</option>
                    <option value="2">⭐⭐ (2점 - 별로예요)</option>
                    <option value="1">⭐ (1점 - 비추천해요)</option>
                </select>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">상세 후기</label>
                <textarea id="reviewContent" placeholder="원장님 스타일, 학원 분위기, 장단점 등을 자유롭게 작성해주세요." style="width: 100%; height: 100px; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; outline: none; font-size: 13px; box-sizing: border-box; resize: none; font-family: inherit;"></textarea>
            </div>
            
            <button onclick="window.submitReview()" style="width: 100%; padding: 12px; background: var(--primary-blue); color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s;">등록하기</button>
        </div>
    </div>

'''
    bottom_orig = bottom_orig.replace('z-index: 2000;', 'z-index: 99999;')
    
    bottom_orig = bottom_orig.replace('    <!-- Leaflet & Main JS -->', review_modal + '    <!-- Leaflet & Main JS -->')
    
    new_html = curr_parts[0] + split_marker + bottom_orig
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_html)
    print('fixed successfully')
else:
    print('Failed to split')
