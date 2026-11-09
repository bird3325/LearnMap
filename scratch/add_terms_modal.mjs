import fs from 'fs';

let content = fs.readFileSync('index.html', 'utf8');

// 1. 푸터 영역 교체
const footerTarget = "© It's LAB. All rights reserved.";

if (!content.includes(footerTarget)) {
    console.error('Footer target not found!');
    process.exit(1);
}

// 푸터를 감싸고 있는 div 전체 교체
const footerDivRegex = /<div\s+style="margin-top:\s*24px;\s*margin-bottom:\s*8px;\s*text-align:\s*center;\s*font-size:\s*10px;\s*color:\s*var\(--text-muted\);\s*opacity:\s*0\.6;\s*font-weight:\s*500;\s*letter-spacing:\s*0\.3px;">\s*© It's LAB\. All rights reserved\.\s*<\/div>/;

const newFooter = `<div
                    style="margin-top: 24px; margin-bottom: 12px; text-align: center; font-size: 11px; color: var(--text-muted); font-weight: 500; letter-spacing: 0.2px;">
                    <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <a href="javascript:void(0)" onclick="if(window.openTermsModal) window.openTermsModal('terms');"
                            style="color: var(--text-muted); text-decoration: none; font-size: 11px; cursor: pointer; transition: color 0.15s;"
                            onmouseover="this.style.color='var(--primary-blue, #2563eb)'" onmouseout="this.style.color='var(--text-muted)'">이용약관</a>
                        <span style="opacity: 0.35; font-size: 10px;">|</span>
                        <a href="javascript:void(0)" onclick="if(window.openTermsModal) window.openTermsModal('privacy');"
                            style="color: var(--text-muted); text-decoration: none; font-size: 11px; font-weight: 700; cursor: pointer; transition: color 0.15s;"
                            onmouseover="this.style.color='var(--primary-blue, #2563eb)'" onmouseout="this.style.color='var(--text-muted)'">개인정보처리방침</a>
                    </div>
                    <div style="font-size: 10px; opacity: 0.6;">
                        © It's LAB. All rights reserved.
                    </div>
                </div>`;

if (!footerDivRegex.test(content)) {
    console.error('Footer div regex failed!');
    process.exit(1);
}

content = content.replace(footerDivRegex, newFooter);
console.log('Footer replaced successfully.');

// 2. </body> 앞에 모달 및 스크립트 추가
const termsModalHtml = `
    <!-- 이용약관 및 개인정보처리방침 통합 모달 -->
    <div id="termsModal"
        style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); z-index: 10100; justify-content: center; align-items: center; padding: 20px; box-sizing: border-box;">
        <div class="terms-modal-content"
            style="background: #ffffff; width: 100%; max-width: 660px; max-height: 86vh; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.25); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0; animation: fadeIn 0.2s ease;">

            <!-- Header Bar -->
            <div
                style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 18px 24px; color: white; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">📜</span>
                    <div>
                        <h3 id="termsModalHeaderTitle" style="margin: 0; font-size: 16px; font-weight: 800; color: #ffffff;">이용약관 및 정책</h3>
                        <span style="font-size: 11px; color: #94a3b8;">학업여지도 (It's LAB) 서비스 정책 및 이용자 보호 규정</span>
                    </div>
                </div>
                <button type="button" onclick="if(window.closeTermsModal) window.closeTermsModal();"
                    style="background: rgba(255,255,255,0.1); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 18px; display: flex; justify-content: center; align-items: center; transition: background 0.2s;"
                    onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'"
                    title="닫기">&times;</button>
            </div>

            <!-- Tab Segment Navigation -->
            <div style="padding: 14px 24px 0 24px; background: #ffffff;">
                <div style="display: flex; background: #f1f5f9; padding: 4px; border-radius: 10px; gap: 4px;">
                    <button type="button" id="btnTermsTabService"
                        onclick="if(window.switchTermsTab) window.switchTermsTab('terms');"
                        style="flex: 1; padding: 8px 12px; font-size: 13px; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; background: #ffffff; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s;">서비스 이용약관</button>
                    <button type="button" id="btnTermsTabPrivacy"
                        onclick="if(window.switchTermsTab) window.switchTermsTab('privacy');"
                        style="flex: 1; padding: 8px 12px; font-size: 13px; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; background: transparent; color: #64748b; transition: all 0.2s;">개인정보처리방침</button>
                </div>
            </div>

            <!-- Body Area: Scrollable Content -->
            <div id="termsScrollContainer" style="padding: 20px 24px; overflow-y: auto; flex: 1; font-size: 12.5px; line-height: 1.75; color: #334155; word-break: keep-all;">
                <!-- 1. 서비스 이용약관 본문 -->
                <div id="termsViewService" style="display: block;">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;">
                        <div style="font-weight: 700; color: #1e293b; margin-bottom: 4px;">📌 학업여지도 서비스 이용약관 안내</div>
                        <div style="color: #64748b; font-size: 12px;">본 약관은 회사가 제공하는 교육환경 분석, 학교·학원 위치 및 학업성취도 정보, 부동산 주거 정보 및 파트너 센터 서비스의 이용과 관련하여 필요한 사항을 담고 있습니다.</div>
                    </div>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">제1조 (목적)</h4>
                    <p style="margin: 0 0 10px 0; color: #475569;">본 약관은 "It's LAB"(이하 "회사")이 운영하는 "학업여지도"(이하 "서비스")를 이용함에 있어 회사와 이용자(회원 및 비회원 포함) 간의 권리, 의무 및 책임사항, 기타 필요한 제반 사항을 규정함을 목적으로 합니다.</p>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">제2조 (용어의 정의)</h4>
                    <p style="margin: 0 0 6px 0; color: #475569;">1. "서비스"란 단말기(PC, 휴대형 단말기 등)에 상관없이 회사가 제공하는 학교 기본 정보, 학업성취도, 학군 진학 예측, 학원 위치 및 매칭, 국토교통부 실거래가 기반 주거 단지 정보 및 파트너 센터 등 학업여지도 플랫폼 일체를 의미합니다.</p>
                    <p style="margin: 0 0 6px 0; color: #475569;">2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</p>
                    <p style="margin: 0 0 6px 0; color: #475569;">3. "회원"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 서비스의 정보를 지속적으로 제공받으며 서비스를 원활히 이용할 수 있는 자를 의미합니다.</p>
                    <p style="margin: 0 0 10px 0; color: #475569;">4. "파트너"란 학원, 교습소 또는 부동산 공인중개사무소 등 사업자로서 파트너 센터에 등록하여 비즈니스 프로필 관리 및 프리미엄 홍보 서비스를 이용하는 회원을 의미합니다.</p>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">제3조 (약관의 효력 및 개정)</h4>
                    <p style="margin: 0 0 6px 0; color: #475569;">1. 본 약관은 서비스 초기 화면 또는 푸터에 게시함으로써 효력이 발생합니다.</p>
                    <p style="margin: 0 0 10px 0; color: #475569;">2. 회사는 약관의 규제에 관한 법률 등 관련 법령을 위배하지 않는 범위 내에서 본 약관을 개정할 수 있으며, 약관을 개정할 경우 적용일자 및 개정사유를 명시하여 적용일자 7일 전(중대한 변경의 경우 30일 전)부터 공지합니다.</p>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">제4조 (서비스의 제공 및 변경)</h4>
                    <p style="margin: 0 0 4px 0; color: #475569;">1. 회사는 이용자에게 다음의 서비스를 제공합니다:</p>
                    <ul style="margin: 0 0 6px 0; padding-left: 20px; color: #475569;">
                        <li>전국 초·중·고등학교 위치, 학교알리미 기반 학업성취도 및 진학 통계 정보</li>
                        <li>공공데이터 및 교육청 등록 학원·교습소 위치, 교습 과목 및 학부모 후기 정보</li>
                        <li>국토교통부 실거래가 및 건축HUB 표제부 기반 아파트·연립·단독 단지 정보</li>
                        <li>회원 등록 거주지 기반 학교 도보시간/거리 계산 및 학군 진학 예측 서비스</li>
                        <li>파트너 사업자를 위한 프로필 등록, 안심 학원 인증 및 지역 광고 솔루션</li>
                    </ul>
                    <p style="margin: 0 0 10px 0; color: #475569;">2. 서비스는 연중무휴 1일 24시간 제공을 원칙으로 하나, 정기점검이나 시스템 보수 등의 사유로 일시 중단될 수 있습니다.</p>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">제5조 (이용자의 의무 및 금지행위)</h4>
                    <p style="margin: 0 0 6px 0; color: #475569;">1. 이용자는 타인의 정보 도용, 허위 사실 기재, 타인의 명예 훼손, 불법 게시물 등록 행위를 하여서는 안 됩니다.</p>
                    <p style="margin: 0 0 10px 0; color: #475569;">2. 이용자는 회사의 사전 서면 승인 없이 서비스의 데이터를 자동화된 수단(크롤러, 스크래퍼, 봇 등)을 통하여 수집·복제·배포하거나 상업적으로 재가공할 수 없습니다.</p>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">제6조 (데이터의 출처 및 면책사항)</h4>
                    <p style="margin: 0 0 6px 0; color: #475569;">1. 본 서비스에서 제공하는 교육, 학원, 부동산 정보는 한국교육학술정보원(NEIS), 공공데이터포털, 국토교통부 등 공공기관의 원천 데이터를 연계·가공한 것입니다. 공공기관 데이터의 갱신 주기, 오기재 또는 현장 상황에 따라 실제 정보와 일부 차이가 발생할 수 있으며, 이에 따른 이용자의 최종적인 선택과 결정에 대한 책임은 이용자 본인에게 있습니다.</p>
                    <p style="margin: 0 0 10px 0; color: #475569;">2. 회사는 천재지변, 정전, 통신망 장애 등 불가항력적인 사유로 인하여 서비스를 일시적으로 제공할 수 없는 경우 이에 대한 책임을 부담하지 않습니다.</p>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">제7조 (준거법 및 분쟁 해결)</h4>
                    <p style="margin: 0 0 10px 0; color: #475569;">회사와 이용자 간 발생한 분쟁에 관하여는 대한민국 법을 적용하며, 관할 법원은 민사소송법에 따른 법원으로 합니다.</p>

                    <div style="margin-top: 16px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 11.5px; color: #64748b;">
                        시행일자: 2026년 11월 7일 (버전 v1.1)
                    </div>
                </div>

                <!-- 2. 개인정보처리방침 본문 -->
                <div id="termsViewPrivacy" style="display: none;">
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;">
                        <div style="font-weight: 700; color: #166534; margin-bottom: 4px;">🔒 학업여지도 개인정보처리방침 안내</div>
                        <div style="color: #15803d; font-size: 12px;">"It's LAB"은 정보통신망 이용촉진 및 정보보호 등에 관한 법률 및 개인정보 보호법에 따라 이용자의 소중한 개인정보를 안전하게 보호하며, 관련 권익을 보호하기 위해 최선을 다하고 있습니다.</div>
                    </div>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">1. 수집하는 개인정보 항목 및 수집 방법</h4>
                    <p style="margin: 0 0 4px 0; color: #475569;">회사는 서비스 제공을 위해 최소한의 개인정보를 수집하고 있습니다:</p>
                    <ul style="margin: 0 0 6px 0; padding-left: 20px; color: #475569;">
                        <li><strong>학부모 일반회원 가입 시</strong>: 이메일 주소(아이디), 비밀번호, 성명/닉네임, 거주지 주소(학교 통학 도보거리 및 통학시간 계산용, 선택)</li>
                        <li><strong>파트너 사업자 가입 시</strong>: 사업자 유형, 상호명, 대표자 성명, 연락처, 이메일 주소, 비밀번호</li>
                        <li><strong>서비스 이용 및 부가기능 이용 시</strong>: 자녀 학년 및 모의 성적 정보(선택), 잘못된 정보 수정 및 광고 문의 시 연락처</li>
                        <li><strong>자동 생성 수집 항목</strong>: 접속 IP 주소, 쿠키(Cookie), 기기 브라우저 정보, 서비스 이용 기록</li>
                    </ul>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">2. 개인정보의 수집 및 이용 목적</h4>
                    <p style="margin: 0 0 6px 0; color: #475569;">수집된 개인정보는 다음의 목적에 한하여 이용됩니다:</p>
                    <ul style="margin: 0 0 10px 0; padding-left: 20px; color: #475569;">
                        <li>회원 식별, 로그인 인증, 회원자격 유지 및 부정 이용 방지</li>
                        <li>회원 주소지 기반 학교별 도보거리·통학시간 계산 및 개인화 학군 진학 예측 서비스 제공</li>
                        <li>파트너 사업자 검수·승인 및 학원/부동산 비즈니스 프로필 관리</li>
                        <li>문의사항 및 오류 신고에 대한 고객지원 처리 및 공지사항 전달</li>
                    </ul>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">3. 개인정보의 보유 및 이용 기간</h4>
                    <p style="margin: 0 0 6px 0; color: #475569;">회사는 원칙적으로 회원의 회원 탈퇴 시까지 개인정보를 보유 및 이용하며, 탈퇴 시 지체 없이 파기합니다. 단, 관계 법령에 따라 일정 기간 보존할 의무가 있는 경우 아래의 법정 기간 동안 안전하게 보관합니다:</p>
                    <ul style="margin: 0 0 10px 0; padding-left: 20px; color: #475569;">
                        <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                        <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                        <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                        <li>접속 로그 및 IP 정보: 3개월 (통신비밀보호법)</li>
                    </ul>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">4. 개인정보의 제3자 제공</h4>
                    <p style="margin: 0 0 10px 0; color: #475569;">회사는 이용자의 사전 동의 없이 개인정보를 외부에 제공하지 않습니다. 단, 법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 요구가 있는 경우는 예외로 합니다.</p>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">5. 이용자의 권리와 행사 방법</h4>
                    <p style="margin: 0 0 10px 0; color: #475569;">이용자는 언제든지 '마이페이지' 또는 고객지원을 통해 자신의 개인정보를 열람, 정정하거나 회원 탈퇴(동의 철회)를 요청할 수 있으며, 회사는 이에 대해 지체 없이 필요한 조치를 취합니다.</p>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">6. 개인정보의 안전성 확보 조치</h4>
                    <p style="margin: 0 0 10px 0; color: #475569;">회사는 개인정보를 취급함에 있어 분실, 도난, 유출, 변조를 방지하기 위하여 비밀번호 단방향 암호화, SSL/TLS 전송 구간 암호화(HTTPS), 접근 권한 통제 등 안전성 확보에 최선을 다하고 있습니다.</p>

                    <h4 style="margin: 16px 0 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">7. 개인정보 보호책임자 및 고객 문의</h4>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; font-size: 12px; color: #475569;">
                        <div>• 서비스명: 학업여지도 (It's LAB)</div>
                        <div>• 개인정보 보호 담당: 고객지원 및 개인정보관리팀</div>
                        <div>• 문의 접수: 서비스 내 '고객지원 및 문의하기' 창구</div>
                    </div>

                    <div style="margin-top: 16px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 11.5px; color: #64748b;">
                        공고 및 시행일자: 2026년 11월 7일 (버전 v1.1)
                    </div>
                </div>
            </div>

            <!-- Footer Action -->
            <div style="padding: 12px 24px 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
                <button type="button" onclick="if(window.closeTermsModal) window.closeTermsModal();"
                    style="padding: 8px 24px; height: 38px; border: none; border-radius: 8px; background: #2563eb; color: #ffffff; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s;"
                    onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
                    확인
                </button>
            </div>
        </div>
    </div>

    <script>
        // 전역 이용약관 및 개인정보처리방침 모달 제어 함수
        window.openTermsModal = function(type) {
            const modal = document.getElementById('termsModal');
            if (!modal) return;
            modal.style.display = 'flex';
            window.switchTermsTab(type || 'terms');
        };

        window.closeTermsModal = function() {
            const modal = document.getElementById('termsModal');
            if (modal) modal.style.display = 'none';
        };

        window.switchTermsTab = function(type) {
            const btnTerms = document.getElementById('btnTermsTabService');
            const btnPrivacy = document.getElementById('btnTermsTabPrivacy');
            const viewTerms = document.getElementById('termsViewService');
            const viewPrivacy = document.getElementById('termsViewPrivacy');
            const scrollBox = document.getElementById('termsScrollContainer');
            const headerTitle = document.getElementById('termsModalHeaderTitle');

            if (type === 'privacy') {
                if (btnTerms) {
                    btnTerms.style.background = 'transparent';
                    btnTerms.style.color = '#64748b';
                    btnTerms.style.fontWeight = '600';
                    btnTerms.style.boxShadow = 'none';
                }
                if (btnPrivacy) {
                    btnPrivacy.style.background = '#ffffff';
                    btnPrivacy.style.color = '#0f172a';
                    btnPrivacy.style.fontWeight = '700';
                    btnPrivacy.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }
                if (viewTerms) viewTerms.style.display = 'none';
                if (viewPrivacy) viewPrivacy.style.display = 'block';
                if (headerTitle) headerTitle.innerText = '개인정보처리방침';
            } else {
                if (btnTerms) {
                    btnTerms.style.background = '#ffffff';
                    btnTerms.style.color = '#0f172a';
                    btnTerms.style.fontWeight = '700';
                    btnTerms.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }
                if (btnPrivacy) {
                    btnPrivacy.style.background = 'transparent';
                    btnPrivacy.style.color = '#64748b';
                    btnPrivacy.style.fontWeight = '600';
                    btnPrivacy.style.boxShadow = 'none';
                }
                if (viewTerms) viewTerms.style.display = 'block';
                if (viewPrivacy) viewPrivacy.style.display = 'none';
                if (headerTitle) headerTitle.innerText = '서비스 이용약관';
            }

            if (scrollBox) scrollBox.scrollTop = 0;
        };

        // 모달 외부 클릭 및 ESC 닫기 이벤트 등록
        document.addEventListener('DOMContentLoaded', function() {
            const modal = document.getElementById('termsModal');
            if (modal) {
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) window.closeTermsModal();
                });
            }
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    const m = document.getElementById('termsModal');
                    if (m && m.style.display === 'flex') window.closeTermsModal();
                }
            });

            // URL 파라미터 체크 (?view=terms 또는 ?view=privacy)
            try {
                const params = new URLSearchParams(window.location.search);
                const view = params.get('view');
                if (view === 'terms' || view === 'privacy') {
                    window.openTermsModal(view);
                }
            } catch(e) {}
        });
    </script>
`;

if (!content.includes('</body>')) {
    console.error('</body> tag not found!');
    process.exit(1);
}

content = content.replace('</body>', termsModalHtml + '\n</body>');
fs.writeFileSync('index.html', content, 'utf8');
console.log('Successfully updated index.html with terms modal and footer links!');
