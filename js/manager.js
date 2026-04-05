// ===== 페이지 전환 =====
const menuItems = document.querySelectorAll('.sidebar-menu li');
const pages = document.querySelectorAll('.page');

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        menuItems.forEach(i => i.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('page-' + item.dataset.page).classList.add('active');
    });
});

function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function shortId(id) {
    return id.length > 20 ? id.slice(0, 8) + '...' + id.slice(-6) : id;
}

// ===== 5. 로그아웃 =====
document.getElementById('adminLogout').addEventListener('click', () => {
    if (confirm('로그아웃 하시겠습니까?')) {
        window.location.href = '/parking-portal/index.html';
    }
});

// ===== 1. 유저 관리 (샘플 데이터 삭제 → AD만) =====
const users = [
    { id: 'AD', pw: 'roqkfwk00', name: '관리자', phone: '010-0000-0000', car: '', role: 'admin', status: 'active', joinDate: '2026-01-01' },
];

const userTableBody = document.getElementById('userTableBody');
const userSearch = document.getElementById('userSearch');
const userModal = document.getElementById('userModal');
const checkAll = document.getElementById('checkAll');

function renderUsers() {
    const keyword = userSearch.value.trim().toLowerCase();
    const filtered = users.filter(u =>
        !keyword || u.id.toLowerCase().includes(keyword) || u.name.includes(keyword) || u.car.includes(keyword) || u.phone.includes(keyword)
    );

    userTableBody.innerHTML = filtered.map((u) => {
        const idx = users.indexOf(u);
        return `<tr>
            <td><input type="checkbox" class="user-check" data-idx="${idx}"></td>
            <td><strong>${u.id}</strong></td>
            <td>${u.name}</td>
            <td>${u.phone}</td>
            <td>${u.car || '<span style="color:#ccc">-</span>'}</td>
            <td><span class="role-badge ${u.role}">${u.role === 'admin' ? '관리자' : '사용자'}</span></td>
            <td><span class="status-dot ${u.status}">${u.status === 'active' ? '활성' : '비활성'}</span></td>
            <td>${u.joinDate}</td>
            <td><div class="action-btns">
                <button class="edit-btn" onclick="openEditUser(${idx})"><i class="fas fa-pen"></i></button>
                <button class="del-btn" onclick="deleteUser(${idx})"><i class="fas fa-trash"></i></button>
            </div></td>
        </tr>`;
    }).join('');

    document.getElementById('statTotal').textContent = users.length;
    document.getElementById('statActive').textContent = users.filter(u => u.status === 'active').length;
    document.getElementById('statInactive').textContent = users.filter(u => u.status === 'inactive').length;
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('statToday').textContent = users.filter(u => u.joinDate === today).length;
}

userSearch.addEventListener('input', renderUsers);
checkAll.addEventListener('change', () => {
    document.querySelectorAll('.user-check').forEach(cb => cb.checked = checkAll.checked);
});

function openModal() { userModal.classList.add('open'); }
function closeModal() { userModal.classList.remove('open'); }
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancel').addEventListener('click', closeModal);
userModal.addEventListener('click', (e) => { if (e.target === userModal) closeModal(); });

document.getElementById('addUserBtn').addEventListener('click', () => {
    document.getElementById('modalTitle').textContent = '유저 추가';
    document.getElementById('editIdx').value = -1;
    document.getElementById('modalId').value = '';
    document.getElementById('modalId').disabled = false;
    document.getElementById('modalPw').value = '';
    document.getElementById('modalName').value = '';
    document.getElementById('modalPhone').value = '';
    document.getElementById('modalCar').value = '';
    document.getElementById('modalRole').value = 'user';
    document.getElementById('modalStatus').value = 'active';
    openModal();
});

function openEditUser(idx) {
    const u = users[idx];
    document.getElementById('modalTitle').textContent = '유저 수정';
    document.getElementById('editIdx').value = idx;
    document.getElementById('modalId').value = u.id;
    document.getElementById('modalId').disabled = true;
    document.getElementById('modalPw').value = '';
    document.getElementById('modalName').value = u.name;
    document.getElementById('modalPhone').value = u.phone;
    document.getElementById('modalCar').value = u.car;
    document.getElementById('modalRole').value = u.role;
    document.getElementById('modalStatus').value = u.status;
    openModal();
}

document.getElementById('modalSave').addEventListener('click', () => {
    const idx = parseInt(document.getElementById('editIdx').value);
    const id = document.getElementById('modalId').value.trim();
    const pw = document.getElementById('modalPw').value;
    const name = document.getElementById('modalName').value.trim();
    const phone = document.getElementById('modalPhone').value.trim();
    const car = document.getElementById('modalCar').value.trim();
    const role = document.getElementById('modalRole').value;
    const status = document.getElementById('modalStatus').value;

    if (!id || !name || !phone) { alert('필수 항목을 입력해주세요.'); return; }

    if (idx === -1) {
        if (!pw) { alert('비밀번호를 입력해주세요.'); return; }
        if (users.find(u => u.id.toLowerCase() === id.toLowerCase())) { alert('이미 존재하는 아이디입니다.'); return; }
        const today = new Date().toISOString().slice(0, 10);
        users.push({ id, pw, name, phone, car, role, status, joinDate: today });
    } else {
        users[idx].name = name;
        users[idx].phone = phone;
        users[idx].car = car;
        users[idx].role = role;
        users[idx].status = status;
        if (pw) users[idx].pw = pw;
    }

    closeModal();
    renderUsers();
});

function deleteUser(idx) {
    if (!confirm(`"${users[idx].name}" (${users[idx].id}) 유저를 삭제하시겠습니까?`)) return;
    users.splice(idx, 1);
    renderUsers();
}

renderUsers();

// ===== 2 & 3. 대화 내역 (관리자 시점: user=왼쪽, bot=오른쪽 + 읽음/안읽음) =====
const readMessages = JSON.parse(localStorage.getItem('admin_read_msgs') || '{}');

function markAsRead(sessionId) {
    readMessages[sessionId] = true;
    localStorage.setItem('admin_read_msgs', JSON.stringify(readMessages));
}

async function loadConversations() {
    const list = document.getElementById('convList');
    try {
        const res = await fetch('/api/admin/conversations');
        const data = await res.json();
        if (data.length === 0) {
            list.innerHTML = '<div class="empty-state">대화 내역이 없습니다.</div>';
            return;
        }
        list.innerHTML = data.map(c => {
            const isRead = readMessages[c.sessionId];
            return `<div class="list-item ${isRead ? '' : 'unread'}" data-sid="${c.sessionId}">
                <div class="list-item-top">
                    <span class="list-item-id">${shortId(c.sessionId)}</span>
                    <span class="list-item-time">${formatTime(c.createdAt)}</span>
                </div>
                <div class="list-item-preview">${c.lastMessage ? c.lastMessage.content : '(비어있음)'}</div>
                <div class="list-item-meta">
                    <span class="meta-tag msgs">${c.messageCount}건</span>
                    ${c.counselorRequested ? '<span class="meta-tag counselor">상담 요청</span>' : ''}
                    ${!isRead ? '<span class="unread-badge">1</span>' : ''}
                </div>
            </div>`;
        }).join('');

        list.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', () => {
                list.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                item.classList.remove('unread');
                const badge = item.querySelector('.unread-badge');
                if (badge) badge.remove();
                markAsRead(item.dataset.sid);
                loadConvDetail(item.dataset.sid);
            });
        });
    } catch {
        list.innerHTML = '<div class="empty-state">불러오기 실패</div>';
    }
}

async function loadConvDetail(sessionId) {
    const detail = document.getElementById('convDetail');
    try {
        const res = await fetch(`/api/admin/conversations/${sessionId}`);
        const conv = await res.json();

        let html = `<div class="detail-header">
            <h3>${shortId(sessionId)}</h3>
            <p>시작: ${formatTime(conv.createdAt)} | 메시지: ${conv.messages.length}건
            ${conv.counselorRequested ? ' | <span style="color:#c62828;font-weight:700">상담원 요청</span>' : ''}</p>
        </div><div class="detail-messages">`;

        for (const m of conv.messages) {
            // 관리자 시점: user(고객)=왼쪽, bot(상담원/챗봇)=오른쪽
            const cls = m.role === 'user' ? 'customer' : 'manager';
            const label = m.role === 'user' ? '<span class="msg-role customer-label">고객</span>' : '<span class="msg-role manager-label">챗봇</span>';
            html += `<div class="detail-msg ${cls}">${label}${m.content}<span class="msg-time">${formatTime(m.timestamp)}</span></div>`;
        }
        html += '</div>';
        detail.innerHTML = html;
    } catch {
        detail.innerHTML = '<div class="empty-state">불러오기 실패</div>';
    }
}

// ===== 상담원 요청 =====
async function loadCounselorRequests() {
    const list = document.getElementById('counselorList');
    const badge = document.getElementById('counselorBadge');
    try {
        const res = await fetch('/api/admin/counselor-requests');
        const data = await res.json();
        const pending = data.filter(r => r.status === 'pending').length;
        badge.textContent = pending;
        badge.classList.toggle('show', pending > 0);

        if (data.length === 0) {
            list.innerHTML = '<div class="empty-state">상담 요청이 없습니다.</div>';
            return;
        }

        list.innerHTML = data.map(r => `
            <div class="list-item" data-sid="${r.sessionId}">
                <div class="list-item-top">
                    <span class="list-item-id">${shortId(r.sessionId)}</span>
                    <span class="list-item-time">${formatTime(r.requestedAt)}</span>
                </div>
                <div class="list-item-preview">${r.lastMessage || '(메시지 없음)'}</div>
                <div class="list-item-meta">
                    <span class="meta-tag ${r.status === 'pending' ? 'pending' : 'resolved'}">${r.status === 'pending' ? '대기중' : '처리완료'}</span>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', () => {
                list.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                loadCounselorDetail(item.dataset.sid);
            });
        });
    } catch {
        list.innerHTML = '<div class="empty-state">불러오기 실패</div>';
    }
}

async function loadCounselorDetail(sessionId) {
    const detail = document.getElementById('counselorDetail');
    try {
        const [convRes, reqRes] = await Promise.all([
            fetch(`/api/admin/conversations/${sessionId}`),
            fetch('/api/admin/counselor-requests')
        ]);
        const conv = await convRes.json();
        const reqs = await reqRes.json();
        const req = reqs.find(r => r.sessionId === sessionId);

        let html = `<div class="detail-header">
            <h3>${shortId(sessionId)}</h3>
            <p>요청 시간: ${formatTime(req?.requestedAt)} | 상태: ${req?.status === 'pending' ? '대기중' : '처리완료'}</p>
        </div><div class="detail-messages">`;

        for (const m of (conv.messages || [])) {
            const cls = m.role === 'user' ? 'customer' : 'manager';
            const label = m.role === 'user' ? '<span class="msg-role customer-label">고객</span>' : '<span class="msg-role manager-label">챗봇</span>';
            html += `<div class="detail-msg ${cls}">${label}${m.content}<span class="msg-time">${formatTime(m.timestamp)}</span></div>`;
        }
        html += '</div>';

        if (req?.status === 'pending') {
            html += `<div class="counselor-actions"><button class="resolve-btn" onclick="resolveRequest('${sessionId}')">처리 완료</button></div>`;
        } else {
            html += `<div class="counselor-actions"><button class="resolve-btn" disabled>처리 완료됨 (${formatTime(req?.resolvedAt)})</button></div>`;
        }

        detail.innerHTML = html;
    } catch {
        detail.innerHTML = '<div class="empty-state">불러오기 실패</div>';
    }
}

async function resolveRequest(sessionId) {
    try {
        await fetch(`/api/admin/counselor-requests/${sessionId}/resolve`, { method: 'POST' });
        loadCounselorRequests();
        loadCounselorDetail(sessionId);
    } catch {
        alert('처리에 실패했습니다.');
    }
}

// ===== 4. API / 구현 문서 =====
const DOCS = [
    {
        icon: 'fa-server',
        color: '#1565c0',
        title: '서버 구조',
        desc: 'Express 서버 및 라우팅 구조',
        content: `<h3>서버 구조</h3>
<table class="doc-table">
<tr><th>항목</th><th>내용</th></tr>
<tr><td>프레임워크</td><td>Express.js (Node.js)</td></tr>
<tr><td>포트</td><td>3000</td></tr>
<tr><td>정적 파일</td><td>프로젝트 루트 전체 서빙 (express.static)</td></tr>
<tr><td>진입점</td><td>js/server.js</td></tr>
<tr><td>실행</td><td>start.bat 또는 node js/server.js</td></tr>
</table>
<h4>주요 미들웨어</h4>
<ul>
<li><b>cors</b> - Cross-Origin 허용</li>
<li><b>express.json()</b> - JSON body 파싱</li>
<li><b>express.static(ROOT)</b> - 정적 파일 서빙</li>
</ul>`
    },
    {
        icon: 'fa-plug',
        color: '#e65100',
        title: 'REST API 목록',
        desc: '전체 API 엔드포인트 정리',
        content: `<h3>REST API 엔드포인트</h3>
<table class="doc-table">
<tr><th>Method</th><th>URL</th><th>설명</th></tr>
<tr><td><span class="method get">GET</span></td><td>/api/availability</td><td>주차장 잔여 현황 (7일간)</td></tr>
<tr><td><span class="method get">GET</span></td><td>/api/availability/:date</td><td>특정 날짜 잔여 조회</td></tr>
<tr><td><span class="method post">POST</span></td><td>/api/reserve</td><td>주차 예약 (sessionId, date, carNumber)</td></tr>
<tr><td><span class="method post">POST</span></td><td>/api/cancel</td><td>예약 취소 (sessionId, confirmNo)</td></tr>
<tr><td><span class="method post">POST</span></td><td>/api/chat</td><td>AI 채팅 (SSE 스트리밍)</td></tr>
<tr><td><span class="method post">POST</span></td><td>/api/counselor</td><td>상담원 연결 요청</td></tr>
<tr><td><span class="method get">GET</span></td><td>/api/admin/conversations</td><td>관리자: 대화 목록</td></tr>
<tr><td><span class="method get">GET</span></td><td>/api/admin/conversations/:id</td><td>관리자: 대화 상세</td></tr>
<tr><td><span class="method get">GET</span></td><td>/api/admin/counselor-requests</td><td>관리자: 상담 요청 목록</td></tr>
<tr><td><span class="method post">POST</span></td><td>/api/admin/counselor-requests/:id/resolve</td><td>관리자: 상담 처리 완료</td></tr>
</table>`
    },
    {
        icon: 'fa-robot',
        color: '#6a1b9a',
        title: 'AI 챗봇 구현',
        desc: 'Ollama + RAG 기반 챗봇 동작 방식',
        content: `<h3>AI 챗봇 구현</h3>
<table class="doc-table">
<tr><th>항목</th><th>내용</th></tr>
<tr><td>AI 엔진</td><td>Ollama (로컬 LLM)</td></tr>
<tr><td>모델</td><td>qwen2.5:14b</td></tr>
<tr><td>Ollama 서버</td><td>http://172.31.0.210:11434</td></tr>
<tr><td>응답 방식</td><td>SSE (Server-Sent Events) 스트리밍</td></tr>
</table>
<h4>RAG (검색 증강 생성)</h4>
<ul>
<li><b>지식 문서</b>: knowledge/ 폴더의 .md 파일</li>
<li><b>벡터화</b>: js/rag.js에서 Ollama 임베딩 API 사용</li>
<li><b>검색</b>: 코사인 유사도 기반 top-3 문서 검색</li>
<li><b>컨텍스트 주입</b>: 시스템 프롬프트 + RAG 결과 + 잔여 현황</li>
</ul>
<h4>대화 흐름</h4>
<ol>
<li>사용자 메시지 수신</li>
<li>RAG 검색 → 관련 문서 추출</li>
<li>시스템 프롬프트 + RAG + 현황 + 대화 히스토리 조합</li>
<li>Ollama API 스트리밍 호출</li>
<li>토큰 단위로 SSE 전송</li>
</ol>`
    },
    {
        icon: 'fa-folder-open',
        color: '#2e7d32',
        title: '파일 구조',
        desc: '프로젝트 디렉토리 구조',
        content: `<h3>프로젝트 파일 구조</h3>
<pre class="doc-tree">
수목원 챗봇/
├── start.bat              # 서버 실행 스크립트
├── package.json           # Node.js 의존성
├── system_prompt.txt      # AI 시스템 프롬프트
├── manager.html           # 관리자 페이지
│
├── js/
│   ├── server.js          # Express 서버 (API + 정적 파일)
│   ├── rag.js             # RAG 벡터 검색 엔진
│   ├── manager.js         # 관리자 페이지 스크립트
│   └── user.js            # (미사용)
│
├── css/
│   └── manager.css        # 관리자 페이지 스타일
│
├── knowledge/             # RAG 지식 문서 (.md)
│
├── data/
│   ├── conversations.json # 대화 내역 저장
│   └── counselor_requests.json # 상담 요청 저장
│
└── parking-portal/        # 사용자 포털
    ├── index.html         # 메인 페이지
    ├── script.js          # 프론트엔드 스크립트
    ├── style.css          # 스타일
    └── parking-data.js    # 주차장 데이터
</pre>`
    },
    {
        icon: 'fa-database',
        color: '#c62828',
        title: '데이터 저장',
        desc: '대화/예약/상담 데이터 관리 방식',
        content: `<h3>데이터 저장 방식</h3>
<table class="doc-table">
<tr><th>데이터</th><th>파일</th><th>형식</th></tr>
<tr><td>대화 내역</td><td>data/conversations.json</td><td>sessionId별 메시지 배열</td></tr>
<tr><td>상담 요청</td><td>data/counselor_requests.json</td><td>sessionId별 요청 상태</td></tr>
<tr><td>주차 현황</td><td>메모리 (5분마다 갱신)</td><td>날짜별 잔여/예약 면수</td></tr>
</table>
<h4>대화 객체 구조</h4>
<pre class="doc-code">{
  "sessionId": "session_1712345678",
  "createdAt": "2026-04-03T10:00:00Z",
  "messages": [
    { "role": "user", "content": "...", "timestamp": "..." },
    { "role": "assistant", "content": "...", "timestamp": "..." }
  ],
  "reservations": [...],
  "counselorRequested": false
}</pre>`
    },
    {
        icon: 'fa-calendar-check',
        color: '#00838f',
        title: '예약 정책',
        desc: '주차 예약 비즈니스 룰',
        content: `<h3>예약 비즈니스 룰</h3>
<table class="doc-table">
<tr><th>규칙</th><th>내용</th></tr>
<tr><td>예약 가능 기간</td><td>내일 ~ 7일 후</td></tr>
<tr><td>당일 예약</td><td>불가</td></tr>
<tr><td>월 예약 횟수</td><td>1회 제한</td></tr>
<tr><td>휴원일</td><td>매주 월요일</td></tr>
<tr><td>총 주차면</td><td>50면</td></tr>
<tr><td>기본 요금</td><td>5,000원</td></tr>
<tr><td>취소 기한</td><td>방문 전날 18:00까지</td></tr>
<tr><td>노쇼 패널티</td><td>30일간 예약 제한</td></tr>
</table>
<h4>감면 대상</h4>
<ul>
<li>저공해 차량: 50%</li>
<li>다자녀 가구: 50%</li>
<li>경차: 50%</li>
<li>장애인: 100%</li>
<li>국가유공자: 50%</li>
</ul>`
    }
];

const docsGrid = document.getElementById('docsGrid');
const docsViewer = document.getElementById('docsViewer');
const docsContent = document.getElementById('docsContent');

function renderDocs() {
    docsGrid.innerHTML = DOCS.map((doc, i) => `
        <button class="doc-card" data-idx="${i}">
            <div class="doc-card-icon" style="background:${doc.color}"><i class="fas ${doc.icon}"></i></div>
            <div class="doc-card-text">
                <h4>${doc.title}</h4>
                <p>${doc.desc}</p>
            </div>
            <i class="fas fa-chevron-right doc-card-arrow"></i>
        </button>
    `).join('');

    docsGrid.querySelectorAll('.doc-card').forEach(card => {
        card.addEventListener('click', () => {
            const doc = DOCS[card.dataset.idx];
            docsGrid.style.display = 'none';
            docsViewer.style.display = 'block';
            docsContent.innerHTML = doc.content;
        });
    });
}

document.getElementById('docsBack').addEventListener('click', () => {
    docsViewer.style.display = 'none';
    docsGrid.style.display = 'grid';
});

renderDocs();

// ===== 초기 로드 =====
loadConversations();
loadCounselorRequests();

// 30초마다 자동 갱신
setInterval(() => {
    loadConversations();
    loadCounselorRequests();
}, 30000);
