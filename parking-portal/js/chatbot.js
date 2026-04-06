// ===== 수목원 주차 예약 챗봇 (XSS safe, 안전한 sessionId) =====
(function () {
    'use strict';

    const chatbotBtn = document.getElementById('chatbotBtn');
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotBody = document.getElementById('chatbotBody');
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotSend = document.getElementById('chatbotSend');
    const counselorBtn = document.getElementById('counselorBtn');
    const ttsToggle = document.getElementById('ttsToggle');

    // 안전한 sessionId (crypto API)
    const sessionId = crypto.randomUUID ? crypto.randomUUID() : 'session_' + Math.random().toString(36).slice(2) + Date.now().toString(36);

    let isSending = false;
    let reserveState = null;
    let ttsEnabled = true;
    let ttsAudio = null;

    const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
    const DISCOUNTS = [
        { id: 'none', label: '해당 없음', rate: 0, amount: 5000 },
        { id: 'eco', label: '저공해 차량 (50%)', rate: 50, amount: 2500 },
        { id: 'multi', label: '다자녀 가구 (50%)', rate: 50, amount: 2500 },
        { id: 'compact', label: '경차 (50%)', rate: 50, amount: 2500 },
        { id: 'disable', label: '장애인 (100%)', rate: 100, amount: 0 },
        { id: 'veteran', label: '국가유공자 (50%)', rate: 50, amount: 2500 },
    ];

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- TTS (Edge TTS, 서버에서 변환) ---
    async function speak(text) {
        if (!ttsEnabled) return;
        stopSpeak();
        const clean = text.replace(/\s+/g, ' ').trim();
        if (!clean) return;
        try {
            const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: clean }) });
            if (!res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            ttsAudio = new Audio(url);
            ttsAudio.playbackRate = 1.0;
            ttsAudio.play();
            ttsAudio.onended = () => { URL.revokeObjectURL(url); ttsAudio = null; };
        } catch (e) { console.error('[TTS]', e); }
    }

    function stopSpeak() {
        if (ttsAudio) { ttsAudio.pause(); ttsAudio.currentTime = 0; ttsAudio = null; }
    }

    ttsToggle.addEventListener('click', () => {
        ttsEnabled = !ttsEnabled;
        ttsToggle.classList.toggle('active', ttsEnabled);
        ttsToggle.querySelector('i').className = ttsEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
        if (!ttsEnabled) stopSpeak();
    });

    function addSpeakBtn(msgDiv) {
        const btn = document.createElement('button');
        btn.className = 'tts-speak-btn';
        btn.innerHTML = '<i class="fas fa-volume-up"></i>';
        btn.addEventListener('click', () => {
            if (ttsAudio && !ttsAudio.paused) { stopSpeak(); btn.classList.remove('speaking'); }
            else {
                const prev = ttsEnabled; ttsEnabled = true;
                speak(msgDiv.textContent);
                ttsEnabled = prev;
                btn.classList.add('speaking');
                const check = setInterval(() => { if (!ttsAudio || ttsAudio.paused) { btn.classList.remove('speaking'); clearInterval(check); } }, 200);
            }
        });
        msgDiv.appendChild(btn);
    }

    // --- 챗봇 열기/닫기 ---
    chatbotBtn.addEventListener('click', () => { chatbotWindow.classList.add('open'); chatbotBtn.classList.add('hidden'); chatbotInput.focus(); });
    chatbotClose.addEventListener('click', () => {
        chatbotWindow.classList.remove('open'); chatbotBtn.classList.remove('hidden'); stopSpeak();
        ttsEnabled = false; ttsToggle.classList.remove('active'); ttsToggle.querySelector('i').className = 'fas fa-volume-mute';
    });

    chatbotBody.addEventListener('wheel', (e) => {
        const { scrollTop, scrollHeight, clientHeight } = chatbotBody;
        if ((scrollTop === 0 && e.deltaY < 0) || (scrollTop + clientHeight >= scrollHeight && e.deltaY > 0)) e.preventDefault();
    }, { passive: false });

    // --- 메시지 헬퍼 (XSS: bot 메시지는 innerHTML 허용 - 서버 응답, user는 textContent) ---
    function addMsg(text, type, autoSpeak = true) {
        const div = document.createElement('div');
        div.className = 'chat-msg ' + type;
        if (type === 'user') div.textContent = text;
        else div.innerHTML = text;
        chatbotBody.appendChild(div);
        chatbotBody.scrollTop = chatbotBody.scrollHeight;
        if (type === 'bot' && text) { addSpeakBtn(div); if (autoSpeak) speak(text); }
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
        chatbotInput.disabled = true; chatbotSend.disabled = true;
        if (showUser) addMsg(text, 'user');
        const typing = addTyping();
        try {
            const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, sessionId }) });
            typing.remove();
            const botDiv = addMsg('', 'bot', false);
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
                    } catch {}
                }
            }
            if (!fullText) botDiv.textContent = '응답을 받지 못했습니다. 다시 시도해주세요.';
            if (fullText) speak(fullText);
        } catch { typing.remove(); addMsg('서버에 연결할 수 없습니다.', 'bot'); }
        isSending = false; chatbotInput.disabled = false; chatbotSend.disabled = false; chatbotInput.focus();
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
            addWidget('<div class="chat-cta"><button class="chat-cta-btn" data-action="startReserve">지금 예약하기</button></div>');
        } catch { typing.remove(); addMsg('현황을 불러올 수 없습니다.', 'bot'); }
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
                let cls, availText;
                if (info.closed) { cls = 'closed'; availText = '휴원'; }
                else if (info.available === 0) { cls = 'full'; availText = '만차'; }
                else if (info.available <= 9) { cls = 'busy'; availText = `${info.available}면`; }
                else { cls = 'available'; availText = `${info.available}면`; }
                const disabled = (cls === 'closed' || cls === 'full') ? 'disabled' : '';
                html += `<button class="cal-date-btn ${cls}" data-date="${date}" ${disabled}><span class="cal-day">${d.getDate()}</span><span class="cal-weekday">${WEEKDAYS[d.getDay()]}</span><span class="cal-avail">${availText}</span></button>`;
            }
            html += '</div></div>';
            const widget = addWidget(html);
            widget.querySelectorAll('.cal-date-btn:not([disabled])').forEach(btn => btn.addEventListener('click', () => selectDate(btn.dataset.date)));
        } catch { addMsg('날짜 정보를 불러올 수 없습니다.', 'bot'); reserveState = null; }
    }
    window.startReserve = startReserve;

    async function selectDate(date) {
        const d = new Date(date + 'T00:00:00');
        const label = `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]})`;
        try {
            const res = await fetch(`/api/availability/${date}`);
            const info = await res.json();
            addMsg(`${label} 선택`, 'user');
            if (window.currentUser) {
                const cu = window.currentUser;
                addMsg(`${label} 잔여 <strong>${info.available}</strong>면 확인됩니다.<br><strong>${escapeHtml(cu.name)}</strong>님으로 예약을 진행합니다.${cu.car ? '<br>등록 차량: ' + escapeHtml(cu.car) : ''}<br><br>차량번호를 입력해 주세요. (예: 12가3456)${cu.car ? '<br>또는 <strong>"등록차량"</strong>이라고 입력하세요.' : ''}`, 'bot');
                reserveState = { step: 'carNumber', date, dateLabel: label, userName: cu.name };
            } else {
                addMsg(`${label} 잔여 <strong>${info.available}</strong>면 확인됩니다.<br>예약자 이름을 입력해 주세요.`, 'bot');
                reserveState = { step: 'name', date, dateLabel: label };
            }
        } catch { addMsg('날짜 정보를 확인할 수 없습니다.', 'bot'); }
    }

    function inputName(name) {
        if (name.length < 2) { addMsg('이름을 2글자 이상 입력해 주세요.', 'bot'); return; }
        reserveState.userName = name;
        reserveState.step = 'carNumber';
        addMsg(name, 'user');
        addMsg(`<strong>${escapeHtml(name)}</strong>님, 차량번호를 입력해 주세요. (예: 12가3456)`, 'bot');
    }

    function inputCarNumber(carNumber) {
        if (carNumber === '등록차량' && window.currentUser && window.currentUser.car) carNumber = window.currentUser.car;
        if (!/^\d{2,3}[가-힣]\d{4}$/.test(carNumber)) { addMsg('차량번호 형식을 확인해 주세요. (예: 12가3456, 123가4567)', 'bot'); return; }
        reserveState.carNumber = carNumber;
        reserveState.step = 'discount';
        addMsg(carNumber, 'user');
        addMsg('할인 적용 내역이 다음 중 있으십니까?', 'bot');
        let html = '<div class="chat-discount-list">';
        DISCOUNTS.forEach(d => { html += `<button class="chat-discount-btn" data-discount="${d.id}">${escapeHtml(d.label)}</button>`; });
        html += '</div>';
        const widget = addWidget(html);
        widget.querySelectorAll('.chat-discount-btn').forEach(btn => btn.addEventListener('click', () => selectDiscount(btn.dataset.discount)));
    }

    function selectDiscount(discountId) {
        const disc = DISCOUNTS.find(d => d.id === discountId);
        reserveState.discount = disc;
        reserveState.step = 'confirm';
        addMsg(disc.label, 'user');
        const priceText = disc.amount === 0
            ? '<strong style="color:#2e7d32">무료 (100% 감면)</strong>'
            : `<strong>${disc.amount.toLocaleString()}원</strong>` + (disc.rate > 0 ? ` <s style="color:#999;font-size:11px">5,000원</s> (${disc.rate}% 감면)` : '');
        addWidget(`<div class="reserve-confirm"><strong>예약 정보 확인</strong><br>예약자: ${escapeHtml(reserveState.userName || '(미입력)')}<br>날짜: ${reserveState.dateLabel}<br>차량: ${escapeHtml(reserveState.carNumber)}<br>할인: ${disc.id === 'none' ? '없음' : escapeHtml(disc.label)}<br>결제금액: ${priceText}</div>
        <div class="chat-action-btns"><button class="chat-action-btn primary" data-action="confirmReserve">예약 확정</button><button class="chat-action-btn secondary" data-action="resetReserve">다시 입력</button></div>`);
        speak(`${reserveState.dateLabel}, ${reserveState.carNumber}, 결제금액 ${disc.amount === 0 ? '무료' : disc.amount.toLocaleString() + '원'}. 예약 정보를 확인하시고 예약 확정 버튼을 눌러주세요.`);
    }

    async function confirmReserve() {
        if (!reserveState || reserveState.step !== 'confirm') return;
        const typing = addTyping();
        try {
            const res = await fetch('/api/reserve', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    date: reserveState.date,
                    carNumber: reserveState.carNumber,
                    discountId: reserveState.discount ? reserveState.discount.id : 'none',
                    userName: reserveState.userName || null,
                    userId: window.currentUser ? window.currentUser.id : null
                })
            });
            typing.remove();
            const result = await res.json();
            if (result.success) {
                const r = result.reservation;
                const discLabel = reserveState.discount && reserveState.discount.id !== 'none' ? reserveState.discount.label : '';
                addWidget(`<div class="reserve-done"><div class="done-icon"><i class="fas fa-check-circle"></i></div>예약이 완료되었습니다!<div class="done-no">${escapeHtml(r.confirmNo)}</div>예약자: ${escapeHtml(reserveState.userName || '')}<br>${reserveState.dateLabel} | ${escapeHtml(r.carNumber)}<br>${discLabel ? '할인: ' + escapeHtml(discLabel) + '<br>' : ''}결제금액: ${r.amount.toLocaleString()}원${r.amount === 0 ? ' (무료)' : ''}<br><br><small>확인 SMS가 발송됩니다.<br>취소는 전일 18:00까지 가능합니다.<br>노쇼 시 이용 제한이 적용됩니다.</small></div>`);
                speak(`${reserveState.dateLabel}로 예약되었습니다. 예약 정보를 확인하세요.`);
            } else { addMsg(result.error, 'bot'); }
        } catch { typing.remove(); addMsg('예약 처리 중 오류가 발생했습니다.', 'bot'); }
        reserveState = null;
    }

    // --- 취소/변경 ---
    function showCancel() {
        addMsg('취소/변경', 'user');
        addMsg('예약 취소를 원하시면 확인번호를 입력해 주세요.<br>(예: AY12345678)', 'bot');
        reserveState = { step: 'cancelInput' };
    }

    async function processCancel(confirmNo) {
        addMsg(confirmNo, 'user');
        const typing = addTyping();
        try {
            const res = await fetch('/api/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, confirmNo: confirmNo.toUpperCase() }) });
            typing.remove();
            const result = await res.json();
            addMsg(result.success ? result.message : result.error, 'bot');
        } catch { typing.remove(); addMsg('취소 처리 중 오류가 발생했습니다.', 'bot'); }
        reserveState = null;
    }

    // --- 이벤트 위임 (onclick 제거, data-action 사용) ---
    document.addEventListener('click', e => {
        const menuBtn = e.target.closest('.chat-menu-btn');
        if (menuBtn) {
            const action = menuBtn.dataset.action;
            if (action === 'congestion') showCongestion();
            else if (action === 'reserve') startReserve();
            else if (action === 'cancel') showCancel();
            else if (action === 'faq') sendToAI('노쇼 정책과 운영시간을 알려주세요');
            return;
        }
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
            const action = actionBtn.dataset.action;
            if (action === 'startReserve') startReserve();
            else if (action === 'confirmReserve') confirmReserve();
            else if (action === 'resetReserve') { reserveState = null; startReserve(); }
        }
    });

    // --- 메시지 전송 ---
    function handleSend() {
        const text = chatbotInput.value.trim();
        if (!text) return;
        chatbotInput.value = '';
        if (reserveState) {
            if (reserveState.step === 'name') { inputName(text); return; }
            if (reserveState.step === 'carNumber') { inputCarNumber(text); return; }
            if (reserveState.step === 'cancelInput') { processCancel(text); return; }
        }
        sendToAI(text);
    }

    chatbotSend.addEventListener('click', handleSend);
    chatbotInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });

    // --- 상담원 연결 (appendMsg 오타 수정 → addMsg) ---
    counselorBtn.addEventListener('click', async () => {
        if (!confirm('상담원 연결을 요청하시겠습니까?')) return;
        try {
            const res = await fetch('/api/counselor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
            const data = await res.json();
            addMsg(data.message || '상담원 연결이 요청되었습니다.', 'bot');
        } catch { addMsg('상담원 연결 요청에 실패했습니다.', 'bot'); }
    });
})();
