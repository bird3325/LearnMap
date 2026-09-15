import urllib.request
import json
import ssl
import time

ctx = ssl._create_unverified_context()
NEIS_KEY = "fb397febaaca465b9f02736cc6f37188"

print("Loading schools_seoul.json...")
with open('src/data/schools_seoul.json', 'r', encoding='utf-8') as f:
    schools = json.load(f)

print(f"Total schools in JSON: {len(schools)}")

# Map SD_SCHUL_CODE -> FOND_SC_NM from NEIS API bulk pages
fond_map = {}

page = 1
while True:
    url = f"https://open.neis.go.kr/hub/schoolInfo?KEY={NEIS_KEY}&Type=json&pIndex={page}&pSize=1000"
    try:
        req = urllib.request.urlopen(url, context=ctx)
        data = json.loads(req.read().decode('utf-8'))
        if 'schoolInfo' not in data:
            print(f"Finished fetching NEIS pages at page {page}")
            break
        rows = data['schoolInfo'][1]['row']
        for r in rows:
            code = r.get('SD_SCHUL_CODE')
            fond = r.get('FOND_SC_NM')
            if code and fond:
                fond_map[code] = fond
        print(f"Fetched page {page}, got {len(rows)} rows. Total mapped: {len(fond_map)}")
        if len(rows) < 1000:
            break
        page += 1
        time.sleep(0.1)
    except Exception as e:
        print(f"Error at page {page}: {e}")
        break

# Fallback patterns for schools without NEIS match
private_keywords = [
    '경기초', '영훈초', '계성초', '숭의초', '리라초', '추계초', '동산초', '경복초', '한양초', '성동초', 
    '은석초', '매원초', '혜화초', '우촌초', '중앙초', '삼육초', '광운초', '명지초', '화랑초', '태랑초', 
    '동국대부속', '세종초', '선화초', '상명초', '경희초', '유석초', '영복초', '경원초', '영화초', '송원초',
    '전남초', '동성초', '혜성초', '인하부초', '신광초', '외고', '예고', '국악고', '체고', '마이스터'
]

updated_count = 0
private_count = 0
public_count = 0
national_count = 0

for s in schools:
    code = str(s.get('school_id', ''))
    fond = fond_map.get(code)
    
    if not fond:
        name = s.get('school_name', '')
        if any(k in name for k in private_keywords):
            fond = '사립'
        elif '부설' in name or '국립' in name:
            fond = '국립'
        else:
            fond = '공립' # default
            
    s['establishment_type'] = fond
    updated_count += 1
    if fond == '사립':
        private_count += 1
    elif fond == '국립':
        national_count += 1
    else:
        public_count += 1

print(f"Updated {updated_count} schools with establishment_type!")
print(f"Breakdown -> 공립: {public_count}, 사립: {private_count}, 국립: {national_count}")

with open('src/data/schools_seoul.json', 'w', encoding='utf-8') as f:
    json.dump(schools, f, ensure_ascii=False, indent=2)

print("Saved updated src/data/schools_seoul.json successfully!")
