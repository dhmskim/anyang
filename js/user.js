const chatBody = document.getElementById('chatBody');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const ttsToggle = document.getElementById('ttsToggle');
const sessionId = 'session_' + Date.now();

let isSending = false;
let reserveState = null;
let ttsEnabled = true;

const WD = ['일','월','화','수','목','금','토'];

// ===== TTS =====
function speak(text) {
    if (!ttsEnabled || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const clean = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'ko-KR'; u.rate = 1.1;
    const v = speechSynthesis.getVoices().find(v => v.lang.startsWith('ko'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
}

function stopSpeak() {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    setTimeout(() => speechSynthesis.cancel(), 100);
}

ttsToggle.addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    ttsToggle.classList.toggle('active', ttsEnabled);
    ttsToggle.querySelector('i').className = ttsEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
    if (!ttsEnabled) stopSpeak();
});

// ===== 메시지 =====
function addMsg(text, type, autoSpeak = true) {
    const div = document.createElement('div');
    div.className = 'msg ' + type;
    div.innerHTML = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
    if (type === 'bot' && text) {
        // TTS 버튼
        const btn = document.createElement('button');
        btn.className = 'tts-btn';
        btn.innerHTML = '<i class="fas fa-volume-up"></i>';
        btn.onclick = () => { stopSpeak(); speak(div.textContent); };
        div.appendChild(btn);
        if (autoSpeak) speak(text);
    }
    return div;
}

function addWidget(html) {
    const div = document.createElement('div');
    div.className = 'widget';
    div.innerHTML = html;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
    return div;
}

function addTyping() {
    const div = document.createElement('div');
    div.className = 'msg bot typing';
    div.innerHTML = '<span class="dot-pulse"></span>';
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
    return div;
}

// ===== 스크롤 전파 차단 =====
chatBody.addEventListener('wheel', e => {
    const { scrollTop, scrollHeight, clientHeight } = chatBody;
    if ((scrollTop === 0 && e.deltaY < 0) || (scrollTop + clientHeight >= scrollHeight && e.deltaY > 0)) {
        e.preventDefault();
    }
}, { passive: false });

// ===== AI 스트리밍 =====
async function sendToAI(text, showUser = true) {
    if (isSending) return;
    isSending = true;
    chatInput.disabled = true;
    if (showUser) addMsg(text, 'user');
    const typing = addTyping();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, sessionId })
        });
        typing.remove();
        const botDiv = addMsg('', 'bot', false);
        let full = '';
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n'); buf = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const d = line.slice(6);
                if (d === '[DONE]') break;
                try {
                    const p = JSON.parse(d);
                    if (p.error) { full = p.error; botDiv.textContent = full; }
                    else if (p.token) { full += p.token; botDiv.textContent = full; chatBody.scrollTop = chatBody.scrollHeight; }
                } catch {}
            }
        }
        if (!full) botDiv.textContent = '응답을 받지 못했습니다.';
        if (full) speak(full);
    } catch {
        typing.remove();
        addMsg('서버에 연결할 수 없습니다.', 'bot');
    }
    isSending = false;
    chatInput.disabled = false;
    chatInput.focus();
}

// ===== 혼잡 현황 =====
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
            const label = `${d.getMonth()+1}/${d.getDate()}(${WD[d.getDay()]})`;
            let badge, cls;
            if (info.closed) { badge = '휴원'; cls = 'gray'; }
            else if (info.available === 0) { badge = '만차'; cls = 'red'; }
            else if (info.available <= 9) { badge = `혼잡 ${info.available}면`; cls = 'yellow'; }
            else { badge = `여유 ${info.available}면`; cls = 'green'; }
            html += `<div class="cg-card"><span class="date">${label}</span><span class="cg-badge ${cls}">${badge}</span></div>`;
        }
        addWidget(html);
        addWidget('<button class="cta-btn" onclick="startReserve()">지금 예약하기</button>');
    } catch {
        typing.remove();
        addMsg('현황을 불러올 수 없습니다.', 'bot');
    }
}

// ===== 예약 플로우 =====
async function startReserve() {
    reserveState = { step: 'date' };
    addMsg('주차 예약', 'user');
    addMsg('예약하실 날짜를 선택해 주세요.<br><small>※ 당일 예약은 불가합니다. (D-1 ~ D-7)</small>', 'bot');
    try {
        const res = await fetch('/api/availability');
        const data = await res.json();
        let html = '<div class="calendar"><div class="calendar-title">날짜 선택</div><div class="calendar-grid">';
        for (const [date, info] of Object.entries(data)) {
            const d = new Date(date + 'T00:00:00');
            let cls, avail;
            if (info.closed) { cls = 'closed'; avail = '휴원'; }
            else if (info.available === 0) { cls = 'full'; avail = '만차'; }
            else if (info.available <= 9) { cls = 'busy'; avail = `${info.available}면`; }
            else { cls = 'ok'; avail = `${info.available}면`; }
            const dis = (cls === 'closed' || cls === 'full') ? 'disabled' : '';
            html += `<button class="cal-btn ${cls}" data-date="${date}" ${dis}><span class="day">${d.getDate()}</span><span class="wd">${WD[d.getDay()]}</span><span class="avail">${avail}</span></button>`;
        }
        html += '</div></div>';
        const w = addWidget(html);
        w.querySelectorAll('.cal-btn:not([disabled])').forEach(b => b.addEventListener('click', () => selectDate(b.dataset.date)));
    } catch {
        addMsg('날짜 정보를 불러올 수 없습니다.', 'bot');
        reserveState = null;
    }
}

async function selectDate(date) {
    const d = new Date(date + 'T00:00:00');
    const label = `${d.getMonth()+1}월 ${d.getDate()}일(${WD[d.getDay()]})`;
    try {
        const res = await fetch(`/api/availability/${date}`);
        const info = await res.json();
        addMsg(`${label} 선택`, 'user');
        addMsg(`${label} 잔여 <strong>${info.available}</strong>면 확인됩니다.<br>차량번호를 입력해 주세요. (예: 12가3456)`, 'bot');
        reserveState = { step: 'car', date, dateLabel: label };
    } catch {
        addMsg('날짜 정보를 확인할 수 없습니다.', 'bot');
    }
}

function inputCar(car) {
    if (!/^\d{2,3}[가-힣]\d{4}$/.test(car)) {
        addMsg('차량번호 형식을 확인해 주세요. (예: 12가3456)', 'bot');
        return;
    }
    reserveState.car = car;
    reserveState.step = 'confirm';
    addMsg(car, 'user');
    addWidget(`<div class="confirm-card"><strong>예약 정보 확인</strong><br>방문일: ${reserveState.dateLabel}<br>차량번호: ${car}<br>요금: 5,000원</div><div class="action-btns"><button class="act-btn primary" onclick="confirmReserve()">예약 확정</button><button class="act-btn secondary" onclick="resetReserve()">다시 입력</button></div>`);
}

async function confirmReserve() {
    if (!reserveState || reserveState.step !== 'confirm') return;
    const typing = addTyping();
    try {
        const res = await fetch('/api/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, date: reserveState.date, carNumber: reserveState.car })
        });
        typing.remove();
        const result = await res.json();
        if (result.success) {
            const r = result.reservation;
            addWidget(`<div class="done-card"><div class="icon"><i class="fas fa-check-circle"></i></div>예약이 완료되었습니다!<div class="no">${r.confirmNo}</div>${reserveState.dateLabel} | ${r.carNumber}<br>결제금액: ${r.amount.toLocaleString()}원<br><br><small>확인 SMS가 발송됩니다.<br>취소는 방문 전날 18:00까지 가능합니다.</small></div>`);
            addWidget('<button class="cta-btn outline" onclick="sendToAI(\'당일 미입차 정책 알려주세요\')">당일 미입차 정책 확인</button>');
        } else {
            addMsg(result.error, 'bot');
        }
    } catch {
        typing.remove();
        addMsg('예약 처리 중 오류가 발생했습니다.', 'bot');
    }
    reserveState = null;
}

function resetReserve() { reserveState = null; startReserve(); }

// ===== 취소/변경 =====
function showCancel() {
    addMsg('취소/변경', 'user');
    addMsg('예약 취소를 원하시면 확인번호를 입력해 주세요.<br>(예: AY12345678)', 'bot');
    reserveState = { step: 'cancelInput' };
}

async function processCancel(no) {
    addMsg(no, 'user');
    const typing = addTyping();
    try {
        const res = await fetch('/api/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, confirmNo: no.toUpperCase() })
        });
        typing.remove();
        const result = await res.json();
        addMsg(result.success ? result.message : result.error, 'bot');
    } catch {
        typing.remove();
        addMsg('취소 처리 중 오류가 발생했습니다.', 'bot');
    }
    reserveState = null;
}

// ===== 상담원 연결 =====
async function requestCounselor() {
    addMsg('상담원 연결 요청', 'user');
    try {
        const res = await fetch('/api/counselor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        const result = await res.json();
        addMsg(result.message, 'bot');
    } catch {
        addMsg('연결 요청에 실패했습니다. 관리사무소(031-470-0242)로 직접 전화해 주세요.', 'bot');
    }
}

// ===== 메뉴 액션 =====
document.addEventListener('click', e => {
    const btn = e.target.closest('.menu-btn');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'congestion') showCongestion();
    else if (action === 'reserve') startReserve();
    else if (action === 'cancel') showCancel();
    else if (action === 'faq') sendToAI('운영시간과 요금, 당일 미입차 정책을 알려주세요');
});

// ===== 메시지 전송 =====
function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    if (reserveState) {
        if (reserveState.step === 'car') { inputCar(text); return; }
        if (reserveState.step === 'cancelInput') { processCancel(text); return; }
    }
    sendToAI(text);
}

chatSend.addEventListener('click', handleSend);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });
