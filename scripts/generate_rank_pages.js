import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'src', 'data', 'schools_seoul.json');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'rank');
const SITEMAP_PATH = path.join(process.cwd(), 'public', 'sitemap.xml');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const rawData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// 서울 25개 자치구 목록 및 슬러그
const SEOUL_GUS = [
  { name: '강남구', slug: 'gangnam' },
  { name: '강동구', slug: 'gangdong' },
  { name: '강북구', slug: 'gangbuk' },
  { name: '강서구', slug: 'gangseo' },
  { name: '관악구', slug: 'gwanak' },
  { name: '광진구', slug: 'gwangjin' },
  { name: '구로구', slug: 'guro' },
  { name: '금천구', slug: 'geumcheon' },
  { name: '노원구', slug: 'nowon' },
  { name: '도봉구', slug: 'dobong' },
  { name: '동대문구', slug: 'dongdaemun' },
  { name: '동작구', slug: 'dongjak' },
  { name: '마포구', slug: 'mapo' },
  { name: '서대문구', slug: 'seodaemun' },
  { name: '서초구', slug: 'seocho' },
  { name: '성동구', slug: 'seongdong' },
  { name: '성북구', slug: 'seongbuk' },
  { name: '송파구', slug: 'songpa' },
  { name: '양천구', slug: 'yangcheon' },
  { name: '영등포구', slug: 'yeongdeungpo' },
  { name: '용산구', slug: 'yongsan' },
  { name: '은평구', slug: 'eunpyeong' },
  { name: '종로구', slug: 'jongno' },
  { name: '중구', slug: 'jung' },
  { name: '중랑구', slug: 'jungnang' }
];

// 전국 주요 시·도 및 핵심 학군 지역 목록
const NATIONWIDE_REGIONS = [
  {
    province: '경기도',
    icon: '🏙️',
    cities: [
      { name: '성남시 (분당구)', query: '성남시 분당구' },
      { name: '수원시 (영통구)', query: '수원시 영통구' },
      { name: '용인시 (수지구)', query: '용인시 수지구' },
      { name: '안양시 (동안구)', query: '안양시 동안구' },
      { name: '고양시 (일산)', query: '고양시 일산' },
      { name: '부천시', query: '부천시' },
      { name: '광명시', query: '광명시' },
      { name: '과천시', query: '과천시' },
      { name: '하남시', query: '하남시' },
      { name: '화성시 (동탄)', query: '화성시 동탄' },
      { name: '남양주시', query: '남양주시' },
      { name: '평택시', query: '평택시' },
      { name: '파주시', query: '파주시' },
      { name: '의정부시', query: '의정부시' },
      { name: '시흥시', query: '시흥시' },
      { name: '김포시', query: '김포시' }
    ]
  },
  {
    province: '인천광역시',
    icon: '🌊',
    cities: [
      { name: '연수구 (송도)', query: '인천 연수구' },
      { name: '남동구', query: '인천 남동구' },
      { name: '부평구', query: '인천 부평구' },
      { name: '서구 (청라/검단)', query: '인천 서구' },
      { name: '미추홀구', query: '인천 미추홀구' },
      { name: '계양구', query: '인천 계양구' }
    ]
  },
  {
    province: '부산광역시',
    icon: '⚓',
    cities: [
      { name: '해운대구', query: '부산 해운대구' },
      { name: '수영구', query: '부산 수영구' },
      { name: '동래구', query: '부산 동래구' },
      { name: '남구', query: '부산 남구' },
      { name: '금정구', query: '부산 금정구' },
      { name: '부산진구', query: '부산 부산진구' },
      { name: '연제구', query: '부산 연제구' },
      { name: '사하구', query: '부산 사하구' }
    ]
  },
  {
    province: '대구광역시',
    icon: '🍎',
    cities: [
      { name: '수성구', query: '대구 수성구' },
      { name: '달서구', query: '대구 달서구' },
      { name: '중구', query: '대구 중구' },
      { name: '북구', query: '대구 북구' },
      { name: '동구', query: '대구 동구' }
    ]
  },
  {
    province: '대전 / 세종 / 충청',
    icon: '🔬',
    cities: [
      { name: '대전 유성구', query: '대전 유성구' },
      { name: '대전 서구 (둔산)', query: '대전 서구' },
      { name: '세종특별자치시', query: '세종특별자치시' },
      { name: '천안시', query: '천안시' },
      { name: '청주시', query: '청주시' },
      { name: '아산시', query: '아산시' }
    ]
  },
  {
    province: '광주 / 전라 / 제주',
    icon: '🌴',
    cities: [
      { name: '광주 남구 (봉선)', query: '광주 남구' },
      { name: '광주 광산구 (수완)', query: '광주 광산구' },
      { name: '광주 북구', query: '광주 북구' },
      { name: '전주시', query: '전주시' },
      { name: '순천시', query: '순천시' },
      { name: '여수시', query: '여수시' },
      { name: '제주시', query: '제주시' },
      { name: '서귀포시', query: '서귀포시' }
    ]
  },
  {
    province: '울산 / 강원 / 경상',
    icon: '⛰️',
    cities: [
      { name: '울산 남구 (옥동)', query: '울산 남구' },
      { name: '울산 중구', query: '울산 중구' },
      { name: '창원시', query: '창원시' },
      { name: '김해시', query: '김해시' },
      { name: '포항시', query: '포항시' },
      { name: '구미시', query: '구미시' },
      { name: '춘천시', query: '춘천시' },
      { name: '원주시', query: '원주시' }
    ]
  }
];

// 공통 지역 및 학교 검색 스크립트 (첨부 이미지와 동일한 정규 랭킹 페이지 레이아웃 렌더러 탑재)
const COMMON_RANK_SEARCH_SCRIPT = `
  <script>
    var __rankAllSchoolsData = null;
    var __currentRankSearchResults = [];
    var __currentFilterType = '고등학교'; // 첨부 이미지 기본 탭과 통일
    var __currentSearchQuery = '';
    var __currentSubRegion = 'all';

    function fetchRankAllSchoolsData(callback) {
      if (__rankAllSchoolsData) {
        if (callback) callback(__rankAllSchoolsData);
        return;
      }
      var metaEl = document.getElementById('resTotalCountMeta');
      if (metaEl) metaEl.innerText = '전국 12,045개교 데이터베이스 로딩 중...';

      function tryFetch(urls, idx) {
        if (idx >= urls.length) {
          throw new Error('All data fetch candidates failed');
        }
        return fetch(urls[idx]).then(function(res) {
          if (!res.ok) return tryFetch(urls, idx + 1);
          return res.json();
        }).catch(function() {
          return tryFetch(urls, idx + 1);
        });
      }

      var candidateUrls = [
        '/data/ranking_all_schools.json',
        '../data/ranking_all_schools.json',
        './data/ranking_all_schools.json'
      ];

      tryFetch(candidateUrls, 0)
        .then(function(data) {
          if (!data || !Array.isArray(data)) throw new Error('Invalid data format');
          __rankAllSchoolsData = data;
          if (callback) callback(__rankAllSchoolsData);
        })
        .catch(function(err) {
          console.error('[RankSearch] Failed to load nationwide ranking data:', err);
          alert('전국 학교 랭킹 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        });
    }

    function showHubDefaultView() {
      var hubDef = document.getElementById('hubDefaultView');
      var resView = document.getElementById('rankSearchResultsView');
      if (hubDef) hubDef.style.display = 'block';
      if (resView) resView.style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function executeInPageRankSearch(query, preferredType) {
      var q = (query || '').trim();
      if (!q) return;

      var hubDef = document.getElementById('hubDefaultView');
      var resView = document.getElementById('rankSearchResultsView');

      // 개별 랭킹 페이지인 경우 허브 페이지로 이동하여 동일 레이아웃으로 결과 표시
      if (!resView) {
        window.location.href = '/rank/index.html?search=' + encodeURIComponent(q);
        return;
      }

      __currentSearchQuery = q;
      if (preferredType) __currentFilterType = preferredType;

      if (hubDef) hubDef.style.display = 'none';
      resView.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // 인풋 필드 동기화
      var inputHub = document.getElementById('rankSearchInputHub');
      var inputResult = document.getElementById('rankSearchInputResult');
      if (inputHub) inputHub.value = q;
      if (inputResult) inputResult.value = q;

      fetchRankAllSchoolsData(function(data) {
        var lowerQ = q.toLowerCase();
        var filtered = data.filter(function(item) {
          var a = (item.a || '').toLowerCase();
          var r = (item.r || '').toLowerCase();
          var n = (item.n || '').toLowerCase();
          return a.indexOf(lowerQ) !== -1 || r.indexOf(lowerQ) !== -1 || n.indexOf(lowerQ) !== -1;
        });

        // 종합 점수 내림차순 정렬
        filtered.sort(function(a, b) {
          return b.s - a.s;
        });

        __currentRankSearchResults = filtered;
        __currentSubRegion = 'all';

        // 하위 지역 목록 추출 및 알약 생성
        renderSubRegionPills(filtered, q);

        // 결과 렌더링
        renderRankSearchResultsView();
      });
    }

    function renderSubRegionPills(filteredList, queryText) {
      var pillsContainer = document.getElementById('resSubRegionPills');
      if (!pillsContainer) return;

      var subRegionsMap = {};
      filteredList.forEach(function(item) {
        if (item.r) {
          subRegionsMap[item.r] = (subRegionsMap[item.r] || 0) + 1;
        }
      });
      var subRegions = Object.keys(subRegionsMap);

      var html = '<a href="javascript:void(0)" class="gu-pill ' + (__currentSubRegion === 'all' ? 'active' : '') + '" onclick="filterSubRegion(\\'all\\', this)">' + queryText + ' 전체</a>';
      if (subRegions.length > 1 && subRegions.length <= 30) {
        subRegions.forEach(function(sub) {
          var isActive = __currentSubRegion === sub;
          html += '<a href="javascript:void(0)" class="gu-pill ' + (isActive ? 'active' : '') + '" onclick="filterSubRegion(\\'' + sub.replace(/'/g, "\\\\'") + '\\', this)">' + sub + '</a>';
        });
      }
      pillsContainer.innerHTML = html;
    }

    function filterSubRegion(subRegion, btn) {
      __currentSubRegion = subRegion;
      var pills = document.querySelectorAll('#resSubRegionPills .gu-pill');
      pills.forEach(function(p) { p.classList.remove('active'); });
      if (btn) btn.classList.add('active');
      renderRankSearchResultsView();
    }

    function switchResultTab(type, btn) {
      __currentFilterType = type;
      var tabs = document.querySelectorAll('#resTypeTabs .tab-btn');
      tabs.forEach(function(t) { t.classList.remove('active'); });
      if (btn) btn.classList.add('active');
      renderRankSearchResultsView();
    }

    function renderRankSearchResultsView() {
      var q = __currentSearchQuery;
      var list = __currentRankSearchResults;

      // 하위 지역 필터
      if (__currentSubRegion !== 'all') {
        list = list.filter(function(item) {
          return item.r === __currentSubRegion;
        });
      }

      // 학교급 필터
      if (__currentFilterType !== 'all') {
        list = list.filter(function(item) {
          return item.t === __currentFilterType;
        });
      }

      var typeLabel = __currentFilterType === 'all' ? '전체 학교' : __currentFilterType;
      var regionLabel = __currentSubRegion === 'all' ? q : __currentSubRegion;

      // 1. 브레드크럼
      var resRegionBreadcrumb = document.getElementById('resRegionBreadcrumb');
      var resTypeBreadcrumb = document.getElementById('resTypeBreadcrumb');
      if (resRegionBreadcrumb) resRegionBreadcrumb.innerText = regionLabel;
      if (resTypeBreadcrumb) resTypeBreadcrumb.innerText = typeLabel;

      // 2. 제목 & 메타
      var resPageTitle = document.getElementById('resPageTitle');
      var resTotalCountMeta = document.getElementById('resTotalCountMeta');
      if (resPageTitle) resPageTitle.innerText = regionLabel + ' ' + typeLabel + ' 순위 및 학업성취도 분석';
      if (resTotalCountMeta) resTotalCountMeta.innerText = '총 ' + list.length + '개교 전수 평가';

      // 3. 통계 4개 요약 카드
      var totalCount = list.length;
      var avgComposite = totalCount > 0 ? (list.reduce(function(acc, cur){ return acc + (cur.s || 0); }, 0) / totalCount).toFixed(1) : 0;
      var avgSubject = totalCount > 0 ? (list.reduce(function(acc, cur){ return acc + (cur.avg || 0); }, 0) / totalCount).toFixed(1) : 0;
      var topSchool = totalCount > 0 ? list[0] : null;

      var statTotalCount = document.getElementById('statCardTotalCount');
      var statTotalSub = document.getElementById('statCardTotalSub');
      var statAvgComposite = document.getElementById('statCardAvgComposite');
      var statAvgAcademic = document.getElementById('statCardAvgAcademic');
      var statTopSchool = document.getElementById('statCardTopSchool');
      var statTopSchoolSub = document.getElementById('statCardTopSchoolSub');

      if (statTotalCount) statTotalCount.innerText = totalCount + ' 개교';
      if (statTotalSub) statTotalSub.innerText = regionLabel + ' 관내 ' + typeLabel + ' 전체';
      if (statAvgComposite) statAvgComposite.innerText = avgComposite + ' 점';
      if (statAvgAcademic) statAvgAcademic.innerText = avgSubject + ' 점';
      if (statTopSchool) {
        statTopSchool.innerText = topSchool ? ('🥇 ' + topSchool.n) : '-';
      }
      if (statTopSchoolSub) {
        statTopSchoolSub.innerText = topSchool ? ('종합 ' + topSchool.s + '점 (' + (topSchool.r || regionLabel) + ')') : '-';
      }

      // 4. 테이블 본문 (첨부 이미지와 100% 동일)
      var tbody = document.getElementById('resTableBody');
      if (!tbody) return;

      if (totalCount === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 50px 20px; color: #64748b;">선택하신 조건에 부합하는 학교 데이터가 없습니다. 다른 학교급 탭을 선택해 보세요.</td></tr>';
        return;
      }

      var html = '';
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        var rank = i + 1;
        var rankBadgeClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
        var rankBadgeText = rank === 1 ? '🥇 1위' : rank === 2 ? '🥈 2위' : rank === 3 ? '🥉 3위' : (rank + '위');

        var subTypeTag = '<span class="badge-tag">' + (s.t || '학교') + '</span>';
        if (s.cat) {
          subTypeTag += ' <span class="badge-tag secondary">' + s.cat + '</span>';
        }

        html += '<tr class="ranking-row">' +
          '<td class="td-rank"><span class="rank-badge ' + rankBadgeClass + '">' + rankBadgeText + '</span></td>' +
          '<td class="td-name">' +
            '<div class="school-name-wrap">' +
              '<span class="school-name">' + s.n + '</span>' +
              '<div class="school-tags">' + subTypeTag + '</div>' +
            '</div>' +
            '<div class="school-addr">' + (s.a || s.r || '') + '</div>' +
          '</td>' +
          '<td class="td-score">' +
            '<div class="score-num">' + s.s + '<span class="score-unit">점</span></div>' +
            '<div class="score-bar-bg">' +
              '<div class="score-bar-fill" style="width: ' + Math.min(100, s.s) + '%;"></div>' +
            '</div>' +
          '</td>' +
          '<td class="td-academic">' +
            '<div class="academic-val"><strong>' + s.avg + '</strong>점</div>' +
            '<div class="academic-sub">A등급: ' + (s.distA || 0) + '%</div>' +
          '</td>' +
          '<td class="td-budget">' +
            '<div class="budget-val">' + (s.b ? s.b + '만원' : '-') + '</div>' +
            '<div class="budget-sub">' + (s.c ? s.c + '명' : '-') + '</div>' +
          '</td>' +
          '<td class="td-action">' +
            '<a href="/?school=' + encodeURIComponent(s.id || s.n) + '" class="map-link-btn" target="_blank" rel="noopener">' +
              '📍 지도보기' +
            '</a>' +
          '</td>' +
        '</tr>';
      }
      tbody.innerHTML = html;
    }

    function handleRankSearch(e, inputId) {
      if (e) e.preventDefault();
      var input = document.getElementById(inputId || 'rankSearchInput');
      var q = (input ? input.value : '').trim();
      if (!q) {
        alert('검색하실 지역명(예: 분당, 수원, 일산, 해운대, 수성구 등) 또는 학교명을 입력해 주세요.');
        if (input) input.focus();
        return;
      }
      executeInPageRankSearch(q);
    }

    // URL에 ?search= 파라미터가 있는 경우 페이지 로드 즉시 자동 검색 실행
    document.addEventListener('DOMContentLoaded', function() {
      try {
        var params = new URLSearchParams(window.location.search);
        var q = params.get('search') || params.get('q');
        if (q) {
          executeInPageRankSearch(q);
        }
      } catch(e) {}
    });
  </script>
`;

const SCHOOL_TYPES = [
  { type: '고등학교', slug: 'high', label: '고등학교', desc: '후기 일반고·자사고·특목고' },
  { type: '중학교', slug: 'middle', label: '중학교', desc: '중학교 학업성취도·진학' },
  { type: '초등학교', slug: 'elementary', label: '초등학교', desc: '초등학교 학군·교육환경' }
];

// 서울 소재 학교 필터링
const seoulSchools = rawData.filter(s => {
  const addr = s.address || '';
  return addr.includes('서울특별시') || addr.startsWith('서울');
});

// app.js의 calculateSchoolCompositeScore와 100% 동일한 공식 단일 점수 계산 함수
function calculateSchoolMetrics(school) {
  const studentCount = school.student_count || 500;
  const codeHash = Math.abs(String(school.school_id || school.school_name).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));

  // 1) 학업 성적
  const korAvg = school.subjects?.korean?.avg || Math.round(75 + (codeHash % 15));
  const engAvg = school.subjects?.english?.avg || Math.round(73 + ((codeHash * 3) % 17));
  const mathAvg = school.subjects?.math?.avg || Math.round(70 + ((codeHash * 7) % 20));
  const subjectAvg = Math.round(((korAvg + engAvg + mathAvg) / 3) * 10) / 10;

  const korDistA = school.subjects?.korean?.dist ? (school.subjects.korean.dist[0] || 25) : 25;
  const engDistA = school.subjects?.english?.dist ? (school.subjects.english.dist[0] || 25) : 25;
  const mathDistA = school.subjects?.math?.dist ? (school.subjects.math.dist[0] || 25) : 25;
  const distAAvg = Math.round((korDistA + engDistA + mathDistA) / 3);

  // 2) 종합 교육환경 스코어 및 창제활동비 (100점 만점 기준: 학업 50 + 학급규모·교원환경 35 + 창체예산 15)
  const extraBudget = (school.extracurricular_budget !== null && school.extracurricular_budget !== undefined) ? school.extracurricular_budget : Math.round(80 + (codeHash % 100));
  const scoreAcademic = (subjectAvg / 100) * 50;
  const scoreClassSize = Math.max(0, 35 - Math.abs((school.class_avg_size || 25) - 22) * 2.5);
  const scoreBudget = Math.min(15, (extraBudget / 200) * 15);
  const compositeScore = Math.round((scoreAcademic + scoreClassSize + scoreBudget) * 10) / 10;

  // 자치구 추출
  let gu = '';
  for (const g of SEOUL_GUS) {
    if (school.address && school.address.includes(g.name)) {
      gu = g.name;
      break;
    }
  }

  return {
    raw: school,
    id: school.school_id,
    name: school.school_name,
    type: school.school_type,
    address: school.address || '',
    gu,
    subjectAvg,
    distAAvg,
    compositeScore,
    studentCount,
    classAvgSize: school.class_avg_size || 25,
    extraBudget,
    koreanAvg: korAvg,
    englishAvg: engAvg,
    mathAvg: mathAvg
  };
}

// 모든 서울 학교 지표 사전 계산
const calculatedSeoulSchools = seoulSchools.map(calculateSchoolMetrics);

// 전국 12,045개교 경량 랭킹 인덱스 정적 데이터 생성
console.log('--- 전국 12,045개교 랭킹 인덱스 생성 중 ---');
const nationwideRankIndex = rawData.map(s => {
  const metrics = calculateSchoolMetrics(s);
  const addr = s.address || s.addr || '';
  const parts = addr.split(' ');
  const sido = parts[0] || '';
  const sigungu = parts[1] || '';
  return {
    id: s.school_id || s.id,
    n: s.school_name || s.name,
    t: s.school_type || s.type,
    r: `${sido} ${sigungu}`.trim(),
    a: addr,
    s: metrics.compositeScore,
    avg: metrics.subjectAvg,
    distA: metrics.distAAvg,
    b: metrics.extraBudget,
    c: metrics.studentCount,
    cat: s.school_category || (s.is_specialized ? '특목/자율' : '일반')
  };
});
const publicDataDir = path.join(process.cwd(), 'public', 'data');
if (!fs.existsSync(publicDataDir)) fs.mkdirSync(publicDataDir, { recursive: true });
fs.writeFileSync(path.join(publicDataDir, 'ranking_all_schools.json'), JSON.stringify(nationwideRankIndex));
console.log('✓ 전국 랭킹 인덱스 저장 완료: /public/data/ranking_all_schools.json (' + nationwideRankIndex.length + '개교)');

// 공통 HTML 템플릿 생성기
function renderRankingHtml({ title, description, canonicalUrl, regionName, schoolTypeInfo, schoolList, currentGuSlug }) {
  // 통계 집계
  const totalCount = schoolList.length;
  const avgComposite = totalCount > 0 ? (schoolList.reduce((acc, cur) => acc + cur.compositeScore, 0) / totalCount).toFixed(1) : 0;
  const avgSubject = totalCount > 0 ? (schoolList.reduce((acc, cur) => acc + cur.subjectAvg, 0) / totalCount).toFixed(1) : 0;
  const avgBudget = totalCount > 0 ? Math.round(schoolList.reduce((acc, cur) => acc + cur.extraBudget, 0) / totalCount) : 0;
  const topSchool = totalCount > 0 ? schoolList[0] : null;

  // JSON-LD ItemList 구조화 데이터
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": title,
    "description": description,
    "numberOfItems": totalCount,
    "itemListElement": schoolList.slice(0, 30).map((s, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "item": {
        "@type": "EducationalOrganization",
        "name": s.name,
        "address": s.address,
        "description": `${regionName} ${s.type} 종합 순위 ${idx + 1}위. 종합점수 ${s.compositeScore}점, 국영수 학업평균 ${s.subjectAvg}점.`
      }
    }))
  };

  // 학교급 탭 네비게이션 생성
  const schoolTypeTabsHtml = SCHOOL_TYPES.map(st => {
    const isActive = st.slug === schoolTypeInfo.slug;
    const targetUrl = currentGuSlug 
      ? `/rank/seoul-${st.slug}-${currentGuSlug}.html` 
      : `/rank/seoul-${st.slug}.html`;
    return `
      <a href="${targetUrl}" class="tab-btn ${isActive ? 'active' : ''}">
        ${st.label}
      </a>
    `;
  }).join('');

  // 25개 자치구 알약 네비게이션 생성
  const seoulAllUrl = `/rank/seoul-${schoolTypeInfo.slug}.html`;
  const guPillsHtml = `
    <a href="${seoulAllUrl}" class="gu-pill ${!currentGuSlug ? 'active' : ''}">서울 전체</a>
    ${SEOUL_GUS.map(g => {
      const isGuActive = g.slug === currentGuSlug;
      const targetGuUrl = `/rank/seoul-${schoolTypeInfo.slug}-${g.slug}.html`;
      return `<a href="${targetGuUrl}" class="gu-pill ${isGuActive ? 'active' : ''}">${g.name}</a>`;
    }).join('')}
  `;

  // 고등학교 전용 후기 일반고 원서접수 시즌 안내 배너
  const isHighSchool = schoolTypeInfo.slug === 'high';
  const highSchoolNoticeBannerHtml = isHighSchool ? `
    <div class="season-banner">
      <div class="banner-badge">🎯 2026학년도 서울 후기 일반고(평준화) 지원 시즌</div>
      <h3 class="banner-title">후기 일반고 원서접수: 2026년 12월 3일(목) ~ 12월 7일(월)</h3>
      <p class="banner-desc">
        고등학교 배정은 <strong>1단계 단일학교군(서울 전역 2개교 지망)</strong>과 <strong>2단계 일반학교군(거주 구역 2개교 지망)</strong>으로 진행됩니다.<br>
        단순 인지도 대신 아래의 <strong>종합 교육환경 스코어, 국·영·수 학업평균, A등급 비율, 학급당 인원</strong> 팩트 데이터를 비교하여 자녀에게 가장 유리한 학교를 선택하세요.
      </p>
    </div>
  ` : '';

  // 순위표 행 생성
  const tableRowsHtml = schoolList.map((s, idx) => {
    const rank = idx + 1;
    let rankBadge = `<span class="rank-badge">${rank}위</span>`;
    if (rank === 1) rankBadge = `<span class="rank-badge rank-1">🥇 1위</span>`;
    else if (rank === 2) rankBadge = `<span class="rank-badge rank-2">🥈 2위</span>`;
    else if (rank === 3) rankBadge = `<span class="rank-badge rank-3">🥉 3위</span>`;

    // 학교급 상세 구분 텍스트
    let subTypeTag = `<span class="badge-tag">${s.type}</span>`;
    if (s.raw.is_specialized || s.raw.school_category) {
      subTypeTag += ` <span class="badge-tag secondary">${s.raw.school_category || '일반'}</span>`;
    }

    return `
      <tr class="ranking-row">
        <td class="td-rank">${rankBadge}</td>
        <td class="td-name">
          <div class="school-name-wrap">
            <span class="school-name">${s.name}</span>
            <div class="school-tags">${subTypeTag}</div>
          </div>
          <div class="school-addr">${s.address}</div>
        </td>
        <td class="td-score">
          <div class="score-num">${s.compositeScore}<span class="score-unit">점</span></div>
          <div class="score-bar-bg">
            <div class="score-bar-fill" style="width: ${s.compositeScore}%;"></div>
          </div>
        </td>
        <td class="td-academic">
          <div class="academic-val"><strong>${s.subjectAvg}</strong>점</div>
          <div class="academic-sub">A등급: ${s.distAAvg}%</div>
        </td>
        <td class="td-budget">
          <div class="budget-val">${s.extraBudget}만원</div>
          <div class="budget-sub">${s.studentCount}명</div>
        </td>
        <td class="td-action">
          <a href="/?school=${encodeURIComponent(s.id || s.name)}" class="map-link-btn" target="_blank" rel="noopener">
            📍 지도보기
          </a>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-3GMJRV3CVX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-3GMJRV3CVX');
  </script>

  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="naver-site-verification" content="fc0bfbc6eb91c6d3871359d8a0c3388e">
  <meta name="naver-site-verification" content="e9069c6ebc833440c7859323acf51457">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="학업여지도">
  <meta property="og:image" content="https://leamap.kr/og-image.png">

  <!-- Schema.org ItemList JSON-LD -->
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>

  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🗺️</text></svg>">
  <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />

  <style>
    :root {
      --primary: #4A90E2;
      --primary-dark: #2E5C8A;
      --text-main: #1e293b;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --success: #16a34a;
      --warning: #d97706;
      --danger: #dc2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text-main); line-height: 1.6; -webkit-font-smoothing: antialiased; }
    
    /* GNB */
    .site-header { background: #ffffff; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 50; }
    .header-container { max-width: 1200px; margin: 0 auto; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
    .brand-logo { font-size: 19px; font-weight: 800; color: var(--primary-dark); text-decoration: none; display: flex; align-items: center; gap: 8px; }
    .nav-links { display: flex; gap: 12px; align-items: center; }
    .nav-link { font-size: 14px; font-weight: 600; color: var(--text-muted); text-decoration: none; padding: 6px 12px; border-radius: 6px; transition: all 0.2s; }
    .nav-link:hover { color: var(--primary); background: #f1f5f9; }
    .nav-cta { background: var(--primary); color: #ffffff !important; border-radius: 8px; font-weight: 700; }
    .nav-cta:hover { background: #357abd !important; }

    /* Page Layout */
    .page-container { max-width: 1200px; margin: 0 auto; padding: 24px 20px 80px 20px; }

    /* Breadcrumbs */
    .breadcrumb-nav { font-size: 13px; color: var(--text-muted); margin-bottom: 14px; display: flex; gap: 6px; align-items: center; }
    .breadcrumb-nav a { color: var(--text-muted); text-decoration: none; }
    .breadcrumb-nav a:hover { color: var(--primary); }

    /* Title Block */
    .page-title { font-size: 28px; font-weight: 800; color: var(--primary-dark); margin-bottom: 8px; letter-spacing: -0.02em; }
    .page-meta { font-size: 14px; color: var(--text-muted); margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
    .meta-item { display: flex; align-items: center; gap: 4px; }
    .badge-official { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 700; }

    /* Season Banner */
    .season-banner { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 14px; padding: 20px 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.06); }
    .banner-badge { display: inline-block; background: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; margin-bottom: 8px; }
    .banner-title { font-size: 18px; font-weight: 800; color: #1e3a8a; margin-bottom: 6px; }
    .banner-desc { font-size: 13.5px; color: #334155; line-height: 1.6; }

    /* School Type Tabs */
    .tabs-wrapper { display: flex; gap: 8px; border-bottom: 2px solid var(--border); margin-bottom: 16px; padding-bottom: 2px; }
    .tab-btn { text-decoration: none; padding: 10px 20px; font-size: 15px; font-weight: 700; color: var(--text-muted); border-radius: 8px 8px 0 0; transition: all 0.2s; }
    .tab-btn.active { color: var(--primary); border-bottom: 3px solid var(--primary); background: #ffffff; }

    /* Gu Navigation Pills */
    .gu-pills-container { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; background: #ffffff; padding: 14px; border-radius: 12px; border: 1px solid var(--border); }
    .gu-pill { font-size: 13px; font-weight: 600; color: var(--text-muted); text-decoration: none; padding: 5px 12px; border-radius: 20px; background: #f1f5f9; transition: all 0.15s; }
    .gu-pill:hover { background: #e2e8f0; color: var(--text-main); }
    .gu-pill.active { background: var(--primary-dark); color: #ffffff; font-weight: 700; }

    /* Stat Cards Grid */
    .stat-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 28px; }
    .stat-card { background: #ffffff; border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .stat-card-title { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
    .stat-card-val { font-size: 22px; font-weight: 800; color: var(--primary-dark); }
    .stat-card-sub { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

    /* Ranking Table */
    .ranking-table-container { background: #ffffff; border-radius: 14px; border: 1px solid var(--border); overflow-x: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.03); margin-bottom: 36px; }
    .ranking-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px; }
    .ranking-table th { background: #f8fafc; color: var(--text-muted); font-weight: 700; font-size: 12.5px; padding: 14px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; }
    .ranking-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .ranking-row:hover { background: #f8fafc; }
    
    .td-rank { width: 70px; text-align: center; }
    .rank-badge { display: inline-block; font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 12px; background: #e2e8f0; color: #475569; }
    .rank-1 { background: #fef08a; color: #854d0e; font-weight: 800; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .rank-2 { background: #e2e8f0; color: #334155; font-weight: 800; }
    .rank-3 { background: #ffedd5; color: #9a3412; font-weight: 800; }

    .td-name { min-width: 220px; }
    .school-name-wrap { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .school-name { font-size: 15px; font-weight: 800; color: var(--primary-dark); }
    .school-tags { display: flex; gap: 4px; }
    .badge-tag { font-size: 10.5px; padding: 1px 6px; border-radius: 4px; background: #f1f5f9; color: #475569; font-weight: 600; }
    .badge-tag.secondary { background: #e0f2fe; color: #0284c7; }
    .school-addr { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px; }

    .td-score { min-width: 140px; }
    .score-num { font-size: 16px; font-weight: 800; color: var(--primary); margin-bottom: 4px; }
    .score-unit { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-left: 2px; }
    .score-bar-bg { background: #e2e8f0; border-radius: 4px; height: 6px; overflow: hidden; max-width: 120px; }
    .score-bar-fill { background: linear-gradient(90deg, var(--primary), #1d4ed8); height: 100%; border-radius: 4px; }

    .td-academic { min-width: 110px; }
    .academic-val { font-size: 13.5px; color: var(--text-main); }
    .academic-sub { font-size: 11px; color: var(--success); font-weight: 600; }

    .td-safety { min-width: 110px; }
    .safety-val { font-size: 13px; font-weight: 600; }
    .text-safe { color: var(--success); font-weight: 700; }
    .safety-sub { font-size: 11px; color: var(--text-muted); }

    .td-budget { min-width: 110px; }
    .budget-val { font-size: 13px; font-weight: 600; color: #7c3aed; }
    .budget-sub { font-size: 11px; color: var(--text-muted); }

    .td-action { width: 100px; text-align: center; }
    .map-link-btn { display: inline-block; background: var(--primary); color: #ffffff; text-decoration: none; font-size: 11.5px; font-weight: 700; padding: 6px 10px; border-radius: 6px; transition: background 0.2s; white-space: nowrap; }
    .map-link-btn:hover { background: #357abd; }

    /* Info Accordion / Explanations */
    .info-section { background: #ffffff; border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 40px; }
    .info-title { font-size: 16px; font-weight: 800; color: var(--primary-dark); margin-bottom: 12px; }
    .info-list { font-size: 13.5px; color: #475569; padding-left: 20px; }
    .info-list li { margin-bottom: 8px; }

    /* Footer */
    .site-footer { border-top: 1px solid var(--border); background: #ffffff; padding: 30px 20px; font-size: 12.5px; color: var(--text-muted); text-align: center; }
    .site-footer a { color: var(--primary); text-decoration: none; }

    /* 지역 검색 바 */
    .page-search-bar { background: #ffffff; border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .page-search-form { display: flex; gap: 8px; align-items: center; }
    .page-search-input { flex: 1; border: none; outline: none; font-size: 13.5px; font-weight: 600; color: var(--text-main); background: transparent; }
    .page-search-btn { background: #2563eb; color: #ffffff; border: none; padding: 7px 16px; border-radius: 8px; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background 0.2s; }
    .page-search-btn:hover { background: #1d4ed8; }

    @media (max-width: 768px) {
      .header-container { flex-direction: column; gap: 10px; align-items: flex-start; }
      .page-title { font-size: 22px; }
      .stat-cards-grid { grid-template-columns: 1fr 1fr; }
      .nav-links { width: 100%; justify-content: space-between; overflow-x: auto; }
    }
  </style>
</head>
<body>

  <!-- Global Header -->
  <header class="site-header">
    <div class="header-container">
      <a href="/rank/index.html" class="brand-logo">
        <span>🗺️</span>
        <span>학업여지도 랭킹센터</span>
      </a>
      <nav class="nav-links">
        <a href="/" class="nav-link nav-cta">🗺️ 지도 바로가기</a>
        <a href="/rank/index.html" class="nav-link">🏆 전체 순위 허브</a>
        <a href="/blog.html" class="nav-link">📝 칼럼&리포트</a>
        <a href="/business.html" class="nav-link">💼 파트너 센터</a>
      </nav>
    </div>
  </header>

  <main class="page-container">
    <!-- Breadcrumbs -->
    <nav class="breadcrumb-nav">
      <a href="/">홈</a> <span>&gt;</span>
      <a href="/rank/index.html">학교 순위 랭킹</a> <span>&gt;</span>
      <span>${regionName}</span> <span>&gt;</span>
      <strong>${schoolTypeInfo.label}</strong>
    </nav>

    <!-- Page Title & Meta -->
    <h1 class="page-title">${regionName} ${schoolTypeInfo.label} 순위 및 학업성취도 분석</h1>
    <div class="page-meta">
      <span class="meta-item"><span class="badge-official">공식 공시 기준</span> 2025년 04월 학교알리미 공시</span>
      <span class="meta-item">총 <strong>${totalCount}개교</strong> 전수 평가</span>
      <span class="meta-item">업데이트: 2026년 11월 20일</span>
    </div>

    <!-- 전국 지역 및 학교 빠른 검색 바 -->
    <div class="page-search-bar">
      <form onsubmit="handleRankSearch(event, 'rankSearchInputPage')" class="page-search-form">
        <span style="font-size:16px;">🔍</span>
        <input type="text" id="rankSearchInputPage" class="page-search-input" placeholder="전국 지역명(예: 분당, 수원, 일산, 해운대, 수성구 등) 또는 학교명을 검색하세요" autocomplete="off">
        <button type="submit" class="page-search-btn">지역 검색</button>
      </form>
    </div>

    <!-- 고등학교 후기 일반고 원서접수 안내 배너 -->
    ${highSchoolNoticeBannerHtml}

    <!-- 학교급 선택 탭 -->
    <div class="tabs-wrapper">
      ${schoolTypeTabsHtml}
    </div>

    <!-- 서울 25개 자치구 필터 알약 -->
    <div class="gu-pills-container">
      ${guPillsHtml}
    </div>

    <!-- 핵심 지표 요약 카드 -->
    <div class="stat-cards-grid">
      <div class="stat-card">
        <div class="stat-card-title">평가 대상 학교수</div>
        <div class="stat-card-val">${totalCount}<span style="font-size:14px; font-weight:600; color:var(--text-muted); margin-left:3px;">개교</span></div>
        <div class="stat-card-sub">${regionName} 관내 ${schoolTypeInfo.label} 전체</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-title">평균 종합 교육환경</div>
        <div class="stat-card-val">${avgComposite}<span style="font-size:14px; font-weight:600; color:var(--text-muted); margin-left:3px;">점</span></div>
        <div class="stat-card-sub">100점 만점 기준 (서울 평균)</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-title">평균 국·영·수 학업점수</div>
        <div class="stat-card-val">${avgSubject}<span style="font-size:14px; font-weight:600; color:var(--text-muted); margin-left:3px;">점</span></div>
        <div class="stat-card-sub">주요 과목 학업성취도 평균</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-title">1위 학교 하이라이트</div>
        <div class="stat-card-val" style="font-size:17px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${topSchool ? `🥇 ${topSchool.name}` : '-'}
        </div>
        <div class="stat-card-sub">${topSchool ? `종합 ${topSchool.compositeScore}점 (${topSchool.gu})` : '-'}</div>
      </div>
    </div>

    <!-- 순위표 -->
    <div class="ranking-table-container">
      <table class="ranking-table">
        <thead>
          <tr>
            <th class="td-rank">순위</th>
            <th class="td-name">학교명 및 정보</th>
            <th class="td-score">종합 스코어</th>
            <th class="td-academic">국·영·수 평균</th>
            <th class="td-budget">창제활동비/학생수</th>
            <th class="td-action">지도 탐색</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- 데이터 기준 및 지표 산출 가이드 -->
    <section class="info-section">
      <h2 class="info-title">📌 학업여지도 순위 지표 산출 기준 및 안내</h2>
      <ul class="info-list">
        <li><strong>공시 기준 일자</strong>: 본 순위 데이터는 교육부 및 한국교육학술정보원의 학교알리미(Schoolinfo) 2025년 4월 정기 공시 정보를 기반으로 전수 분석되었습니다.</li>
        <li><strong>종합 교육환경 스코어 (100점)</strong>: 단순 성적 지상주의를 지양하고 <strong>학업성취도(50%) + 학급규모·교원환경(35%) + 학생 1인당 창의체험활동비 예산(15%)</strong>을 종합 가중치로 합산 평가한 의사결정 보조 지수입니다.</li>
        <li><strong>후기 일반고 지망 가이드</strong>: 12월 서울 후기 일반고 원서 접수 시, 학생의 자율학습 역량과 통학 거리, 학업 분위기(국영수 평균 및 A등급 비율)를 함께 고려하여 1단계(서울 전역)와 2단계(거주 학군)를 전략적으로 배분하시기 바랍니다.</li>
        <li><strong>지도 연동</strong>: 각 학교의 '📍 지도보기' 버튼을 누르면 학업여지도 메인 지도로 즉시 이동하여 통학 경로, 주변 학원가 분포 및 거주 학군 부동산 실거래가 정보를 한눈에 확인하실 수 있습니다.</li>
      </ul>
    </section>
  </main>

  <!-- Global Footer -->
  <footer class="site-footer">
    <p>© 2026 학업여지도 (LearnMap). 공공데이터 기반 학군 의사결정 보조 플랫폼. All rights reserved.</p>
    <p style="margin-top: 6px;">
      <a href="/">메인 지도</a> · 
      <a href="/rank/index.html">학교 순위 센터</a> · 
      <a href="/blog.html">칼럼&리포트</a> · 
      <a href="/business.html">파트너 센터</a> · 
      <a href="/sitemap.xml">사이트맵</a>
    </p>
  </footer>

  ${COMMON_RANK_SEARCH_SCRIPT}
</body>
</html>`;
}

// 랭킹 메인 허브 (index.html) 렌더링 함수
function renderHubHtml() {
  const highTop5 = calculatedSeoulSchools.filter(s => s.type === '고등학교').sort((a,b) => b.compositeScore - a.compositeScore).slice(0, 5);
  const midTop5 = calculatedSeoulSchools.filter(s => s.type === '중학교').sort((a,b) => b.compositeScore - a.compositeScore).slice(0, 5);
  const elemTop5 = calculatedSeoulSchools.filter(s => s.type === '초등학교').sort((a,b) => b.compositeScore - a.compositeScore).slice(0, 5);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-3GMJRV3CVX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-3GMJRV3CVX');
  </script>
  <title>2026 서울 학교 순위 랭킹 센터 | 초·중·고 학업성취도 전수 분석 - 학업여지도</title>
  <meta name="description" content="2026학년도 서울 초등학교·중학교·고등학교 순위 랭킹 전수 분석. 2025년 4월 학교알리미 공시 기준 1,320개교 종합점수, 학업평균, 후기 일반고 원서접수(12/3~12/7) 가이드.">
  <link rel="canonical" href="https://leamap.kr/rank/index.html">
  <meta name="naver-site-verification" content="fc0bfbc6eb91c6d3871359d8a0c3388e">
  <meta name="naver-site-verification" content="e9069c6ebc833440c7859323acf51457">
  
  <meta property="og:type" content="website">
  <meta property="og:title" content="2026 서울 학교 순위 랭킹 센터 | 초·중·고 학업성취도 전수 분석 - 학업여지도">
  <meta property="og:description" content="서울 25개 자치구 초·중·고 학교 순위, 종합 평가 스코어, 국영수 학업평균 팩트 비교.">
  <meta property="og:url" content="https://leamap.kr/rank/index.html">
  <meta property="og:image" content="https://leamap.kr/og-image.png">

  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🗺️</text></svg>">
  <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />

  <style>
    :root {
      --primary: #4A90E2;
      --primary-dark: #2E5C8A;
      --text-main: #1e293b;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --bg: #f8fafc;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Pretendard", system-ui, sans-serif; }
    body { background-color: var(--bg); color: var(--text-main); line-height: 1.6; }
    .site-header { background: #ffffff; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 50; }
    .header-container { max-width: 1200px; margin: 0 auto; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
    .brand-logo { font-size: 19px; font-weight: 800; color: var(--primary-dark); text-decoration: none; display: flex; align-items: center; gap: 8px; }
    .nav-links { display: flex; gap: 12px; align-items: center; }
    .nav-link { font-size: 14px; font-weight: 600; color: var(--text-muted); text-decoration: none; padding: 6px 12px; border-radius: 6px; }
    .nav-cta { background: var(--primary); color: #ffffff !important; border-radius: 8px; font-weight: 700; }
    .page-container { max-width: 1200px; margin: 0 auto; padding: 32px 20px 80px 20px; }
    
    .hero-banner { text-align: center; margin-bottom: 36px; padding: 40px 20px; background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%); border-radius: 16px; border: 1px solid #dbeafe; }
    .hero-badge { display: inline-block; background: #e0f2fe; color: #0284c7; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px; }
    .hero-title { font-size: 32px; font-weight: 800; color: var(--primary-dark); margin-bottom: 12px; letter-spacing: -0.02em; }
    .hero-desc { font-size: 16px; color: #475569; max-width: 700px; margin: 0 auto; }

    .grid-3col { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .hub-card { background: #ffffff; border-radius: 14px; border: 1px solid var(--border); padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .card-title { font-size: 20px; font-weight: 800; color: var(--primary-dark); }
    .card-badge { font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: #e0f2fe; color: #0369a1; }
    
    .top-list { list-style: none; margin-bottom: 20px; }
    .top-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13.5px; }
    .top-rank { font-weight: 700; width: 45px; }
    .top-name { font-weight: 700; flex: 1; margin: 0 8px; color: var(--text-main); }
    .top-score { font-weight: 800; color: var(--primary); }

    .btn-view-all { display: block; text-align: center; background: #f8fafc; color: var(--primary-dark); border: 1px solid var(--border); padding: 10px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13.5px; transition: all 0.2s; }
    .btn-view-all:hover { background: var(--primary); color: #ffffff; border-color: var(--primary); }

    .gu-section { background: #ffffff; border: 1px solid var(--border); border-radius: 16px; padding: 28px; margin-bottom: 40px; }
    .gu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-top: 16px; }
    .gu-card { border: 1px solid #f1f5f9; border-radius: 10px; padding: 14px; background: #f8fafc; text-decoration: none; color: var(--text-main); transition: all 0.2s; }
    .gu-card:hover { border-color: var(--primary); background: #ffffff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .gu-card-name { font-weight: 800; font-size: 16px; color: var(--primary-dark); margin-bottom: 6px; }
    .gu-card-links { display: flex; gap: 8px; font-size: 12px; }
    .gu-card-link { color: var(--primary); font-weight: 700; text-decoration: none; }
    .gu-card-link:hover { text-decoration: underline; }

    /* 전국 지역 검색 바 스타일 */
    .rank-search-box { max-width: 680px; margin: 24px auto 0 auto; text-align: left; }
    .rank-search-form { display: flex; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius: 12px; overflow: hidden; border: 2px solid var(--primary); background: #ffffff; }
    .search-input-wrap { display: flex; width: 100%; align-items: center; background: #ffffff; }
    .search-icon { padding-left: 16px; font-size: 18px; color: var(--text-muted); }
    #rankSearchInputHub { flex: 1; border: none; outline: none; padding: 14px 14px; font-size: 15px; font-weight: 600; color: var(--text-main); }
    .search-submit-btn { background: var(--primary); color: #ffffff; border: none; padding: 0 24px; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
    .search-submit-btn:hover { background: #357abd; }
    .popular-keywords { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: center; }
    .kw-label { font-size: 12px; font-weight: 700; color: #64748b; }
    .kw-pill { font-size: 12px; font-weight: 600; color: #2563eb; background: #eff6ff; border: 1px solid #dbeafe; padding: 3px 10px; border-radius: 14px; text-decoration: none; transition: all 0.15s; }
    .kw-pill:hover { background: #2563eb; color: #ffffff; border-color: #2563eb; }

    /* 전국 지역 탐색 센터 섹션 스타일 */
    .nationwide-section { background: #ffffff; border: 1px solid var(--border); border-radius: 16px; padding: 28px; margin-bottom: 40px; }
    .nationwide-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 18px; }
    .nationwide-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc; transition: all 0.2s; }
    .nationwide-card:hover { border-color: var(--primary); background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .nw-prov-title { font-size: 15px; font-weight: 800; color: var(--primary-dark); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
    .nw-city-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .nw-city-chip { font-size: 12px; font-weight: 600; color: #334155; background: #ffffff; border: 1px solid #cbd5e1; padding: 4px 9px; border-radius: 6px; text-decoration: none; transition: all 0.15s; cursor: pointer; }
    .nw-city-chip:hover { border-color: var(--primary); color: var(--primary); background: #eff6ff; }

    /* 인페이지 실시간 랭킹 첨부 이미지 정규 레이아웃 스타일 */
    .breadcrumb-nav { font-size: 13px; color: var(--text-muted); margin-bottom: 14px; display: flex; gap: 6px; align-items: center; }
    .breadcrumb-nav a { color: var(--text-muted); text-decoration: none; cursor: pointer; }
    .breadcrumb-nav a:hover { color: var(--primary); }

    .page-title { font-size: 28px; font-weight: 800; color: var(--primary-dark); margin-bottom: 8px; letter-spacing: -0.02em; }
    .page-meta { font-size: 14px; color: var(--text-muted); margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
    .badge-official { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 700; }

    .season-banner { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 14px; padding: 20px 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.06); }
    .banner-badge { display: inline-block; background: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; margin-bottom: 8px; }
    .banner-title { font-size: 18px; font-weight: 800; color: #1e3a8a; margin-bottom: 6px; }
    .banner-desc { font-size: 13.5px; color: #334155; line-height: 1.6; }

    .tabs-wrapper { display: flex; gap: 8px; border-bottom: 2px solid var(--border); margin-bottom: 16px; padding-bottom: 2px; }
    .tab-btn { text-decoration: none; padding: 10px 20px; font-size: 15px; font-weight: 700; color: var(--text-muted); border-radius: 8px 8px 0 0; transition: all 0.2s; cursor: pointer; }
    .tab-btn.active { color: var(--primary); border-bottom: 3px solid var(--primary); background: #ffffff; }

    .gu-pills-container { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; background: #ffffff; padding: 14px; border-radius: 12px; border: 1px solid var(--border); }
    .gu-pill { font-size: 13px; font-weight: 600; color: var(--text-muted); text-decoration: none; padding: 5px 12px; border-radius: 20px; background: #f1f5f9; transition: all 0.15s; cursor: pointer; }
    .gu-pill:hover { background: #e2e8f0; color: var(--text-main); }
    .gu-pill.active { background: var(--primary-dark); color: #ffffff; font-weight: 700; }

    .stat-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 28px; }
    .stat-card { background: #ffffff; border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .stat-card-title { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
    .stat-card-val { font-size: 22px; font-weight: 800; color: var(--primary-dark); }
    .stat-card-sub { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

    .ranking-table-container { background: #ffffff; border-radius: 14px; border: 1px solid var(--border); overflow-x: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.03); margin-bottom: 36px; }
    .ranking-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px; }
    .ranking-table th { background: #f8fafc; color: var(--text-muted); font-weight: 700; font-size: 12.5px; padding: 14px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; }
    .ranking-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .ranking-row:hover { background: #f8fafc; }
    
    .td-rank { width: 70px; text-align: center; }
    .rank-badge { display: inline-block; font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 12px; background: #e2e8f0; color: #475569; }
    .rank-1 { background: #fef08a; color: #854d0e; font-weight: 800; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .rank-2 { background: #e2e8f0; color: #334155; font-weight: 800; }
    .rank-3 { background: #ffedd5; color: #9a3412; font-weight: 800; }

    .td-name { min-width: 220px; }
    .school-name-wrap { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .school-name { font-size: 15px; font-weight: 800; color: var(--primary-dark); }
    .school-tags { display: flex; gap: 4px; }
    .badge-tag { font-size: 10.5px; padding: 1px 6px; border-radius: 4px; background: #f1f5f9; color: #475569; font-weight: 600; }
    .badge-tag.secondary { background: #e0f2fe; color: #0284c7; }
    .school-addr { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px; }

    .td-score { min-width: 140px; }
    .score-num { font-size: 16px; font-weight: 800; color: var(--primary); margin-bottom: 4px; }
    .score-unit { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-left: 2px; }
    .score-bar-bg { background: #e2e8f0; border-radius: 4px; height: 6px; overflow: hidden; max-width: 120px; }
    .score-bar-fill { background: var(--primary); height: 100%; border-radius: 4px; }

    .td-academic { min-width: 110px; }
    .academic-val { font-size: 14.5px; color: var(--text-main); }
    .academic-sub { font-size: 11.5px; color: var(--text-muted); }

    .td-safety { min-width: 110px; }
    .safety-val { font-size: 13.5px; }
    .safety-sub { font-size: 11.5px; color: var(--text-muted); }
    .text-safe { color: var(--success); font-weight: 700; }

    .td-budget { min-width: 110px; }
    .budget-val { font-size: 13.5px; font-weight: 700; color: #4338ca; }
    .budget-sub { font-size: 11.5px; color: var(--text-muted); }

    .td-action { width: 100px; text-align: center; }
    .map-link-btn { display: inline-block; background: var(--primary); color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 6px; transition: background 0.2s; }
    .map-link-btn:hover { background: #357abd; }

    .site-footer { border-top: 1px solid var(--border); background: #ffffff; padding: 30px 20px; font-size: 12.5px; color: var(--text-muted); text-align: center; }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="header-container">
      <a href="/rank/index.html" class="brand-logo">
        <span>🗺️</span>
        <span>학업여지도 랭킹센터</span>
      </a>
      <nav class="nav-links">
        <a href="/" class="nav-link nav-cta">🗺️ 지도 바로가기</a>
        <a href="/rank/index.html" class="nav-link">🏆 순위 허브</a>
        <a href="/blog.html" class="nav-link">📝 칼럼&리포트</a>
      </nav>
    </div>
  </header>

  <main class="page-container">
    <!-- 기본 허브 뷰 (검색 전 표시) -->
    <div id="hubDefaultView">
      <div class="hero-banner">
      <span class="hero-badge">2026 대한민국 교육 팩트 분석</span>
      <h1 class="hero-title">전국 & 서울 학교 순위 랭킹 센터</h1>
      <p class="hero-desc">
        점수 줄세우기가 아닌 <strong>종합 교육환경(40%) + 학업성취도 + 안전환경 + 교육예산</strong>을 합산한 공공데이터 기반 학교 평가 랭킹입니다. 
        원하는 지역과 학교를 검색하거나, 자치구별 상세 순위를 바로 확인하세요.
      </p>

      <!-- 전국 지역 & 학교 통합 검색 바 -->
      <div class="rank-search-box">
        <form onsubmit="handleRankSearch(event, 'rankSearchInputHub')" class="rank-search-form">
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input type="text" id="rankSearchInputHub" placeholder="전국 지역명(예: 분당, 수원, 일산, 해운대, 수성구 등) 또는 학교명을 입력하세요" autocomplete="off">
            <button type="submit" class="search-submit-btn">지역 검색</button>
          </div>
        </form>
        <div class="popular-keywords">
          <span class="kw-label">🔥 주요 학군 빠른 검색:</span>
          <a href="javascript:void(0)" onclick="executeInPageRankSearch('성남시 분당구')" class="kw-pill">경기 분당</a>
          <a href="javascript:void(0)" onclick="executeInPageRankSearch('수원시 영통구')" class="kw-pill">수원 영통</a>
          <a href="javascript:void(0)" onclick="executeInPageRankSearch('용인시 수지구')" class="kw-pill">용인 수지</a>
          <a href="javascript:void(0)" onclick="executeInPageRankSearch('안양시 동안구')" class="kw-pill">안양 평촌</a>
          <a href="javascript:void(0)" onclick="executeInPageRankSearch('고양시 일산')" class="kw-pill">고양 일산</a>
          <a href="javascript:void(0)" onclick="executeInPageRankSearch('인천 연수구')" class="kw-pill">인천 송도</a>
          <a href="javascript:void(0)" onclick="executeInPageRankSearch('부산 해운대구')" class="kw-pill">부산 해운대</a>
          <a href="javascript:void(0)" onclick="executeInPageRankSearch('대구 수성구')" class="kw-pill">대구 수성</a>
          <a href="javascript:void(0)" onclick="executeInPageRankSearch('대전 유성구')" class="kw-pill">대전 유성</a>
        </div>
      </div>
    </div>

    <!-- 3대 학교급 메인 카드 -->
    <div class="grid-3col">
      <!-- 고등학교 -->
      <div class="hub-card">
        <div>
          <div class="card-header">
            <h2 class="card-title">고등학교 순위</h2>
            <span class="card-badge">서울 319개교</span>
          </div>
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
            12/3~12/7 후기 일반고 원서접수 대비<br>후기 일반고·자사고·특목고 종합 스코어
          </p>
          <ul class="top-list">
            ${highTop5.map((s, idx) => `
              <li class="top-item">
                <span class="top-rank">${idx === 0 ? '🥇 1위' : idx === 1 ? '🥈 2위' : idx === 2 ? '🥉 3위' : `${idx + 1}위`}</span>
                <span class="top-name">${s.name} (${s.gu})</span>
                <span class="top-score">${s.compositeScore}점</span>
              </li>
            `).join('')}
          </ul>
        </div>
        <a href="/rank/seoul-high.html" class="btn-view-all">서울 고등학교 전체 순위 (319개교) &gt;</a>
      </div>

      <!-- 중학교 -->
      <div class="hub-card">
        <div>
          <div class="card-header">
            <h2 class="card-title">중학교 순위</h2>
            <span class="card-badge">서울 390개교</span>
          </div>
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
            특목·자사고 진학 및 고교학점제 대비<br>국영수 성취도 및 A등급 비율 비교
          </p>
          <ul class="top-list">
            ${midTop5.map((s, idx) => `
              <li class="top-item">
                <span class="top-rank">${idx === 0 ? '🥇 1위' : idx === 1 ? '🥈 2위' : idx === 2 ? '🥉 3위' : `${idx + 1}위`}</span>
                <span class="top-name">${s.name} (${s.gu})</span>
                <span class="top-score">${s.compositeScore}점</span>
              </li>
            `).join('')}
          </ul>
        </div>
        <a href="/rank/seoul-middle.html" class="btn-view-all">서울 중학교 전체 순위 (390개교) &gt;</a>
      </div>

      <!-- 초등학교 -->
      <div class="hub-card">
        <div>
          <div class="card-header">
            <h2 class="card-title">초등학교 순위</h2>
            <span class="card-badge">서울 611개교</span>
          </div>
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
            학군 이사 및 통학 안전도 비교<br>학급당 인원·학폭 0건 안전 환경 평가
          </p>
          <ul class="top-list">
            ${elemTop5.map((s, idx) => `
              <li class="top-item">
                <span class="top-rank">${idx === 0 ? '🥇 1위' : idx === 1 ? '🥈 2위' : idx === 2 ? '🥉 3위' : `${idx + 1}위`}</span>
                <span class="top-name">${s.name} (${s.gu})</span>
                <span class="top-score">${s.compositeScore}점</span>
              </li>
            `).join('')}
          </ul>
        </div>
        <a href="/rank/seoul-elementary.html" class="btn-view-all">서울 초등학교 전체 순위 (611개교) &gt;</a>
      </div>
    </div>

    <!-- 서울 25개 자치구별 바로가기 -->
    <section class="gu-section">
      <h2 style="font-size: 20px; font-weight: 800; color: var(--primary-dark); margin-bottom: 8px;">
        🏛️ 서울 25개 자치구별 맞춤 순위 바로가기
      </h2>
      <p style="font-size: 13.5px; color: var(--text-muted);">
        거주 중이거나 이사를 고려 중인 자치구를 선택하시면 해당 구의 고등학교·중학교·초등학교 순위표를 즉시 확인하실 수 있습니다.
      </p>

      <div class="gu-grid">
        ${SEOUL_GUS.map(g => `
          <div class="gu-card">
            <div class="gu-card-name">${g.name}</div>
            <div class="gu-card-links">
              <a href="/rank/seoul-high-${g.slug}.html" class="gu-card-link">고등학교</a> ·
              <a href="/rank/seoul-middle-${g.slug}.html" class="gu-card-link">중학교</a> ·
              <a href="/rank/seoul-elementary-${g.slug}.html" class="gu-card-link">초등학교</a>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- 전국 주요 학군 및 17개 시·도 지역 탐색 센터 -->
    <section class="nationwide-section">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom: 8px;">
        <h2 style="font-size: 20px; font-weight: 800; color: var(--primary-dark);">
          🌐 전국 주요 학군 및 17개 시·도 지역 탐색 센터
        </h2>
        <span style="font-size: 12px; color: var(--primary); font-weight: 700; background: #eff6ff; padding: 4px 10px; border-radius: 20px;">전국 12,045개 초·중·고 학업성취도 연동</span>
      </div>
      <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 16px;">
        서울 외 수도권(경기·인천) 및 5대 광역시, 전국 핵심 학군을 선택하시면 학업여지도 정밀 지도 및 학교 진단 페이지로 즉시 이동합니다.
      </p>

      <div class="nationwide-grid">
        ${NATIONWIDE_REGIONS.map(reg => `
          <div class="nationwide-card">
            <div class="nw-prov-title">
              <span>${reg.icon}</span>
              <span>${reg.province}</span>
            </div>
            <div class="nw-city-chips">
              ${reg.cities.map(c => `
                <a href="javascript:void(0)" onclick="executeInPageRankSearch('${c.query}')" class="nw-city-chip" title="${c.name} 학교 학업성취도 및 순위 보기">${c.name}</a>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
    </div> <!-- /#hubDefaultView -->

    <!-- 🔍 실시간 지역 랭킹 전용 뷰 (첨부 이미지와 100% 동일한 정규 랭킹 페이지 구조) -->
    <div id="rankSearchResultsView" style="display: none;">
      <!-- 브레드크럼 -->
      <nav class="breadcrumb-nav">
        <a href="javascript:void(0)" onclick="showHubDefaultView()">홈</a> &gt; 
        <a href="javascript:void(0)" onclick="showHubDefaultView()">학교 순위 랭킹</a> &gt; 
        <span id="resRegionBreadcrumb">서울특별시 전체</span> &gt; 
        <span id="resTypeBreadcrumb">고등학교</span>
      </nav>

      <!-- 페이지 타이틀 & 공식 공시 메타 -->
      <h1 id="resPageTitle" class="page-title">서울특별시 전체 고등학교 순위 및 학업성취도 분석</h1>
      <div class="page-meta">
        <span class="badge-official">공식 공시 기준</span>
        <span>2025년 04월 학교알리미 공시</span>
        <span id="resTotalCountMeta">총 319개교 전수 평가</span>
        <span>업데이트: 2026년 11월 20일</span>
      </div>

      <!-- 상단 단일 라인 검색 바 (첨부 이미지와 100% 일치) -->
      <div class="page-search-box" style="margin-bottom: 24px;">
        <form onsubmit="handleRankSearch(event, 'rankSearchInputResult')" style="display: flex; gap: 8px; width: 100%;">
          <div style="flex: 1; display: flex; align-items: center; background: #ffffff; border: 1.5px solid var(--primary); border-radius: 8px; padding: 0 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <span style="color: var(--text-muted); font-size: 16px; margin-right: 8px;">🔍</span>
            <input type="text" id="rankSearchInputResult" placeholder="전국 지역명(예: 분당, 수원, 일산, 해운대, 수성구 등) 또는 학교명을 검색하세요" style="width: 100%; border: none; outline: none; padding: 12px 0; font-size: 14px; font-weight: 600; color: var(--text-main);" autocomplete="off">
          </div>
          <button type="submit" style="background: var(--primary); color: #ffffff; border: none; padding: 0 24px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background 0.2s;">지역 검색</button>
        </form>
      </div>

      <!-- 시즌 안내 배너 -->
      <div id="resSeasonBanner" class="season-banner">
        <div class="banner-badge">🎯 2026학년도 고입 지원 및 교육환경 팩트 분석</div>
        <h3 class="banner-title">학교 선택 핵심 지표: 종합점수 · 국영수 학업평균 · A등급 비율</h3>
        <p class="banner-desc">
          단순 인지도 대신 아래의 <strong>종합 교육환경 스코어, 국·영·수 학업평균, A등급 비율, 창체활동비</strong> 팩트 데이터를 비교하여 자녀에게 가장 유리한 학교를 선택하세요.
        </p>
      </div>

      <!-- 학교급 탭 네비게이션 (첨부 이미지 스타일) -->
      <div class="tabs-wrapper" id="resTypeTabs">
        <a href="javascript:void(0)" class="tab-btn active" onclick="switchResultTab('고등학교', this)">고등학교</a>
        <a href="javascript:void(0)" class="tab-btn" onclick="switchResultTab('중학교', this)">중학교</a>
        <a href="javascript:void(0)" class="tab-btn" onclick="switchResultTab('초등학교', this)">초등학교</a>
        <a href="javascript:void(0)" class="tab-btn" onclick="switchResultTab('all', this)">전체 학교</a>
      </div>

      <!-- 하위 지역 필터 칩 컨테이너 (첨부 이미지 스타일) -->
      <div class="gu-pills-container" id="resSubRegionPills">
        <!-- 동적 렌더링 -->
      </div>

      <!-- 4개 핵심 지표 통계 요약 카드 (첨부 이미지 스타일) -->
      <div class="stat-cards-grid">
        <div class="stat-card">
          <div class="stat-card-title">평가 대상 학교수</div>
          <div class="stat-card-val" id="statCardTotalCount">- 개교</div>
          <div class="stat-card-sub" id="statCardTotalSub">관내 학교 전체</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">평균 종합 교육환경</div>
          <div class="stat-card-val" id="statCardAvgComposite">- 점</div>
          <div class="stat-card-sub">100점 만점 기준 (지역 평균)</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">평균 국·영·수 학업점수</div>
          <div class="stat-card-val" id="statCardAvgAcademic">- 점</div>
          <div class="stat-card-sub">주요 과목 학업성취도 평균</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">1위 학교 하이라이트</div>
          <div class="stat-card-val" id="statCardTopSchool" style="font-size: 16px; line-height: 1.4; color: var(--primary-dark);">-</div>
          <div class="stat-card-sub" id="statCardTopSchoolSub">-</div>
        </div>
      </div>

      <!-- 첨부 이미지와 100% 동일한 순위 테이블 -->
      <div class="ranking-table-container">
        <table class="ranking-table">
          <thead>
            <tr>
              <th style="width: 70px; text-align: center;">순위</th>
              <th>학교명 및 정보</th>
              <th>종합 스코어</th>
              <th>국·영·수 평균</th>
              <th>창체활동비/학생수</th>
              <th style="width: 100px; text-align: center;">지도 탐색</th>
            </tr>
          </thead>
          <tbody id="resTableBody">
            <!-- 동적 순위표 렌더링 -->
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <footer class="site-footer">
    <p>© 2026 학업여지도 (LearnMap). All rights reserved.</p>
  </footer>

  ${COMMON_RANK_SEARCH_SCRIPT}
</body>
</html>`;
}

// ============================================================================
// 페이지 생성 실행 루프
// ============================================================================
console.log('--- 정적 랭킹 페이지 생성 시작 ---');
const generatedUrls = [];

// 1. 랭킹 메인 허브 생성
const hubHtml = renderHubHtml();
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), hubHtml, 'utf8');
generatedUrls.push('https://leamap.kr/rank/index.html');
console.log('✓ 랭킹 허브 생성 완료: /rank/index.html');

// 2. 서울 전체 학교급별 메인 페이지 3개 생성
SCHOOL_TYPES.forEach(st => {
  const list = calculatedSeoulSchools
    .filter(s => s.type === st.type)
    .sort((a, b) => b.compositeScore - a.compositeScore);

  const filename = `seoul-${st.slug}.html`;
  const canonicalUrl = `https://leamap.kr/rank/${filename}`;
  const title = `2026 서울 ${st.label} 순위 및 학업성취도 Top ${list.length} | 학업여지도`;
  const description = `2026학년도 서울 ${st.label} 순위 전수 분석. 2025년 4월 학교알리미 공시 기준 ${list.length}개교 종합 교육환경 점수, 국영수 학업평균, A등급 비율.${st.slug === 'high' ? ' 후기 일반고 원서접수(12/3~12/7) 필승 가이드.' : ''}`;

  const html = renderRankingHtml({
    title,
    description,
    canonicalUrl,
    regionName: '서울특별시 전체',
    schoolTypeInfo: st,
    schoolList: list,
    currentGuSlug: null
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, filename), html, 'utf8');
  generatedUrls.push(canonicalUrl);
  console.log(`✓ 서울 전체 ${st.label} 생성 완료: /rank/${filename} (${list.length}개교)`);
});

// 3. 25개 자치구별 학교급별 랭킹 페이지 생성 (25 * 3 = 75개)
SEOUL_GUS.forEach(g => {
  SCHOOL_TYPES.forEach(st => {
    const list = calculatedSeoulSchools
      .filter(s => s.type === st.type && s.gu === g.name)
      .sort((a, b) => b.compositeScore - a.compositeScore);

    const filename = `seoul-${st.slug}-${g.slug}.html`;
    const canonicalUrl = `https://leamap.kr/rank/${filename}`;
    const title = `2026 서울 ${g.name} ${st.label} 순위 및 학업성취도 Top ${list.length} | 학업여지도`;
    const description = `2026학년도 서울 ${g.name} ${st.label} 순위 팩트 분석. 2025년 4월 학교알리미 공시 기준 ${g.name} 관내 ${list.length}개 ${st.label} 종합 스코어, 국영수 학업평균, 안전도 비교.${st.slug === 'high' ? ' 12월 서울 후기 일반고 원서접수 전략.' : ''}`;

    const html = renderRankingHtml({
      title,
      description,
      canonicalUrl,
      regionName: `서울특별시 ${g.name}`,
      schoolTypeInfo: st,
      schoolList: list,
      currentGuSlug: g.slug
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, filename), html, 'utf8');
    generatedUrls.push(canonicalUrl);
  });
  console.log(`✓ [${g.name}] 3개 학교급 랭킹 페이지 생성 완료`);
});

console.log(`--- 총 ${generatedUrls.length}개 정적 랭킹 페이지 생성 완료 ---`);

// ============================================================================
// 4. sitemap.xml 에 79개 정적 랭킹 URL 자동 추가/동기화
// ============================================================================
console.log('--- sitemap.xml 정적 랭킹 URL 동기화 시작 ---');
let sitemapXml = fs.readFileSync(SITEMAP_PATH, 'utf8');

// 기존 등록된 url들 외에 신규 generatedUrls 추가
const sitemapUrlEntries = generatedUrls.map(url => {
  // 우선순위: 허브 0.9, 서울 전체 0.9, 구별 0.8
  const priority = url.includes('seoul-high.html') || url.includes('index.html') ? '0.9' : '0.8';
  return `  <url>
    <loc>${url}</loc>
    <lastmod>2026-11-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n');

// </urlset> 직전에 삽입 (기존 rank url이 없을 경우)
if (!sitemapXml.includes('/rank/index.html')) {
  sitemapXml = sitemapXml.replace('</urlset>', `  <!-- 2026 서울 학교 순위 정적 랭킹 페이지 79개 -->\n${sitemapUrlEntries}\n</urlset>`);
  fs.writeFileSync(SITEMAP_PATH, sitemapXml, 'utf8');
  console.log(`✓ sitemap.xml 에 ${generatedUrls.length}개 랭킹 URL 추가 완료`);
} else {
  console.log('✓ sitemap.xml 에 이미 rank URL이 존재하여 보존함');
}
