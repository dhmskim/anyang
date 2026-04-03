const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { buildVectors, search } = require('./rag');

const app = express();
const PORT = 3000;

const OLLAMA_URL = 'http://172.31.0.210:11434';
const MODEL = 'qwen2.5:14b';
const DATA_DIR = path.join(ROOT, 'data');

// 시스템 프롬프트
const systemPrompt = fs.readFileSync(path.join(ROOT, 'system_prompt.txt'), 'utf-8');

app.use(cors());
app.use(express.json());
app.use(express.static(ROOT));

// data 폴더 보장
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// ===== 대화 저장소 =====
const CONV_FILE = path.join(DATA_DIR, 'conversations.json');
const COUNSEL_FILE = path.join(DATA_DIR, 'counselor_requests.json');

function loadJSON(file) {
    if (!fs.existsSync(file)) return {};
    try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return {}; }
}
function saveJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

let conversations = loadJSON(CONV_FILE);
let counselorRequests = loadJSON(COUNSEL_FILE);

function getConv(sessionId) {
    if (!conversations[sessionId]) {
        conversations[sessionId] = {
            sessionId,
            createdAt: new Date().toISOString(),
            messages: [],
            reservations: [],
            counselorRequested: false
        };
    }
    return conversations[sessionId];
}

function addMessage(sessionId, role, content) {
    const conv = getConv(sessionId);
    conv.messages.push({ role, content, timestamp: new Date().toISOString() });
    // 주기적 저장
    saveJSON(CONV_FILE, conversations);
}

function getHistory(sessionId, maxTurns = 10) {
    const conv = getConv(sessionId);
    const msgs = conv.messages.filter(m => m.role === 'user' || m.role === 'assistant');
    return msgs.slice(-maxTurns * 2).map(m => ({ role: m.role, content: m.content }));
}

// ===== Mock 주차장 데이터 =====
function generateAvailability() {
    const data = {};
    const today = new Date();
    // D-7 ~ D-1 (당일 제외, 내일부터 7일간)
    for (let i = 1; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 1) {
            data[key] = { total: 50, reserved: 50, available: 0, closed: true, closedReason: '휴원일 (매주 월요일)' };
        } else {
            const reserved = dayOfWeek === 0 || dayOfWeek === 6
                ? Math.floor(Math.random() * 15) + 38
                : Math.floor(Math.random() * 20) + 15;
            data[key] = { total: 50, reserved: Math.min(reserved, 50), available: Math.max(50 - reserved, 0), closed: false };
        }
    }
    return data;
}

let parkingData = generateAvailability();
setInterval(() => { parkingData = generateAvailability(); }, 5 * 60 * 1000);

// ===== API: 잔여 현황 =====
app.get('/api/availability', (req, res) => res.json(parkingData));
app.get('/api/availability/:date', (req, res) => {
    const info = parkingData[req.params.date];
    if (!info) return res.status(404).json({ error: '조회 가능 기간이 아닙니다.' });
    res.json(info);
});

// ===== API: 예약 =====
app.post('/api/reserve', (req, res) => {
    const { sessionId, date, carNumber } = req.body;
    if (!date || !carNumber) return res.status(400).json({ error: '날짜와 차량번호를 입력해주세요.' });
    if (!/^\d{2,3}[가-힣]\d{4}$/.test(carNumber)) return res.status(400).json({ error: '차량번호 형식이 올바르지 않습니다. (예: 12가3456)' });

    const info = parkingData[date];
    if (!info) return res.status(400).json({ error: '예약 가능 기간이 아닙니다.' });
    if (info.closed) return res.status(400).json({ error: `${info.closedReason}으로 예약할 수 없습니다.` });
    if (info.available <= 0) return res.status(400).json({ error: '해당 날짜는 만차입니다.' });

    // 당일 예약 차단
    const today = new Date().toISOString().split('T')[0];
    if (date <= today) return res.status(400).json({ error: '당일 예약은 불가합니다. 최소 전날까지 예약해야 합니다.' });

    // 월 1회 제한
    const conv = getConv(sessionId || 'default');
    const month = date.slice(0, 7);
    const hasThisMonth = conv.reservations.some(r => r.date.startsWith(month) && r.status === 'confirmed');
    if (hasThisMonth) return res.status(400).json({ error: '월 1회 예약 제한을 초과했습니다. 기존 예약을 취소한 후 다시 시도해주세요.' });

    info.reserved++;
    info.available = Math.max(info.available - 1, 0);

    const confirmNo = 'AY' + Date.now().toString().slice(-8);
    const reservation = { confirmNo, date, carNumber, amount: 5000, status: 'confirmed', createdAt: new Date().toISOString() };
    conv.reservations.push(reservation);
    saveJSON(CONV_FILE, conversations);

    res.json({ success: true, reservation });
});

// ===== API: 취소 =====
app.post('/api/cancel', (req, res) => {
    const { sessionId, confirmNo } = req.body;
    const conv = getConv(sessionId || 'default');
    const reservation = conv.reservations.find(r => r.confirmNo === confirmNo && r.status === 'confirmed');
    if (!reservation) return res.status(404).json({ error: '해당 확인번호의 예약을 찾을 수 없습니다.' });

    const deadline = new Date(reservation.date + 'T18:00:00');
    deadline.setDate(deadline.getDate() - 1);
    if (new Date() > deadline) return res.status(400).json({ error: '취소 기한(방문 전날 18:00)이 지났습니다. 관리사무소(031-470-0242)로 문의해주세요.' });

    reservation.status = 'cancelled';
    const info = parkingData[reservation.date];
    if (info) { info.reserved = Math.max(info.reserved - 1, 0); info.available = Math.min(info.available + 1, info.total); }
    saveJSON(CONV_FILE, conversations);

    res.json({ success: true, message: `예약(${confirmNo})이 취소되었습니다. 환불은 3~5 영업일 내 처리됩니다.` });
});

// ===== API: 상담원 연결 요청 =====
app.post('/api/counselor', (req, res) => {
    const { sessionId } = req.body;
    const conv = getConv(sessionId);
    conv.counselorRequested = true;

    counselorRequests[sessionId] = {
        sessionId,
        requestedAt: new Date().toISOString(),
        status: 'pending',
        lastMessage: conv.messages.length > 0 ? conv.messages[conv.messages.length - 1].content : ''
    };
    saveJSON(COUNSEL_FILE, counselorRequests);
    saveJSON(CONV_FILE, conversations);

    res.json({ success: true, message: '상담원 연결이 요청되었습니다. 관리사무소(031-470-0242)에서 곧 연락드리겠습니다.' });
});

// ===== API: 관리자 - 대화 목록 =====
app.get('/api/admin/conversations', (req, res) => {
    const list = Object.values(conversations).map(c => ({
        sessionId: c.sessionId,
        createdAt: c.createdAt,
        messageCount: c.messages.length,
        lastMessage: c.messages.length > 0 ? c.messages[c.messages.length - 1] : null,
        counselorRequested: c.counselorRequested
    }));
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(list);
});

// ===== API: 관리자 - 특정 대화 조회 =====
app.get('/api/admin/conversations/:sessionId', (req, res) => {
    const conv = conversations[req.params.sessionId];
    if (!conv) return res.status(404).json({ error: '대화를 찾을 수 없습니다.' });
    res.json(conv);
});

// ===== API: 관리자 - 상담원 요청 목록 =====
app.get('/api/admin/counselor-requests', (req, res) => {
    const list = Object.values(counselorRequests);
    list.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    res.json(list);
});

// ===== API: 관리자 - 상담원 요청 처리 =====
app.post('/api/admin/counselor-requests/:sessionId/resolve', (req, res) => {
    const cr = counselorRequests[req.params.sessionId];
    if (!cr) return res.status(404).json({ error: '요청을 찾을 수 없습니다.' });
    cr.status = 'resolved';
    cr.resolvedAt = new Date().toISOString();
    saveJSON(COUNSEL_FILE, counselorRequests);
    res.json({ success: true });
});

// ===== API: AI 채팅 (스트리밍) =====
app.post('/api/chat', async (req, res) => {
    const { message, sessionId = 'default' } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: '메시지를 입력해주세요.' });

    addMessage(sessionId, 'user', message);

    // RAG
    let ragContext = '';
    try {
        const results = await search(message, 3);
        if (results.length > 0) {
            ragContext = '\n\n[참고 문서]\n' + results.map(r =>
                `--- ${r.title} > ${r.heading} (관련도: ${r.score}) ---\n${r.text}`
            ).join('\n\n');
        }
    } catch (e) { console.error('[RAG] 검색 실패:', e.message); }

    // 잔여 현황
    let availContext = '\n\n[현재 잔여 현황]\n';
    for (const [date, info] of Object.entries(parkingData)) {
        availContext += `- ${date}: ${info.closed ? '휴원' : `잔여 ${info.available}면`}\n`;
    }

    const messages = [
        { role: 'system', content: systemPrompt + ragContext + availContext },
        ...getHistory(sessionId)
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
                        fullResponse += chunk.message.content;
                        res.write(`data: ${JSON.stringify({ token: chunk.message.content })}\n\n`);
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

        addMessage(sessionId, 'assistant', fullResponse);
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
    try { await buildVectors(); } catch (e) { console.error('[RAG] 벡터 빌드 실패:', e.message); }
});
