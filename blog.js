// =========================================================================
// 학업여지도 칼럼 & 리서치 블로그 (Blog UI & Interactive Logic)
// =========================================================================

let allPosts = [];
let currentCategory = 'all';
let searchQuery = '';
let currentSort = 'latest';
let activePostId = null;

// Markdown 단순 렌더러 (별도 외부 라이브러리 없이 안전하고 경량화된 HTML 변환)
function renderMarkdown(md) {
    if (!md) return '';
    let html = md
        // Escape basic HTML to prevent XSS
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Horizontal Rule
    html = html.replace(/^---$/gim, '<hr>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Images: ![alt](url)
    html = html.replace(/!\[(.*?)\]\((.*?)\)/gim, '<figure class="blog-post-figure"><img src="$2" alt="$1" class="blog-post-img" loading="lazy" /><figcaption class="blog-img-caption">$1</figcaption></figure>');

    // Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.*?)~~/gim, '<del>$1</del>');

    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>(\s*<li>.*?<\/li>)*)/gim, '<ul>$1</ul>');

    // Tables: basic markdown table parsing
    const lines = html.split('\n');
    let inTable = false;
    let tableHtml = '';
    const newLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            const isSeparator = cells.every(c => /^[-:]+$/.test(c));

            if (!inTable) {
                inTable = true;
                tableHtml = '<div class="blog-table-wrapper"><table class="blog-post-table"><thead><tr>';
                cells.forEach(c => {
                    tableHtml += `<th>${c}</th>`;
                });
                tableHtml += '</tr></thead><tbody>';
            } else if (isSeparator) {
                // separator line, skip
            } else {
                tableHtml += '<tr>';
                cells.forEach(c => {
                    tableHtml += `<td>${c}</td>`;
                });
                tableHtml += '</tr>';
            }
        } else {
            if (inTable) {
                tableHtml += '</tbody></table></div>';
                newLines.push(tableHtml);
                inTable = false;
                tableHtml = '';
            }
            newLines.push(lines[i]);
        }
    }
    if (inTable) {
        tableHtml += '</tbody></table></div>';
        newLines.push(tableHtml);
    }
    html = newLines.join('\n');

    // Paragraphs (split by double newlines)
    const paragraphs = html.split(/\n{2,}/);
    html = paragraphs.map(p => {
        p = p.trim();
        if (!p) return '';
        if (p.startsWith('<h') || p.startsWith('<ul>') || p.startsWith('<blockquote>') || p.startsWith('<hr>') || p.startsWith('<div') || p.startsWith('<figure')) {
            return p;
        }
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    return html;
}

// 날짜 포맷 (YYYY.MM.DD)
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

// 토스트 메시지
function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// 게시글 객체 속성 정규화 (Supabase DB snake_case & camelCase 동시 호환)
function normalizePost(item) {
    if (!item) return item;
    return {
        ...item,
        id: String(item.id),
        slug: item.slug || String(item.id),
        title: item.title || '',
        category: item.category || '학군 분석',
        summary: item.summary || '',
        content: item.content || '',
        thumbnail: item.thumbnail || '',
        images: Array.isArray(item.images) ? item.images : [],
        tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
        author: item.author || '학업여지도 리서치팀',
        authorRole: item.authorRole || item.author_role || '수석연구원',
        readTime: item.readTime || item.read_time || '4분',
        views: Number(item.views) || 0,
        likes: Number(item.likes) || 0,
        createdAt: item.createdAt || item.created_at || new Date().toISOString(),
        updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
        isPublished: item.isPublished !== undefined ? item.isPublished : (item.is_published !== undefined ? item.is_published : true),
        relatedSchools: Array.isArray(item.relatedSchools) ? item.relatedSchools : (Array.isArray(item.related_schools) ? item.related_schools : [])
    };
}

// 게시글 데이터 로드 (백엔드 DB API 시도 후 로컬 파일 폴백)
async function loadPosts() {
    try {
        const res = await fetch('/api/blog/posts');
        if (res.ok) {
            const rawPosts = await res.json();
            allPosts = Array.isArray(rawPosts) ? rawPosts.map(normalizePost) : [];
            renderPosts();
            checkUrlRoute();
            return;
        }
    } catch (e) {
        console.warn('[Blog] /api/blog/posts API 호출 실패, 로컬 폴백 시도:', e);
    }

    try {
        const resStatic = await fetch('/src/data/blog_posts.json');
        if (resStatic.ok) {
            const rawPosts = await resStatic.json();
            allPosts = Array.isArray(rawPosts) ? rawPosts.map(normalizePost) : [];
            renderPosts();
            checkUrlRoute();
            return;
        }
    } catch (err) {
        console.error('[Blog] 게시글 데이터 로드 실패:', err);
    }
}

// 필터링 및 정렬된 게시글 반환
function getFilteredPosts() {
    let list = [...allPosts];

    // 발행 상태인 글만
    list = list.filter(item => item.isPublished !== false);

    // 카테고리 필터
    if (currentCategory !== 'all') {
        list = list.filter(item => item.category === currentCategory);
    }

    // 검색어 필터
    if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        list = list.filter(item => {
            const titleMatch = (item.title || '').toLowerCase().includes(q);
            const summaryMatch = (item.summary || '').toLowerCase().includes(q);
            const contentMatch = (item.content || '').toLowerCase().includes(q);
            const tagMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(q));
            return titleMatch || summaryMatch || contentMatch || tagMatch;
        });
    }

    // 정렬
    if (currentSort === 'latest') {
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (currentSort === 'popular') {
        list.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (currentSort === 'likes') {
        list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }

    return list;
}

// 게시글 목록 렌더링
function renderPosts() {
    const grid = document.getElementById('postGrid');
    if (!grid) return;

    const filtered = getFilteredPosts();

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <h3>일치하는 칼럼/게시글이 없습니다.</h3>
                <p>다른 검색어나 카테고리 탭을 선택해 보세요.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(post => {
        const tagsHtml = (post.tags || []).slice(0, 3).map(tag => `<span class="tag-pill">#${tag}</span>`).join('');
        const thumbSrc = post.thumbnail || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" fill="%231E293B"></svg>';

        return `
            <article class="post-card" data-post-id="${post.id}" onclick="window.openPostPage('${post.id}')">
                <div class="card-thumb-wrap">
                    <img src="${thumbSrc}" alt="${post.title}" class="card-thumb-img" loading="lazy">
                    <span class="card-category-badge">${post.category || '칼럼'}</span>
                    <span class="card-readtime">⏱️ ${post.readTime || '3분'}</span>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${post.title}</h3>
                    <p class="card-summary">${post.summary || ''}</p>
                    <div class="card-tags">
                        ${tagsHtml}
                    </div>
                    <div class="card-footer">
                        <div class="card-author-info">
                            <div class="author-avatar">🎓</div>
                            <span>${post.author || '학업여지도팀'}</span>
                        </div>
                        <div class="card-metrics">
                            <span class="metric-item">👁️ ${post.views || 0}</span>
                            <span class="metric-item">❤️ ${post.likes || 0}</span>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// 게시글 상세 페이지 열기 (모달창이 아닌 정규 독립 웹페이지로 전환)
window.openPostPage = function (postId, pushHistory = true) {
    const post = allPosts.find(p => p.id === postId || p.slug === postId);
    if (!post) return;

    activePostId = postId;

    // 1) 뷰 전환 (목록 숨김 -> 상세 페이지 노출)
    const listView = document.getElementById('blogListView');
    const detailView = document.getElementById('blogDetailPageView');
    if (listView) listView.style.display = 'none';
    if (detailView) detailView.style.display = 'block';

    // 2) 브라우저 스크롤 맨 위로 이동
    window.scrollTo({ top: 0, behavior: 'instant' });

    // 3) 상단 대표 썸네일 배너 (상세 본문 내용과 이미지 중복 방지를 위해 상단 노출 비활성화)
    const thumbBanner = document.getElementById('modalThumbBanner');
    if (thumbBanner) {
        thumbBanner.style.display = 'none';
    }

    // 4) 상세 페이지 DOM 바인딩
    const catEl = document.getElementById('modalCategory');
    if (catEl) catEl.textContent = post.category || '칼럼';

    const breadcrumbCat = document.getElementById('breadcrumbCategory');
    if (breadcrumbCat) breadcrumbCat.textContent = post.category || '학군 분석';

    const dateEl = document.getElementById('modalDate');
    if (dateEl) dateEl.textContent = formatDate(post.createdAt);

    const readEl = document.getElementById('modalReadTime');
    if (readEl) readEl.textContent = `⏱️ ${post.readTime || '3분'} 분량`;

    const titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.textContent = post.title;

    const authorEl = document.getElementById('modalAuthor');
    if (authorEl) authorEl.textContent = post.author || '학업여지도 리서치팀';

    const roleEl = document.getElementById('modalAuthorRole');
    if (roleEl) roleEl.textContent = post.authorRole || '수석연구원';

    const bodyEl = document.getElementById('modalBody');
    if (bodyEl) bodyEl.innerHTML = renderMarkdown(post.content || post.summary);

    // 관련 학교 위젯
    const relatedBox = document.getElementById('modalRelatedSchoolsBox');
    const relatedList = document.getElementById('modalRelatedSchoolsList');
    if (relatedBox && relatedList) {
        if (post.relatedSchools && post.relatedSchools.length > 0) {
            relatedBox.style.display = 'flex';
            relatedList.innerHTML = post.relatedSchools.map(school => `
                <a href="index.html?search=${encodeURIComponent(school.name)}" class="school-map-link" title="${school.name} 지도로 이동">
                    📍 ${school.name} (${school.region || ''}) ↗
                </a>
            `).join('');
        } else {
            relatedBox.style.display = 'none';
        }
    }

    // 태그
    const tagsContainer = document.getElementById('modalTags');
    if (tagsContainer) {
        if (post.tags && post.tags.length > 0) {
            tagsContainer.innerHTML = post.tags.map(t => `<span class="tag-pill" style="font-size:12px; padding:4px 10px;">#${t}</span>`).join('');
        } else {
            tagsContainer.innerHTML = '';
        }
    }

    // 좋아요 상태 복원
    updateLikeUI(postId, post.likes || 0);

    // 브라우저 탭 타이틀 및 SEO 메타태그 동적 갱신
    updatePageSeoMetadata(post);

    // 브라우저 URL 쿼리/히스토리 갱신
    if (pushHistory) {
        const newUrl = `${window.location.pathname}?id=${encodeURIComponent(postId)}`;
        history.pushState({ postId }, post.title, newUrl);
    }

    // 조회수 증가 알림 백엔드 호출
    try {
        fetch(`/api/blog/posts/${postId}/view`, { method: 'POST' }).catch(() => {});
        post.views = (post.views || 0) + 1;
    } catch (_) {}
};

// 기존 함수명 호환성 유지
window.openPostModal = window.openPostPage;

// 게시글 상세 페이지 닫기 (목록 화면으로 복귀)
window.closePostPage = function (pushHistory = true) {
    activePostId = null;

    const listView = document.getElementById('blogListView');
    const detailView = document.getElementById('blogDetailPageView');
    if (detailView) detailView.style.display = 'none';
    if (listView) listView.style.display = 'block';

    window.scrollTo({ top: 0, behavior: 'instant' });

    // 브라우저 탭 타이틀 및 SEO 메타태그 기본값으로 복원
    resetPageSeoMetadata();

    // 브라우저 히스토리 복원
    if (pushHistory) {
        history.pushState({}, '학업여지도 칼럼 & 리서치 블로그', window.location.pathname);
    }
};

window.closePostModal = window.closePostPage;

// 좋아요 UI 업데이트
function updateLikeUI(postId, fallbackLikes) {
    const btnLike = document.getElementById('btnLike');
    const likeCountSpan = document.getElementById('likeCount');
    if (!btnLike || !likeCountSpan) return;

    const likedKey = `learnmap_blog_liked_${postId}`;
    const isLiked = localStorage.getItem(likedKey) === 'true';

    btnLike.classList.toggle('liked', isLiked);
    likeCountSpan.textContent = fallbackLikes + (isLiked ? 1 : 0);
}

// 좋아요 버튼 토글 이벤트
function setupLikeButton() {
    const btnLike = document.getElementById('btnLike');
    if (!btnLike) return;

    btnLike.addEventListener('click', () => {
        if (!activePostId) return;
        const post = allPosts.find(p => p.id === activePostId);
        if (!post) return;

        const likedKey = `learnmap_blog_liked_${activePostId}`;
        const isLiked = localStorage.getItem(likedKey) === 'true';

        if (isLiked) {
            localStorage.removeItem(likedKey);
            showToast('좋아요를 취소했습니다.');
        } else {
            localStorage.setItem(likedKey, 'true');
            showToast('이 칼럼을 좋아합니다 ❤️');
        }

        updateLikeUI(activePostId, post.likes || 0);
        renderPosts();
    });
}

// 공유 버튼
function setupShareButton() {
    const btnShare = document.getElementById('btnShare');
    if (!btnShare) return;

    btnShare.addEventListener('click', async () => {
        const shareUrl = window.location.href;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                showToast('칼럼 주소가 클립보드에 복사되었습니다.');
            } else {
                const tempInput = document.createElement('input');
                tempInput.value = shareUrl;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                showToast('칼럼 주소가 클립보드에 복사되었습니다.');
            }
        } catch (e) {
            showToast('주소 복사에 실패했습니다.');
        }
    });
}

// URL 쿼리스트링(?id=post-xxx) 또는 해시(#post-xxx) 확인 및 라우팅
function checkUrlRoute() {
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get('id');
    const hashId = window.location.hash.replace('#', '');
    const targetId = queryId || hashId;

    if (targetId && allPosts.some(p => p.id === targetId || p.slug === targetId)) {
        window.openPostPage(targetId, false);
    } else if (!targetId && activePostId) {
        window.closePostPage(false);
    }
}

// 하위 호환
function checkUrlHash() {
    checkUrlRoute();
}

// 이벤트 리스너 등록
function initEventListeners() {
    // 카테고리 탭
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category || 'all';
            renderPosts();
        });
    });

    // 실시간 검색
    const searchInput = document.getElementById('blogSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderPosts();
        });
    }

    // 정렬 셀렉트
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderPosts();
        });
    }

    // 칼럼 상세 페이지 -> 목록으로 돌아가기 버튼들
    const btnBackTop = document.getElementById('btnBackToList');
    if (btnBackTop) {
        btnBackTop.addEventListener('click', () => window.closePostPage(true));
    }

    const btnBackBottom = document.getElementById('btnBackToListBottom');
    if (btnBackBottom) {
        btnBackBottom.addEventListener('click', () => window.closePostPage(true));
    }

    const breadcrumbListLink = document.getElementById('breadcrumbBlogListLink');
    if (breadcrumbListLink) {
        breadcrumbListLink.addEventListener('click', () => window.closePostPage(true));
    }

    // 브라우저 뒤로가기/앞으로가기 (History API Popstate)
    window.addEventListener('popstate', () => {
        checkUrlRoute();
    });

    // URL 해시 변경 감지
    window.addEventListener('hashchange', () => {
        checkUrlRoute();
    });

    // ESC 키 누를 시 목록으로 돌아가기
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activePostId) {
            window.closePostPage(true);
        }
    });

    setupLikeButton();
    setupShareButton();
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadPosts();
});

// ==========================================
// SEO & 메타태그 동적 최적화 (검색엔진 & SNS 공유)
// ==========================================
const DEFAULT_SEO = {
    title: '학업여지도 칼럼 & 리서치 블로그',
    desc: '공공데이터 기반 학군 심층 분석, 고교학점제 입시 정보, 학군지 부동산 가치 평가 리포트를 제공합니다.',
    keywords: '학업여지도, 학군분석, 학업성취도, 특목고자사고, 고교학점제, 대입실적, 학군지부동산, 입시리포트',
    image: 'favicon.svg',
    url: 'blog.html'
};

function stripMarkdownToPlainText(text) {
    if (!text) return '';
    return text
        .replace(/!\[.*?\]\(.*?\)/g, '') // 이미지 제거
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 링크 텍스트만 추출
        .replace(/#{1,6}\s+/g, '') // 헤더 제거
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // 볼드 제거
        .replace(/(\*|_)(.*?)\1/g, '$2') // 이탤릭 제거
        .replace(/~~(.*?)~~/g, '$1') // 취소선 제거
        .replace(/`{1,3}.*?`{1,3}/gs, '') // 인라인 코드/코드블럭 제거
        .replace(/>\s+/g, '') // 인용문 제거
        .replace(/[-*+]\s+/g, '') // 목록 글머리 기호 제거
        .replace(/\n+/g, ' ') // 줄바꿈을 공백으로
        .trim();
}

function updatePageSeoMetadata(post) {
    if (!post) return;

    const fullTitle = `${post.title} | 학업여지도 칼럼 & 리서치`;
    const plainSnippet = stripMarkdownToPlainText(post.summary || post.content || '').slice(0, 160) || DEFAULT_SEO.desc;
    
    // 절대 URL 생성
    const origin = window.location.origin;
    const postUrl = `${origin}${window.location.pathname}?id=${encodeURIComponent(post.id || post.slug)}`;
    
    let imageUrl = post.thumbnail ? post.thumbnail.trim() : '';
    if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `${origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }
    if (!imageUrl) {
        imageUrl = `${origin}/favicon.svg`;
    }

    // 1) Title
    document.title = fullTitle;
    const elTitle = document.getElementById('seoTitle');
    if (elTitle) elTitle.textContent = fullTitle;

    // 2) Description
    const elDesc = document.getElementById('seoDesc');
    if (elDesc) elDesc.setAttribute('content', plainSnippet);

    // 3) Keywords
    const elKeywords = document.getElementById('seoKeywords');
    if (elKeywords) {
        const tags = Array.isArray(post.tags) ? post.tags.join(', ') : '';
        elKeywords.setAttribute('content', `${post.category || '학군분석'}, ${tags}, 학업여지도, 입시리포트`);
    }

    // 4) Canonical
    const elCanonical = document.getElementById('seoCanonical');
    if (elCanonical) elCanonical.setAttribute('href', postUrl);

    // 5) Open Graph (Kakao, Facebook)
    const setMeta = (id, attr, val) => {
        const el = document.getElementById(id);
        if (el) el.setAttribute(attr, val);
    };

    setMeta('seoOgTitle', 'content', post.title);
    setMeta('seoOgDesc', 'content', plainSnippet);
    setMeta('seoOgImage', 'content', imageUrl);
    setMeta('seoOgUrl', 'content', postUrl);
    setMeta('seoOgType', 'content', 'article');

    // 6) Twitter Card
    setMeta('seoTwTitle', 'content', post.title);
    setMeta('seoTwDesc', 'content', plainSnippet);
    setMeta('seoTwImage', 'content', imageUrl);

    // 7) Schema.org BlogPosting 구조화 데이터
    const elJsonLd = document.getElementById('seoJsonLd');
    if (elJsonLd) {
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": postUrl
            },
            "headline": post.title,
            "description": plainSnippet,
            "image": imageUrl ? [imageUrl] : undefined,
            "datePublished": post.createdAt,
            "dateModified": post.updatedAt || post.createdAt,
            "author": {
                "@type": "Person",
                "name": post.author || "학업여지도 리서치팀",
                "jobTitle": post.authorRole || "수석연구원"
            },
            "publisher": {
                "@type": "Organization",
                "name": "학업여지도",
                "logo": {
                    "@type": "ImageObject",
                    "url": `${origin}/favicon.svg`
                }
            }
        };
        elJsonLd.textContent = JSON.stringify(structuredData, null, 2);
    }
}

function resetPageSeoMetadata() {
    document.title = DEFAULT_SEO.title;
    const elTitle = document.getElementById('seoTitle');
    if (elTitle) elTitle.textContent = DEFAULT_SEO.title;

    const elDesc = document.getElementById('seoDesc');
    if (elDesc) elDesc.setAttribute('content', DEFAULT_SEO.desc);

    const elKeywords = document.getElementById('seoKeywords');
    if (elKeywords) elKeywords.setAttribute('content', DEFAULT_SEO.keywords);

    const elCanonical = document.getElementById('seoCanonical');
    if (elCanonical) elCanonical.setAttribute('href', 'blog.html');

    const setMeta = (id, attr, val) => {
        const el = document.getElementById(id);
        if (el) el.setAttribute(attr, val);
    };

    setMeta('seoOgTitle', 'content', DEFAULT_SEO.title);
    setMeta('seoOgDesc', 'content', DEFAULT_SEO.desc);
    setMeta('seoOgImage', 'content', DEFAULT_SEO.image);
    setMeta('seoOgUrl', 'content', 'blog.html');
    setMeta('seoOgType', 'content', 'website');

    setMeta('seoTwTitle', 'content', DEFAULT_SEO.title);
    setMeta('seoTwDesc', 'content', DEFAULT_SEO.desc);
    setMeta('seoTwImage', 'content', DEFAULT_SEO.image);

    const elJsonLd = document.getElementById('seoJsonLd');
    if (elJsonLd) {
        const defaultData = {
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "학업여지도 칼럼 & 리서치",
            "description": DEFAULT_SEO.desc,
            "publisher": {
                "@type": "Organization",
                "name": "학업여지도"
            }
        };
        elJsonLd.textContent = JSON.stringify(defaultData, null, 2);
    }
}

