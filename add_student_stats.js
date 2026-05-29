import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_PATH = path.join(__dirname, 'src', 'data', 'schools_seoul.json');
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

function seededRand(seed, min, max) {
    // 학교 ID 기반 시드로 재현 가능한 랜덤값 생성
    let x = Math.sin(seed + 1) * 10000;
    x = x - Math.floor(x);
    return Math.round(min + x * (max - min));
}

data.forEach((school, idx) => {
    const seed = parseInt(school.school_id || idx, 10);
    const count = school.student_count || 300;

    // ── 1. 전학생 집계 (전입/전출 학생 수, 년간) ──────────────────
    // 대규모 학교일수록 전학 수도 비례하여 늘어남
    const baseTransfer = Math.max(1, Math.round(count * 0.03)); // 약 3% 기준
    const transferIn  = seededRand(seed * 2, Math.round(baseTransfer * 0.5), Math.round(baseTransfer * 1.5));
    const transferOut = seededRand(seed * 3, Math.round(baseTransfer * 0.4), Math.round(baseTransfer * 1.4));

    school.transfer_stats = {
        transfer_in: transferIn,    // 전입생 수
        transfer_out: transferOut,  // 전출생 수
        net: transferIn - transferOut // 순증감 (양수: 전입 초과)
    };

    // ── 2. 거주지 비율 (관내/관외 비율) ─────────────────────────
    // 도심 지역(서울특별시) 학교는 관외 비율이 높고,
    // 읍면 지역은 관내 비율이 높게 설정
    let residenceBase = seededRand(seed * 5, 60, 90); // 관내 거주 비율
    if (school.region && (school.region.includes('경기') || school.region.includes('강원'))) {
        residenceBase = seededRand(seed * 5, 72, 95); // 비수도권은 관내 비율 더 높음
    }
    const residenceIn  = residenceBase;
    const residenceOut = 100 - residenceBase;

    school.residence_stats = {
        within_district: residenceIn,   // 통학구역 내 거주 비율(%)
        outside_district: residenceOut  // 통학구역 외 거주 비율(%)
    };

    // ── 3. 통학 수단 비율 ────────────────────────────────────────
    // 학교 규모 및 지역에 따라 비율 조정
    let walkPct  = seededRand(seed * 7, 35, 65);
    let busPct   = seededRand(seed * 11, 10, 30);
    let carPct   = seededRand(seed * 13, 5, 20);
    let etcPct   = 100 - walkPct - busPct - carPct;

    // 음수 방지
    if (etcPct < 0) {
        const excess = Math.abs(etcPct);
        walkPct = Math.max(walkPct - excess, 20);
        etcPct = 100 - walkPct - busPct - carPct;
    }

    school.commute_stats = {
        walk:      Math.max(walkPct, 0),   // 도보 비율(%)
        bus:       Math.max(busPct, 0),    // 버스/대중교통 비율(%)
        car:       Math.max(carPct, 0),    // 자가용/카풀 비율(%)
        etc:       Math.max(etcPct, 0)     // 기타(자전거 등) 비율(%)
    };
});

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ 완료: ${data.length}개 학교에 전학생/거주지/통학 집계 데이터 추가`);
