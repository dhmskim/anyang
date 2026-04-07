require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { buildVectors, search } = require('./rag');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:14b';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const DATA_DIR = path.join(ROOT, 'data');

// 시스템 프롬프트
const systemPrompt = fs.readFileSync(path.join(ROOT, 'system_prompt.txt'), 'utf-8');

// ===== 미들웨어 =====
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(ROOT, 'parking-portal')));
app.use('/css', express.static(path.join(ROOT, 'css')));
app.get('/manager.html', (req, res) => res.sendFile(path.join(ROOT, 'manager.html')));
app.get('/js/manager.js', (req, res) => res.sendFile(path.join(ROOT, 'js', 'manager.js')));

// Rate Limiting
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: '로그인 시도가 너무 많습니다.' } });
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// data 폴더 보장
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// ===== JSON 파일 저장 (파일 잠금) =====
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LOG_DIR = path.join(DATA_DIR, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

let fileLocks = {};

function loadJSON(file) {
    if (!fs.existsSync(file)) return {};
    try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return {}; }
}

function saveJSON(file, data) {
    if (fileLocks[file]) return;
    fileLocks[file] = true;
    try {
        const tmp = file + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
        fs.renameSync(tmp, file);
    } finally {
        fileLocks[file] = false;
    }
}

// ===== 날짜별 로그 파일 =====
function todayStr() {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().slice(0, 10);
}

function getLogFile(prefix) {
    return path.join(LOG_DIR, `${prefix}_${todayStr()}.log`);
}

function appendLog(prefix, entry) {
    const line = JSON.stringify({ ...entry, _ts: new Date().toISOString() }) + '\n';
    fs.appendFileSync(getLogFile(prefix), line, 'utf-8');
}

function readLogLines(prefix, date) {
    const file = path.join(LOG_DIR, `${prefix}_${date || todayStr()}.log`);
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean).map(l => {
        try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
}

function readAllLogs(prefix) {
    const files = fs.readdirSync(LOG_DIR).filter(f => f.startsWith(prefix + '_') && f.endsWith('.log')).sort();
    const all = [];
    for (const f of files) {
        const lines = fs.readFileSync(path.join(LOG_DIR, f), 'utf-8').trim().split('\n').filter(Boolean);
        for (const l of lines) { try { all.push(JSON.parse(l)); } catch {} }
    }
    return all;
}

// 메모리 캐시 (현재 세션만, 서버 재시작 시 로그에서 복원)
let conversations = {};
let counselorRequests = {};

// 서버 시작 시 오늘+어제 로그에서 대화 복원
function restoreFromLogs() {
    const today = todayStr();
    const d = new Date(); d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().slice(0, 10);
    for (const date of [yesterday, today]) {
        const msgs = readLogLines('chat', date);
        for (const m of msgs) {
            if (!conversations[m.sessionId]) {
                conversations[m.sessionId] = { sessionId: m.sessionId, createdAt: m._ts, messages: [], reservations: [], counselorRequested: false };
            }
            conversations[m.sessionId].messages.push({ role: m.role, content: m.content, timestamp: m._ts });
        }
        const counselors = readLogLines('counselor', date);
        for (const c of counselors) {
            counselorRequests[c.sessionId] = c;
        }
    }
    console.log(`[Log] 복원 완료: 대화 ${Object.keys(conversations).length}건, 상담 ${Object.keys(counselorRequests).length}건`);
}
restoreFromLogs();

// ===== 유저 관리 (영속성) =====
function loadUsers() {
    const data = loadJSON(USERS_FILE);
    if (!data.users || data.users.length === 0) {
        // 초기 관리자 계정 생성
        const adminId = process.env.ADMIN_ID || 'AD';
        const adminPw = process.env.ADMIN_PW || 'admin1234';
        const hash = bcrypt.hashSync(adminPw, 10);
        return [{ id: adminId, pw: hash, name: '관리자', phone: '010-0000-0000', car: '', role: 'admin', status: 'active', joinDate: '2026-01-01' }];
    }
    return data.users;
}

function saveUsers() { saveJSON(USERS_FILE, { users }); }
let users = loadUsers();

// ===== 인증 =====
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: '인증이 필요합니다.' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
}

function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: '관리자만 접근 가능합니다.' });
    next();
}

// 로그인
app.post('/api/auth/login', (req, res) => {
    const { id, pw } = req.body;
    if (!id || !pw) return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
    const user = users.find(u => u.id === id);
    if (!user || !bcrypt.compareSync(pw, user.pw)) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    if (user.status !== 'active') return res.status(403).json({ error: '비활성 계정입니다.' });
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ success: true, token, user: { id: user.id, name: user.name, role: user.role, phone: user.phone, car: user.car } });
});

// 회원가입
app.post('/api/auth/signup', (req, res) => {
    const { id, pw, name, phone, car } = req.body;
    if (!id || !pw || !name || !phone) return res.status(400).json({ error: '필수 항목을 입력해주세요.' });
    if (!/^[a-zA-Z0-9]{4,20}$/.test(id)) return res.status(400).json({ error: '아이디는 영문, 숫자 4~20자입니다.' });
    if (pw.length < 8) return res.status(400).json({ error: '비밀번호는 8자 이상입니다.' });
    if (users.find(u => u.id.toLowerCase() === id.toLowerCase())) return res.status(409).json({ error: '이미 존재하는 아이디입니다.' });

    const hash = bcrypt.hashSync(pw, 10);
    const today = new Date().toISOString().slice(0, 10);
    users.push({ id, pw: hash, name, phone, car: car || '', role: 'user', status: 'active', joinDate: today });
    saveUsers();
    res.json({ success: true });
});

// 아이디 중복확인
app.get('/api/auth/check-id/:id', (req, res) => {
    const exists = users.some(u => u.id.toLowerCase() === req.params.id.toLowerCase());
    res.json({ available: !exists });
});

// ===== 관리자: 유저 관리 =====
app.get('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
    res.json(users.map(u => ({ ...u, pw: undefined })));
});

app.post('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
    const { id, pw, name, phone, car, role, status } = req.body;
    if (!id || !pw || !name || !phone) return res.status(400).json({ error: '필수 항목 누락' });
    if (users.find(u => u.id.toLowerCase() === id.toLowerCase())) return res.status(409).json({ error: '중복 아이디' });
    const hash = bcrypt.hashSync(pw, 10);
    const today = new Date().toISOString().slice(0, 10);
    users.push({ id, pw: hash, name, phone, car: car || '', role: role || 'user', status: status || 'active', joinDate: today });
    saveUsers();
    res.json({ success: true });
});

app.put('/api/admin/users/:id', authMiddleware, adminOnly, (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: '유저 없음' });
    const { name, phone, car, role, status, pw } = req.body;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (car !== undefined) user.car = car;
    if (role) user.role = role;
    if (status) user.status = status;
    if (pw) user.pw = bcrypt.hashSync(pw, 10);
    saveUsers();
    res.json({ success: true });
});

app.delete('/api/admin/users/:id', authMiddleware, adminOnly, (req, res) => {
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: '유저 없음' });
    users.splice(idx, 1);
    saveUsers();
    res.json({ success: true });
});

// ===== 대화 저장소 =====
function getConv(sessionId) {
    if (!conversations[sessionId]) {
        conversations[sessionId] = {
            sessionId, createdAt: new Date().toISOString(),
            messages: [], reservations: [], counselorRequested: false
        };
    }
    return conversations[sessionId];
}

function addMessage(sessionId, role, content) {
    const conv = getConv(sessionId);
    conv.messages.push({ role, content, timestamp: new Date().toISOString() });
    appendLog('chat', { sessionId, role, content });
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

// ===== API: 예약 (금액 서버 검증) =====
const DISCOUNTS = {
    none: { rate: 0, amount: 5000 },
    eco: { rate: 50, amount: 2500 },
    multi: { rate: 50, amount: 2500 },
    compact: { rate: 50, amount: 2500 },
    disable: { rate: 100, amount: 0 },
    veteran: { rate: 50, amount: 2500 },
};

app.post('/api/reserve', (req, res) => {
    const { sessionId, date, carNumber, discountId, userName, userId } = req.body;
    if (!date || !carNumber) return res.status(400).json({ error: '날짜와 차량번호를 입력해주세요.' });
    if (!/^\d{2,3}[가-힣]\d{4}$/.test(carNumber)) return res.status(400).json({ error: '차량번호 형식이 올바르지 않습니다.' });

    const info = parkingData[date];
    if (!info) return res.status(400).json({ error: '예약 가능 기간이 아닙니다.' });
    if (info.closed) return res.status(400).json({ error: `${info.closedReason}으로 예약할 수 없습니다.` });
    if (info.available <= 0) return res.status(400).json({ error: '해당 날짜는 만차입니다.' });

    const today = new Date().toISOString().split('T')[0];
    if (date <= today) return res.status(400).json({ error: '당일 예약은 불가합니다.' });

    const conv = getConv(sessionId || crypto.randomUUID());
    const month = date.slice(0, 7);
    const hasThisMonth = conv.reservations.some(r => r.date.startsWith(month) && r.status === 'confirmed');
    if (hasThisMonth) return res.status(400).json({ error: '월 1회 예약 제한을 초과했습니다.' });

    const disc = DISCOUNTS[discountId] || DISCOUNTS.none;
    const amount = disc.amount;
    const userType = userId ? 'member' : 'guest';

    info.reserved++;
    info.available = Math.max(info.available - 1, 0);

    const confirmNo = 'AY' + Date.now().toString().slice(-8);
    const reservation = { confirmNo, date, carNumber, amount, discountId: discountId || 'none', status: 'confirmed', createdAt: new Date().toISOString() };
    conv.reservations.push(reservation);
    appendLog('reserve', {
        confirmNo,
        action: 'confirm',
        userType,
        userId: userId || null,
        userName: userName || null,
        date,
        carNumber,
        discountId: discountId || 'none',
        amount,
        sessionId: sessionId || 'unknown'
    });

    res.json({ success: true, reservation });
});

// ===== API: 취소 =====
app.post('/api/cancel', (req, res) => {
    const { sessionId, confirmNo } = req.body;
    const conv = getConv(sessionId || 'default');
    const reservation = conv.reservations.find(r => r.confirmNo === confirmNo && r.status === 'confirmed');
    if (!reservation) return res.status(404).json({ error: '해당 확인번호의 예약을 찾을 수 없습니다.' });

    const now = new Date();
    const deadline = new Date(reservation.date + 'T09:00:00');
    deadline.setDate(deadline.getDate() - 1);
    deadline.setHours(18, 0, 0, 0);
    if (now > deadline) return res.status(400).json({ error: '취소 기한(방문 전날 18:00)이 지났습니다.' });

    reservation.status = 'cancelled';
    const info = parkingData[reservation.date];
    if (info) { info.reserved = Math.max(info.reserved - 1, 0); info.available = Math.min(info.available + 1, info.total); }
    appendLog('reserve', {
        confirmNo,
        action: 'cancel',
        date: reservation.date,
        carNumber: reservation.carNumber,
        sessionId
    });

    res.json({ success: true, message: `예약(${confirmNo})이 취소되었습니다. 환불은 3~5 영업일 내 처리됩니다.` });
});

// ===== API: 상담원 연결 요청 =====
app.post('/api/counselor', (req, res) => {
    const { sessionId } = req.body;
    const conv = getConv(sessionId);
    conv.counselorRequested = true;

    const reqData = {
        sessionId, requestedAt: new Date().toISOString(), status: 'pending',
        lastMessage: conv.messages.length > 0 ? conv.messages[conv.messages.length - 1].content : ''
    };
    counselorRequests[sessionId] = reqData;
    appendLog('counselor', reqData);

    res.json({ success: true, message: '상담원 연결이 요청되었습니다. 관리사무소에서 곧 연락드리겠습니다.' });
});

// ===== 관리자 API (인증 필요) =====
app.get('/api/admin/conversations', authMiddleware, adminOnly, (req, res) => {
    const list = Object.values(conversations).map(c => ({
        sessionId: c.sessionId, createdAt: c.createdAt,
        messageCount: c.messages.length,
        lastMessage: c.messages.length > 0 ? c.messages[c.messages.length - 1] : null,
        counselorRequested: c.counselorRequested
    }));
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(list);
});

app.get('/api/admin/conversations/:sessionId', authMiddleware, adminOnly, (req, res) => {
    const conv = conversations[req.params.sessionId];
    if (!conv) return res.status(404).json({ error: '대화를 찾을 수 없습니다.' });
    res.json(conv);
});

app.get('/api/admin/counselor-requests', authMiddleware, adminOnly, (req, res) => {
    const list = Object.values(counselorRequests);
    list.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    res.json(list);
});

app.post('/api/admin/counselor-requests/:sessionId/resolve', authMiddleware, adminOnly, (req, res) => {
    const cr = counselorRequests[req.params.sessionId];
    if (!cr) return res.status(404).json({ error: '요청을 찾을 수 없습니다.' });
    cr.status = 'resolved';
    cr.resolvedAt = new Date().toISOString();
    appendLog('counselor', { sessionId: req.params.sessionId, action: 'resolve', resolvedAt: cr.resolvedAt });
    res.json({ success: true });
});

// ===== API: 주차장 좌표 (Nominatim 지오코딩 + 캐시) =====
const GEOCODE_CACHE_FILE = path.join(DATA_DIR, 'geocode_cache.json');
let geocodeCache = loadJSON(GEOCODE_CACHE_FILE);

async function geocodeAddress(addr) {
    if (geocodeCache[addr]) return geocodeCache[addr];
    try {
        const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(addr) + '&countrycodes=kr&limit=1';
        const res = await fetch(url, { headers: { 'User-Agent': 'anyang-parking/1.0' } });
        const data = await res.json();
        if (data[0]) {
            const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            geocodeCache[addr] = result;
            saveJSON(GEOCODE_CACHE_FILE, geocodeCache);
            return result;
        }
    } catch (e) { console.error('[Geocode]', addr, e.message); }
    return null;
}

// 서버 시작 시 PARKING_DATA 주소를 미리 지오코딩
async function preloadGeocode() {
    const parkingDataFile = path.join(ROOT, 'parking-portal', 'parking-data.js');
    if (!fs.existsSync(parkingDataFile)) return;
    const content = fs.readFileSync(parkingDataFile, 'utf-8');
    const addrMatches = content.match(/addr:\s*"([^"]+)"/g);
    if (!addrMatches) return;
    const addrs = addrMatches.map(m => '안양시 ' + m.match(/"([^"]+)"/)[1]);
    let count = 0;
    for (const addr of addrs) {
        if (geocodeCache[addr]) { count++; continue; }
        await geocodeAddress(addr);
        count++;
        console.log(`[Geocode] ${count}/${addrs.length} ${addr}`);
        await new Promise(ok => setTimeout(ok, 1100));
    }
    console.log(`[Geocode] 완료: ${Object.keys(geocodeCache).length}개 캐시됨`);
}

app.get('/api/geocode', (req, res) => {
    res.json(geocodeCache);
});

// ===== API: 주변 주차장 (Overpass/OSM) =====
let parkingCache = null;
let parkingCacheTime = 0;
const PARKING_CACHE_TTL = 30 * 60 * 1000; // 30분 캐시
const ARBORETUM_LAT = 37.4175;
const ARBORETUM_LNG = 126.9430;

app.get('/api/nearby-parking', async (req, res) => {
    const radius = Math.min(parseInt(req.query.radius) || 5000, 30000);

    if (parkingCache && Date.now() - parkingCacheTime < PARKING_CACHE_TTL) {
        return res.json(parkingCache);
    }

    try {
        const query = `[out:json][timeout:15];(node["amenity"="parking"](around:${radius},${ARBORETUM_LAT},${ARBORETUM_LNG});way["amenity"="parking"](around:${radius},${ARBORETUM_LAT},${ARBORETUM_LNG}););out center 300;`;
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(query)
        });
        const data = await response.json();

        const parkings = data.elements.map(e => {
            const lat = e.lat || e.center?.lat;
            const lng = e.lon || e.center?.lon;
            if (!lat || !lng) return null;
            const tags = e.tags || {};
            return {
                id: e.id,
                name: tags.name || tags['name:ko'] || '주차장',
                lat, lng,
                type: tags.parking || 'surface',
                fee: tags.fee || 'unknown',
                capacity: tags.capacity ? parseInt(tags.capacity) : null,
                access: tags.access || 'yes',
                operator: tags.operator || '',
                surface: tags.surface || '',
                addr: tags['addr:full'] || tags['addr:street'] || ''
            };
        }).filter(Boolean);

        parkingCache = parkings;
        parkingCacheTime = Date.now();
        res.json(parkings);
    } catch (err) {
        console.error('[Parking]', err.message);
        res.status(500).json({ error: '주차장 정보를 가져올 수 없습니다.' });
    }
});

// ===== API: Edge TTS =====
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const NUM_KR_TTS = ['영','일','이','삼','사','오','육','칠','팔','구'];
const DAY_FULL_TTS = {'월':'월요일','화':'화요일','수':'수요일','목':'목요일','금':'금요일','토':'토요일','일':'일요일'};

function ttsClean(text) {
    let t = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    t = t.replace(/예\s*[)）:]\s*\S+/g, '');
    t = t.replace(/\(([월화수목금토일])\)/g, (_, d) => DAY_FULL_TTS[d] || d);
    t = t.replace(/(\d{2,3})([가-힣])(\d{4})/g, (_, a, b, c) => {
        return a.split('').map(n => NUM_KR_TTS[n]).join('. ') + '. ' + b + '. ' + c.split('').map(n => NUM_KR_TTS[n]).join('. ');
    });
    t = t.replace(/([A-Z]{2})(\d{6,10})/g, (_, prefix, nums) => {
        return prefix.split('').join('. ') + '. ' + nums.split('').map(n => NUM_KR_TTS[n]).join('. ');
    });
    t = t.replace(/(\d{2,4})-(\d{3,4})-(\d{4})/g, (_, a, b, c) => {
        return a.split('').map(n => NUM_KR_TTS[n]).join('. ') + ', ' + b.split('').map(n => NUM_KR_TTS[n]).join('. ') + ', ' + c.split('').map(n => NUM_KR_TTS[n]).join('. ');
    });
    return t;
}

app.post('/api/tts', async (req, res) => {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).end();
    try {
        const tts = new MsEdgeTTS();
        await tts.setMetadata('ko-KR-SunHiNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const cleanText = ttsClean(text);
        const { audioStream } = tts.toStream(cleanText);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache');
        audioStream.on('data', (chunk) => res.write(chunk));
        audioStream.on('end', () => res.end());
        audioStream.on('error', () => res.status(500).end());
    } catch (err) {
        console.error('[TTS]', err.message);
        res.status(500).end();
    }
});

// ===== API: AI 채팅 (스트리밍) =====
app.post('/api/chat', async (req, res) => {
    const { message, sessionId = crypto.randomUUID() } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: '메시지를 입력해주세요.' });

    addMessage(sessionId, 'user', message);

    let ragContext = '';
    try {
        const results = await search(message, 3);
        if (results.length > 0) {
            ragContext = '\n\n[참고 문서]\n' + results.map(r =>
                `--- ${r.title} > ${r.heading} (관련도: ${r.score}) ---\n${r.text}`
            ).join('\n\n');
        }
    } catch (e) { console.error('[RAG] 검색 실패:', e.message); }

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
                } catch (e) { /* 파싱 불가능한 라인 무시 */ }
            }
        }
        if (buffer.trim()) {
            try {
                const chunk = JSON.parse(buffer);
                if (chunk.message && chunk.message.content) {
                    fullResponse += chunk.message.content;
                    res.write(`data: ${JSON.stringify({ token: chunk.message.content })}\n\n`);
                }
            } catch (e) { /* 잔여 버퍼 무시 */ }
        }

        addMessage(sessionId, 'assistant', fullResponse);
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err) {
        console.error('[Chat]', err.message);
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
    preloadGeocode().catch(e => console.error('[Geocode] 사전 로딩 실패:', e.message));
});
