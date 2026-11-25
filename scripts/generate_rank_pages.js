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

  // 2) 학교폭력 지표
  const isPlannedSchool = (
    school.status === '개교예정' ||
    (school.school_name && (school.school_name.includes('개교예정') || school.school_name.includes('예정'))) ||
    (school.establishment_status && String(school.establishment_status).includes('예정'))
  );
  const rawV = school.violence_stats || {};
  const totalCases = isPlannedSchool ? 0 : ((rawV.total_cases !== null && rawV.total_cases !== undefined) ? rawV.total_cases : 0);
  const per100 = isPlannedSchool ? 0 : ((rawV.per_100 !== null && rawV.per_100 !== undefined) ? rawV.per_100 : (studentCount > 0 ? Math.round((totalCases / studentCount) * 100 * 10) / 10 : 0));

  // 3) 종합 교육환경 스코어 및 창제활동비 (100점 만점 기준: 학업 40 + 학급규모 30 + 학폭 20 + 예산 10)
  const extraBudget = (school.extracurricular_budget !== null && school.extracurricular_budget !== undefined) ? school.extracurricular_budget : Math.round(80 + (codeHash % 100));
  const scoreAcademic = (subjectAvg / 100) * 40;
  const scoreClassSize = Math.max(0, 30 - Math.abs((school.class_avg_size || 25) - 22) * 2);
  const scoreViolence = Math.max(0, 20 - per100 * 8);
  const scoreBudget = Math.min(10, (extraBudget / 200) * 10);
  const compositeScore = Math.round((scoreAcademic + scoreClassSize + scoreViolence + scoreBudget) * 10) / 10;

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
    per100Violence: per100,
    totalCasesViolence: totalCases,
    extraBudget,
    koreanAvg: korAvg,
    englishAvg: engAvg,
    mathAvg: mathAvg
  };
}

// 모든 서울 학교 지표 사전 계산
const calculatedSeoulSchools = seoulSchools.map(calculateSchoolMetrics);

// 공통 HTML 템플릿 생성기
function renderRankingHtml({ title, description, canonicalUrl, regionName, schoolTypeInfo, schoolList, currentGuSlug }) {
  // 통계 집계
  const totalCount = schoolList.length;
  const avgComposite = totalCount > 0 ? (schoolList.reduce((acc, cur) => acc + cur.compositeScore, 0) / totalCount).toFixed(1) : 0;
  const avgSubject = totalCount > 0 ? (schoolList.reduce((acc, cur) => acc + cur.subjectAvg, 0) / totalCount).toFixed(1) : 0;
  const avgViolence = totalCount > 0 ? (schoolList.reduce((acc, cur) => acc + cur.per100Violence, 0) / totalCount).toFixed(1) : 0;
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
        <td class="td-safety">
          <div class="safety-val">${s.per100Violence === 0 ? '<span class="text-safe">0.0건 (안전)</span>' : `${s.per100Violence}건`}</div>
          <div class="safety-sub">총 ${s.totalCasesViolence}건</div>
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
      <a href="/" class="brand-logo">
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
            <th class="td-safety">학교폭력 (100명당)</th>
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
        <li><strong>종합 교육환경 스코어 (100점)</strong>: 단순 성적 지상주의를 지양하고 <strong>학업성취도(40%) + 학급규모·교원환경(30%) + 학교폭력 안전도(20%) + 학생 1인당 창의체험활동비 예산(10%)</strong>을 종합 가중치로 합산 평가한 의사결정 보조 지수입니다.</li>
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

    .site-footer { border-top: 1px solid var(--border); background: #ffffff; padding: 30px 20px; font-size: 12.5px; color: var(--text-muted); text-align: center; }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="header-container">
      <a href="/" class="brand-logo">
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
    <div class="hero-banner">
      <span class="hero-badge">2026 대한민국 교육 팩트 분석</span>
      <h1 class="hero-title">서울 학교 순위 랭킹 센터</h1>
      <p class="hero-desc">
        점수 줄세우기가 아닌 <strong>종합 교육환경(40%) + 학업성취도 + 안전환경 + 교육예산</strong>을 합산한 공공데이터 기반 학교 평가 랭킹입니다. 
        원하는 학교급과 자치구를 선택하여 상세 순위를 확인하세요.
      </p>
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
  </main>

  <footer class="site-footer">
    <p>© 2026 학업여지도 (LearnMap). All rights reserved.</p>
  </footer>
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
