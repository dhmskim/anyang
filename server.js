const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { buildVectors, search } = require('./rag');

const app = express();
const PORT = 3000;

const OLLAMA_URL = 'http://172.31.0.210:11434';
const MODEL = 'qwen2.5:14b';

// 시스템 프롬프트 로드
const systemPrompt = fs.readFileSync(
    path.join(__dirname, 'system_prompt.txt'), 'utf-8'
);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'parking-portal')));

// ===== 세션 관리 =====
const sessions = new Map();
const MAX_TURNS = 10;

function getSession(id) {
    if (!sessions.has(id)) {
        sessions.set(id, { history: [], reservations: [] });
    }
    return sessions.get(id);
}

function addHistory(id, role, content) {
    const session = getSession(id);
    session.history.push({ role, content });
    while (session.history.length > MAX_TURNS * 2) {
        session.history.shift();
    }
}

// ===== Mock 주차장 데이터 =====
function generateAvailability() {
    const data = {};
    const today = new Date();
    for (let i = 0; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        // 월요일 휴원
        if (dayOfWeek === 1) {
            data[key] = { total: 50, reserved: 50, available: 0, closed: true, closedReason: '휴원일 (매주 월요일)' };
        } else {
            // 주말은 혼잡, 평일은 여유
            const reserved = dayOfWeek === 0 || dayOfWeek === 6
                ? Math.floor(Math.random() * 15) + 38  // 38~50
                : Math.floor(Math.random() * 20) + 15;  // 15~35
            data[key] = { total: 50, reserved: Math.min(reserved, 50), available: Math.max(50 - reserved, 0), closed: false };
        }
    }
    return data;
}

let parkingData = generateAvailability();
// 5분마다 갱신
setInterval(() => { parkingData = generateAvailability(); }, 5 * 60 * 1000);

// ===== API: 잔여 현황 =====
app.get('/api/availability', (req, res) => {
    res.json(parkingData);
});

// ===== API: 특정 날짜 조회 =====
app.get('/api/availability/:date', (req, res) => {
    const info = parkingData[req.params.date];
    if (!info) return res.status(404).json({ error: '조회 가능 기간이 아닙니다.' });
    res.json(info);
});

// ===== API: 예약 =====
app.post('/api/reserve', (req, res) => {
    const { sessionId, date, carNumber, discountLabel, amount } = req.body;

    if (!date || !carNumber) {
        return res.status(400).json({ error: '날짜와 차량번호를 입력해주세요.' });
    }

    // 차량번호 형식 검증
    if (!/^\d{2,3}[가-힣]\d{4}$/.test(carNumber)) {
        return res.status(400).json({ error: '차량번호 형식이 올바르지 않습니다. (예: 12가3456)' });
    }

    const info = parkingData[date];
    if (!info) return res.status(400).json({ error: '예약 가능 기간이 아닙니다.' });
    if (info.closed) return res.status(400).json({ error: `${info.closedReason}으로 예약할 수 없습니다.` });
    if (info.available <= 0) return res.status(400).json({ error: '해당 날짜는 만차입니다.' });

    // 월 1회 제한 체크 (세션 기준 Mock)
    const session = getSession(sessionId || 'default');
    const month = date.slice(0, 7);
    const hasThisMonth = session.reservations.some(r => r.date.startsWith(month) && r.status === 'confirmed');
    if (hasThisMonth) {
        return res.status(400).json({ error: '월 1회 예약 제한을 초과했습니다. 기존 예약을 취소한 후 다시 시도해주세요.' });
    }

    // 예약 처리
    info.reserved++;
    info.available = Math.max(info.available - 1, 0);

    const confirmNo = 'AY' + Date.now().toString().slice(-8);
    const finalAmount = typeof amount === 'number' ? amount : 5000;
    const reservation = {
        confirmNo,
        date,
        carNumber,
        discount: discountLabel || '없음',
        amount: finalAmount,
        status: 'confirmed',
        createdAt: new Date().toISOString()
    };
    session.reservations.push(reservation);

    res.json({
        success: true,
        reservation,
        message: `예약이 확정되었습니다. 확인번호: ${confirmNo}`
    });
});

// ===== API: 예약 취소 =====
app.post('/api/cancel', (req, res) => {
    const { sessionId, confirmNo } = req.body;
    const session = getSession(sessionId || 'default');

    const reservation = session.reservations.find(r => r.confirmNo === confirmNo && r.status === 'confirmed');
    if (!reservation) {
        return res.status(404).json({ error: '해당 확인번호의 예약을 찾을 수 없습니다.' });
    }

    // D-1 18:00 체크
    const reserveDate = new Date(reservation.date + 'T18:00:00');
    reserveDate.setDate(reserveDate.getDate() - 1);
    if (new Date() > reserveDate) {
        return res.status(400).json({ error: '취소 기한(예약일 전일 18:00)이 지났습니다. 관리사무소(031-470-0242)로 문의해주세요.' });
    }

    reservation.status = 'cancelled';

    // 잔여면수 복구
    const info = parkingData[reservation.date];
    if (info) {
        info.reserved = Math.max(info.reserved - 1, 0);
        info.available = Math.min(info.available + 1, info.total);
    }

    res.json({ success: true, message: `예약(${confirmNo})이 취소되었습니다. 환불은 3~5 영업일 내 처리됩니다.` });
});

// ===== API: 내 예약 조회 =====
app.get('/api/reservations/:sessionId', (req, res) => {
    const session = getSession(req.params.sessionId);
    res.json(session.reservations.filter(r => r.status === 'confirmed'));
});

// ===== API: AI 채팅 (스트리밍) =====
app.post('/api/chat', async (req, res) => {
    const { message, sessionId = 'default' } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: '메시지를 입력해주세요.' });
    }

    addHistory(sessionId, 'user', message);

    // RAG: 관련 문서 검색
    let ragContext = '';
    try {
        const results = await search(message, 3);
        if (results.length > 0) {
            ragContext = '\n\n[참고 문서]\n' + results.map(r =>
                `--- ${r.title} > ${r.heading} (관련도: ${r.score}) ---\n${r.text}`
            ).join('\n\n');
        }
    } catch (e) {
        console.error('[RAG] 검색 실패:', e.message);
    }

    // 현재 잔여 현황
    let availContext = '\n\n[현재 잔여 현황]\n';
    for (const [date, info] of Object.entries(parkingData)) {
        const label = info.closed ? '휴원' : `잔여 ${info.available}면`;
        availContext += `- ${date}: ${label}\n`;
    }

    const messages = [
        { role: 'system', content: systemPrompt + ragContext + availContext },
        ...getSession(sessionId).history
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: MODEL, messages, stream: true })
        });

        if (!response.ok) {
            res.write(`data: ${JSON.stringify({ error: 'AI 서버 연결에 실패했습니다.' })}\n\n`);
            res.write('data: [DONE]\n\n');
            return res.end();
        }

        let fullResponse = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const chunk = JSON.parse(line);
                    if (chunk.message && chunk.message.content) {
                        const token = chunk.message.content;
                        fullResponse += token;
                        res.write(`data: ${JSON.stringify({ token })}\n\n`);
                    }
                } catch (e) {}
            }
        }

        if (buffer.trim()) {
            try {
                const chunk = JSON.parse(buffer);
                if (chunk.message && chunk.message.content) {
                    fullResponse += chunk.message.content;
                    res.write(`data: ${JSON.stringify({ token: chunk.message.content })}\n\n`);
                }
            } catch (e) {}
        }

        addHistory(sessionId, 'assistant', fullResponse);
        res.write('data: [DONE]\n\n');
        res.end();

    } catch (err) {
        console.error('Server error:', err.message);
        res.write(`data: ${JSON.stringify({ error: 'AI 서버에 연결할 수 없습니다.' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }
});

// ===== 서버 시작 =====
app.listen(PORT, async () => {
    console.log(`수목원 주차 챗봇 서버: http://localhost:${PORT}`);
    console.log(`Ollama: ${OLLAMA_URL} (모델: ${MODEL})`);

    // RAG 벡터 빌드
    try {
        await buildVectors();
    } catch (e) {
        console.error('[RAG] 벡터 빌드 실패:', e.message);
        console.log('[RAG] RAG 없이 시스템 프롬프트만으로 동작합니다.');
    }
});
