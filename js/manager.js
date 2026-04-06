// ===== 관리자 페이지 (JWT 인증 연동) =====
(function () {
    'use strict';

    let authToken = localStorage.getItem('admin_token') || null;

    // --- 인증 (자동 로그인 시도, 실패 시에도 페이지 표시) ---
    function authHeaders() {
        return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken };
    }

    async function ensureAuth() {
        if (authToken) {
            try {
                const res = await fetch('/api/admin/users', { headers: authHeaders() });
                if (res.ok) return;
            } catch {}
        }
        // 토큰 없거나 만료 → 자동 로그인 시도
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: 'AD', pw: 'roqkfwk00' })
            });
            const data = await res.json();
            if (data.success) {
                authToken = data.token;
                localStorage.setItem('admin_token', authToken);
            }
        } catch {}
    }

    // --- 페이지 전환 ---
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
        return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    function shortId(id) { return id.length > 20 ? id.slice(0, 8) + '...' + id.slice(-6) : id; }
    function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

    // --- 로그아웃 ---
    document.getElementById('adminLogout').addEventListener('click', () => {
        if (confirm('로그아웃 하시겠습니까?')) {
            authToken = null;
            localStorage.removeItem('admin_token');
            window.location.href = '/parking-portal/index.html';
        }
    });

    // ===== 유저 관리 (서버 API 연동, 영속성) =====
    const userTableBody = document.getElementById('userTableBody');
    const userSearch = document.getElementById('userSearch');
    const userModal = document.getElementById('userModal');
    const checkAll = document.getElementById('checkAll');
    let usersCache = [];

    async function loadUsers() {
        try {
            const res = await fetch('/api/admin/users', { headers: authHeaders() });
            if (!res.ok) return;
            usersCache = await res.json();
            renderUsers();
        } catch {}
    }

    function renderUsers() {
        const keyword = userSearch.value.trim().toLowerCase();
        const filtered = usersCache.filter(u =>
            !keyword || u.id.toLowerCase().includes(keyword) || u.name.includes(keyword) || (u.car || '').includes(keyword) || u.phone.includes(keyword)
        );
        userTableBody.innerHTML = filtered.map(u => `<tr>
            <td><input type="checkbox" class="user-check" data-id="${escapeHtml(u.id)}"></td>
            <td><strong>${escapeHtml(u.id)}</strong></td>
            <td>${escapeHtml(u.name)}</td>
            <td>${escapeHtml(u.phone)}</td>
            <td>${u.car ? escapeHtml(u.car) : '<span style="color:#ccc">-</span>'}</td>
            <td><span class="role-badge ${u.role}">${u.role === 'admin' ? '관리자' : '사용자'}</span></td>
            <td><span class="status-dot ${u.status}">${u.status === 'active' ? '활성' : '비활성'}</span></td>
            <td>${u.joinDate}</td>
            <td><div class="action-btns">
                <button class="edit-btn" data-edit-id="${escapeHtml(u.id)}"><i class="fas fa-pen"></i></button>
                <button class="del-btn" data-del-id="${escapeHtml(u.id)}"><i class="fas fa-trash"></i></button>
            </div></td>
        </tr>`).join('');

        document.getElementById('statTotal').textContent = usersCache.length;
        document.getElementById('statActive').textContent = usersCache.filter(u => u.status === 'active').length;
        document.getElementById('statInactive').textContent = usersCache.filter(u => u.status !== 'active').length;
        const today = new Date().toISOString().slice(0, 10);
        document.getElementById('statToday').textContent = usersCache.filter(u => u.joinDate === today).length;

        // 이벤트 위임
        userTableBody.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openEditUser(btn.dataset.editId)));
        userTableBody.querySelectorAll('.del-btn').forEach(btn => btn.addEventListener('click', () => deleteUser(btn.dataset.delId)));
    }

    userSearch.addEventListener('input', renderUsers);
    checkAll.addEventListener('change', () => document.querySelectorAll('.user-check').forEach(cb => cb.checked = checkAll.checked));

    function openModal() { userModal.classList.add('open'); }
    function closeModal() { userModal.classList.remove('open'); }
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    userModal.addEventListener('click', (e) => { if (e.target === userModal) closeModal(); });

    document.getElementById('addUserBtn').addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = '유저 추가';
        document.getElementById('editIdx').value = '';
        document.getElementById('modalId').value = ''; document.getElementById('modalId').disabled = false;
        document.getElementById('modalPw').value = '';
        document.getElementById('modalName').value = '';
        document.getElementById('modalPhone').value = '';
        document.getElementById('modalCar').value = '';
        document.getElementById('modalRole').value = 'user';
        document.getElementById('modalStatus').value = 'active';
        openModal();
    });

    function openEditUser(userId) {
        const u = usersCache.find(x => x.id === userId);
        if (!u) return;
        document.getElementById('modalTitle').textContent = '유저 수정';
        document.getElementById('editIdx').value = u.id;
        document.getElementById('modalId').value = u.id; document.getElementById('modalId').disabled = true;
        document.getElementById('modalPw').value = '';
        document.getElementById('modalName').value = u.name;
        document.getElementById('modalPhone').value = u.phone;
        document.getElementById('modalCar').value = u.car || '';
        document.getElementById('modalRole').value = u.role;
        document.getElementById('modalStatus').value = u.status;
        openModal();
    }

    document.getElementById('modalSave').addEventListener('click', async () => {
        const editId = document.getElementById('editIdx').value;
        const id = document.getElementById('modalId').value.trim();
        const pw = document.getElementById('modalPw').value;
        const name = document.getElementById('modalName').value.trim();
        const phone = document.getElementById('modalPhone').value.trim();
        const car = document.getElementById('modalCar').value.trim();
        const role = document.getElementById('modalRole').value;
        const status = document.getElementById('modalStatus').value;
        if (!id || !name || !phone) { alert('필수 항목을 입력해주세요.'); return; }

        try {
            let res;
            if (!editId) {
                if (!pw) { alert('비밀번호를 입력해주세요.'); return; }
                res = await fetch('/api/admin/users', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ id, pw, name, phone, car, role, status }) });
            } else {
                const body = { name, phone, car, role, status };
                if (pw) body.pw = pw;
                res = await fetch('/api/admin/users/' + encodeURIComponent(editId), { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
            }
            const data = await res.json();
            if (data.success) { closeModal(); loadUsers(); }
            else alert(data.error || '처리 실패');
        } catch { alert('서버 오류'); }
    });

    async function deleteUser(userId) {
        if (!confirm(`"${userId}" 유저를 삭제하시겠습니까?`)) return;
        try {
            await fetch('/api/admin/users/' + encodeURIComponent(userId), { method: 'DELETE', headers: authHeaders() });
            loadUsers();
        } catch { alert('삭제 실패'); }
    }

    // ===== 대화 내역 (관리자 시점 + 읽음/안읽음) =====
    const readMessages = JSON.parse(localStorage.getItem('admin_read_msgs') || '{}');
    function markAsRead(sid) { readMessages[sid] = true; localStorage.setItem('admin_read_msgs', JSON.stringify(readMessages)); }

    async function loadConversations() {
        const list = document.getElementById('convList');
        try {
            const res = await fetch('/api/admin/conversations', { headers: authHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            if (data.length === 0) { list.innerHTML = '<div class="empty-state">대화 내역이 없습니다.</div>'; return; }
            list.innerHTML = data.map(c => {
                const isRead = readMessages[c.sessionId];
                return `<div class="list-item ${isRead ? '' : 'unread'}" data-sid="${c.sessionId}">
                    <div class="list-item-top"><span class="list-item-id">${shortId(c.sessionId)}</span><span class="list-item-time">${formatTime(c.createdAt)}</span></div>
                    <div class="list-item-preview">${c.lastMessage ? escapeHtml(c.lastMessage.content) : '(비어있음)'}</div>
                    <div class="list-item-meta"><span class="meta-tag msgs">${c.messageCount}건</span>${c.counselorRequested ? '<span class="meta-tag counselor">상담 요청</span>' : ''}${!isRead ? '<span class="unread-badge">1</span>' : ''}</div>
                </div>`;
            }).join('');
            list.querySelectorAll('.list-item').forEach(item => {
                item.addEventListener('click', () => {
                    list.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active'); item.classList.remove('unread');
                    const badge = item.querySelector('.unread-badge'); if (badge) badge.remove();
                    markAsRead(item.dataset.sid);
                    loadConvDetail(item.dataset.sid);
                });
            });
        } catch { list.innerHTML = '<div class="empty-state">불러오기 실패</div>'; }
    }

    async function loadConvDetail(sessionId) {
        const detail = document.getElementById('convDetail');
        try {
            const res = await fetch(`/api/admin/conversations/${sessionId}`, { headers: authHeaders() });
            const conv = await res.json();
            let html = `<div class="detail-header"><h3>${shortId(sessionId)}</h3><p>시작: ${formatTime(conv.createdAt)} | 메시지: ${conv.messages.length}건${conv.counselorRequested ? ' | <span style="color:#c62828;font-weight:700">상담원 요청</span>' : ''}</p></div><div class="detail-messages">`;
            for (const m of conv.messages) {
                const cls = m.role === 'user' ? 'customer' : 'manager';
                const label = m.role === 'user' ? '<span class="msg-role customer-label">고객</span>' : '<span class="msg-role manager-label">챗봇</span>';
                html += `<div class="detail-msg ${cls}">${label}${escapeHtml(m.content)}<span class="msg-time">${formatTime(m.timestamp)}</span></div>`;
            }
            detail.innerHTML = html + '</div>';
        } catch { detail.innerHTML = '<div class="empty-state">불러오기 실패</div>'; }
    }

    // ===== 상담원 요청 =====
    async function loadCounselorRequests() {
        const list = document.getElementById('counselorList');
        const badge = document.getElementById('counselorBadge');
        try {
            const res = await fetch('/api/admin/counselor-requests', { headers: authHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            const pending = data.filter(r => r.status === 'pending').length;
            badge.textContent = pending; badge.classList.toggle('show', pending > 0);
            if (data.length === 0) { list.innerHTML = '<div class="empty-state">상담 요청이 없습니다.</div>'; return; }
            list.innerHTML = data.map(r => `<div class="list-item" data-sid="${r.sessionId}">
                <div class="list-item-top"><span class="list-item-id">${shortId(r.sessionId)}</span><span class="list-item-time">${formatTime(r.requestedAt)}</span></div>
                <div class="list-item-preview">${escapeHtml(r.lastMessage || '(메시지 없음)')}</div>
                <div class="list-item-meta"><span class="meta-tag ${r.status === 'pending' ? 'pending' : 'resolved'}">${r.status === 'pending' ? '대기중' : '처리완료'}</span></div>
            </div>`).join('');
            list.querySelectorAll('.list-item').forEach(item => {
                item.addEventListener('click', () => {
                    list.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active'); loadCounselorDetail(item.dataset.sid);
                });
            });
        } catch { list.innerHTML = '<div class="empty-state">불러오기 실패</div>'; }
    }

    async function loadCounselorDetail(sessionId) {
        const detail = document.getElementById('counselorDetail');
        try {
            const [convRes, reqRes] = await Promise.all([
                fetch(`/api/admin/conversations/${sessionId}`, { headers: authHeaders() }),
                fetch('/api/admin/counselor-requests', { headers: authHeaders() })
            ]);
            const conv = await convRes.json();
            const reqs = await reqRes.json();
            const req = reqs.find(r => r.sessionId === sessionId);
            let html = `<div class="detail-header"><h3>${shortId(sessionId)}</h3><p>요청: ${formatTime(req?.requestedAt)} | ${req?.status === 'pending' ? '대기중' : '처리완료'}</p></div><div class="detail-messages">`;
            for (const m of (conv.messages || [])) {
                const cls = m.role === 'user' ? 'customer' : 'manager';
                const label = m.role === 'user' ? '<span class="msg-role customer-label">고객</span>' : '<span class="msg-role manager-label">챗봇</span>';
                html += `<div class="detail-msg ${cls}">${label}${escapeHtml(m.content)}<span class="msg-time">${formatTime(m.timestamp)}</span></div>`;
            }
            html += '</div>';
            if (req?.status === 'pending') html += `<div class="counselor-actions"><button class="resolve-btn" id="resolveBtn">처리 완료</button></div>`;
            else html += `<div class="counselor-actions"><button class="resolve-btn" disabled>처리 완료됨 (${formatTime(req?.resolvedAt)})</button></div>`;
            detail.innerHTML = html;
            const resolveBtn = document.getElementById('resolveBtn');
            if (resolveBtn) resolveBtn.addEventListener('click', async () => {
                await fetch(`/api/admin/counselor-requests/${sessionId}/resolve`, { method: 'POST', headers: authHeaders() });
                loadCounselorRequests(); loadCounselorDetail(sessionId);
            });
        } catch { detail.innerHTML = '<div class="empty-state">불러오기 실패</div>'; }
    }

    // ===== API / 구현 문서 =====
    const DOCS = [
        { icon: 'fa-server', color: '#1565c0', title: '서버 구조', desc: 'Express 서버 및 라우팅', content: `<h3>서버 구조</h3><table class="doc-table"><tr><th>항목</th><th>내용</th></tr><tr><td>프레임워크</td><td>Express.js (Node.js)</td></tr><tr><td>포트</td><td>환경변수 PORT (기본 3000)</td></tr><tr><td>보안</td><td>Helmet, Rate Limiting, JWT 인증</td></tr><tr><td>진입점</td><td>js/server.js</td></tr></table>` },
        { icon: 'fa-plug', color: '#e65100', title: 'REST API', desc: '전체 API 엔드포인트', content: `<h3>REST API</h3><table class="doc-table"><tr><th>Method</th><th>URL</th><th>인증</th><th>설명</th></tr><tr><td><span class="method post">POST</span></td><td>/api/auth/login</td><td>-</td><td>로그인 (JWT 발급)</td></tr><tr><td><span class="method post">POST</span></td><td>/api/auth/signup</td><td>-</td><td>회원가입</td></tr><tr><td><span class="method get">GET</span></td><td>/api/availability</td><td>-</td><td>주차장 잔여 현황</td></tr><tr><td><span class="method post">POST</span></td><td>/api/reserve</td><td>-</td><td>주차 예약</td></tr><tr><td><span class="method post">POST</span></td><td>/api/cancel</td><td>-</td><td>예약 취소</td></tr><tr><td><span class="method post">POST</span></td><td>/api/chat</td><td>-</td><td>AI 채팅 (SSE)</td></tr><tr><td><span class="method post">POST</span></td><td>/api/tts</td><td>-</td><td>Edge TTS 음성</td></tr><tr><td><span class="method get">GET</span></td><td>/api/admin/*</td><td>JWT</td><td>관리자 전용</td></tr></table>` },
        { icon: 'fa-robot', color: '#6a1b9a', title: 'AI 챗봇', desc: 'Ollama + RAG 동작 방식', content: `<h3>AI 챗봇</h3><table class="doc-table"><tr><th>항목</th><th>내용</th></tr><tr><td>AI 엔진</td><td>Ollama (로컬 LLM)</td></tr><tr><td>모델</td><td>환경변수 OLLAMA_MODEL</td></tr><tr><td>RAG</td><td>knowledge/ 폴더 .md 파일 벡터 검색</td></tr><tr><td>응답</td><td>SSE 스트리밍</td></tr></table><h4>흐름</h4><ol><li>사용자 메시지 → RAG 검색</li><li>시스템 프롬프트 + RAG + 현황 + 히스토리</li><li>Ollama 스트리밍 → 토큰 SSE 전송</li></ol>` },
        { icon: 'fa-folder-open', color: '#2e7d32', title: '파일 구조', desc: '프로젝트 디렉토리', content: `<h3>파일 구조</h3><pre class="doc-tree">수목원 챗봇/\n├── .env                   # 환경변수\n├── start.bat              # 실행 스크립트\n├── js/server.js           # Express 서버\n├── js/rag.js              # RAG 엔진\n├── js/manager.js          # 관리자 스크립트\n├── knowledge/             # RAG 문서\n├── data/                  # JSON 데이터\n│   ├── conversations.json\n│   ├── counselor_requests.json\n│   └── users.json\n└── parking-portal/\n    ├── index.html\n    ├── js/portal-ui.js    # 포털 UI\n    ├── js/auth.js         # 로그인/회원가입\n    └── js/chatbot.js      # 챗봇</pre>` },
        { icon: 'fa-database', color: '#c62828', title: '데이터 저장', desc: '파일 기반 저장 + 잠금', content: `<h3>데이터 저장</h3><table class="doc-table"><tr><th>데이터</th><th>파일</th></tr><tr><td>대화 내역</td><td>data/conversations.json</td></tr><tr><td>상담 요청</td><td>data/counselor_requests.json</td></tr><tr><td>유저 정보</td><td>data/users.json (비밀번호 bcrypt 해시)</td></tr><tr><td>주차 현황</td><td>메모리 (5분 갱신)</td></tr></table><p>파일 저장 시 tmp → rename 원자적 쓰기 + 잠금 처리</p>` },
        { icon: 'fa-calendar-check', color: '#00838f', title: '예약 정책', desc: '비즈니스 룰', content: `<h3>예약 정책</h3><table class="doc-table"><tr><th>규칙</th><th>내용</th></tr><tr><td>예약 기간</td><td>내일 ~ 7일 후</td></tr><tr><td>월 횟수</td><td>1회</td></tr><tr><td>휴원일</td><td>매주 월요일</td></tr><tr><td>총 면수</td><td>50면</td></tr><tr><td>취소 기한</td><td>전날 18:00</td></tr><tr><td>금액</td><td>서버에서 할인 ID 기반 계산</td></tr></table>` }
    ];

    const docsGrid = document.getElementById('docsGrid');
    const docsViewer = document.getElementById('docsViewer');
    const docsContent = document.getElementById('docsContent');

    docsGrid.innerHTML = DOCS.map((doc, i) => `<button class="doc-card" data-idx="${i}"><div class="doc-card-icon" style="background:${doc.color}"><i class="fas ${doc.icon}"></i></div><div class="doc-card-text"><h4>${doc.title}</h4><p>${doc.desc}</p></div><i class="fas fa-chevron-right doc-card-arrow"></i></button>`).join('');
    docsGrid.querySelectorAll('.doc-card').forEach(card => {
        card.addEventListener('click', () => {
            docsGrid.style.display = 'none'; docsViewer.style.display = 'block';
            docsContent.innerHTML = DOCS[card.dataset.idx].content;
        });
    });
    document.getElementById('docsBack').addEventListener('click', () => { docsViewer.style.display = 'none'; docsGrid.style.display = 'grid'; });

    // ===== 초기화 =====
    window.loadConversations = loadConversations;
    window.loadCounselorRequests = loadCounselorRequests;

    ensureAuth().then(() => {
        loadUsers();
        loadConversations();
        loadCounselorRequests();
        setInterval(() => { loadConversations(); loadCounselorRequests(); }, 30000);
    });
})();
