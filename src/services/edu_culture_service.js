/**
 * 아이 주변 교육·문화 자원 서비스 (Edu & Culture Resource Service)
 * 
 * 학부모 질문: "집 근처에 아이가 공부하거나 체험할 만한 곳이 있을까?"
 * 
 * 공공도서관, 청소년시설, 공공 체육시설, 과학·문화 체험시설 등
 * 공교육 밖 공공 교육자원을 지도에서 탐색하고 연령대와 관심 분야에 따라 추천합니다.
 * 
 * [확장 기능]
 * 1. 주말 체험 코스 (Weekend Course)
 * 2. 방학 활동 계획 (Vacation Activity Plan)
 * 3. 집에서 가까운 무료 교육시설 추천 (Free Resource Curation)
 */

export class EduCultureService {
    constructor() {
        this.resources = [];
        this.isLoaded = false;
        this.init();
    }

    async init() {
        if (this.isLoaded) return;
        try {
            // 브라우저 및 Node 환경 호환 fetch
            let data = null;
            if (typeof window !== 'undefined' && window.fetch) {
                const res = await fetch('/src/data/edu_culture_resources.json')
                    .catch(() => fetch('/data/edu_culture_resources.json'));
                if (res && res.ok) {
                    data = await res.json();
                }
            }
            if (!data) {
                // Node 환경 또는 정적 번들 fallback
                try {
                    const fallbackModule = await import('../data/edu_culture_resources.json', { assert: { type: 'json' } });
                    data = fallbackModule.default || fallbackModule;
                } catch (_) {}
            }
            this.resources = Array.isArray(data) ? data : [];
            this.isLoaded = true;
        } catch (err) {
            console.warn('[EduCultureService] 데이터 로드 실패, 빈 배열 초기화:', err);
            this.resources = [];
        }
    }

    /**
     * 외부에서 데이터를 직접 주입할 수 있는 메서드 (SSR, 테스트용)
     */
    setResources(list) {
        if (Array.isArray(list)) {
            this.resources = list;
            this.isLoaded = true;
        }
    }

    /**
     * Haversine 공식을 사용한 위경도 간 거리(km) 계산
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
        const R = 6371; // 지구 반경 (km)
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return parseFloat((R * c).toFixed(2));
    }

    /**
     * 조건에 맞는 공공 교육·문화 자원 검색 및 추천 필터링
     */
    getResources(options = {}) {
        const {
            centerLat = 37.5665,
            centerLng = 126.9780,
            radiusKm = 5.0, // 반경 (km)
            category = 'all', // 'library' | 'youth' | 'sports' | 'science_culture'
            age = 'all', // 'infant' | 'elem_low' | 'elem_high' | 'middle' | 'high'
            interest = 'all', // 'reading' | 'science' | 'art' | 'sports' | 'history'
            freeOnly = false, // 무료 시설만
            keyword = '',
            sort = 'distance' // 'distance' | 'name' | 'recommend'
        } = options;

        let results = this.resources.map(item => {
            const dist = this.calculateDistance(centerLat, centerLng, item.lat, item.lng);
            return {
                ...item,
                distanceKm: dist,
                distanceMeters: Math.round(dist * 1000)
            };
        });

        // 1. 카테고리 필터
        if (category && category !== 'all') {
            results = results.filter(item => item.category === category);
        }

        // 2. 연령대 필터
        if (age && age !== 'all') {
            results = results.filter(item => item.target_ages.includes(age));
        }

        // 3. 관심 분야 필터
        if (interest && interest !== 'all') {
            results = results.filter(item => item.interests.includes(interest));
        }

        // 4. 무료 여부 필터
        if (freeOnly) {
            results = results.filter(item => item.is_free === true);
        }

        // 5. 검색어 필터
        if (keyword && keyword.trim() !== '') {
            const kw = keyword.trim().toLowerCase();
            results = results.filter(item => 
                item.name.toLowerCase().includes(kw) ||
                item.address.toLowerCase().includes(kw) ||
                (item.description && item.description.toLowerCase().includes(kw)) ||
                (item.programs && item.programs.some(p => p.toLowerCase().includes(kw)))
            );
        }

        // 6. 반경 필터 (반경이 지정되어 있고 너무 먼 경우 제외 - 단 결과가 너무 적으면 전체 확장)
        if (radiusKm && radiusKm > 0) {
            const withinRadius = results.filter(item => item.distanceKm <= radiusKm);
            if (withinRadius.length >= 2) {
                results = withinRadius;
            }
        }

        // 7. 정렬
        if (sort === 'name') {
            results.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        } else if (sort === 'recommend') {
            // 무료 여부, 프로그램 수 가중 정렬
            results.sort((a, b) => {
                const scoreA = (a.is_free ? 2 : 1) * (a.programs ? a.programs.length : 1) / (a.distanceKm + 1);
                const scoreB = (b.is_free ? 2 : 1) * (b.programs ? b.programs.length : 1) / (b.distanceKm + 1);
                return scoreB - scoreA;
            });
        } else {
            // 기본: 거리순
            results.sort((a, b) => a.distanceKm - b.distanceKm);
        }

        return results;
    }

    /**
     * [확장 기능 1] 주말 체험 코스 (Weekend Course) 생성
     * 반경 내 시설들을 융합하여 반나절/원데이 추천 테마 동선 생성
     */
    getWeekendExperienceCourses(centerLat, centerLng, age = 'elem_low') {
        const list = this.getResources({ centerLat, centerLng, radiusKm: 15.0, age, sort: 'distance' });
        
        const courses = [];

        // 테마 1: [과학과 인문 탐험 코스]
        const scienceItem = list.find(r => r.category === 'science_culture');
        const libraryItem = list.find(r => r.category === 'library' && r.id !== (scienceItem ? scienceItem.id : ''));
        if (scienceItem && libraryItem) {
            courses.push({
                id: 'course_sci_lib',
                title: '🔭 호기심 쑥쑥! 과학실험 & 북캉스 코스',
                theme: '과학탐구 + 독서인문',
                duration: '약 4~5시간 (반나절 추천)',
                targetAgeDesc: '초등 전학년 및 학부모',
                description: '오전에는 오감 자극 과학전시를 체험하고, 오후에는 편안한 어린이 도서관에서 마음의 양식을 쌓는 알찬 주말 코스입니다.',
                stops: [
                    { step: 1, name: scienceItem.name, category: scienceItem.category_name, action: '상설 전시 및 핸즈온 체험 관람', dist: `${scienceItem.distanceKm}km`, fee: scienceItem.is_free ? '무료' : `${scienceItem.admission_fee.toLocaleString()}원` },
                    { step: 2, name: libraryItem.name, category: libraryItem.category_name, action: '어린이실 추천 도서 탐독 및 북카페 휴식', dist: `${libraryItem.distanceKm}km`, fee: '무료' }
                ],
                tip: '도서관은 주말 오전에 비교적 여유로우며, 과학관은 온라인 사전예약 시 대기 없이 입장 가능합니다.'
            });
        }

        // 테마 2: [에너지 발산 & 문화예술 코스]
        const sportsItem = list.find(r => r.category === 'sports');
        const youthItem = list.find(r => r.category === 'youth' && r.id !== (sportsItem ? sportsItem.id : ''));
        if (sportsItem || youthItem) {
            const first = sportsItem || youthItem;
            const second = youthItem && youthItem.id !== first.id ? youthItem : list.find(r => r.id !== first.id);
            courses.push({
                id: 'course_sport_youth',
                title: '⚽ 활력 충전! 청소년 체육 & 문화예술 코스',
                theme: '신체발달 + 창의활동',
                duration: '약 3~4시간',
                targetAgeDesc: '유아 및 초·중등생',
                description: '주중에 쌓인 학업 스트레스를 신체 활동으로 해소하고, 청소년 전용 복합공간에서 또래와 함께 문화 활동을 즐깁니다.',
                stops: [
                    { step: 1, name: first.name, category: first.category_name, action: '공공 수영장 또는 실내 암벽·구기 운동 체험', dist: `${first.distanceKm}km`, fee: first.is_free ? '무료' : `${first.admission_fee.toLocaleString()}원` },
                    ...(second ? [{ step: 2, name: second.name, category: second.category_name, action: '동아리 룸 또는 미디어 창작실 자율 체험', dist: `${second.distanceKm}km`, fee: second.is_free ? '무료' : `${second.admission_fee.toLocaleString()}원` }] : [])
                ],
                tip: '청소년수련관의 주말 자율 프로그램은 시설별 운영 일정이 다르므로 방문 전 유선 확인을 권장합니다.'
            });
        }

        // 테마 3: [100% 무료! 알뜰 지혜 탐방 코스]
        const freeItems = list.filter(r => r.is_free).slice(0, 2);
        if (freeItems.length >= 2) {
            courses.push({
                id: 'course_free_eco',
                title: '🌿 부담 제로! 집 근처 무료 지혜놀이터 코스',
                theme: '100% 무료 + 생태/역사',
                duration: '약 3시간',
                targetAgeDesc: '전 연령 가족 동반',
                description: '입장료 부담 없이 지자체와 공공기관이 공들여 마련한 최신 시설에서 뜻깊은 주말을 보냅니다.',
                stops: freeItems.map((item, idx) => ({
                    step: idx + 1,
                    name: item.name,
                    category: item.category_name,
                    action: `${item.programs && item.programs[0] ? item.programs[0] : '자율 관람 및 시설 이용'}`,
                    dist: `${item.distanceKm}km`,
                    fee: '무료'
                })),
                tip: '공공도서관 및 박물관의 어린이 전용 프로그램은 분기별로 무료 신청이 가능합니다.'
            });
        }

        return courses;
    }

    /**
     * [확장 기능 2] 방학 활동 계획 (Vacation Activity Plan) 생성
     * 방학 4주 동안 아이의 주간 테마별 성장 플랜 편성
     */
    getVacationActivityPlan(centerLat, centerLng, age = 'elem_high') {
        const allList = this.getResources({ centerLat, centerLng, radiusKm: 20.0, age, sort: 'distance' });

        return [
            {
                week: '1주차',
                theme: '📚 [독서 마라톤 주간] 도서관에서 시작하는 생각 근육 키우기',
                targetGoal: '방학 권장도서 5권 완독 및 독서노트 작성',
                recommendedFacilities: allList.filter(r => r.category === 'library').slice(0, 2).map(r => ({
                    name: r.name,
                    distance: `${r.distanceKm}km`,
                    highlight: r.programs ? r.programs[0] : '어린이실 집중 독서'
                })),
                actionGuide: '가장 가까운 공공도서관에 아이 본인 명의 회원증을 발급하고, 스스로 읽고 싶은 책 3권을 고르는 경험을 선물하세요.'
            },
            {
                week: '2주차',
                theme: '🔬 [미래 과학 탐구 주간] 오감으로 깨우치는 첨단 기술과 자연',
                targetGoal: '과학관 특별 기획전시 관람 및 직접 손으로 만드는 실험',
                recommendedFacilities: allList.filter(r => r.category === 'science_culture').slice(0, 2).map(r => ({
                    name: r.name,
                    distance: `${r.distanceKm}km`,
                    highlight: r.programs ? r.programs[0] : '체험전시 관람'
                })),
                actionGuide: '천체투영관이나 3D 메이커스페이스가 마련된 과학관에서 방학 특별 단기 워크숍을 신청해 보세요.'
            },
            {
                week: '3주차',
                theme: '⚽ [신체 에너지 충전 주간] 체육관·수영장에서 기초체력 다지기',
                targetGoal: '주 3회 땀 흘리는 규칙적인 운동 루틴 형성',
                recommendedFacilities: allList.filter(r => r.category === 'sports' || r.category === 'youth').slice(0, 2).map(r => ({
                    name: r.name,
                    distance: `${r.distanceKm}km`,
                    highlight: r.programs ? r.programs[0] : '유소년 체육 강좌'
                })),
                actionGuide: '방학 집중 수영교실이나 청소년 농구 특강을 통해 스마트폰 과몰입을 예방하고 체력을 충전합니다.'
            },
            {
                week: '4주차',
                theme: '🏛️ [역사와 자치 주간] 우리 고장 역사와 청소년 동아리 체험',
                targetGoal: '우리 지역 역사 현장 탐방 및 방학 마무리 성장 포트폴리오 정리',
                recommendedFacilities: allList.filter(r => r.category === 'youth' || r.interests.includes('history')).slice(0, 2).map(r => ({
                    name: r.name,
                    distance: `${r.distanceKm}km`,
                    highlight: r.programs ? r.programs[0] : '진로멘토링 및 문화체험'
                })),
                actionGuide: '방학 동안 체험한 공공시설 스탬프를 정리하고, 새 학기 준비를 위한 마음가짐을 정리해 봅니다.'
            }
        ];
    }

    /**
     * [확장 기능 3] 집 근처 무료 교육시설 엄선 추천
     */
    getFreeNearbyResources(centerLat, centerLng, limit = 5) {
        return this.getResources({
            centerLat,
            centerLng,
            freeOnly: true,
            sort: 'distance'
        }).slice(0, limit);
    }

    /**
     * 카테고리별 마커 심볼 및 색상 반환
     */
    getCategoryMeta(category) {
        switch (category) {
            case 'library':
                return { label: '공공도서관', icon: '📚', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
            case 'youth':
                return { label: '청소년시설', icon: '🏛️', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
            case 'sports':
                return { label: '공공 체육시설', icon: '⚽', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
            case 'science_culture':
                return { label: '과학·문화체험', icon: '🔬', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' };
            default:
                return { label: '공공 교육자원', icon: '📍', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' };
        }
    }
}

// 싱글톤 인스턴스 기본 export
export const eduCultureService = new EduCultureService();
