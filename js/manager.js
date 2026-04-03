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

// ===== 대화 내역 =====
async function loadConversations() {
    const list = document.getElementById('convList');
    try {
        const res = await fetch('/api/admin/conversations');
        const data = await res.json();
        if (data.length === 0) {
            list.innerHTML = '<div class="empty-state">대화 내역이 없습니다.</div>';
            return;
        }
        list.innerHTML = data.map(c => `
            <div class="list-item" data-sid="${c.sessionId}">
                <div class="list-item-top">
                    <span class="list-item-id">${shortId(c.sessionId)}</span>
                    <span class="list-item-time">${formatTime(c.createdAt)}</span>
                </div>
                <div class="list-item-preview">${c.lastMessage ? c.lastMessage.content : '(비어있음)'}</div>
                <div class="list-item-meta">
                    <span class="meta-tag msgs">${c.messageCount}건</span>
                    ${c.counselorRequested ? '<span class="meta-tag counselor">상담 요청</span>' : ''}
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', () => {
                list.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
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
            const cls = m.role === 'user' ? 'user' : 'bot';
            html += `<div class="detail-msg ${cls}">${m.content}<span class="msg-time">${formatTime(m.timestamp)}</span></div>`;
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
            const cls = m.role === 'user' ? 'user' : 'bot';
            html += `<div class="detail-msg ${cls}">${m.content}<span class="msg-time">${formatTime(m.timestamp)}</span></div>`;
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

// ===== 초기 로드 =====
loadConversations();
loadCounselorRequests();

// 30초마다 자동 갱신
setInterval(() => {
    loadConversations();
    loadCounselorRequests();
}, 30000);
