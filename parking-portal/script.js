// ===== 메인 슬라이더 =====
const slides = document.querySelectorAll('.slide');
const prevBtn = document.querySelector('.slide-arrow.prev');
const nextBtn = document.querySelector('.slide-arrow.next');
const pauseBtn = document.getElementById('slidePauseBtn');
const indicatorNum = document.querySelector('.indicator');
let currentSlide = 0;
let slideTimer;
let isPaused = false;

function showSlide(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    slides.forEach(s => s.classList.remove('active'));
    slides[index].classList.add('active');
    currentSlide = index;
    indicatorNum.textContent = index + 1;
}

function startSlider() {
    slideTimer = setInterval(() => showSlide(currentSlide + 1), 5000);
}

function stopSlider() {
    clearInterval(slideTimer);
}

prevBtn.addEventListener('click', () => {
    stopSlider();
    showSlide(currentSlide - 1);
    if (!isPaused) startSlider();
});

nextBtn.addEventListener('click', () => {
    stopSlider();
    showSlide(currentSlide + 1);
    if (!isPaused) startSlider();
});

pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    if (isPaused) {
        stopSlider();
        pauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        startSlider();
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
});

startSlider();

// ===== 탭 전환 =====
const tabs = document.querySelectorAll('.search-tabs .tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + target).classList.add('active');
    });
});

// ===== 모바일 메뉴 토글 =====
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const gnbList = document.querySelector('.gnb-list');

mobileMenuBtn.addEventListener('click', () => {
    gnbList.classList.toggle('active');
    const icon = mobileMenuBtn.querySelector('i');
    if (gnbList.classList.contains('active')) {
        icon.className = 'fas fa-times';
    } else {
        icon.className = 'fas fa-bars';
    }
});

// ===== 조회 기능 =====
// 미납요금 조회
document.getElementById('unpaidBtn').addEventListener('click', () => {
    const val = document.getElementById('unpaidInput').value.trim();
    const result = document.getElementById('unpaidResult');
    if (!val) { result.innerHTML = '<p class="result-warn"><i class="fas fa-exclamation-circle"></i> 차량번호를 입력해주세요.</p>'; return; }
    result.innerHTML = `<div class="result-card">
        <div class="result-icon ok"><i class="fas fa-check-circle"></i></div>
        <div class="result-text"><strong>${val}</strong> 차량의 미납요금이 없습니다.</div>
    </div>`;
});

// 견인차량 조회
document.getElementById('towBtn').addEventListener('click', () => {
    const val = document.getElementById('towInput').value.trim();
    const result = document.getElementById('towResult');
    if (!val) { result.innerHTML = '<p class="result-warn"><i class="fas fa-exclamation-circle"></i> 차량번호를 입력해주세요.</p>'; return; }
    result.innerHTML = `<div class="result-card">
        <div class="result-icon ok"><i class="fas fa-check-circle"></i></div>
        <div class="result-text"><strong>${val}</strong> 차량은 견인 내역이 없습니다.</div>
    </div>`;
});

// 주차장 검색
document.getElementById('parkingSearchBtn').addEventListener('click', () => {
    const val = document.getElementById('parkingSearchInput').value.trim().toLowerCase();
    const result = document.getElementById('parkingSearchResult');
    if (!val) { result.innerHTML = '<p class="result-warn"><i class="fas fa-exclamation-circle"></i> 검색어를 입력해주세요.</p>'; return; }
    const found = PARKING_DATA.filter(p => p.name.toLowerCase().includes(val) || p.addr.toLowerCase().includes(val));
    if (found.length === 0) {
        result.innerHTML = '<p class="result-warn"><i class="fas fa-info-circle"></i> 검색 결과가 없습니다.</p>';
        return;
    }
    result.innerHTML = found.map(p => {
        const pct = Math.round(p.used / p.total * 100);
        const status = getStatus(p.used, p.total);
        const statusLabel = STATUS_LABELS[status];
        const remaining = p.total - p.used;
        return `<div class="result-parking">
            <span class="result-parking-name">${p.name}</span>
            <span class="result-parking-addr">안양시 ${p.addr}</span>
            <span class="result-parking-status ${status}">${statusLabel} ${remaining}/${p.total}면</span>
        </div>`;
    }).join('');
});

// ===== 주차장 카드 동적 생성 =====
const parkingTrack = document.getElementById('parkingGrid');
const TYPE_LABELS = { outdoor: '노외', street: '노상', mechanical: '기계식', underground: '지하' };

function getStatus(used, total) {
    const pct = used / total;
    if (pct >= 0.85) return 'crowded';
    if (pct >= 0.6) return 'normal';
    return 'available';
}

const STATUS_LABELS = { available: '여유', normal: '보통', crowded: '혼잡' };

function buildCards() {
    parkingTrack.innerHTML = PARKING_DATA.map(p => {
        const pct = Math.round(p.used / p.total * 100);
        const status = getStatus(p.used, p.total);
        return `<div class="parking-circle-card" data-used="${p.used}" data-total="${p.total}" data-area="${p.area}">
            <div class="circle-chart"><svg viewBox="0 0 120 120"><circle class="circle-bg" cx="60" cy="60" r="50"/><circle class="circle-fill" cx="60" cy="60" r="50"/></svg><div class="circle-center"><span class="circle-percent">${pct}%</span><span class="circle-status ${status}">${STATUS_LABELS[status]}</span></div></div>
            <div class="circle-info"><span class="badge-type ${p.type}">${TYPE_LABELS[p.type]}</span><h4>${p.name}</h4><p class="circle-count">주차 <strong>${p.used}</strong> / ${p.total}면</p><p class="circle-addr">${p.addr}</p></div>
        </div>`;
    }).join('');
}

buildCards();

// ===== 도넛 차트 애니메이션 =====
const CIRCUMFERENCE = 2 * Math.PI * 50;

// 퍼센트(0~1)에 따라 초록 → 노랑 → 빨강 그라데이션
function getColorByPercent(pct) {
    let r, g, b;
    if (pct < 0.5) {
        // 초록(26,122,58) → 노랑(230,168,0)
        const t = pct / 0.5;
        r = Math.round(26 + (230 - 26) * t);
        g = Math.round(122 + (168 - 122) * t);
        b = Math.round(58 + (0 - 58) * t);
    } else {
        // 노랑(230,168,0) → 빨강(211,47,47)
        const t = (pct - 0.5) / 0.5;
        r = Math.round(230 + (211 - 230) * t);
        g = Math.round(168 + (47 - 168) * t);
        b = Math.round(0 + (47 - 0) * t);
    }
    return `rgb(${r},${g},${b})`;
}

function animateCircles() {
    parkingTrack.querySelectorAll('.parking-circle-card').forEach(card => {
        const used = parseInt(card.dataset.used);
        const total = parseInt(card.dataset.total);
        const pct = used / total;
        const offset = CIRCUMFERENCE * (1 - pct);
        const fill = card.querySelector('.circle-fill');
        fill.style.strokeDasharray = CIRCUMFERENCE;
        fill.style.strokeDashoffset = offset;
        fill.style.stroke = getColorByPercent(pct);
    });
}

// ===== 주차현황 슬라이더 =====
const parkingViewport = document.querySelector('.parking-slider-viewport');
const parkingPrevBtn = document.querySelector('.parking-prev');
const parkingNextBtn = document.querySelector('.parking-next');
const VISIBLE_COUNT = 3;
let parkingIndex = 0;
let parkingMaxIndex = 0;
let parkingAutoTimer = null;
let currentFilter = 'all';

function getVisibleCards() {
    return Array.from(parkingTrack.querySelectorAll('.parking-circle-card')).filter(card => {
        return currentFilter === 'all' || card.dataset.area === currentFilter;
    });
}

function layoutSlider() {
    const allCards = parkingTrack.querySelectorAll('.parking-circle-card');
    const visibleCards = getVisibleCards();

    parkingMaxIndex = Math.max(0, visibleCards.length - VISIBLE_COUNT);
    if (parkingIndex > parkingMaxIndex) parkingIndex = 0;
    if (parkingIndex < 0) parkingIndex = parkingMaxIndex;

    allCards.forEach(card => {
        card.style.display = (currentFilter === 'all' || card.dataset.area === currentFilter) ? '' : 'none';
    });

    const viewportWidth = parkingViewport.offsetWidth;
    const gap = 16;
    const cardWidth = (viewportWidth - gap * (VISIBLE_COUNT - 1)) / VISIBLE_COUNT;

    visibleCards.forEach(card => {
        card.style.width = cardWidth + 'px';
        card.style.minWidth = cardWidth + 'px';
        card.style.marginRight = gap + 'px';
    });

    parkingTrack.style.width = visibleCards.length * (cardWidth + gap) + 'px';
    parkingTrack.style.transform = `translateX(-${parkingIndex * (cardWidth + gap)}px)`;

    animateCircles();
}

function goNext() {
    parkingIndex++;
    if (parkingIndex > parkingMaxIndex) parkingIndex = 0;
    layoutSlider();
}

function goPrev() {
    parkingIndex--;
    if (parkingIndex < 0) parkingIndex = parkingMaxIndex;
    layoutSlider();
}

function resetParkingAuto() {
    clearInterval(parkingAutoTimer);
    parkingAutoTimer = setInterval(goNext, 5000);
}

parkingPrevBtn.addEventListener('click', () => {
    goPrev();
    resetParkingAuto();
});

parkingNextBtn.addEventListener('click', () => {
    goNext();
    resetParkingAuto();
});

// 초기화
layoutSlider();
resetParkingAuto();

// 리사이즈 대응
window.addEventListener('resize', () => layoutSlider());

// ===== 지역 필터 탭 =====
const areaTabs = document.querySelectorAll('.area-tab');

areaTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        areaTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.area;
        parkingIndex = 0;
        layoutSlider();
        resetParkingAuto();
    });
});

// ===== Leaflet 지도 =====
(function initMap() {
    const mapEl = document.getElementById('parkingMap');
    if (!mapEl || typeof L === 'undefined') return;

    const map = L.map('parkingMap', {
        zoomControl: false,
        attributionControl: false
    }).setView([37.3950, 126.9450], 13);

    // 위성 타일 (Esri World Imagery)
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
    });

    // 위성 위에 도로/지명 라벨 오버레이
    const labels = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        pane: 'overlayPane'
    });

    // 일반 지도 (CartoDB Voyager)
    const streets = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
    });

    // 기본: 위성 + 라벨
    satellite.addTo(map);
    labels.addTo(map);

    L.control.layers({
        '위성 지도': L.layerGroup([satellite, labels]),
        '일반 지도': streets
    }, null, { position: 'topright', collapsed: false }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('&copy; Esri &copy; <a href="https://carto.com/">CARTO</a>')
        .addTo(map);

    const allMarkers = [];
    const resultList = document.getElementById('mapResultList');
    const resultCount = document.getElementById('mapResultCount');
    const activeFilters = new Set(['outdoor', 'street', 'underground', 'mechanical']);

    // 사이드바 리스트 렌더
    function renderList() {
        const keyword = (document.getElementById('mapSearchInput').value || '').trim().toLowerCase();
        resultList.innerHTML = '';
        let count = 0;

        PARKING_DATA.forEach((p, idx) => {
            if (!activeFilters.has(p.type)) return;
            if (keyword && !p.name.toLowerCase().includes(keyword) && !p.addr.toLowerCase().includes(keyword)) return;

            const pct = Math.round(p.used / p.total * 100);
            const status = getStatus(p.used, p.total);
            const remaining = p.total - p.used;
            const statusLabel = STATUS_LABELS[status];

            const div = document.createElement('div');
            div.className = 'map-result-item';
            div.dataset.idx = idx;
            div.innerHTML = `
                <div class="map-result-icon ${status}"><i class="fas fa-parking"></i></div>
                <div class="map-result-info">
                    <h5>${p.name}</h5>
                    <p>안양시 ${p.addr}</p>
                    <div class="map-result-meta">
                        <div class="map-result-bar"><div class="map-result-bar-fill ${status}" style="width:${pct}%"></div></div>
                        <span class="map-result-slots ${status}">${statusLabel} ${remaining}면</span>
                    </div>
                </div>`;

            resultList.appendChild(div);
            count++;
        });

        resultCount.textContent = count + '개';
    }

    // 필터 칩 이벤트
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const type = chip.dataset.type;

            if (type === 'all') {
                const allActive = activeFilters.size === 4;
                document.querySelectorAll('.filter-chip').forEach(c => {
                    if (allActive) {
                        c.classList.remove('active');
                        activeFilters.clear();
                    } else {
                        c.classList.add('active');
                        ['outdoor', 'street', 'underground', 'mechanical'].forEach(t => activeFilters.add(t));
                    }
                });
            } else {
                chip.classList.toggle('active');
                if (activeFilters.has(type)) activeFilters.delete(type);
                else activeFilters.add(type);

                const allChip = document.querySelector('.filter-chip[data-type="all"]');
                if (activeFilters.size === 4) allChip.classList.add('active');
                else allChip.classList.remove('active');
            }

            renderList();
        });
    });

    // 검색
    document.getElementById('mapSearchInput').addEventListener('input', () => renderList());

    // 내 위치 버튼
    document.getElementById('mapLocateBtn').addEventListener('click', () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
            map.setView([pos.coords.latitude, pos.coords.longitude], 15, { animate: true });
            L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
                radius: 7,
                color: '#fff',
                fillColor: '#0055a5',
                fillOpacity: 1,
                weight: 2.5
            }).addTo(map);
        });
    });

    // 초기 렌더
    renderList();
})();

// ===== 로그인 =====
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const loginClose = document.getElementById('loginClose');
const loginSubmit = document.getElementById('loginSubmit');
const testLoginBtn = document.getElementById('testLoginBtn');
const testAccount = document.getElementById('testAccount');
const loginIdInput = document.getElementById('loginId');
const loginPwInput = document.getElementById('loginPw');
const utilRight = document.getElementById('utilRight');

loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginOverlay.classList.add('open');
    loginIdInput.focus();
});

loginClose.addEventListener('click', () => loginOverlay.classList.remove('open'));
loginOverlay.addEventListener('click', (e) => {
    if (e.target === loginOverlay) loginOverlay.classList.remove('open');
});

// 로그인 상태 추적
let currentUser = null;

function doLogin(id, displayName) {
    loginOverlay.classList.remove('open');
    currentUser = { id, name: displayName || id };
    // registeredUsers에서 추가 정보 가져오기
    const regUser = typeof registeredUsers !== 'undefined' && registeredUsers.find(u => u.id === id);
    if (regUser) {
        currentUser.phone = regUser.phone;
        currentUser.car = regUser.car;
        currentUser.name = regUser.name || displayName || id;
    }
    utilRight.innerHTML = `
        <span class="util-user">
            <i class="fas fa-user-circle"></i>
            <strong>${displayName || id}</strong>님
            <button class="logout-btn" id="logoutBtn">로그아웃</button>
        </span>
        <span class="divider">|</span>
        <a href="#">마이페이지</a>`;
    document.getElementById('logoutBtn').addEventListener('click', doLogout);
}

function doLogout() {
    currentUser = null;
    utilRight.innerHTML = `
        <a href="#" id="loginBtn">로그인</a>
        <span class="divider">|</span>
        <a href="#">회원가입</a>
        <span class="divider">|</span>
        <a href="#">마이페이지</a>`;
    document.getElementById('loginBtn').addEventListener('click', (e) => {
        e.preventDefault();
        loginOverlay.classList.add('open');
        loginIdInput.focus();
    });
}

loginPwInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginSubmit.click();
});

testLoginBtn.addEventListener('click', () => {
    const val = testAccount.value;
    if (!val) { alert('테스트 계정을 선택하세요.'); return; }
    const [id, pw] = val.split('|');
    loginIdInput.value = id;
    loginPwInput.value = pw;
    doLogin(id, 'AD(관리자)');
});

// ===== 회원가입 =====
const signupOverlay = document.getElementById('signupOverlay');
const signupCloseBtn = document.getElementById('signupClose');
const signupSubmitBtn = document.getElementById('signupSubmit');
const idCheckBtn = document.getElementById('idCheckBtn');
const agreeAll = document.getElementById('agreeAll');
const agreeItems = document.querySelectorAll('.agree-item');

// 가입된 계정 저장 (테스트용 메모리)
const registeredUsers = [{ id: 'AD', pw: 'roqkfwk00', name: '관리자', phone: '010-0000-0000', car: '' }];
let idChecked = false;

document.getElementById('signupBtn').addEventListener('click', (e) => {
    e.preventDefault();
    signupOverlay.classList.add('open');
});

signupCloseBtn.addEventListener('click', () => signupOverlay.classList.remove('open'));
signupOverlay.addEventListener('click', (e) => {
    if (e.target === signupOverlay) signupOverlay.classList.remove('open');
});

// 로그인 ↔ 회원가입 전환
document.getElementById('goLoginBtn').addEventListener('click', (e) => {
    e.preventDefault();
    signupOverlay.classList.remove('open');
    loginOverlay.classList.add('open');
    loginIdInput.focus();
});

// 아이디 중복확인
idCheckBtn.addEventListener('click', () => {
    const id = document.getElementById('signupId').value.trim();
    const msg = document.getElementById('idMsg');
    if (!/^[a-zA-Z0-9]{4,20}$/.test(id)) {
        msg.textContent = '영문, 숫자 4~20자로 입력해주세요.';
        msg.className = 'field-msg err';
        idChecked = false;
        return;
    }
    if (registeredUsers.find(u => u.id.toLowerCase() === id.toLowerCase())) {
        msg.textContent = '이미 사용 중인 아이디입니다.';
        msg.className = 'field-msg err';
        idChecked = false;
    } else {
        msg.textContent = '사용 가능한 아이디입니다.';
        msg.className = 'field-msg ok';
        idChecked = true;
    }
});

document.getElementById('signupId').addEventListener('input', () => { idChecked = false; document.getElementById('idMsg').textContent = ''; });

// 비밀번호 실시간 검증
document.getElementById('signupPw').addEventListener('input', () => {
    const pw = document.getElementById('signupPw').value;
    const msg = document.getElementById('pwMsg');
    if (pw.length === 0) { msg.textContent = ''; return; }
    if (pw.length < 8 || !/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
        msg.textContent = '영문, 숫자 포함 8자 이상 입력해주세요.';
        msg.className = 'field-msg err';
    } else {
        msg.textContent = '사용 가능한 비밀번호입니다.';
        msg.className = 'field-msg ok';
    }
});

document.getElementById('signupPwConfirm').addEventListener('input', () => {
    const pw = document.getElementById('signupPw').value;
    const pwc = document.getElementById('signupPwConfirm').value;
    const msg = document.getElementById('pwConfirmMsg');
    if (pwc.length === 0) { msg.textContent = ''; return; }
    if (pw !== pwc) {
        msg.textContent = '비밀번호가 일치하지 않습니다.';
        msg.className = 'field-msg err';
    } else {
        msg.textContent = '비밀번호가 일치합니다.';
        msg.className = 'field-msg ok';
    }
});

// 전체 동의
agreeAll.addEventListener('change', () => {
    agreeItems.forEach(item => item.checked = agreeAll.checked);
});

agreeItems.forEach(item => {
    item.addEventListener('change', () => {
        agreeAll.checked = [...agreeItems].every(i => i.checked);
    });
});

// 가입 제출
signupSubmitBtn.addEventListener('click', () => {
    const id = document.getElementById('signupId').value.trim();
    const pw = document.getElementById('signupPw').value;
    const pwc = document.getElementById('signupPwConfirm').value;
    const name = document.getElementById('signupName').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const car = document.getElementById('signupCar').value.trim();
    const requiredAgrees = [...agreeItems].slice(0, 2);

    if (!id) { alert('아이디를 입력해주세요.'); return; }
    if (!idChecked) { alert('아이디 중복확인을 해주세요.'); return; }
    if (pw.length < 8 || !/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) { alert('비밀번호를 올바르게 입력해주세요.'); return; }
    if (pw !== pwc) { alert('비밀번호가 일치하지 않습니다.'); return; }
    if (!name) { alert('이름을 입력해주세요.'); return; }
    if (!phone) { alert('휴대폰 번호를 입력해주세요.'); return; }
    if (!requiredAgrees.every(a => a.checked)) { alert('필수 약관에 동의해주세요.'); return; }

    registeredUsers.push({ id, pw, name, phone, car });

    // 테스트 계정 콤보에 추가
    const opt = document.createElement('option');
    opt.value = id + '|' + pw;
    opt.textContent = id + ' / ' + pw + ' (' + name + ')';
    testAccount.appendChild(opt);

    alert('회원가입이 완료되었습니다!\n아이디: ' + id);
    signupOverlay.classList.remove('open');

    // 로그인 모달로 이동
    loginIdInput.value = id;
    loginPwInput.value = '';
    loginOverlay.classList.add('open');
    loginPwInput.focus();
});

// 로그인 시 등록된 계정도 확인하도록 수정
loginSubmit.removeEventListener('click', loginSubmit._handler);
loginSubmit._handler = () => {
    const id = loginIdInput.value.trim();
    const pw = loginPwInput.value.trim();
    if (!id || !pw) { alert('아이디와 비밀번호를 입력하세요.'); return; }
    const user = registeredUsers.find(u => u.id === id && u.pw === pw);
    if (user) {
        doLogin(id, user.name === '관리자' ? 'AD(관리자)' : user.name);
    } else {
        alert('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
};
loginSubmit.addEventListener('click', loginSubmit._handler);

// ===== 유관기관 바로가기 =====
const familyGoBtn = document.querySelector('.btn-go');
const familySelect = document.getElementById('familySite');

const FAMILY_URLS = {
    '안양시청': 'https://www.anyang.go.kr',
    '안양도시공사': 'https://www.auc.or.kr',
    '경기도 교통정보센터': 'https://gits.gg.go.kr',
    '국토교통부': 'https://www.molit.go.kr',
    '한국교통안전공단': 'https://www.kotsa.or.kr'
};

if (familyGoBtn && familySelect) {
    familyGoBtn.addEventListener('click', () => {
        const selected = familySelect.value;
        if (selected === '유관기관 바로가기') return;
        const url = FAMILY_URLS[selected];
        if (url) window.open(url, '_blank');
    });
}

// ===== 수목원 주차 예약 챗봇 =====
const chatbotBtn = document.getElementById('chatbotBtn');
const chatbotWindow = document.getElementById('chatbotWindow');
const chatbotClose = document.getElementById('chatbotClose');
const chatbotBody = document.getElementById('chatbotBody');
const chatbotInput = document.getElementById('chatbotInput');
const chatbotSend = document.getElementById('chatbotSend');
const counselorBtn = document.getElementById('counselorBtn');
const sessionId = 'session_' + Date.now();
const ttsToggle = document.getElementById('ttsToggle');
let isSending = false;
let reserveState = null;
let ttsEnabled = true;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// --- TTS (Edge TTS) ---
let ttsAudio = null;

// TTS 변환은 서버에서 SSML로 처리

async function speak(text) {
    if (!ttsEnabled) return;
    stopSpeak();
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return;

    try {
        const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: clean })
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        ttsAudio = new Audio(url);
        ttsAudio.playbackRate = 1.0;
        ttsAudio.play();
        ttsAudio.onended = () => { URL.revokeObjectURL(url); ttsAudio = null; };
    } catch (e) {
        console.error('[TTS]', e);
    }
}

function stopSpeak() {
    if (ttsAudio) {
        ttsAudio.pause();
        ttsAudio.currentTime = 0;
        ttsAudio = null;
    }
}

ttsToggle.addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    ttsToggle.classList.toggle('active', ttsEnabled);
    ttsToggle.querySelector('i').className = ttsEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
    if (!ttsEnabled) stopSpeak();
});

// 개별 메시지 스피커 버튼
function addSpeakBtn(msgDiv) {
    const btn = document.createElement('button');
    btn.className = 'tts-speak-btn';
    btn.innerHTML = '<i class="fas fa-volume-up"></i>';
    btn.addEventListener('click', () => {
        const text = msgDiv.textContent;
        if (ttsAudio && !ttsAudio.paused) {
            stopSpeak();
            btn.classList.remove('speaking');
        } else {
            const prevEnabled = ttsEnabled;
            ttsEnabled = true;
            speak(text);
            ttsEnabled = prevEnabled;
            btn.classList.add('speaking');
            const check = setInterval(() => {
                if (!ttsAudio || ttsAudio.paused) {
                    btn.classList.remove('speaking');
                    clearInterval(check);
                }
            }, 200);
        }
    });
    msgDiv.appendChild(btn);
}

chatbotBtn.addEventListener('click', () => {
    chatbotWindow.classList.add('open');
    chatbotBtn.classList.add('hidden');
    chatbotInput.focus();
});

chatbotClose.addEventListener('click', () => {
    chatbotWindow.classList.remove('open');
    chatbotBtn.classList.remove('hidden');
    stopSpeak();
    // TTS도 OFF 처리
    ttsEnabled = false;
    ttsToggle.classList.remove('active');
    ttsToggle.querySelector('i').className = 'fas fa-volume-mute';
});

// --- 챗봇 내부 스크롤 전파 차단 ---
chatbotBody.addEventListener('wheel', (e) => {
    const { scrollTop, scrollHeight, clientHeight } = chatbotBody;
    const atTop = scrollTop === 0 && e.deltaY < 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
    if (atTop || atBottom) {
        e.preventDefault();
    }
}, { passive: false });

// --- 메시지 헬퍼 ---
function addMsg(text, type, autoSpeak = true) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + type;
    div.innerHTML = text;
    chatbotBody.appendChild(div);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
    if (type === 'bot' && text) {
        addSpeakBtn(div);
        if (autoSpeak) speak(text);
    }
    return div;
}

function addWidget(html) {
    const div = document.createElement('div');
    div.className = 'chat-widget';
    div.innerHTML = html;
    chatbotBody.appendChild(div);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
    return div;
}

function addTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg bot typing';
    div.innerHTML = '<span class="dot-pulse"></span>';
    chatbotBody.appendChild(div);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
    return div;
}

// --- AI 스트리밍 ---
async function sendToAI(text, showUser = true) {
    if (isSending) return;
    isSending = true;
    chatbotInput.disabled = true;
    chatbotSend.disabled = true;

    if (showUser) addMsg(text, 'user');
    const typing = addTyping();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, sessionId })
        });

        typing.remove();
        const botDiv = addMsg('', 'bot', false); // 스트리밍 중에는 TTS 안 함
        let fullText = '';

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6);
                if (data === '[DONE]') break;
                try {
                    const p = JSON.parse(data);
                    if (p.error) { fullText = p.error; botDiv.textContent = fullText; }
                    else if (p.token) { fullText += p.token; botDiv.textContent = fullText; chatbotBody.scrollTop = chatbotBody.scrollHeight; }
                } catch (e) {}
            }
        }
        if (!fullText) botDiv.textContent = '응답을 받지 못했습니다. 다시 시도해주세요.';
        // 스트리밍 완료 후 TTS
        if (fullText) speak(fullText);
    } catch (err) {
        typing.remove();
        addMsg('서버에 연결할 수 없습니다.', 'bot');
    }

    isSending = false;
    chatbotInput.disabled = false;
    chatbotSend.disabled = false;
    chatbotInput.focus();
}

// --- 혼잡 현황 ---
async function showCongestion() {
    addMsg('혼잡 현황', 'user');
    const typing = addTyping();

    try {
        const res = await fetch('/api/availability');
        const data = await res.json();
        typing.remove();
        addMsg('이번 주 안양수목원 주차장 현황입니다.', 'bot');

        let html = '';
        for (const [date, info] of Object.entries(data)) {
            const d = new Date(date + 'T00:00:00');
            const label = `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
            let badge, badgeClass;
            if (info.closed) { badge = '휴원'; badgeClass = 'gray'; }
            else if (info.available === 0) { badge = '만차'; badgeClass = 'red'; }
            else if (info.available <= 9) { badge = `혼잡 ${info.available}면`; badgeClass = 'yellow'; }
            else { badge = `여유 ${info.available}면`; badgeClass = 'green'; }
            html += `<div class="congestion-card"><span class="cg-date">${label}</span><span class="cg-badge ${badgeClass}">${badge}</span></div>`;
        }
        addWidget(html);

        // CTA
        addWidget('<div class="chat-cta"><button class="chat-cta-btn" onclick="startReserve()">지금 예약하기</button></div>');
    } catch (e) {
        typing.remove();
        addMsg('현황을 불러올 수 없습니다.', 'bot');
    }
}

// --- 예약 플로우 ---
async function startReserve() {
    reserveState = { step: 'date' };
    addMsg('주차 예약', 'user');
    addMsg('예약하실 날짜를 선택해 주세요.', 'bot');

    try {
        const res = await fetch('/api/availability');
        const data = await res.json();

        let html = '<div class="chat-calendar"><div class="chat-calendar-title">날짜 선택 (오늘~7일 후)</div><div class="chat-calendar-grid">';
        for (const [date, info] of Object.entries(data)) {
            const d = new Date(date + 'T00:00:00');
            const day = d.getDate();
            const wd = WEEKDAYS[d.getDay()];
            let cls, availText;
            if (info.closed) { cls = 'closed'; availText = '휴원'; }
            else if (info.available === 0) { cls = 'full'; availText = '만차'; }
            else if (info.available <= 9) { cls = 'busy'; availText = `${info.available}면`; }
            else { cls = 'available'; availText = `${info.available}면`; }

            const disabled = (cls === 'closed' || cls === 'full') ? 'disabled' : '';
            html += `<button class="cal-date-btn ${cls}" data-date="${date}" ${disabled}>
                <span class="cal-day">${day}</span>
                <span class="cal-weekday">${wd}</span>
                <span class="cal-avail">${availText}</span>
            </button>`;
        }
        html += '</div></div>';
        const widget = addWidget(html);

        widget.querySelectorAll('.cal-date-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => selectDate(btn.dataset.date));
        });
    } catch (e) {
        addMsg('날짜 정보를 불러올 수 없습니다.', 'bot');
        reserveState = null;
    }
}

async function selectDate(date) {
    const d = new Date(date + 'T00:00:00');
    const label = `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]})`;

    try {
        const res = await fetch(`/api/availability/${date}`);
        const info = await res.json();
        addMsg(`${label} 선택`, 'user');

        if (currentUser) {
            // 로그인 상태 → 이름 자동 불러오기
            addMsg(`${label} 잔여 <strong>${info.available}</strong>면 확인됩니다.<br><strong>${currentUser.name}</strong>님으로 예약을 진행합니다.${currentUser.car ? '<br>등록 차량: ' + currentUser.car : ''}<br><br>차량번호를 입력해 주세요. (예: 12가3456)${currentUser.car ? '<br>또는 등록된 차량으로 진행하려면 <strong>"등록차량"</strong>이라고 입력하세요.' : ''}`, 'bot');
            reserveState = { step: 'carNumber', date, dateLabel: label, userName: currentUser.name };
        } else {
            // 비로그인 → 이름 먼저 질문
            addMsg(`${label} 잔여 <strong>${info.available}</strong>면 확인됩니다.<br>예약자 이름을 입력해 주세요.`, 'bot');
            reserveState = { step: 'name', date, dateLabel: label };
        }
    } catch (e) {
        addMsg('날짜 정보를 확인할 수 없습니다.', 'bot');
    }
}

function inputName(name) {
    if (name.length < 2) {
        addMsg('이름을 2글자 이상 입력해 주세요.', 'bot');
        return;
    }
    reserveState.userName = name;
    reserveState.step = 'carNumber';
    addMsg(name, 'user');
    addMsg(`<strong>${name}</strong>님, 차량번호를 입력해 주세요. (예: 12가3456)`, 'bot');
}

const DISCOUNTS = [
    { id: 'none',    label: '해당 없음',          rate: 0,   amount: 5000 },
    { id: 'eco',     label: '저공해 차량 (50%)',   rate: 50,  amount: 2500 },
    { id: 'multi',   label: '다자녀 가구 (50%)',   rate: 50,  amount: 2500 },
    { id: 'compact', label: '경차 (50%)',          rate: 50,  amount: 2500 },
    { id: 'disable', label: '장애인 (100%)',       rate: 100, amount: 0 },
    { id: 'veteran', label: '국가유공자 (50%)',    rate: 50,  amount: 2500 },
];

function inputCarNumber(carNumber) {
    // "등록차량" 입력 시 로그인된 차량번호 사용
    if (carNumber === '등록차량' && currentUser && currentUser.car) {
        carNumber = currentUser.car;
    }

    if (!/^\d{2,3}[가-힣]\d{4}$/.test(carNumber)) {
        addMsg('차량번호 형식을 확인해 주세요. (예: 12가3456, 123가4567)', 'bot');
        return;
    }

    reserveState.carNumber = carNumber;
    reserveState.step = 'discount';

    addMsg(carNumber, 'user');
    addMsg('할인 적용 내역이 다음 중 있으십니까?', 'bot');

    let html = '<div class="chat-discount-list">';
    DISCOUNTS.forEach(d => {
        html += `<button class="chat-discount-btn" data-discount="${d.id}">${d.label}</button>`;
    });
    html += '</div>';

    const widget = addWidget(html);
    widget.querySelectorAll('.chat-discount-btn').forEach(btn => {
        btn.addEventListener('click', () => selectDiscount(btn.dataset.discount));
    });
}

function selectDiscount(discountId) {
    const disc = DISCOUNTS.find(d => d.id === discountId);
    reserveState.discount = disc;
    reserveState.step = 'confirm';

    addMsg(disc.label, 'user');

    const priceText = disc.amount === 0
        ? '<strong style="color:#2e7d32">무료 (100% 감면)</strong>'
        : `<strong>${disc.amount.toLocaleString()}원</strong>` + (disc.rate > 0 ? ` <s style="color:#999;font-size:11px">5,000원</s> (${disc.rate}% 감면)` : '');

    const html = `<div class="reserve-confirm">
        <strong>예약 정보 확인</strong><br>
        예약자: ${reserveState.userName || '(미입력)'}<br>
        날짜: ${reserveState.dateLabel}<br>
        차량: ${reserveState.carNumber}<br>
        할인: ${disc.id === 'none' ? '없음' : disc.label}<br>
        결제금액: ${priceText}
    </div>
    <div class="chat-action-btns">
        <button class="chat-action-btn primary" onclick="confirmReserve()">예약 확정</button>
        <button class="chat-action-btn secondary" onclick="resetReserve()">다시 입력</button>
    </div>`;
    addWidget(html);

    // TTS: 예약 확인 안내
    speak(`${reserveState.dateLabel}, ${reserveState.carNumber}, 결제금액 ${disc.amount === 0 ? '무료' : disc.amount.toLocaleString() + '원'}. 예약 정보를 확인하시고 예약 확정 버튼을 눌러주세요.`);
}

async function confirmReserve() {
    if (!reserveState || reserveState.step !== 'confirm') return;

    const typing = addTyping();
    try {
        const res = await fetch('/api/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                date: reserveState.date,
                carNumber: reserveState.carNumber,
                discountLabel: reserveState.discount ? reserveState.discount.label : '없음',
                amount: reserveState.discount ? reserveState.discount.amount : 5000
            })
        });
        typing.remove();
        const result = await res.json();

        if (result.success) {
            const r = result.reservation;
            const discLabel = reserveState.discount && reserveState.discount.id !== 'none' ? reserveState.discount.label : '';
            addWidget(`<div class="reserve-done">
                <div class="done-icon"><i class="fas fa-check-circle"></i></div>
                예약이 완료되었습니다!
                <div class="done-no">${r.confirmNo}</div>
                예약자: ${reserveState.userName || ''}<br>
                ${reserveState.dateLabel} | ${r.carNumber}<br>
                ${discLabel ? '할인: ' + discLabel + '<br>' : ''}
                결제금액: ${r.amount.toLocaleString()}원${r.amount === 0 ? ' (무료)' : ''}<br><br>
                <small>확인 SMS가 발송됩니다.<br>
                취소는 전일 18:00까지 가능합니다.<br>
                노쇼 시 이용 제한이 적용됩니다.</small>
            </div>`);

            // TTS: 예약 완료 안내
            speak(`${reserveState.dateLabel}로 예약되었습니다. 예약 정보를 확인하세요.`);
        } else {
            addMsg(result.error, 'bot');
        }
    } catch (e) {
        typing.remove();
        addMsg('예약 처리 중 오류가 발생했습니다.', 'bot');
    }
    reserveState = null;
}

function resetReserve() {
    reserveState = null;
    startReserve();
}

// --- 취소/변경 ---
function showCancel() {
    addMsg('취소/변경', 'user');
    addMsg('예약 취소를 원하시면 확인번호를 입력해 주세요.<br>(예: AY12345678)<br><br>확인번호는 예약 완료 시 발급된 번호입니다.', 'bot');
    reserveState = { step: 'cancelInput' };
}

async function processCancel(confirmNo) {
    addMsg(confirmNo, 'user');
    const typing = addTyping();
    try {
        const res = await fetch('/api/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, confirmNo: confirmNo.toUpperCase() })
        });
        typing.remove();
        const result = await res.json();
        addMsg(result.success ? result.message : result.error, 'bot');
    } catch (e) {
        typing.remove();
        addMsg('취소 처리 중 오류가 발생했습니다.', 'bot');
    }
    reserveState = null;
}

// --- 메인 메뉴 액션 ---
document.addEventListener('click', e => {
    const menuBtn = e.target.closest('.chat-menu-btn');
    if (!menuBtn) return;
    const action = menuBtn.dataset.action;
    if (action === 'congestion') showCongestion();
    else if (action === 'reserve') startReserve();
    else if (action === 'cancel') showCancel();
    else if (action === 'faq') sendToAI('노쇼 정책과 운영시간을 알려주세요');
});

// --- 메시지 전송 ---
function handleSend() {
    const text = chatbotInput.value.trim();
    if (!text) return;
    chatbotInput.value = '';

    // 예약 플로우 중이면 단계에 따라 처리
    if (reserveState) {
        if (reserveState.step === 'name') {
            inputName(text);
            return;
        }
        if (reserveState.step === 'carNumber') {
            inputCarNumber(text);
            return;
        }
        if (reserveState.step === 'cancelInput') {
            processCancel(text);
            return;
        }
    }

    // 자유 입력 → AI
    sendToAI(text);
}

chatbotSend.addEventListener('click', handleSend);
chatbotInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });

// --- 상담원 연결 ---
counselorBtn.addEventListener('click', async () => {
    if (!confirm('상담원 연결을 요청하시겠습니까?')) return;
    try {
        const res = await fetch('/api/counselor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        const data = await res.json();
        appendMsg('bot', data.message || '상담원 연결이 요청되었습니다. 관리사무소(031-470-0242)에서 곧 연락드리겠습니다.');
    } catch {
        appendMsg('bot', '상담원 연결 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
});
