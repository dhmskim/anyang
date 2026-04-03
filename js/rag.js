const fs = require('fs');
const path = require('path');

const OLLAMA_URL = 'http://172.31.0.210:11434';
const EMBED_MODEL = 'nomic-embed-text:latest';
const ROOT = path.join(__dirname, '..');
const KNOWLEDGE_DIR = path.join(ROOT, 'knowledge');
const VECTORS_FILE = path.join(ROOT, 'data', 'vectors.json');

// 문서를 청크로 분할 (## 헤딩 기준)
function splitChunks(filename, content) {
    const chunks = [];
    const sections = content.split(/^## /m);

    // 첫 번째는 # 제목 + 도입부
    const title = sections.shift().trim();
    const docTitle = title.split('\n')[0].replace(/^#\s*/, '');

    for (const section of sections) {
        if (!section.trim()) continue;
        const lines = section.split('\n');
        const heading = lines[0].trim();
        const body = lines.slice(1).join('\n').trim();
        if (!body) continue;

        chunks.push({
            source: filename,
            title: docTitle,
            heading,
            text: `${docTitle} > ${heading}\n${body}`,
        });
    }

    // 섹션이 없으면 문서 전체를 하나의 청크로
    if (chunks.length === 0 && title) {
        chunks.push({
            source: filename,
            title: docTitle,
            heading: '',
            text: content.trim(),
        });
    }

    return chunks;
}

// Ollama 임베딩 API 호출
async function getEmbedding(text) {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
    });
    if (!res.ok) throw new Error(`Embedding failed: ${res.status}`);
    const data = await res.json();
    return data.embedding;
}

// 코사인 유사도
function cosineSim(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 벡터 DB (메모리)
let vectorStore = [];

// knowledge 폴더의 모든 문서를 임베딩
async function buildVectors() {
    console.log('[RAG] 지식 문서 임베딩 시작...');

    // 캐시 확인
    let cache = {};
    if (fs.existsSync(VECTORS_FILE)) {
        try {
            cache = JSON.parse(fs.readFileSync(VECTORS_FILE, 'utf-8'));
        } catch (e) {
            cache = {};
        }
    }

    const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'));
    const newStore = [];
    let cached = 0, embedded = 0;

    for (const file of files) {
        const content = fs.readFileSync(path.join(KNOWLEDGE_DIR, file), 'utf-8');
        const chunks = splitChunks(file, content);

        for (const chunk of chunks) {
            const cacheKey = chunk.source + '::' + chunk.heading;

            // 캐시에 있고 텍스트가 동일하면 재사용
            if (cache[cacheKey] && cache[cacheKey].text === chunk.text) {
                newStore.push({ ...chunk, embedding: cache[cacheKey].embedding });
                cached++;
            } else {
                const embedding = await getEmbedding(chunk.text);
                newStore.push({ ...chunk, embedding });
                embedded++;
            }
        }
    }

    vectorStore = newStore;

    // 캐시 저장
    const cacheData = {};
    for (const item of vectorStore) {
        const key = item.source + '::' + item.heading;
        cacheData[key] = { text: item.text, embedding: item.embedding };
    }
    fs.writeFileSync(VECTORS_FILE, JSON.stringify(cacheData), 'utf-8');

    console.log(`[RAG] 완료: ${files.length}개 문서, ${vectorStore.length}개 청크 (캐시: ${cached}, 신규: ${embedded})`);
}

// 질문으로 관련 문서 검색
async function search(query, topK = 3) {
    if (vectorStore.length === 0) return [];

    const queryEmbed = await getEmbedding(query);
    const scored = vectorStore.map(item => ({
        ...item,
        score: cosineSim(queryEmbed, item.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).filter(item => item.score > 0.3).map(item => ({
        source: item.source,
        title: item.title,
        heading: item.heading,
        text: item.text,
        score: Math.round(item.score * 100) / 100,
    }));
}

module.exports = { buildVectors, search };
