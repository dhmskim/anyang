# 서울대 안양수목원 주차장 사전예약 AI 챗봇 시스템

## 1. 프로젝트 개요

### 1.1 프로젝트 정보
- **프로젝트명**: 서울대 안양수목원 주차장 사전예약 챗봇
- **패키지명**: `parking-chatbot-server` v1.0.0
- **설명**: 안양시 통합주차포털 AI 챗봇 서버
- **개발 기간**: 2026년 4월~
- **저장소**: Git (main 브랜치)

### 1.2 프로젝트 목적
서울대 안양수목원 주차장(50면, 전면 사전예약제)의 예약/취소/혼잡현황 조회를 AI 챗봇으로 자동화하고, 안양시 통합주차포털 형태의 웹 서비스로 제공합니다.

### 1.3 핵심 기능
| 기능 | 설명 |
|------|------|
| AI 챗봇 | Ollama 로컬 LLM(qwen2.5:14b) 기반 자연어 대화, SSE 스트리밍 응답 |
| RAG 검색 | knowledge/ 문서를 벡터 임베딩하여 질문 관련 문서를 자동 검색 후 답변 |
| 주차 예약 | 날짜 선택 → 차량번호 입력 → 확인 → 예약 확정 (월 1회 제한) |
| 예약 취소 | 확인번호 입력으로 취소 (전날 18:00까지) |
| 혼잡 현황 | D+1~D+7 잔여면수 실시간 조회 |
| TTS 음성 안내 | Edge TTS(ko-KR-SunHiNeural)로 챗봇 응답 음성 변환 |
| 주차장 지도 | Leaflet 위성지도 + 안양시 공영주차장 33개소 마커 표시 |
| 관리자 페이지 | 유저 관리(CRUD), 대화 내역 조회, 상담원 요청 처리, API 문서 |
| 회원 인증 | JWT 토큰 기반 로그인/회원가입, bcrypt 비밀번호 해싱 |
| 상담원 연결 | 챗봇에서 상담원 연결 요청 → 관리자 페이지에서 처리 |

---

## 2. 기술 스택

### 2.1 백엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| Node.js | - | 런타임 |
| Express.js | ^4.21.0 | 웹 서버 프레임워크 |
| Ollama | - | 로컬 LLM 호스팅 (qwen2.5:14b, nomic-embed-text) |
| jsonwebtoken | ^9.0.3 | JWT 인증 토큰 |
| bcryptjs | ^3.0.3 | 비밀번호 해싱 |
| helmet | ^8.1.0 | HTTP 보안 헤더 |
| express-rate-limit | ^8.3.2 | API 요청 제한 |
| cors | ^2.8.5 | CORS 설정 |
| dotenv | ^17.4.1 | 환경변수 관리 |
| msedge-tts | ^2.0.4 | Edge TTS 음성 합성 |

### 2.2 프론트엔드
| 기술 | 용도 |
|------|------|
| HTML5/CSS3/JavaScript (Vanilla) | SPA 없이 순수 구현 |
| Leaflet.js (CDN) | 주차장 지도 |
| Esri World Imagery | 위성 지도 타일 |
| CartoDB | 라벨 오버레이 |
| Font Awesome 6.4 (CDN) | 아이콘 |

### 2.3 AI / RAG
| 구성 요소 | 기술 | 역할 |
|-----------|------|------|
| 생성 모델 | qwen2.5:14b (Ollama) | 챗봇 답변 생성 |
| 임베딩 모델 | nomic-embed-text:latest (Ollama) | 텍스트 → 768차원 벡터 |
| 벡터 검색 | 코사인 유사도 (자체 구현) | 관련 문서 Top-3 검색 |
| 벡터 캐시 | data/vectors.json | 임베딩 결과 파일 캐시 |

### 2.4 외부 API
| API | 용도 |
|-----|------|
| Nominatim (OpenStreetMap) | 주소 → 좌표 지오코딩 |
| Overpass API (OSM) | 주변 주차장 검색 |
| 전국주차장정보표준데이터 (data.go.kr) | 공공데이터 (키 활성화 대기중) |

---

## 3. 프로젝트 구조

```
수목원 챗봇/
├── .env                        # 환경변수 (PORT, OLLAMA_URL, JWT_SECRET 등)
├── .env.example                # 환경변수 템플릿
├── .gitignore                  # node_modules/, vectors.json, .env, data/logs/
├── package.json                # 프로젝트 설정 및 의존성
├── package-lock.json
├── start.bat                   # Windows 실행 스크립트
├── system_prompt.txt           # AI 챗봇 시스템 프롬프트
│
├── js/                         # 서버 스크립트
│   ├── server.js               # Express 서버 메인 (637줄)
│   ├── rag.js                  # RAG 엔진 (임베딩, 검색) (144줄)
│   ├── manager.js              # 관리자 페이지 JS (313줄)
│   └── user.js                 # 사용자 챗봇 JS (레거시, script.js에서 분리 전)
│
├── css/                        # 스타일시트
│   ├── user.css                # 사용자 챗봇 스타일 (341줄)
│   └── manager.css             # 관리자 페이지 스타일 (805줄)
│
├── knowledge/                  # RAG 지식 문서 (Markdown)
│   ├── 운영안내.md             # 운영시간, 휴원일, 위치, 입장료
│   ├── 요금안내.md             # 기본요금, 감면요금, 결제/환불
│   ├── 예약방법.md             # 예약 절차, 제한, 주의사항
│   ├── 취소변경.md             # 취소/변경 방법, 환불 규정
│   ├── 노쇼정책.md             # 당일 미입차 제재 단계
│   ├── 감면대상.md             # 감면 대상, 등록 방법
│   └── 대안주차장.md           # 인근 대안 주차장, 대중교통
│
├── data/                       # 데이터 저장 폴더
│   ├── users.json              # 회원 정보 (bcrypt 해시)
│   ├── vectors.json            # RAG 벡터 캐시
│   ├── geocode_cache.json      # 주소→좌표 캐시
│   └── logs/                   # 날짜별 로그 파일
│       ├── chat_YYYY-MM-DD.log       # 대화 내역
│       ├── reserve_YYYY-MM-DD.log    # 예약/취소
│       └── counselor_YYYY-MM-DD.log  # 상담 요청
│
├── parking-portal/             # 사용자 포털 (안양시 통합주차포털)
│   ├── index.html              # 메인 페이지 (587줄)
│   ├── style.css               # 포털 스타일 (2,545줄)
│   ├── script.js               # 원본 통합 스크립트 (1,159줄, 레거시)
│   ├── parking-data.js         # 안양시 공영주차장 33개소 데이터
│   └── js/                     # 모듈 분할된 스크립트
│       ├── portal-ui.js        # 슬라이더, 탭, 조회, 주차현황, 지도 (333줄)
│       ├── auth.js             # 로그인/회원가입 (199줄)
│       └── chatbot.js          # 챗봇 전체 기능 (359줄)
│
├── manager.html                # 관리자 페이지 (207줄)
│
├── 작업파일/
│   └── RAG_구축_문서.md        # RAG 시스템 기술 문서
│
├── 2026-04-03.md               # 작업 내역 (지도/사이드바)
└── 2026-04-06.md               # 작업 내역 (보안/코드/로그)
```

---

## 4. 서버 아키텍처 (js/server.js)

### 4.1 서버 설정
| 항목 | 값 |
|------|-----|
| 포트 | `process.env.PORT` (기본 3000) |
| Ollama URL | `process.env.OLLAMA_URL` (기본 `http://localhost:11434`) |
| AI 모델 | `process.env.OLLAMA_MODEL` (기본 `qwen2.5:14b`) |
| JWT Secret | `process.env.JWT_SECRET` |
| 정적 파일 | 프로젝트 루트 전체 |

### 4.2 미들웨어 스택
```
Helmet (보안 헤더)
  ↓
CORS
  ↓
express.json()
  ↓
express.static (프로젝트 루트)
  ↓
Rate Limiting
  ├── /api/* → 60 req/min
  └── /api/auth/* → 20 req/15min
```

### 4.3 데이터 저장 방식
- **파일 기반**: JSON 파일 + 날짜별 .log 파일
- **원자적 쓰기**: tmp 파일 생성 → rename (데이터 손실 방지)
- **파일 잠금**: `fileLocks` 객체로 동시 쓰기 방지
- **메모리 캐시**: 대화(`conversations`), 상담요청(`counselorRequests`)은 메모리에 유지
- **서버 재시작 복원**: 오늘+어제 로그에서 대화/상담 데이터 자동 복원

### 4.4 로그 시스템
| 로그 유형 | 파일명 패턴 | 내용 |
|-----------|-------------|------|
| 대화 | `chat_YYYY-MM-DD.log` | sessionId, role, content, timestamp |
| 예약 | `reserve_YYYY-MM-DD.log` | confirmNo, action, userType, userId, date, carNumber, amount |
| 상담 | `counselor_YYYY-MM-DD.log` | sessionId, requestedAt, status, lastMessage |

각 로그 라인은 JSON 형식 + `_ts` 타임스탬프가 추가됩니다.

---

## 5. REST API 엔드포인트

### 5.1 인증 (공개)
| Method | URL | 설명 |
|--------|-----|------|
| `POST` | `/api/auth/login` | 로그인 → JWT 토큰 발급 (8시간 유효) |
| `POST` | `/api/auth/signup` | 회원가입 (bcrypt 해싱, 영문숫자 4~20자 ID, 8자 이상 PW) |
| `GET` | `/api/auth/check-id/:id` | 아이디 중복확인 |

### 5.2 주차 (공개)
| Method | URL | 설명 |
|--------|-----|------|
| `GET` | `/api/availability` | 전체 잔여현황 (D+1~D+7) |
| `GET` | `/api/availability/:date` | 특정 날짜 잔여현황 |
| `POST` | `/api/reserve` | 주차 예약 (날짜, 차량번호, 할인ID) |
| `POST` | `/api/cancel` | 예약 취소 (확인번호) |

### 5.3 AI / 음성 (공개)
| Method | URL | 설명 |
|--------|-----|------|
| `POST` | `/api/chat` | AI 채팅 (SSE 스트리밍) |
| `POST` | `/api/tts` | Edge TTS 음성 합성 (MP3 스트림) |
| `POST` | `/api/counselor` | 상담원 연결 요청 |

### 5.4 지도 (공개)
| Method | URL | 설명 |
|--------|-----|------|
| `GET` | `/api/geocode` | 주소→좌표 캐시 조회 |
| `GET` | `/api/nearby-parking?radius=` | 주변 주차장 (Overpass/OSM, 30분 캐시) |

### 5.5 관리자 (JWT 인증 필수)
| Method | URL | 설명 |
|--------|-----|------|
| `GET` | `/api/admin/users` | 전체 유저 목록 |
| `POST` | `/api/admin/users` | 유저 추가 |
| `PUT` | `/api/admin/users/:id` | 유저 수정 |
| `DELETE` | `/api/admin/users/:id` | 유저 삭제 |
| `GET` | `/api/admin/conversations` | 대화 목록 (최신순) |
| `GET` | `/api/admin/conversations/:sessionId` | 대화 상세 |
| `GET` | `/api/admin/counselor-requests` | 상담 요청 목록 |
| `POST` | `/api/admin/counselor-requests/:sessionId/resolve` | 상담 처리 완료 |

---

## 6. RAG (검색 증강 생성) 시스템

### 6.1 동작 흐름
```
사용자 질문 입력
    ↓
[1] 질문 텍스트 → nomic-embed-text로 768차원 벡터 임베딩
    ↓
[2] vectors.json의 모든 청크와 코사인 유사도 계산
    ↓
[3] 유사도 0.3 이상 + 상위 3개 (Top-K=3) 문서 추출
    ↓
[4] 시스템 프롬프트 + [참고 문서] + [잔여 현황] + 대화 히스토리 조합
    ↓
[5] Ollama (qwen2.5:14b)에 전달 → SSE 스트리밍 응답
    ↓
[6] 클라이언트에 토큰 단위 실시간 전송
```

### 6.2 문서 청킹
- `knowledge/*.md` 파일을 `##` (h2 헤딩) 기준으로 분할
- 각 청크: `문서제목 > 섹션제목\n본문` 형식
- 현재 7개 문서에서 약 28개 청크 생성

### 6.3 벡터 캐시
- 파일: `data/vectors.json`
- 캐시 키: `파일명::섹션제목`
- 문서 내용 동일 시 임베딩 재사용 → 재시작 1~2초
- 문서 변경 시 해당 청크만 재임베딩

### 6.4 지식 문서 목록
| 파일 | 청크 수 | 주요 내용 |
|------|---------|-----------|
| `운영안내.md` | 5 | 운영시간(하/동절기), 휴원일, 위치/교통, 입장료, 문의 |
| `요금안내.md` | 4 | 기본요금(5,000원), 감면별 요금, 결제방법, 환불규정 |
| `예약방법.md` | 5 | 예약 6단계 절차, 예약기간(D-7~D-1), 월1회 제한, 주의사항 |
| `취소변경.md` | 5 | 취소방법(3가지), 환불, 날짜/차량번호 변경, 확인번호 분실 |
| `노쇼정책.md` | 5 | 당일 미입차 정의, 제재(1~3회), 초기화, 예외 인정, 증빙 |
| `감면대상.md` | 3 | 50%/100% 감면 대상, 등록방법, 유의사항 |
| `대안주차장.md` | 4 | 안양예술공원, 삼성산입구, 만안구청, 대중교통 |

---

## 7. AI 챗봇 시스템 프롬프트

### 7.1 역할
"서울대 안양수목원 주차장 사전예약 챗봇"으로서 주차 관련 질의응답 전용.

### 7.2 Intent 분류 (5가지)
| Intent | 처리 방식 |
|--------|-----------|
| 예약 | UI가 플로우 관리, AI는 자연어 안내만 |
| 혼잡안내 | [현재 잔여 현황] 데이터 참조 |
| 취소변경 | 취소/변경 방법 안내 |
| FAQ | [참고 문서]에서 검색하여 답변 |
| 범위외 | 관리사무소 전화번호 안내 |

### 7.3 핵심 규칙
- **"노쇼" 표현 금지** → 반드시 "당일 미입차"로 통일
- [참고 문서]에 있는 정보만 사용, 없는 정보 생성 금지
- 답변 2~3문장 이내, 한국어만
- 오타 지적 금지, 모호한 질문은 되묻기
- 불만 감지 시 공감 먼저

---

## 8. 사용자 포털 (parking-portal/)

### 8.1 페이지 구성 (index.html)
안양도시공사 통합주차포털 형태의 풀페이지 웹사이트:

| 섹션 | 설명 |
|------|------|
| 상단 유틸바 | 로그인/회원가입/마이페이지 |
| 헤더 + GNB | 로고, 7개 메뉴 (주차장찾기, 주차요금정산, 파킹패스 등) |
| 메인 비주얼 | 3장 자동 슬라이더 (5초 간격) |
| 퀵메뉴 | 7개 바로가기 아이콘 |
| 차량번호 검색 | 3탭 (미납요금/견인차량/주차장검색) |
| 실시간 주차현황 | 33개 주차장 원형 차트 슬라이더, 지역필터(전체/만안구/동안구) |
| 서비스 안내 배너 | 파킹패스, 사전결제, 감면대상 |
| 공지사항 + 요금표 | 2컬럼 레이아웃 |
| 주차장 지도 | Leaflet 위성지도 + 사이드바 목록 |
| 관련 사이트 + 푸터 | 안양시청, 안양도시공사, 경기도청 등 |
| 챗봇 위젯 | 우하단 플로팅 버튼, 챗봇 창 |
| 로그인/회원가입 모달 | 서버 API 연동 |

### 8.2 챗봇 위젯 (chatbot.js)
| 기능 | 설명 |
|------|------|
| 메뉴 버튼 | 혼잡현황, 주차예약, 취소/변경, 노쇼/운영안내 |
| AI 대화 | SSE 스트리밍으로 실시간 토큰 표시 |
| 예약 플로우 | 날짜 선택(캘린더) → 차량번호 입력 → 확인 → 확정 |
| 취소 플로우 | 확인번호 입력 → 서버 취소 요청 |
| TTS | 봇 응답 자동 음성 재생 (토글 가능) |
| 상담원 연결 | 상담원 버튼 클릭 시 서버에 요청 |

### 8.3 주차장 데이터 (parking-data.js)
안양시 공영주차장 33개소 정보:
- **만안구**: 14개소 (안양역, 관악역 환승, 박달시장, 비호교 등)
- **동안구**: 19개소 (범계역, 평촌지하, 충훈지하, 스마트스퀘어 등)
- 각 주차장: name, type(outdoor/street/underground), area, used, total, addr

### 8.4 지도 기능 (portal-ui.js)
- **지도**: Leaflet + Esri 위성 타일 + CartoDB 라벨 오버레이
- **안양수목원 마커**: 초록 나무 아이콘 고정 표시
- **주차장 마커**: 여유(초록)/보통(주황)/혼잡(빨강) 색상 구분
- **팝업**: 주차장명, 주소, 점유율 게이지바, 잔여면수
- **사이드바**: 검색, 유형별 필터(노외/노상/지하), 목록 ↔ 마커 양방향 연동
- **좌표**: 서버 Nominatim 지오코딩 → geocode_cache.json 캐시
- **내 위치**: GPS 버튼으로 현위치 표시

### 8.5 인증 (auth.js)
- 서버 API(`/api/auth/login`, `/api/auth/signup`) 연동
- JWT 토큰 기반 로그인 상태 관리
- 아이디 중복확인, 비밀번호 검증, 약관 동의
- 테스트 계정 바로 로그인 기능

---

## 9. 관리자 페이지 (manager.html)

### 9.1 페이지 구성
사이드바 네비게이션 + 5개 페이지:

| 페이지 | 기능 |
|--------|------|
| 유저 관리 | 회원 목록 (검색, 필터), 추가/수정/삭제 모달, 통계 카드 (전체/활성/비활성/오늘가입) |
| 대화 내역 | 좌측 대화 목록 + 우측 상세 뷰 (읽음/안읽음 구분) |
| 상담원 요청 | 대기중/처리완료 상태 관리, 대화 내역 함께 표시, 처리 완료 버튼 |
| API / 구현 문서 | 서버구조, REST API, AI 챗봇, 파일구조, 데이터저장, 예약정책 문서 |
| 기타 관리 | 지식 문서 관리 안내, 데이터 저장 현황 |

### 9.2 인증
- JWT 자동 로그인 (localStorage 토큰)
- 토큰 만료 시 자동 재로그인 시도
- 관리자 전용 API에 Bearer 토큰 헤더 전송
- 30초 간격 대화 내역/상담 요청 자동 새로고침

---

## 10. 예약 비즈니스 규칙

### 10.1 예약 정책
| 규칙 | 내용 |
|------|------|
| 총 주차면 | 50면 (전면 사전예약제, 현장주차 불가) |
| 예약 가능 기간 | D+1 ~ D+7 (당일 예약 불가) |
| 월 제한 | 1인(1차량) 월 1회 |
| 휴원일 | 매주 월요일 (자동 만차 처리) |
| 취소 기한 | 방문 전날 18:00 |
| 환불 | 취소 시 전액환불, 3~5 영업일 |

### 10.2 할인 정책 (서버에서 계산)
| discountId | 대상 | 감면율 | 금액 |
|------------|------|--------|------|
| `none` | 일반 | 0% | 5,000원 |
| `eco` | 저공해차 | 50% | 2,500원 |
| `multi` | 다자녀 | 50% | 2,500원 |
| `compact` | 경차 | 50% | 2,500원 |
| `veteran` | 국가유공자 | 50% | 2,500원 |
| `disable` | 장애인 | 100% | 무료 |

### 10.3 당일 미입차 제재
| 횟수 | 제재 |
|------|------|
| 1회 | 당월 잔여 예약 전면 정지, 익월 자동 해제 |
| 2회 | 30일간 예약 불가 |
| 3회+ | 당해 연도 잔여 기간 예약 불가 |

---

## 11. 보안

### 11.1 적용된 보안 조치
| 분류 | 조치 |
|------|------|
| 환경변수 | `.env` 분리 (Ollama URL, PORT, JWT Secret, 관리자 계정) |
| 인증 | JWT 토큰 (8시간 만료), bcrypt 해시 (salt 10) |
| 권한 | `authMiddleware` + `adminOnly` 미들웨어 |
| Rate Limiting | API 60req/min, 인증 20req/15min |
| HTTP 헤더 | Helmet 적용 |
| XSS 방어 | `textContent` / `escapeHtml()` 사용 |
| 세션 | `crypto.randomUUID()` (예측 불가) |
| 데이터 | 원자적 파일 쓰기 (tmp→rename) |
| 금액 | 서버에서 `discountId` 기반 직접 계산 (클라이언트 조작 불가) |

### 11.2 환경변수 (.env)
```
PORT=3000
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:14b
JWT_SECRET=your-secret-key-here
ADMIN_ID=AD
ADMIN_PW=your-admin-password
```

---

## 12. TTS (Text-to-Speech)

### 12.1 엔진
- **서버**: Edge TTS (`msedge-tts` 패키지)
- **음성**: `ko-KR-SunHiNeural` (한국어 여성)
- **포맷**: AUDIO_24KHZ_48KBITRATE_MONO_MP3

### 12.2 텍스트 전처리 (`ttsClean`)
| 처리 | 설명 |
|------|------|
| HTML 태그 제거 | `<br>`, `<strong>` 등 |
| 예시 패턴 제거 | `예) 12가3456` 등 |
| 요일 변환 | `(월)` → `월요일` |
| 차량번호 읽기 | `12가3456` → `일. 이. 가. 삼. 사. 오. 육` |
| 확인번호 읽기 | `AY12345678` → `에이. 와이. 일. 이...` |
| 전화번호 읽기 | `031-470-0242` → `영. 삼. 일, 사. 칠. 영...` |

---

## 13. 프론트엔드 모듈 구조

### 13.1 script.js → 3개 모듈 분할
기존 `parking-portal/script.js` (1,159줄)를 3개 파일로 분할:

| 모듈 | 파일 | 줄수 | 담당 |
|------|------|------|------|
| portal-ui.js | `parking-portal/js/portal-ui.js` | 333 | 슬라이더, 탭, 모바일메뉴, 조회, 주차현황 원형차트, Leaflet 지도 |
| auth.js | `parking-portal/js/auth.js` | 199 | 로그인/회원가입 모달, 서버 API 연동, 테스트 계정 |
| chatbot.js | `parking-portal/js/chatbot.js` | 359 | 챗봇 전체 (메시지, AI 스트리밍, 예약 플로우, 취소, TTS, 상담원) |

### 13.2 설계 원칙
- IIFE 스코프 격리 (전역 변수 제거)
- `data-action` 이벤트 위임 (inline onclick 제거)
- XSS safe: `textContent` / `escapeHtml()` 사용

---

## 14. 주차장 지도 시스템

### 14.1 좌표 획득 흐름
```
서버 시작
  ↓
parking-data.js에서 주소 추출
  ↓
Nominatim API로 지오코딩 (1.1초 간격, rate limit 준수)
  ↓
geocode_cache.json에 캐시 저장
  ↓
클라이언트 → GET /api/geocode → 캐시된 좌표 로드
  ↓
Leaflet 마커 생성
```

### 14.2 마커 스타일
| 상태 | 색상 | 조건 |
|------|------|------|
| 여유 (available) | 초록 `#2e7d32` | 점유율 < 60% |
| 보통 (normal) | 주황 `#e67e00` | 점유율 60~85% |
| 혼잡 (crowded) | 빨강 `#d32f2f` | 점유율 >= 85% |

---

## 15. 실행 방법

### 15.1 사전 요구사항
- Node.js 설치
- Ollama 실행 (qwen2.5:14b, nomic-embed-text 모델 설치)

### 15.2 설치 및 실행
```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일에서 OLLAMA_URL, JWT_SECRET 등 수정

# 3. 서버 실행
npm start
# 또는
node js/server.js

# 4. Windows에서는 start.bat 더블클릭
```

### 15.3 접속
- **사용자 페이지**: http://localhost:3000/parking-portal/index.html
- **관리자 페이지**: http://localhost:3000/manager.html

### 15.4 서버 시작 시 자동 작업
1. RAG 벡터 빌드 (`knowledge/*.md` → 임베딩 → vectors.json)
2. Nominatim 지오코딩 사전 로딩 (parking-data.js 주소)
3. 오늘+어제 로그에서 대화/상담 데이터 메모리 복원
4. 초기 관리자 계정 생성 (users.json 없을 경우)

---

## 16. 커밋 이력

| 커밋 | 날짜 | 내용 |
|------|------|------|
| `57d9935` | 2026-04-06 | 작업 내역 문서 업데이트 |
| `3df6f3d` | 2026-04-06 | 예약 로그 개선: 예약번호별 구분, 회원/비회원 구분 |
| `7d5c1f8` | 2026-04-06 | 대화/예약/상담 데이터를 날짜별 .log 파일로 전환 |
| `e486710` | 2026-04-06 | 대화 내역 데이터 업데이트 |
| `0bb4bf4` | 2026-04-06 | 보안/코드 전면 개선, script.js 모듈 분할, 지도 위성뷰 + 좌표 캐시 |

---

## 17. 챗봇 대화 플로우 상태머신

> **주의**: 이 섹션은 `js/user.js` (레거시, 미사용) 기준입니다. 실제 사용 중인 `parking-portal/js/chatbot.js`의 정확한 6단계 플로우는 **섹션 56**을 참고하세요.

### 17.1 상태 변수
챗봇은 `reserveState` 객체로 현재 대화 플로우의 단계를 관리합니다. `null`이면 일반 AI 대화 모드입니다.

### 17.2 예약 플로우
```
[일반 모드] reserveState = null
    │
    ├─ 메뉴 "주차 예약" 클릭
    │
    ▼
[1단계: 날짜 선택] reserveState = { step: 'date' }
    │  API: GET /api/availability → 캘린더 위젯 렌더링
    │  날짜 버튼 클릭 → selectDate(date)
    │
    ▼
[2단계: 차량번호 입력] reserveState = { step: 'car', date, dateLabel }
    │  사용자 텍스트 입력 → inputCar(text)
    │  정규식 검증: /^\d{2,3}[가-힣]\d{4}$/
    │  실패 시 재입력 요청 (step 유지)
    │
    ▼
[3단계: 예약 확인] reserveState = { step: 'confirm', date, dateLabel, car }
    │  확인 카드 위젯 렌더링 (날짜, 차량번호, 요금)
    │  "예약 확정" 클릭 → confirmReserve()
    │  "다시 입력" 클릭 → resetReserve() → 1단계로 복귀
    │
    ▼
[4단계: 예약 완료] reserveState = null (초기화)
    │  API: POST /api/reserve
    │  성공: 확인번호(AY********) + 완료 카드
    │  실패: 에러 메시지 표시
    │
    ▼
[일반 모드 복귀]
```

### 17.3 취소 플로우
```
[일반 모드] reserveState = null
    │
    ├─ 메뉴 "취소/변경" 클릭
    │
    ▼
[취소 입력] reserveState = { step: 'cancelInput' }
    │  사용자 텍스트 입력 → processCancel(text)
    │  API: POST /api/cancel { confirmNo }
    │  성공/실패 메시지 표시
    │
    ▼
[일반 모드 복귀] reserveState = null
```

### 17.4 메시지 전송 분기 로직
```javascript
handleSend() {
    if (reserveState) {
        if (reserveState.step === 'car')         → inputCar(text)
        if (reserveState.step === 'cancelInput')  → processCancel(text)
        // date, confirm 단계는 버튼으로만 진행 (텍스트 입력 무시)
    } else {
        → sendToAI(text)  // 일반 AI 대화
    }
}
```

### 17.5 메뉴 버튼 → 액션 매핑
| 버튼 | data-action | 호출 함수 |
|------|-------------|-----------|
| 혼잡 현황 | `congestion` | `showCongestion()` |
| 주차 예약 | `reserve` | `startReserve()` |
| 취소/변경 | `cancel` | `showCancel()` |
| 노쇠/운영 안내 | `faq` | `sendToAI('운영시간과 요금, 당일 미입차 정책을 알려주세요')` |

---

## 18. Mock 데이터 생성 로직

### 18.1 주차 잔여현황 (generateAvailability)
서버 시작 시 및 5분마다 D+1~D+7 잔여현황을 랜덤 생성합니다.

```
generateAvailability() {
    for each day in (today+1 ~ today+7):
        if (월요일):
            → total: 50, reserved: 50, available: 0, closed: true
            → closedReason: "휴원일 (매주 월요일)"
        else if (주말 토·일):
            → reserved = random(38~52)  // 주말은 혼잡
        else (평일 화~금):
            → reserved = random(15~34)  // 평일은 여유
        → available = max(50 - reserved, 0)
}
```

### 18.2 갱신 주기
```javascript
setInterval(() => { parkingData = generateAvailability(); }, 5 * 60 * 1000);
// 5분마다 전체 데이터 재생성
```

### 18.3 주차장 점유 데이터 (parking-data.js)
33개 공영주차장의 `used`/`total` 값은 정적 하드코딩 데이터입니다.
실시간 연동 전까지 페이지 로드 시 항상 동일한 값이 표시됩니다.

| 지역 | 주차장 수 | 총 면수 | 사용 면수 |
|------|-----------|---------|-----------|
| 만안구 | 14개소 | 1,920면 | 1,008면 |
| 동안구 | 19개소 | 4,340면 | 2,637면 |
| **합계** | **33개소** | **6,260면** | **3,645면** |

---

## 19. 주차현황 원형 차트 UI

### 19.1 SVG 원형 차트 구조
각 주차장 카드에 SVG 기반 원형 게이지가 표시됩니다.

```html
<svg viewBox="0 0 120 120">
    <circle class="circle-bg" cx="60" cy="60" r="50"/>      <!-- 배경 원 -->
    <circle class="circle-fill" cx="60" cy="60" r="50"/>     <!-- 채워지는 원 -->
</svg>
```

### 19.2 애니메이션 로직
```javascript
// 원 둘레 = 2π × 50 = 314.16
const CIRCUMFERENCE = 2 * Math.PI * 50;

// 점유율에 따라 stroke-dashoffset 설정
fill.style.strokeDasharray = CIRCUMFERENCE;
fill.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);  // 채워지는 비율
fill.style.stroke = getColorByPercent(pct);                // 색상 결정
```

### 19.3 색상 그라데이션 함수
점유율에 따라 초록 → 주황 → 빨강으로 부드럽게 전환됩니다.

```
getColorByPercent(pct):
    pct < 0.5  → 초록(26,122,58) → 주황(230,168,0) 보간
    pct >= 0.5 → 주황(230,168,0) → 빨강(211,47,47) 보간
```

| 점유율 | 색상 | RGB |
|--------|------|-----|
| 0% | 초록 | rgb(26, 122, 58) |
| 50% | 주황 | rgb(230, 168, 0) |
| 100% | 빨강 | rgb(211, 47, 47) |

### 19.4 슬라이더 동작
- **표시 카드 수**: 한 번에 3개 (VISIBLE_COUNT = 3)
- **자동 이동**: 5초 간격 (`setInterval`)
- **좌/우 화살표**: 수동 이동 시 자동 타이머 리셋
- **지역 필터**: 전체/만안구/동안구 탭으로 필터링
- **카드 너비**: 뷰포트에 맞춰 동적 계산 `(viewport - gap * 2) / 3`
- **이동 방식**: CSS `transform: translateX()` + 트랙 전체 너비 계산

---

## 20. CSS 디자인 시스템

### 20.1 폰트
```css
font-family: 'Malgun Gothic', '맑은 고딕', -apple-system, sans-serif;
```
- 윈도우 기본 한글 폰트 (맑은 고딕) 우선
- macOS 폴백: -apple-system

### 20.2 색상 팔레트

#### 사용자 포털 (parking-portal/style.css)
| 용도 | 색상 | Hex |
|------|------|-----|
| 메인 브랜드 (포털) | 파랑 | `#0055a5` |
| 메인 브랜드 (챗봇/수목원) | 초록 | `#2e7d32` |
| 챗봇 그라데이션 | 초록 진함 | `#1b5e20` |
| 유틸바/푸터 배경 | 다크 네이비 | `#1a1a2e` / `#2a2a3d` |
| 본문 텍스트 | 다크 그레이 | `#333` |
| 보조 텍스트 | 그레이 | `#888` |
| 배경 | 화이트 | `#fff` |
| 비주얼 슬라이드 1 | 파랑 | `#003b73` → `#0055a5` |
| 비주얼 슬라이드 2 | 초록 | `#0d5c26` → `#1a7a3a` |
| 비주얼 슬라이드 3 | 주황 | `#8a3a00` → `#c35400` |

#### 상태 색상 (공통)
| 상태 | 색상 | 배경 | Hex |
|------|------|------|-----|
| 여유 / 성공 | 초록 | 연초록 | `#2e7d32` / `#e8f5e9` |
| 보통 / 경고 | 주황 | 연주황 | `#e67e00` · `#f57f17` / `#fff8e1` |
| 혼잡 / 에러 | 빨강 | 연빨강 | `#d32f2f` / `#ffebee` |
| 비활성 / 휴원 | 그레이 | 연회색 | `#999` / `#f5f5f5` |

#### 관리자 페이지 (css/manager.css)
| 용도 | 색상 | Hex |
|------|------|-----|
| 사이드바 배경 | 다크 네이비 | `#1a1a2e` |
| 사이드바 활성 | 초록 | `#4caf50` |
| 메인 배경 | 연회색 | `#f0f2f5` |
| 통계-전체 | 파랑 그라데이션 | `#42a5f5` → `#1565c0` |
| 통계-활성 | 초록 그라데이션 | `#66bb6a` → `#2e7d32` |
| 통계-비활성 | 빨강 그라데이션 | `#ef5350` → `#c62828` |
| 통계-오늘 | 주황 그라데이션 | `#ffa726` → `#e65100` |
| 안읽음 | 연노랑 | `#fffde7` (배경) + `#ffa000` (보더) |
| 상담원 버튼 | 주황 | `#e67e22` |

#### 독립 챗봇 (css/user.css)
| 용도 | 색상 | Hex |
|------|------|-----|
| 배경 | 연초록 | `#e8f5e9` |
| 챗봇 메인 | 초록 | `#2e7d32` |
| 챗봇 진함 | 진초록 | `#1b5e20` |
| 채팅 배경 | 연회색 | `#f5f7fa` |
| 메뉴 보더 | 연초록 보더 | `#c8e6c9` |

### 20.3 반응형 브레이크포인트

#### 사용자 포털
| 브레이크포인트 | 대상 | 변경 사항 |
|---------------|------|-----------|
| **1024px** | 태블릿 | 퀵메뉴 4열, 배너 1열, 지도 세로 배치 (사이드바 위 + 지도 아래) |
| **768px** | 모바일 | 햄버거 메뉴, 비주얼 280px, 퀵메뉴 3열, 검색 세로, 정보 1열, 푸터 세로 |
| **480px** | 소형 모바일 | 퀵메뉴 2열, 비주얼 20px 타이틀, 요금표 12px, 챗봇 전체화면 |

#### 관리자 페이지
| 브레이크포인트 | 변경 사항 |
|---------------|-----------|
| **900px** | 사이드바 → 상단 가로 탭, 분할 레이아웃 → 세로, 통계 2열, 테이블 가로 스크롤 |

#### 독립 챗봇
| 브레이크포인트 | 변경 사항 |
|---------------|-----------|
| **480px** | 챗봇 컨테이너 100% 너비, 100vh 높이, border-radius 제거 |

### 20.4 컨테이너
```css
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}
```

### 20.5 레이아웃 패턴
| 패턴 | 사용 위치 |
|------|-----------|
| Flexbox | 헤더, 유틸바, 카드, 입력 영역, 사이드바 |
| CSS Grid | 퀵메뉴(2~7열), 챗봇 메뉴(2열), 캘린더(4열), 통계카드(4열), 문서카드 |
| Sticky | 헤더 (top: 0, z-index: 1000) |
| Fixed | 챗봇 버튼 (bottom: 32px, right: 32px, z-index: 9000), 챗봇 창 (z-index: 9100) |

### 20.6 CSS 애니메이션
| 애니메이션 | 효과 | 사용 위치 |
|-----------|------|-----------|
| `dotPulse` | 1.2s 무한 펄스 (투명도 + 스케일) | 타이핑 인디케이터 (3개 점) |
| 슬라이드 전환 | `opacity 0.8s ease` | 메인 비주얼 (fade-in/out) |
| 호버 | `transform: scale(1.05)` | 챗봇 버튼, 문서카드 |
| transition 0.2s | 색상/배경/보더 변경 | 대부분의 인터랙티브 요소 |

---

## 21. 알려진 이슈 및 불일치점

### 21.1 Ollama URL 하드코딩 불일치
| 파일 | URL | 설정 방식 |
|------|-----|-----------|
| `js/server.js` | `process.env.OLLAMA_URL` (기본 `http://localhost:11434`) | `.env` 환경변수 |
| `js/rag.js` | `http://172.31.0.210:11434` | **하드코딩** |

`rag.js`의 `OLLAMA_URL`이 `172.31.0.210`으로 하드코딩되어 있어, `.env`의 설정과 무관하게 항상 해당 IP로 임베딩 요청을 보냅니다.
- **영향**: 네트워크 환경이 바뀌면 RAG 임베딩이 실패
- **수정 필요**: `rag.js`에서도 `process.env.OLLAMA_URL` 참조하도록 변경

### 21.2 레거시 파일 잔존
| 파일 | 상태 | 설명 |
|------|------|------|
| `parking-portal/script.js` (1,159줄) | **레거시** | 분할 전 원본 파일이 여전히 존재 |
| `parking-portal/js/*.js` (3개) | **현재 사용** | index.html에서 이 3개를 로드 |
| `js/user.js` (305줄) | **미사용 의심** | chatbot.js와 동일한 역할, 독립 챗봇 페이지용으로 추정 |

`index.html`은 모듈화된 3개 파일(`portal-ui.js`, `auth.js`, `chatbot.js`)을 로드하며, `script.js`는 로드하지 않습니다.
`script.js`는 삭제해도 무방하나, 분할 전 원본 백업으로 보관 중인 것으로 보입니다.

### 21.3 관리자 자동 로그인 평문 비밀번호
`js/manager.js` 24행에서 자동 로그인 시 관리자 비밀번호가 평문으로 하드코딩되어 있습니다:
```javascript
body: JSON.stringify({ id: 'AD', pw: 'roqkfwk00' })
```
- **영향**: 브라우저 소스 코드에서 관리자 비밀번호 노출
- **수정 필요**: 자동 로그인 제거 또는 토큰 갱신 방식으로 변경

### 21.4 Mock 데이터 한계
| 항목 | 현재 | 필요 |
|------|------|------|
| 수목원 잔여현황 | 5분마다 랜덤 생성 | 실제 예약 DB 연동 |
| 33개 주차장 점유 | 정적 하드코딩 | 실시간 IoT/센서 데이터 |
| 미납요금 조회 | "없습니다" 고정 응답 | 결제 시스템 연동 |
| 견인차량 조회 | "없습니다" 고정 응답 | 견인 DB 연동 |
| SMS 발송 | 미구현 (안내 문구만 표시) | SMS API 연동 |
| 결제 | 미구현 (금액 표시만) | PG사 연동 |

### 21.5 관리자 문서 페이지 데이터 불일치
`js/manager.js`의 DOCS 배열에 기재된 파일 구조와 데이터 저장 정보가 로그 시스템 전환 이후 업데이트되지 않았습니다:
- 문서에는 `data/conversations.json`, `data/counselor_requests.json`으로 기재
- 실제로는 `data/logs/chat_YYYY-MM-DD.log` 등으로 변경됨

### 21.6 Nominatim 좌표 정확도
Nominatim(OpenStreetMap) 지오코딩의 한국 주소 정확도가 낮아, 일부 주차장이 동일한 좌표로 겹치거나 잘못된 위치에 표시될 수 있습니다.
- 카카오/네이버 지도 API 또는 공공데이터 좌표로 대체 필요

### 21.7 월 1회 예약 제한 범위
월 1회 예약 제한이 세션(`sessionId`) 기준으로 작동합니다. 브라우저를 닫고 새로 열면 새 세션이 생성되어 제한을 우회할 수 있습니다.
- 회원 로그인 시 `userId` 기준으로 변경 필요
- 비회원도 차량번호 기준 중복 검사 추가 필요

---

## 22. 레거시 파일 관계 및 코드 분할 이력

### 22.1 분할 전 구조
```
parking-portal/
├── index.html          ← <script src="script.js">
├── script.js           ← 모든 기능 통합 (1,159줄)
└── parking-data.js
```

### 22.2 분할 후 구조
```
parking-portal/
├── index.html          ← <script src="js/portal-ui.js">
│                          <script src="js/auth.js">
│                          <script src="js/chatbot.js">
├── script.js           ← 레거시 (미사용, 삭제 가능)
├── parking-data.js
└── js/
    ├── portal-ui.js    ← 슬라이더, 탭, 조회, 주차현황, 지도 (333줄)
    ├── auth.js         ← 로그인/회원가입 (199줄)
    └── chatbot.js      ← 챗봇 전체 (359줄)
```

### 22.3 분할 원칙
| 원칙 | 적용 |
|------|------|
| IIFE 스코프 격리 | 각 모듈이 `(function() { 'use strict'; ... })();`으로 감싸짐 |
| 전역 변수 제거 | `window.currentUser`, `window.authToken`만 예외 (모듈 간 공유) |
| 이벤트 위임 | inline `onclick` → `data-action` + `addEventListener` |
| 공유 함수 | `window.getStatus()`, `window.STATUS_LABELS` (portal-ui에서 정의, chatbot에서 사용) |

### 22.4 user.js의 위치
`js/user.js`는 `parking-portal/js/chatbot.js`와 유사한 독립 챗봇 스크립트입니다.
- `css/user.css`와 쌍으로 사용되며, 별도의 독립 챗봇 페이지용
- 포털 통합 이전의 초기 버전으로 추정
- 현재 어느 HTML에서도 로드하지 않음 (사실상 미사용)

---

## 23. 데이터 흐름도

### 23.1 AI 채팅 전체 시퀀스
```
[클라이언트]                    [Express 서버]                [Ollama 서버]
    │                               │                            │
    │  POST /api/chat               │                            │
    │  { message, sessionId }       │                            │
    │──────────────────────────────▶│                            │
    │                               │                            │
    │                               │ 1. addMessage(user)        │
    │                               │ 2. appendLog('chat')       │
    │                               │                            │
    │                               │ 3. RAG search(message)     │
    │                               │    ┌──────────────────────▶│
    │                               │    │ POST /api/embeddings  │
    │                               │    │ { model, prompt }     │
    │                               │    │◀──────────────────────┤
    │                               │    │ { embedding: [...] }  │
    │                               │                            │
    │                               │ 4. 코사인 유사도 계산       │
    │                               │    → Top-3 문서 추출       │
    │                               │                            │
    │                               │ 5. 컨텍스트 조합           │
    │                               │    시스템프롬프트           │
    │                               │    + [참고 문서]            │
    │                               │    + [잔여 현황]            │
    │                               │    + 대화 히스토리(최대 10턴)│
    │                               │                            │
    │                               │ 6. POST /api/chat          │
    │                               │    { model, messages,      │
    │                               │      stream: true }        │
    │                               │───────────────────────────▶│
    │                               │                            │
    │  SSE: data: {"token":"안"}    │◀──────── chunk ────────────│
    │◀──────────────────────────────│                            │
    │  SSE: data: {"token":"녕"}    │◀──────── chunk ────────────│
    │◀──────────────────────────────│                            │
    │  ...                          │  ...                       │
    │  SSE: data: [DONE]            │                            │
    │◀──────────────────────────────│                            │
    │                               │ 7. addMessage(assistant)   │
    │                               │ 8. appendLog('chat')       │
    │                               │                            │
```

### 23.2 예약 시퀀스
```
[클라이언트]                    [Express 서버]
    │                               │
    │  GET /api/availability        │
    │──────────────────────────────▶│
    │◀──────────────────────────────│  (D+1~D+7 잔여현황)
    │                               │
    │  [사용자: 날짜 선택]           │
    │                               │
    │  GET /api/availability/:date  │
    │──────────────────────────────▶│
    │◀──────────────────────────────│  (특정 날짜 잔여)
    │                               │
    │  [사용자: 차량번호 입력]       │
    │  [사용자: 예약 확정 클릭]      │
    │                               │
    │  POST /api/reserve            │
    │  { sessionId, date,           │
    │    carNumber, discountId,     │
    │    userName, userId }         │
    │──────────────────────────────▶│
    │                               │  1. 차량번호 정규식 검증
    │                               │  2. 날짜 유효성 (D+1~D+7)
    │                               │  3. 만차/휴원 확인
    │                               │  4. 월 1회 제한 확인
    │                               │  5. 할인 금액 서버 계산
    │                               │  6. parkingData 갱신
    │                               │  7. 확인번호 생성 (AY + timestamp)
    │                               │  8. appendLog('reserve')
    │◀──────────────────────────────│
    │  { success, reservation }     │
    │                               │
```

### 23.3 인증 시퀀스
```
[클라이언트]                    [Express 서버]
    │                               │
    │  POST /api/auth/login         │
    │  { id, pw }                   │
    │──────────────────────────────▶│
    │                               │  1. users.json에서 유저 조회
    │                               │  2. bcrypt.compareSync(pw, hash)
    │                               │  3. jwt.sign({ id, name, role }, SECRET, 8h)
    │◀──────────────────────────────│
    │  { success, token, user }     │
    │                               │
    │  [이후 관리자 API 호출 시]     │
    │  Authorization: Bearer <token>│
    │──────────────────────────────▶│
    │                               │  authMiddleware → jwt.verify
    │                               │  adminOnly → role === 'admin'
    │                               │
```

### 23.4 TTS 시퀀스
```
[클라이언트]                    [Express 서버]              [Edge TTS]
    │                               │                         │
    │  POST /api/tts                │                         │
    │  { text }                     │                         │
    │──────────────────────────────▶│                         │
    │                               │  1. ttsClean(text)      │
    │                               │  2. setMetadata(voice)  │
    │                               │  3. toStream(clean)     │
    │                               │────────────────────────▶│
    │  Content-Type: audio/mpeg     │                         │
    │◀───── audioStream chunk ──────│◀────── audio data ──────│
    │◀───── audioStream chunk ──────│◀────── audio data ──────│
    │  ...                          │  ...                    │
    │◀───── end                     │                         │
    │                               │                         │
```

### 23.5 지도 좌표 로딩 시퀀스
```
[서버 시작 시]
    │
    ├─ parking-data.js에서 addr 필드 추출 (33개)
    ├─ 각 주소에 "안양시 " 접두사 추가
    ├─ geocode_cache.json에서 캐시 확인
    │   ├─ 캐시 있음 → 건너뜀
    │   └─ 캐시 없음 → Nominatim API 호출 (1.1초 간격)
    └─ 결과를 geocode_cache.json에 저장

[클라이언트 로드 시]
    │
    ├─ GET /api/geocode → 전체 캐시 JSON 반환
    ├─ PARKING_DATA 각 항목에 lat/lng 주입
    └─ Leaflet 마커 생성 + 사이드바 목록 렌더링
```

---

## 24. 서버 초기화 순서

서버 시작(`node js/server.js`) 시 다음 순서로 초기화됩니다:

```
1. dotenv 로드 → 환경변수 설정
2. Express 앱 생성
3. 미들웨어 등록 (Helmet, CORS, JSON, Static, Rate Limit)
4. 데이터 디렉토리 보장 (data/, data/logs/)
5. users.json 로드 → 없으면 초기 관리자 계정 생성
6. restoreFromLogs() → 어제+오늘 로그에서 대화/상담 메모리 복원
7. generateAvailability() → 초기 주차 잔여현황 생성
8. setInterval(5분) → 잔여현황 주기적 갱신
9. geocode_cache.json 로드
10. app.listen(PORT) → 서버 시작
    ├─ buildVectors() → knowledge/*.md 임베딩 (비동기)
    └─ preloadGeocode() → 주소 지오코딩 사전 로딩 (비동기)
```

---

## 25. 에러 처리 패턴

### 25.1 서버 에러 처리
| 위치 | 에러 유형 | 처리 방식 |
|------|-----------|-----------|
| AI 채팅 | Ollama 연결 실패 | SSE로 에러 메시지 전송 + `[DONE]` |
| AI 채팅 | RAG 검색 실패 | `console.error` + RAG 결과 없이 진행 |
| 예약 | 검증 실패 | HTTP 400 + JSON 에러 메시지 |
| 예약 | 만차/기간 초과 | HTTP 400 + 구체적 사유 |
| 인증 | 토큰 무효 | HTTP 401 + 에러 메시지 |
| 인증 | 권한 부족 | HTTP 403 + 에러 메시지 |
| TTS | 변환 실패 | HTTP 500 (빈 응답) |
| 지오코딩 | Nominatim 실패 | `console.error` + null 반환 (마커 미표시) |
| Overpass | API 실패 | HTTP 500 + 에러 메시지 |
| JSON 파일 | 파싱 실패 | 빈 객체 `{}` 반환 |
| 벡터 빌드 | 실패 | `console.error` + 빈 벡터스토어 (검색 결과 없음) |

### 25.2 클라이언트 에러 처리
| 위치 | 에러 유형 | 처리 방식 |
|------|-----------|-----------|
| AI 채팅 | fetch 실패 | "서버에 연결할 수 없습니다." 봇 메시지 |
| 예약 | API 실패 | "예약 처리 중 오류가 발생했습니다." |
| 혼잡 현황 | API 실패 | "현황을 불러올 수 없습니다." |
| 취소 | API 실패 | "취소 처리 중 오류가 발생했습니다." |
| 상담원 연결 | API 실패 | 관리사무소 전화번호 안내 |
| 로그인/회원가입 | API 실패 | `alert('서버에 연결할 수 없습니다.')` |
| 관리자 데이터 | API 실패 | "불러오기 실패" 빈 상태 |
| 지도 좌표 | API 실패 | 좌표 없는 주차장은 마커 미표시 (목록은 표시) |

---

## 26. 대화 히스토리 관리

### 26.1 메모리 구조
```javascript
conversations = {
    "session_1712345678": {
        sessionId: "session_1712345678",
        createdAt: "2026-04-06T10:00:00.000Z",
        messages: [
            { role: "user", content: "주차 예약하고 싶어요", timestamp: "..." },
            { role: "assistant", content: "예약하실 날짜를...", timestamp: "..." },
            ...
        ],
        reservations: [
            { confirmNo: "AY12345678", date: "2026-04-08", carNumber: "12가3456",
              amount: 5000, discountId: "none", status: "confirmed", createdAt: "..." }
        ],
        counselorRequested: false
    }
}
```

### 26.2 히스토리 전달
- AI에 전달되는 대화 히스토리는 **최대 10턴 (20메시지)** (`maxTurns = 10`)
- `user`, `assistant` 역할만 포함 (system 제외)
- 오래된 메시지는 자동으로 잘려나감

### 26.3 데이터 영속성
| 데이터 | 메모리 | 파일 |
|--------|--------|------|
| 대화 내역 | `conversations` 객체 | `data/logs/chat_YYYY-MM-DD.log` |
| 예약 내역 | `conversations[].reservations` | `data/logs/reserve_YYYY-MM-DD.log` |
| 상담 요청 | `counselorRequests` 객체 | `data/logs/counselor_YYYY-MM-DD.log` |
| 유저 정보 | `users` 배열 | `data/users.json` |
| 주차 현황 | `parkingData` 객체 | 메모리만 (5분 갱신) |
| 벡터 캐시 | `vectorStore` 배열 | `data/vectors.json` |
| 좌표 캐시 | `geocodeCache` 객체 | `data/geocode_cache.json` |

### 26.4 서버 재시작 시 복원
- 오늘 + 어제 로그 파일에서 대화/상담 데이터 복원
- 이틀 이전 데이터는 메모리에 로드되지 않음 (로그 파일 자체는 보관)
- 예약 데이터는 세션 기반이므로, 재시작 후 이전 세션의 예약 이력 접근 불가

---

## 27. 주차장 데이터 상세 (parking-data.js)

### 27.1 만안구 주차장 (14개소)
| 주차장명 | 유형 | 총면수 | 사용 | 잔여 | 점유율 |
|----------|------|--------|------|------|--------|
| 안양역 공영주차장 | 노외 | 300 | 105 | 195 | 35% |
| 안양6동2 노외주차장 | 노외 | 180 | 64 | 116 | 36% |
| 안양7동 노외주차장 | 노외 | 120 | 87 | 33 | 73% |
| 안양8동 노외주차장 | 노외 | 170 | 156 | 14 | 92% |
| 박달시장1 노외주차장 | 노외 | 100 | 35 | 65 | 35% |
| 박달시장2 노외주차장 | 노외 | 90 | 68 | 22 | 76% |
| 공업부지 노외주차장 | 노외 | 150 | 72 | 78 | 48% |
| 비호교1 노외주차장 | 노외 | 80 | 42 | 38 | 53% |
| 비호교2 노외주차장 | 노외 | 70 | 55 | 15 | 79% |
| 관악역1 환승주차장 | 노외 | 200 | 28 | 172 | 14% |
| 관악역2 환승주차장 | 노외 | 180 | 134 | 46 | 74% |
| 관악역3 환승주차장 | 노외 | 120 | 45 | 75 | 38% |
| 관악역4 환승주차장 | 노외 | 100 | 95 | 5 | 95% |
| 삼모루 노상주차장 | 노상 | 60 | 22 | 38 | 37% |

### 27.2 동안구 주차장 (19개소)
| 주차장명 | 유형 | 총면수 | 사용 | 잔여 | 점유율 |
|----------|------|--------|------|------|--------|
| 범계역 공영주차장 | 노외 | 300 | 216 | 84 | 72% |
| 평촌지하 주차장 | 지하 | 450 | 320 | 130 | 71% |
| 관양동 노외주차장 | 노외 | 200 | 182 | 18 | 91% |
| 충훈지하 주차장 | 지하 | 380 | 210 | 170 | 55% |
| 인덕원동 노외주차장 | 노외 | 150 | 58 | 92 | 39% |
| 동편마을지하 주차장 | 지하 | 350 | 270 | 80 | 77% |
| 스마트스퀘어지하 주차장 | 지하 | 400 | 180 | 220 | 45% |
| 4동 노외주차장 | 노외 | 100 | 88 | 12 | 88% |
| 호계3동 노외주차장 | 노외 | 130 | 52 | 78 | 40% |
| 일번가 노외주차장 | 노외 | 110 | 77 | 33 | 70% |
| 삼덕공원지하 주차장 | 지하 | 300 | 195 | 105 | 65% |
| 삼덕 노외주차장 | 노외 | 80 | 32 | 48 | 40% |
| 호현마을1 노외주차장 | 노외 | 90 | 44 | 46 | 49% |
| 호현마을2 노외주차장 | 노외 | 90 | 78 | 12 | 87% |
| 샘모루초교지하 주차장 | 지하 | 250 | 110 | 140 | 44% |
| 개나리놀이터지하 주차장 | 지하 | 200 | 150 | 50 | 75% |
| 덕현공원지하 주차장 | 지하 | 220 | 175 | 45 | 80% |
| 해동놀이터지하 주차장 | 지하 | 160 | 60 | 100 | 38% |
| 화창초교지하 주차장 | 지하 | 180 | 130 | 50 | 72% |

### 27.3 유형별 분포
| 유형 | 개수 | 총 면수 |
|------|------|---------|
| 노외 (outdoor) | 22개소 | 2,990면 |
| 지하 (underground) | 10개소 | 3,090면 |
| 노상 (street) | 1개소 | 60면 |
| **합계** | **33개소** | **6,140면** |

---

## 28. z-index 계층 구조

| z-index | 요소 | 위치 |
|---------|------|------|
| 9999 | 모달 오버레이 (유저관리, 로그인, 회원가입) | manager.css, style.css |
| 9100 | 챗봇 창 | style.css |
| 9000 | 챗봇 플로팅 버튼 | style.css |
| 1100 | GNB 드롭다운 서브메뉴 | style.css |
| 1000 | 헤더 (sticky) | style.css |
| 10 | 슬라이드 컨트롤 | style.css |
| 2 | 슬라이드 콘텐츠 | style.css |
| 1 | 활성 슬라이드 | style.css |

---

## 29. 이벤트 핸들링 구조

### 29.1 포털 이벤트 (portal-ui.js)
| 이벤트 | 대상 | 동작 |
|--------|------|------|
| click | `.slide-arrow.prev/next` | 슬라이더 이전/다음 |
| click | `#slidePauseBtn` | 슬라이더 일시정지/재생 |
| click | `.search-tabs .tab` | 조회 탭 전환 |
| click | `#mobileMenuBtn` | 모바일 메뉴 토글 |
| click | `#unpaidBtn`, `#towBtn`, `#parkingSearchBtn` | 조회 실행 |
| click | `.area-tab` | 주차현황 지역 필터 |
| click | `.parking-prev/next` | 주차현황 슬라이더 |
| click | `.filter-chip` | 지도 유형 필터 |
| click | `#mapLocateBtn` | GPS 내 위치 |
| input | `#mapSearchInput` | 지도 주차장 검색 |
| resize | window | 슬라이더 레이아웃 재계산 |

### 29.2 인증 이벤트 (auth.js)
| 이벤트 | 대상 | 동작 |
|--------|------|------|
| click | `#loginBtn`, `#signupBtn` | 모달 열기 |
| click | `#loginClose`, `#signupClose` | 모달 닫기 |
| click | 오버레이 배경 | 모달 닫기 |
| click | `#loginSubmit` | 서버 로그인 |
| click | `#testLoginBtn` | 테스트 계정 로그인 |
| click | `#idCheckBtn` | 아이디 중복확인 |
| click | `#signupSubmit` | 회원가입 |
| click | `#logoutBtn` | 로그아웃 |
| click | `#goLoginBtn` | 회원가입 → 로그인 전환 |
| keydown (Enter) | `#loginPw` | 로그인 실행 |
| input | `#signupId` | 중복확인 초기화 |
| input | `#signupPw` | 비밀번호 검증 |
| input | `#signupPwConfirm` | 비밀번호 확인 |
| change | `#agreeAll` | 전체 동의 체크 |
| change | `.agree-item` | 개별 동의 → 전체 동의 상태 갱신 |

### 29.3 챗봇 이벤트 (chatbot.js)
| 이벤트 | 대상 | 동작 |
|--------|------|------|
| click | `#chatbotBtn` | 챗봇 창 열기 + 플로팅 버튼 숨김 |
| click | `#chatbotClose` | 챗봇 창 닫기 + 플로팅 버튼 복원 + TTS OFF |
| click | `#ttsToggle` | TTS 켜기/끄기 |
| click | `#chatbotSend` | 메시지 전송 |
| click | `#counselorBtn` | `confirm()` 확인 후 상담원 연결 |
| keydown (Enter) | `#chatbotInput` | 메시지 전송 |
| click (위임) | `.chat-menu-btn` | 메뉴 액션 분기 (congestion/reserve/cancel/faq) |
| click (위임) | `[data-action]` | 위젯 버튼 (startReserve/confirmReserve/resetReserve) |
| wheel | `#chatbotBody` | 스크롤 전파 차단 (passive: false) |

---

## 30. 확인번호 체계

### 30.1 형식
```
AY + timestamp 끝 8자리
예: AY12345678
```

### 30.2 생성 로직
```javascript
const confirmNo = 'AY' + Date.now().toString().slice(-8);
```

### 30.3 특성
- **접두사**: `AY` (Anyang)
- **숫자 부분**: `Date.now()` 밀리초 끝 8자리
- **유일성**: 같은 밀리초에 2건 예약 시 중복 가능 (충돌 확률 극히 낮음)
- **용도**: 예약 확인, 취소 시 식별자

---

## 31. TODO / 미완료 항목

### 31.1 긴급 (보안/버그)
- [ ] `rag.js` Ollama URL 환경변수로 변경 (하드코딩 제거)
- [ ] `manager.js` 관리자 비밀번호 평문 하드코딩 제거
- [ ] 관리자 문서 페이지 데이터 저장 정보 업데이트 (로그 전환 반영)
- [ ] 월 1회 예약 제한을 userId/carNumber 기준으로 변경

### 31.2 기능 개선
- [ ] 공공데이터 API 키 활성화 확인 → 주차장 좌표 정확도 향상
- [ ] 카카오/네이버 REST API로 주소→좌표 변환 대체
- [ ] Nominatim 중복 좌표 문제 해결
- [ ] 실제 주차장 실시간 데이터 연동 (현재 Mock 데이터)
- [ ] 결제 시스템 (PG사) 연동
- [ ] SMS 발송 연동
- [ ] DB 마이그레이션 (파일 기반 → MySQL/MariaDB)
- [ ] 벡터 DB 도입 검토 (문서 50개 초과 시)
- [ ] 레거시 `parking-portal/script.js` 삭제
- [ ] 미사용 `js/user.js` 정리 또는 독립 챗봇 페이지 구성
- [ ] 확인번호 UUID 기반으로 변경 (중복 방지)
- [ ] 비회원 예약 시 차량번호 기준 월 제한 검사
- [ ] 미납요금/견인차량 실제 데이터 연동
- [ ] 마이페이지 구현 (예약 내역 조회, 감면 증빙 업로드)
- [ ] 날짜별 로그 자동 정리 (보관 기간 설정)

---

## 32. API 요청/응답 형식 상세

### 32.1 POST /api/auth/login
**Request:**
```json
{
    "id": "string (필수)",
    "pw": "string (필수)"
}
```
**Response (성공):**
```json
{
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIs... (JWT, 8시간 유효)",
    "user": {
        "id": "AD",
        "name": "관리자",
        "role": "admin",
        "phone": "010-0000-0000",
        "car": ""
    }
}
```
**Response (실패):**
```json
{ "error": "아이디 또는 비밀번호가 올바르지 않습니다." }  // 401
{ "error": "비활성 계정입니다." }                         // 403
{ "error": "아이디와 비밀번호를 입력해주세요." }            // 400
```

### 32.2 POST /api/auth/signup
**Request:**
```json
{
    "id": "string (필수, 영문숫자 4~20자)",
    "pw": "string (필수, 8자 이상)",
    "name": "string (필수)",
    "phone": "string (필수)",
    "car": "string (선택)"
}
```
**Response:** `{ "success": true }` 또는 `{ "error": "..." }`

### 32.3 GET /api/auth/check-id/:id
**Response:**
```json
{ "available": true }   // 사용 가능
{ "available": false }  // 이미 존재
```

### 32.4 GET /api/availability
**Response:**
```json
{
    "2026-04-08": { "total": 50, "reserved": 38, "available": 12, "closed": false },
    "2026-04-09": { "total": 50, "reserved": 50, "available": 0, "closed": true, "closedReason": "휴원일 (매주 월요일)" },
    "2026-04-10": { "total": 50, "reserved": 22, "available": 28, "closed": false },
    ...
}
```

### 32.5 POST /api/reserve
**Request:**
```json
{
    "sessionId": "string",
    "date": "YYYY-MM-DD (필수)",
    "carNumber": "string (필수, 정규식: /^\\d{2,3}[가-힣]\\d{4}$/)",
    "discountId": "none|eco|multi|compact|disable|veteran",
    "userName": "string (선택)",
    "userId": "string (선택, 회원일 경우)"
}
```
**Response (성공):**
```json
{
    "success": true,
    "reservation": {
        "confirmNo": "AY12345678",
        "date": "2026-04-08",
        "carNumber": "12가3456",
        "amount": 5000,
        "discountId": "none",
        "status": "confirmed",
        "createdAt": "2026-04-07T10:00:00.000Z"
    }
}
```
**Response (실패):**
```json
{ "error": "날짜와 차량번호를 입력해주세요." }        // 400
{ "error": "차량번호 형식이 올바르지 않습니다." }     // 400
{ "error": "예약 가능 기간이 아닙니다." }             // 400
{ "error": "해당 날짜는 만차입니다." }                // 400
{ "error": "당일 예약은 불가합니다." }                // 400
{ "error": "월 1회 예약 제한을 초과했습니다." }       // 400
{ "error": "휴원일 (매주 월요일)으로 예약할 수 없습니다." } // 400
```

### 32.6 POST /api/cancel
**Request:**
```json
{
    "sessionId": "string",
    "confirmNo": "string (필수, 예: AY12345678)"
}
```
**Response (성공):**
```json
{
    "success": true,
    "message": "예약(AY12345678)이 취소되었습니다. 환불은 3~5 영업일 내 처리됩니다."
}
```
**Response (실패):**
```json
{ "error": "해당 확인번호의 예약을 찾을 수 없습니다." }  // 404
{ "error": "취소 기한(방문 전날 18:00)이 지났습니다." }   // 400
```

### 32.7 POST /api/chat (SSE 스트리밍)
**Request:**
```json
{
    "message": "string (필수)",
    "sessionId": "string (선택, 없으면 자동 생성)"
}
```
**Response (SSE):**
```
Content-Type: text/event-stream

data: {"token":"안"}
data: {"token":"녕"}
data: {"token":"하"}
data: {"token":"세요"}
...
data: [DONE]
```
**Response (에러):**
```
data: {"error":"AI 서버 연결에 실패했습니다."}
data: [DONE]
```

### 32.8 POST /api/tts
**Request:**
```json
{ "text": "string (필수)" }
```
**Response:** `Content-Type: audio/mpeg` (MP3 바이너리 스트림)

### 32.9 POST /api/counselor
**Request:**
```json
{ "sessionId": "string" }
```
**Response:**
```json
{
    "success": true,
    "message": "상담원 연결이 요청되었습니다. 관리사무소에서 곧 연락드리겠습니다."
}
```

### 32.10 GET /api/geocode
**Response:**
```json
{
    "안양시 만안구 안양로 112": { "lat": 37.4012, "lng": 126.9231 },
    "안양시 동안구 시민대로 180": { "lat": 37.3901, "lng": 126.9512 },
    ...
}
```

### 32.11 GET /api/nearby-parking?radius=5000
**Response:**
```json
[
    {
        "id": 123456789,
        "name": "주차장",
        "lat": 37.418,
        "lng": 126.943,
        "type": "surface",
        "fee": "unknown",
        "capacity": null,
        "access": "yes",
        "operator": "",
        "surface": "",
        "addr": ""
    },
    ...
]
```

### 32.12 GET /api/admin/conversations (JWT 필수)
**Response:**
```json
[
    {
        "sessionId": "session_1712345678",
        "createdAt": "2026-04-06T10:00:00.000Z",
        "messageCount": 12,
        "lastMessage": {
            "role": "assistant",
            "content": "예약이 완료되었습니다!",
            "timestamp": "2026-04-06T10:05:00.000Z"
        },
        "counselorRequested": false
    },
    ...
]
```

---

## 33. 입력 검증 규칙 모음

### 33.1 서버 검증
| 대상 | 규칙 | 정규식/조건 |
|------|------|-------------|
| 아이디 | 영문, 숫자 4~20자 | `/^[a-zA-Z0-9]{4,20}$/` |
| 비밀번호 | 8자 이상 | `pw.length < 8` |
| 차량번호 | 2~3자리 숫자 + 한글 1자 + 숫자 4자리 | `/^\d{2,3}[가-힣]\d{4}$/` |
| 아이디 중복 | 대소문자 무시 비교 | `u.id.toLowerCase() === id.toLowerCase()` |
| 예약 날짜 | 미래 날짜만 (당일 불가) | `date <= today` → 거부 |
| 예약 날짜 | D+1~D+7 범위 | `parkingData[date]` 존재 여부 |
| 월 1회 제한 | 같은 월 confirmed 예약 존재 | `date.startsWith(month) && status === 'confirmed'` |
| 취소 기한 | 방문 전날 18:00 | `now > deadline` → 거부 |
| Overpass 반경 | 최대 30,000m | `Math.min(radius, 30000)` |

### 33.2 클라이언트 검증 (auth.js)
| 대상 | 규칙 | 피드백 |
|------|------|--------|
| 아이디 | 영문숫자 4~20자 | 실시간 field-msg 표시 |
| 비밀번호 | 영문+숫자 포함 8자 이상 | `pwMsg` 텍스트 |
| 비밀번호 확인 | pw === pwConfirm | "일치" / "불일치" |
| 아이디 중복 | 서버 API 호출 | "사용 가능" / "이미 사용 중" |
| 필수 약관 | [필수] 2개 체크 | alert |
| 아이디 변경 시 | idChecked = false 초기화 | 재확인 필요 |

### 33.3 차량번호 검증 예시
| 입력 | 결과 |
|------|------|
| `12가3456` | 통과 |
| `123나4567` | 통과 |
| `1가2345` | 거부 (앞자리 1자리) |
| `12A3456` | 거부 (영문) |
| `12가345` | 거부 (뒷자리 3자리) |

---

## 34. 캐시 전략 총정리

| 캐시 대상 | 저장 위치 | TTL/갱신 | 키 | 설명 |
|-----------|-----------|----------|-----|------|
| 대화 내역 | 메모리 + .log 파일 | 영구 (메모리는 2일) | sessionId | 서버 재시작 시 2일치 복원 |
| 상담 요청 | 메모리 + .log 파일 | 영구 (메모리는 2일) | sessionId | 서버 재시작 시 2일치 복원 |
| 유저 정보 | 메모리 + users.json | 변경 시 즉시 저장 | id | 원자적 파일 쓰기 |
| 주차 잔여현황 | 메모리만 | 5분마다 재생성 | date | 파일 미저장 (Mock) |
| RAG 벡터 | 메모리 + vectors.json | 서버 시작 시 빌드 | `파일명::섹션제목` | 텍스트 동일 시 재사용 |
| 지오코드 좌표 | 메모리 + geocode_cache.json | 영구 캐시 | `안양시 + 주소` | Nominatim 결과 저장 |
| Overpass 주차장 | 메모리 | 30분 TTL | (단일 캐시) | 전체 결과 캐시 |
| 관리자 토큰 | localStorage | JWT 8시간 | `admin_token` | 브라우저 저장 |
| 읽음 상태 | localStorage | 영구 | `admin_read_msgs` | 세션ID별 읽음 플래그 |
| 로그인 상태 | window 전역변수 | 페이지 수명 | - | currentUser, authToken |

---

## 35. window 전역 변수 및 함수 목록

### 35.1 portal-ui.js에서 정의
| 이름 | 타입 | 용도 |
|------|------|------|
| `window.getStatus(used, total)` | function | 점유율로 상태 계산 (available/normal/crowded) |
| `window.STATUS_LABELS` | object | `{ available: '여유', normal: '보통', crowded: '혼잡' }` |

### 35.2 auth.js에서 정의
| 이름 | 타입 | 용도 |
|------|------|------|
| `window.currentUser` | object/null | 로그인된 유저 정보 `{ id, name, role, phone, car }` |
| `window.authToken` | string/null | JWT 토큰 문자열 |

### 35.3 manager.js에서 정의
| 이름 | 타입 | 용도 |
|------|------|------|
| `window.loadConversations` | function | 대화 내역 로드 (HTML onclick에서 호출) |
| `window.loadCounselorRequests` | function | 상담 요청 로드 (HTML onclick에서 호출) |

### 35.4 chatbot.js에서 사용하는 전역 (DOM ID 기반)
- `chatbotBtn`, `chatbotWindow`, `chatbotClose` — 챗봇 창 열기/닫기 (portal-ui.js에서 관리하지 않음, chatbot.js에서 직접 처리)
- `startReserve()`, `confirmReserve()`, `resetReserve()`, `requestCounselor()`, `sendToAI()` — HTML 내 inline onclick에서 호출

---

## 36. GNB (Global Navigation Bar) 메뉴 구조

### 36.1 PC 메뉴 (hover 드롭다운)
```
주차장 찾기
주차요금 정산
  ├── 주차요금 사전결제
  └── 미납요금 조회/납부
파킹패스
월정기주차
감면 등록
견인차량 검색
정보마당
  ├── 공지사항
  ├── 주차요금 안내
  ├── 감면대상 안내
  └── 자주 묻는 질문
```

### 36.2 모바일 메뉴 (768px 이하)
- 햄버거 버튼 (`fa-bars` / `fa-times` 토글)
- 세로 아코디언 형태
- 서브메뉴: 연회색 배경(`#f8f9fc`)으로 구분

### 36.3 GNB 인터랙션
- 호버 시 텍스트 파랑(`#0055a5`) + 하단 3px 파랑 언더라인 (`scaleX` 애니메이션)
- 서브메뉴: 상단 3px 파랑 보더, `box-shadow` 드롭

---

## 37. 메인 비주얼 슬라이더 상세

### 37.1 슬라이드 콘텐츠 (3장)
| 번호 | 서브타이틀 | 메인 카피 | 설명 | 배경 색상 |
|------|-----------|-----------|------|-----------|
| 1 | 안양시 통합주차포털 | 스마트한 주차생활, 통합주차포털에서 시작하세요 | 실시간 주차현황 조회부터 요금 납부까지 한 곳에서 | 파랑 `#0055a5`→`#003b73` |
| 2 | 파킹패스 서비스 | 출차 시 멈추지 않고 자동결제! 파킹패스 | 차량번호와 카드를 등록하면 자동으로 요금이 결제됩니다 | 초록 `#1a7a3a`→`#0d5c26` |
| 3 | 주차요금 사전결제 | 출차 전 미리 결제하고 빠르게 출차하세요 | 웹, 모바일에서 간편하게 사전결제 가능 | 주황 `#c35400`→`#8a3a00` |

### 37.2 슬라이더 동작
- 자동 전환: 5초 간격 (`setInterval`)
- 전환 효과: `opacity 0.8s ease` (페이드)
- 좌/우 화살표: 수동 전환 + 타이머 리셋
- 일시정지 버튼: `fa-pause` ↔ `fa-play` 토글
- 인디케이터: `현재/3` 형태 (예: `1 / 3`)

---

## 38. 퀵메뉴 바로가기

| 순서 | 메뉴명 | 아이콘 | 그라데이션 색상 |
|------|--------|--------|----------------|
| 1 | 주차장 찾기 | `fa-search-location` | 파랑 `#0055a5`→`#003b73` |
| 2 | 사전결제 | `fa-credit-card` | 초록 `#1a7a3a`→`#0d5c26` |
| 3 | 미납요금 조회/납부 | `fa-file-invoice-dollar` | 주황 `#c35400`→`#8a3a00` |
| 4 | 파킹패스 | `fa-car-side` | 보라 `#6a1b9a`→`#4a148c` |
| 5 | 월정기주차 | `fa-calendar-check` | 청록 `#00838f`→`#006064` |
| 6 | 감면 등록 | `fa-user-check` | 핑크 `#ad1457`→`#880e4f` |
| 7 | 견인차량 검색 | `fa-truck-pickup` | 빨강 `#e53935`→`#b71c1c` |

- 호버 시: `translateY(-4px)` + 파랑 보더 + 그림자
- 반응형: 7열 → 4열(1024px) → 3열(768px) → 2열(480px)

---

## 39. 공지사항 하드코딩 데이터

| 날짜 | 제목 | 뱃지 |
|------|------|------|
| 2026.04.01 | 2026년 상반기 월정기주차 신규 접수 안내 | NEW |
| 2026.03.28 | 파킹패스 서비스 이용 안내 및 등록 방법 | - |
| 2026.03.25 | 안양역 공영주차장 야간 운영시간 변경 안내 | - |
| 2026.03.20 | 친환경차(전기·수소차) 주차요금 감면 확대 시행 | - |
| 2026.03.15 | 주차요금 사전결제 시스템 점검 안내 (4/5) | - |

---

## 40. 요금표 하드코딩 데이터

| 구분 | 기본요금 (15분) | 추가요금 (10분) | 1일 최대 |
|------|----------------|----------------|----------|
| 노외 | 무료 | 300원 | 10,000원 |
| 노상 | 무료 | 200원 | 8,000원 |
| 기계식 | 무료 | 250원 | 9,000원 |

- 최초 15분 무료, 이후 10분 단위 과금
- 이 데이터는 안양시 공영주차장 일반 요금이며, 수목원 예약 요금(5,000원/일)과는 별개

---

## 41. 서비스 배너 카드

| 순서 | 타이틀 | 설명 | 아이콘 | 배경색 |
|------|--------|------|--------|--------|
| 1 | 파킹패스 안내 | 차량번호 인식으로 자동결제! 출차 시 정차 없이 통과 | `fa-car-side` | 파랑 `#f0f5ff` |
| 2 | 사전결제 안내 | 출차 전 웹/모바일로 미리 결제, 빠른 출차 가능 | `fa-credit-card` | 초록 `#f0f8f0` |
| 3 | 감면대상 안내 | 장애인, 국가유공자, 친환경차 등 주차요금 감면 안내 | `fa-percent` | 주황 `#fff5ec` |

---

## 42. 유관기관 바로가기

| 기관명 | URL |
|--------|-----|
| 안양시청 | https://www.anyang.go.kr |
| 안양도시공사 | https://www.auc.or.kr |
| 경기도 교통정보센터 | https://gits.gg.go.kr |
| 국토교통부 | https://www.molit.go.kr |
| 한국교통안전공단 | https://www.kotsa.or.kr |

- `<select>` + GO 버튼으로 새 창 열기

---

## 43. 주차장 유형 분류 체계

### 43.1 유형 코드
| 코드 | 한글 | 뱃지 색상 | 설명 |
|------|------|-----------|------|
| `outdoor` | 노외 | 파랑 `#0055a5` | 건물 외부 노천 주차장 |
| `street` | 노상 | 초록 `#1a7a3a` | 도로변 주차구획 |
| `underground` | 지하 | 청록 `#00838f` | 건물/공원 지하 주차장 |
| `mechanical` | 기계식 | 보라 `#6a1b9a` | 기계식 타워형 (현재 데이터 없음) |

### 43.2 지도 필터 칩
| 칩 | data-type | 기본 상태 |
|----|-----------|-----------|
| 전체 | `all` | active |
| 노외 | `outdoor` | active |
| 노상 | `street` | active |
| 지하 | `underground` | active |

- "전체" 클릭: 모든 필터 켜기/끄기 토글
- 개별 클릭: 해당 유형만 토글
- 4개 모두 활성 시 "전체" 칩도 자동 활성

---

## 44. Overpass API 쿼리 상세

### 44.1 쿼리 구조
```
[out:json][timeout:15];
(
  node["amenity"="parking"](around:5000,37.4175,126.9430);
  way["amenity"="parking"](around:5000,37.4175,126.9430);
);
out center 300;
```

### 44.2 파라미터
| 항목 | 값 |
|------|-----|
| 중심 좌표 | 안양수목원 (37.4175, 126.9430) |
| 반경 | 기본 5,000m, 최대 30,000m |
| 태그 | `amenity=parking` |
| 대상 | `node` + `way` |
| 응답 제한 | 300건 |
| 타임아웃 | 15초 |

### 44.3 응답 매핑
| OSM 태그 | 매핑 필드 |
|----------|-----------|
| `tags.name` / `tags.name:ko` | name (없으면 "주차장") |
| `lat`, `lon` / `center.lat`, `center.lon` | lat, lng |
| `tags.parking` | type (기본 "surface") |
| `tags.fee` | fee (기본 "unknown") |
| `tags.capacity` | capacity (parseInt) |
| `tags.access` | access (기본 "yes") |
| `tags.operator` | operator |
| `tags.surface` | surface |
| `tags.addr:full` / `tags.addr:street` | addr |

### 44.4 캐시
- 메모리 캐시 TTL: 30분 (`PARKING_CACHE_TTL`)
- `Date.now() - parkingCacheTime < 30 * 60 * 1000` 이면 캐시 반환

---

## 45. SSE (Server-Sent Events) 프로토콜 상세

### 45.1 서버 → 클라이언트
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"token":"안"}

data: {"token":"녕"}

data: {"token":"하세요"}

data: [DONE]
```

### 45.2 Ollama → Express 서버 (내부)
```
HTTP/1.1 200 OK
Content-Type: application/x-ndjson

{"message":{"role":"assistant","content":"안"},"done":false}
{"message":{"role":"assistant","content":"녕"},"done":false}
{"message":{"role":"assistant","content":"하세요"},"done":true}
```

### 45.3 스트리밍 처리 흐름
```
Ollama NDJSON → reader.read() → 줄 분할 → JSON 파싱
    → chunk.message.content 추출
    → fullResponse에 누적
    → SSE 형식으로 변환 후 res.write()
    → 완료 시 fullResponse를 대화 내역에 저장
```

### 45.4 클라이언트 수신
```javascript
const reader = res.body.getReader();
while (true) {
    const { done, value } = await reader.read();
    // "data: " 접두사 제거 → JSON 파싱
    // p.token → botDiv.textContent에 누적
    // "[DONE]" → 종료
}
```

---

## 46. npm 의존성 상세

### 46.1 직접 의존성
| 패키지 | 설치 버전 | 용도 |
|--------|-----------|------|
| `express` | 4.22.1 | 웹 서버 프레임워크 |
| `cors` | 2.8.6 | Cross-Origin 요청 허용 |
| `helmet` | 8.1.0 | HTTP 보안 헤더 (X-Frame, CSP 등) |
| `express-rate-limit` | 8.3.2 | API 요청 횟수 제한 |
| `dotenv` | 17.4.1 | `.env` 파일 환경변수 로드 |
| `jsonwebtoken` | 9.0.3 | JWT 토큰 생성/검증 |
| `bcryptjs` | 3.0.3 | 비밀번호 해싱 (순수 JS, native 의존 없음) |
| `msedge-tts` | 2.0.4 | Microsoft Edge TTS 음성 합성 |

### 46.2 프로젝트 크기
| 항목 | 크기 |
|------|------|
| node_modules | 8.5MB |
| data 폴더 | 529KB (대부분 vectors.json) |
| 소스 코드 (node_modules 제외) | ~1MB |

---

## 47. 코드 통계

### 47.1 파일별 줄 수
| 파일 | 줄 수 | 역할 |
|------|-------|------|
| `parking-portal/style.css` | 2,545 | 사용자 포털 전체 스타일 |
| `parking-portal/script.js` | 1,159 | 레거시 통합 스크립트 (미사용) |
| `css/manager.css` | 805 | 관리자 페이지 스타일 |
| `js/server.js` | 636 | Express 서버 메인 |
| `parking-portal/index.html` | 587 | 사용자 포털 HTML |
| `parking-portal/js/chatbot.js` | 359 | 챗봇 기능 |
| `css/user.css` | 341 | 독립 챗봇 스타일 |
| `parking-portal/js/portal-ui.js` | 333 | 포털 UI |
| `js/manager.js` | 313 | 관리자 기능 |
| `js/user.js` | 305 | 독립 챗봇 (미사용) |
| `manager.html` | 206 | 관리자 HTML |
| `parking-portal/js/auth.js` | 199 | 인증 |
| `js/rag.js` | 144 | RAG 엔진 |
| `parking-portal/parking-data.js` | 37 | 주차장 데이터 |
| `system_prompt.txt` | 29 | AI 시스템 프롬프트 |
| **합계** | **7,998줄** | (chatbot.js 359줄 포함) |

### 47.2 언어별 분포
| 언어 | 줄 수 | 비율 |
|------|-------|------|
| CSS | 3,691 | 46.1% |
| JavaScript | 3,485 | 43.6% |
| HTML | 793 | 9.9% |
| Text | 29 | 0.4% |

### 47.3 모듈별 분포
| 모듈 | 줄 수 | 비율 |
|------|-------|------|
| 사용자 포털 (parking-portal/) | 5,220 | 65.3% |
| 서버 (js/) | 1,398 | 17.5% |
| 관리자 | 1,011 | 12.6% |
| 독립 챗봇 (레거시) | 646 | 8.1% |
| 기타 (prompt, data) | 66 | 0.8% |

---

## 48. 지도 Leaflet 커스터마이징

### 48.1 마커 스타일 (CSS)
| 요소 | 스타일 |
|------|--------|
| `.pm-marker` | 30px 원형, 2.5px 흰 테두리, 드롭 쉐도우 |
| 호버 | `transform: scale(1.3)`, z-index 올림 |
| 수목원 마커 | 38px 초록 원, 나무 아이콘, z-index 1000 |

### 48.2 팝업 스타일
```
┌─────────────────────────┐
│  [파랑 헤더]              │
│  주차장명                 │
│  주소                     │
├─────────────────────────┤
│  [게이지 바] ■■■■■□□ 72% │
│  주차 216/300면  여유 84면 │
└─────────────────────────┘
```
- 헤더: 파랑 그라데이션 `#0055a5`→`#003b73`
- 게이지: 상태별 그라데이션 (초록/주황/빨강)

### 48.3 툴팁
- 검정 반투명 배경(`rgba(0,0,0,.8)`)
- 흰색 텍스트, 12px, 600 weight
- `direction: 'top'`, `offset: [0, -12]`

### 48.4 혼잡 마커 펄스 애니메이션
```css
@keyframes pulse-ring {
    0% { transform: scale(1); opacity: .6; }
    100% { transform: scale(2.2); opacity: 0; }
}
```
- 빨간 반투명 원이 1.8초 간격으로 확대되며 사라짐
- 혼잡 주차장에만 적용

### 48.5 지도 타일 구성
| 레이어 | URL | 용도 |
|--------|-----|------|
| Esri World Imagery | `server.arcgisonline.com/...World_Imagery/...` | 위성 사진 기본 |
| CartoDB Light Labels | `basemaps.cartocdn.com/light_only_labels/...` | 도로/지명 라벨 오버레이 |

---

## 49. 로그 파일 형식 상세

### 49.1 chat 로그
```jsonl
{"sessionId":"session_1712345678","role":"user","content":"주차 예약하고 싶어요","_ts":"2026-04-06T10:00:00.000Z"}
{"sessionId":"session_1712345678","role":"assistant","content":"예약하실 날짜를 선택해 주세요.","_ts":"2026-04-06T10:00:02.500Z"}
```

### 49.2 reserve 로그
```jsonl
{"confirmNo":"AY12345678","action":"confirm","userType":"member","userId":"testuser","userName":"김테스트","date":"2026-04-08","carNumber":"12가3456","discountId":"none","amount":5000,"sessionId":"session_1712345678","_ts":"2026-04-06T10:01:00.000Z"}
{"confirmNo":"AY12345678","action":"cancel","date":"2026-04-08","carNumber":"12가3456","sessionId":"session_1712345678","_ts":"2026-04-06T11:00:00.000Z"}
```

### 49.3 counselor 로그
```jsonl
{"sessionId":"session_1712345678","requestedAt":"2026-04-06T10:05:00.000Z","status":"pending","lastMessage":"상담원 연결해주세요","_ts":"2026-04-06T10:05:00.000Z"}
{"sessionId":"session_1712345678","action":"resolve","resolvedAt":"2026-04-06T10:30:00.000Z","_ts":"2026-04-06T10:30:00.000Z"}
```

### 49.4 로그 파일 특성
- 형식: JSONL (JSON Lines, 한 줄에 하나의 JSON 객체)
- 인코딩: UTF-8
- 줄 바꿈: `\n`
- 타임스탬프: 모든 로그에 `_ts` (ISO 8601) 자동 추가
- 파일명 규칙: `{prefix}_{YYYY-MM-DD}.log`
- 쓰기 방식: `fs.appendFileSync` (추가 모드)

---

## 50. 테스트 계정 정보

### 50.1 관리자 계정 (초기 생성)
| 항목 | 값 |
|------|-----|
| ID | `AD` (환경변수 `ADMIN_ID`) |
| PW | 환경변수 `ADMIN_PW` |
| 이름 | 관리자 |
| 전화 | 010-0000-0000 |
| 역할 | admin |
| 가입일 | 2026-01-01 |
| 비밀번호 저장 | bcrypt 해시 (salt 10) |

### 50.2 관리자 계정 생성 조건
- `data/users.json` 파일이 없거나 `users` 배열이 비어있을 때만 생성
- 기존 유저가 있으면 초기 계정 미생성

### 50.3 로그인 모달 테스트 계정
`parking-portal/index.html`에 하드코딩된 테스트 드롭다운:
```
AD / roqkfwk00 (관리자)
```
- 주의: HTML에 비밀번호가 평문 노출됨

---

## 51. 푸터 정보

### 51.1 기관 정보
| 항목 | 값 |
|------|-----|
| 기관명 | 안양도시공사 |
| 주소 | (14066) 경기도 안양시 동안구 시민대로 235 (관양동) |
| 대표전화 | 031-8045-7000 |
| 주차관련 문의 | 031-8045-7114 |
| 팩스 | 031-8045-7099 |
| 저작권 | Copyright 2026 안양도시공사. All rights reserved. |

### 51.2 하단 링크
개인정보처리방침 (강조 표시) | 이용약관 | 이메일무단수집거부 | 저작권정책 | 접근성 정책

---

## 52. Helmet 보안 헤더 설정

```javascript
app.use(helmet({
    contentSecurityPolicy: false,         // CSP 비활성화 (CDN 리소스 허용)
    crossOriginEmbedderPolicy: false      // 외부 리소스 임베딩 허용
}));
```

### 52.1 Helmet이 설정하는 기본 헤더
| 헤더 | 효과 |
|------|------|
| `X-DNS-Prefetch-Control: off` | DNS 프리페치 비활성화 |
| `X-Frame-Options: SAMEORIGIN` | 클릭재킹 방지 |
| `Strict-Transport-Security` | HTTPS 강제 |
| `X-Download-Options: noopen` | IE 파일 다운로드 보안 |
| `X-Content-Type-Options: nosniff` | MIME 스니핑 방지 |
| `X-Permitted-Cross-Domain-Policies: none` | Flash/PDF 크로스도메인 방지 |
| `Referrer-Policy: no-referrer` | 리퍼러 정보 미전송 |
| `X-XSS-Protection: 0` | 브라우저 XSS 필터 (최신 브라우저용) |

### 52.2 CSP 비활성화 사유
- Leaflet CDN (`unpkg.com`)
- Font Awesome CDN (`cdnjs.cloudflare.com`)
- Esri/CartoDB 지도 타일 (외부 이미지)
- Nominatim/Overpass API (외부 fetch)

---

## 53. JWT 토큰 구조

### 53.1 페이로드
```json
{
    "id": "AD",
    "name": "관리자",
    "role": "admin",
    "iat": 1712345678,
    "exp": 1712374478
}
```

### 53.2 설정
| 항목 | 값 |
|------|-----|
| 알고리즘 | HS256 (기본값) |
| 시크릿 | `process.env.JWT_SECRET` |
| 만료 | 8시간 (`expiresIn: '8h'`) |
| 포함 정보 | id, name, role |

### 53.3 사용 흐름
```
로그인 → JWT 발급 → localStorage 저장 → 요청 시 Authorization 헤더
    → authMiddleware에서 jwt.verify → req.user 주입
    → adminOnly에서 role === 'admin' 확인
```

---

## 54. 수목원 핵심 정보 요약

### 54.1 기본 정보
| 항목 | 값 |
|------|-----|
| 정식 명칭 | 서울대 안양수목원 |
| 주소 | 경기도 안양시 만안구 수목원로 315 |
| 좌표 | 37.4175, 126.9430 |
| 관리사무소 | 031-470-0242 |
| 입장료 | 무료 |
| 주차 | 50면 전면 사전예약제, 현장주차 불가 |

### 54.2 운영시간
| 기간 | 시간 | 입장 마감 |
|------|------|-----------|
| 하절기 (4~10월) | 09:00~18:00 | 17:00 |
| 동절기 (11~3월) | 09:00~17:00 | 16:00 |

### 54.3 휴원일
- 매주 월요일
- 1월 1일 (신정)
- 설날 당일
- 추석 당일
- 기상 악화 시 임시 휴원 (홈페이지 공지)

### 54.4 교통
- 지하철: 1호선 관악역 2번 출구 → 마을버스 환승
- 버스: 안양수목원 정류장 하차
- 마을버스: 관악역 → 마을버스 2번 → 수목원 정류장 (약 15분)
- 시내버스: 안양역 → 9번 → 수목원 입구 (약 25분)

---

## 55. chatbot.js vs user.js 차이점 상세

`parking-portal/js/chatbot.js` (359줄, **현재 사용**)와 `js/user.js` (305줄, **레거시 미사용**)는 같은 역할이지만 구현이 상당히 다릅니다.

### 55.1 핵심 차이 비교표
| 항목 | `chatbot.js` (현재) | `user.js` (레거시) |
|------|---------------------|-------------------|
| 스코프 | IIFE `(function() { ... })()` | 전역 스코프 |
| sessionId | `crypto.randomUUID()` (안전) | `'session_' + Date.now()` (예측 가능) |
| TTS 엔진 | **서버 Edge TTS** (`/api/tts` → Audio 객체) | **브라우저 speechSynthesis** |
| 예약 단계 | 6단계 (날짜→이름→차량→할인→확인→완료) | 4단계 (날짜→차량→확인→완료) |
| 이름 입력 | 비회원: 이름 입력 / 회원: 자동 | 없음 |
| 할인 선택 | 6종 할인 버튼 UI | 없음 (일괄 5,000원) |
| 회원 연동 | `window.currentUser` 참조, 등록차량 명령 | 없음 |
| XSS 방어 | user→`textContent`, bot→`innerHTML` 구분 | bot 전부 `innerHTML` |
| 이벤트 | `data-action` 이벤트 위임 | inline `onclick` |
| 챗봇 창 토글 | 포함 (open/close/hidden) | 미포함 |
| 상담원 확인 | `confirm()` 대화상자 | 즉시 요청 |
| CSS 클래스 | `chat-msg`, `chat-widget`, `chat-calendar` | `msg`, `widget`, `calendar` |

### 55.2 chatbot.js 전용 — 회원 로그인 연동
```javascript
// 날짜 선택 후 분기
if (window.currentUser) {
    // 회원: 이름 자동 설정, 등록차량 안내
    reserveState = { step: 'carNumber', userName: cu.name };
} else {
    // 비회원: 이름 입력 단계 추가
    reserveState = { step: 'name' };
}
```

- 회원이면 이름 입력 건너뜀 → 차량번호 단계로 직행
- `"등록차량"` 입력 시 `window.currentUser.car` 자동 적용

### 55.3 chatbot.js 전용 — 할인 선택 UI
```javascript
const DISCOUNTS = [
    { id: 'none',    label: '해당 없음',           rate: 0,   amount: 5000 },
    { id: 'eco',     label: '저공해 차량 (50%)',    rate: 50,  amount: 2500 },
    { id: 'multi',   label: '다자녀 가구 (50%)',    rate: 50,  amount: 2500 },
    { id: 'compact', label: '경차 (50%)',           rate: 50,  amount: 2500 },
    { id: 'disable', label: '장애인 (100%)',        rate: 100, amount: 0    },
    { id: 'veteran', label: '국가유공자 (50%)',     rate: 50,  amount: 2500 },
];
```
- 차량번호 입력 후 할인 버튼 목록 표시
- 선택 시 확인 카드에 할인 적용 금액 표시

### 55.4 chatbot.js 전용 — 서버 TTS
```javascript
async function speak(text) {
    const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean })
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    ttsAudio = new Audio(url);
    ttsAudio.play();
    ttsAudio.onended = () => { URL.revokeObjectURL(url); ttsAudio = null; };
}
```
- user.js의 `speechSynthesis`와 달리, 서버에서 Edge TTS로 변환된 MP3를 `Audio` 객체로 재생
- 각 봇 메시지에 개별 스피커 버튼 (`addSpeakBtn`) 추가

### 55.5 chatbot.js 전용 — 챗봇 창 열기/닫기
```javascript
chatbotBtn.addEventListener('click', () => {
    chatbotWindow.classList.add('open');
    chatbotBtn.classList.add('hidden');     // 플로팅 버튼 숨김
    chatbotInput.focus();
});

chatbotClose.addEventListener('click', () => {
    chatbotWindow.classList.remove('open');
    chatbotBtn.classList.remove('hidden');   // 플로팅 버튼 복원
    stopSpeak();                             // TTS 중지
    ttsEnabled = false;                      // TTS 끔
});
```

---

## 56. 예약 플로우 상태머신 (chatbot.js 실제 버전, 수정)

기존 17장의 상태머신은 `js/user.js` 기준이었습니다. 실제 사용되는 `chatbot.js`의 정확한 플로우:

```
[일반 모드] reserveState = null
    │
    ├─ 메뉴 "주차 예약" 클릭 또는 "지금 예약하기" 버튼
    │
    ▼
[1단계: 날짜 선택] reserveState = { step: 'date' }
    │  GET /api/availability → 캘린더 위젯
    │  날짜 버튼 클릭 → selectDate()
    │
    ├─── [비회원] ──────────────────────────────────┐
    │                                                │
    ▼                                                ▼
[2A: 이름 입력] step='name'              [2B: 차량번호] step='carNumber'
    │  2글자 이상 검증                        │  (회원: 이름 자동 설정)
    │  → inputName()                          │  "등록차량" 명령 지원
    │                                         │
    ▼                                         │
[3단계: 차량번호 입력] step='carNumber'  ◄────┘
    │  정규식 /^\d{2,3}[가-힣]\d{4}$/
    │  → inputCarNumber()
    │
    ▼
[4단계: 할인 선택] step='discount'
    │  6종 할인 버튼 위젯
    │  → selectDiscount()
    │
    ▼
[5단계: 예약 확인] step='confirm'
    │  확인 카드 (이름, 날짜, 차량, 할인, 금액)
    │  "예약 확정" → confirmReserve()
    │  "다시 입력" → reserveState=null → startReserve()
    │
    ▼
[6단계: 예약 완료] reserveState = null
    │  POST /api/reserve
    │  성공: 확인번호 + 완료 카드 + TTS 안내
    │  실패: 에러 메시지
    │
    ▼
[일반 모드 복귀]
```

### 56.1 handleSend() 분기 (chatbot.js)
```javascript
if (reserveState) {
    if (reserveState.step === 'name')        → inputName(text)
    if (reserveState.step === 'carNumber')   → inputCarNumber(text)
    if (reserveState.step === 'cancelInput') → processCancel(text)
    // date, discount, confirm 단계는 버튼으로만 진행
}
sendToAI(text)  // reserveState 없으면 AI 대화
```

---

## 57. 접근성 (Accessibility)

### 57.1 aria-label 사용 현황
| 요소 | aria-label |
|------|------------|
| 모바일 메뉴 버튼 | "메뉴 열기" |
| 슬라이더 이전 | "이전" |
| 슬라이더 다음 | "다음" |
| 슬라이더 일시정지 | "일시정지" |
| 주차현황 이전 | "이전" |
| 주차현황 다음 | "다음" |
| 챗봇 플로팅 버튼 | "수목원 주차 예약" |
| TTS 토글 | "음성 안내" |
| 챗봇 닫기 | "닫기" |
| 챗봇 전송 | "전송" |
| 상담원 버튼 | "상담원 연결" |
| 바로가기 GO | "바로가기" |

### 57.2 키보드 인터랙션
| 키 | 동작 |
|----|------|
| Enter | 챗봇 메시지 전송 |
| Enter | 로그인 실행 (비밀번호 필드) |

### 57.3 title 속성
| 요소 | title |
|------|-------|
| TTS 토글 | "음성 안내 켜기/끄기" |
| 상담원 버튼 | "상담원 연결" |
| 내 위치 버튼 | "내 위치" |

### 57.4 미비 사항
- 포커스 트랩 없음 (모달 열린 상태에서 Tab으로 배경 요소 접근 가능)
- 스크린 리더 대응 부족 (라이브 영역 `aria-live` 미사용)
- 색상 대비 일부 미달 (연한 회색 텍스트 `#aaa`, `#999`)
- 키보드 네비게이션으로 챗봇 메뉴 버튼 접근 불편

---

## 58. CORS 설정

```javascript
app.use(cors());
```

기본 설정으로, 모든 오리진에서의 요청을 허용합니다.

| 항목 | 기본값 |
|------|--------|
| `origin` | `*` (모든 도메인) |
| `methods` | `GET,HEAD,PUT,PATCH,POST,DELETE` |
| `preflightContinue` | false |
| `optionsSuccessStatus` | 204 |
| `credentials` | false |
| `allowedHeaders` | 요청의 `Access-Control-Request-Headers` 반영 |

- 현재 로컬 개발용이므로 와일드카드 허용
- 프로덕션 배포 시 특정 도메인으로 제한 필요

---

## 59. Static 파일 서빙

```javascript
app.use(express.static(ROOT));
// ROOT = path.join(__dirname, '..')  → 프로젝트 루트
```

### 59.1 접근 가능한 정적 파일
| URL 경로 | 실제 파일 |
|----------|-----------|
| `/parking-portal/index.html` | `parking-portal/index.html` |
| `/parking-portal/style.css` | `parking-portal/style.css` |
| `/parking-portal/js/chatbot.js` | `parking-portal/js/chatbot.js` |
| `/parking-portal/parking-data.js` | `parking-portal/parking-data.js` |
| `/manager.html` | `manager.html` |
| `/css/manager.css` | `css/manager.css` |
| `/js/manager.js` | `js/manager.js` |
| `/system_prompt.txt` | `system_prompt.txt` |
| `/.env` | **.env 파일이 외부에서 접근 가능!** |

### 59.2 보안 위험
**프로젝트 루트 전체를 static으로 서빙**하고 있어, 다음 파일들이 URL로 접근 가능합니다:
- `http://localhost:3000/.env` → 환경변수 (JWT Secret, 관리자 비밀번호)
- `http://localhost:3000/data/users.json` → 유저 정보 (bcrypt 해시 포함)
- `http://localhost:3000/data/geocode_cache.json` → 좌표 캐시
- `http://localhost:3000/system_prompt.txt` → AI 시스템 프롬프트
- `http://localhost:3000/js/server.js` → 서버 소스코드

**수정 필요**: `express.static`을 `parking-portal/`과 특정 경로로만 제한하거나, `.env`, `data/`, `js/server.js` 등을 제외해야 합니다.

---

## 60. 챗봇 위젯 UI 컴포넌트 목록

### 60.1 메시지 컴포넌트
| 컴포넌트 | CSS 클래스 | 설명 |
|----------|-----------|------|
| 사용자 메시지 | `.chat-msg.user` | 파랑 배경, 우측 정렬, `textContent` (XSS safe) |
| 봇 메시지 | `.chat-msg.bot` | 흰 배경, 좌측 정렬, `innerHTML` + 스피커 버튼 |
| 타이핑 인디케이터 | `.chat-msg.bot.typing` | 3점 펄스 애니메이션 |

### 60.2 위젯 컴포넌트
| 컴포넌트 | CSS 클래스 | 사용 위치 |
|----------|-----------|-----------|
| 초기 메뉴 | `.chat-menu` | 챗봇 최초 표시 (4개 버튼 2x2 그리드) |
| 캘린더 | `.chat-calendar` | 예약 날짜 선택 (4열 그리드) |
| 혼잡 카드 | `.congestion-card` | 혼잡 현황 (날짜 + 상태 뱃지) |
| 할인 목록 | `.chat-discount-list` | 할인 선택 (6개 세로 버튼) |
| 예약 확인 | `.reserve-confirm` | 예약 정보 확인 카드 (연초록 배경) |
| 예약 완료 | `.reserve-done` | 예약 완료 카드 (초록 그라데이션) |
| 액션 버튼 | `.chat-action-btns` | 예약확정/다시입력 (좌우 배치) |
| CTA 버튼 | `.chat-cta-btn` | "지금 예약하기" 등 |
| 빠른 응답 | `.chat-quick-btn` | 빠른 답변 버튼 (pill 형태) |

### 60.3 캘린더 날짜 버튼 상태
| 클래스 | 상태 | 스타일 | 클릭 |
|--------|------|--------|------|
| `.available` | 여유 | 초록 보더, 초록 텍스트 | 가능 |
| `.busy` | 혼잡 (≤9면) | 주황 보더, 주황 텍스트 | 가능 |
| `.full` | 만차 | 연빨강 배경, 반투명, not-allowed | disabled |
| `.closed` | 휴원 | 회색 배경, 반투명, not-allowed | disabled |

---

## 61. 수목원 주차장 vs 안양시 공영주차장 구분

이 프로젝트에는 **두 종류의 주차장 데이터**가 공존합니다:

### 61.1 서울대 안양수목원 주차장 (챗봇 대상)
| 항목 | 값 |
|------|-----|
| 위치 | 경기도 안양시 만안구 수목원로 315 |
| 면수 | 50면 |
| 운영 | 전면 사전예약제, 현장주차 불가 |
| 요금 | 종일 5,000원 (감면 적용 가능) |
| 데이터 | `generateAvailability()` Mock 생성 |
| API | `/api/availability`, `/api/reserve`, `/api/cancel` |

### 61.2 안양시 공영주차장 33개소 (포털 지도)
| 항목 | 값 |
|------|-----|
| 위치 | 안양시 만안구 14개소 + 동안구 19개소 |
| 면수 | 총 6,140면 |
| 운영 | 일반 공영주차장 (시간제 과금) |
| 요금 | 최초 15분 무료, 이후 10분당 200~300원 |
| 데이터 | `parking-data.js` 정적 하드코딩 |
| 표시 | 주차현황 슬라이더, 지도 마커 |

### 61.3 관계
- 챗봇은 **수목원 주차장만** 예약/취소/조회
- 포털 메인 페이지는 **안양시 전체 공영주차장** 현황 표시
- 지도에서 수목원은 초록 나무 아이콘으로 별도 표시

---

## 62. 레거시 script.js 상세 분석

`parking-portal/script.js` (1,159줄)는 분할 전 원본 파일입니다. index.html에서 로드하지 않으므로 실행되지 않지만, 코드 히스토리와 분할 전/후 비교를 위해 분석합니다.

### 62.1 구조 (분할 전 통합 파일)
```
1~51행     메인 슬라이더 (→ portal-ui.js)
53~65행    탭 전환 (→ portal-ui.js)
67~79행    모바일 메뉴 (→ portal-ui.js)
81~125행   조회 기능 (→ portal-ui.js)
127~277행  주차현황 카드 + 슬라이더 (→ portal-ui.js)
280~600행  Leaflet 지도 (→ portal-ui.js)
602~618행  유관기관 바로가기 (→ portal-ui.js)
620~665행  로그인/회원가입 (→ auth.js로 분리 예정이었으나 포함)
666~711행  TTS (Edge TTS 서버) 
712~754행  챗봇 열기/닫기
756~796행  메시지 헬퍼
798~852행  AI 스트리밍
854~884행  혼잡 현황
886~1077행 예약 플로우 (6단계)
1079~1103행 취소/변경
1105~1143행 이벤트 처리
1145~1159행 상담원 연결
```

### 62.2 script.js와 chatbot.js의 차이
| 항목 | script.js (레거시) | chatbot.js (현재) |
|------|-------------------|-------------------|
| 스코프 | 전역 (비IIFE) | IIFE |
| `currentUser` 참조 | `currentUser` (전역) | `window.currentUser` |
| XSS | 봇 메시지도 `innerHTML` | user→`textContent`, bot→`innerHTML` 구분 |
| 이벤트 | `onclick="confirmReserve()"` inline | `data-action` 이벤트 위임 |
| 상담원 오타 | `appendMsg('bot', ...)` (존재하지 않는 함수) | `addMsg(...)` (수정됨) |
| `escapeHtml` | 없음 (XSS 취약) | 포함 |
| CTA 버튼 | `onclick="startReserve()"` | `data-action="startReserve"` |

### 62.3 script.js의 버그
1159행 상담원 연결에서 `appendMsg` 호출 — 이 함수는 존재하지 않아 런타임 에러가 발생합니다. chatbot.js에서는 `addMsg`로 수정됨.

---

## 63. Ollama API 요청 형식

### 63.1 채팅 API (서버 → Ollama)
```json
POST http://localhost:11434/api/chat

{
    "model": "qwen2.5:14b",
    "messages": [
        {
            "role": "system",
            "content": "당신은 \"서울대 안양수목원 주차장 사전예약 챗봇\"입니다.\n...\n\n[참고 문서]\n--- 운영안내 > 운영시간 (관련도: 0.82) ---\n...\n\n[현재 잔여 현황]\n- 2026-04-08: 잔여 12면\n..."
        },
        { "role": "user", "content": "주차 요금이 얼마예요?" },
        { "role": "assistant", "content": "주차 요금은 1일 5,000원입니다..." },
        { "role": "user", "content": "감면 대상은?" }
    ],
    "stream": true
}
```

### 63.2 임베딩 API (서버 → Ollama, RAG용)
```json
POST http://172.31.0.210:11434/api/embeddings

{
    "model": "nomic-embed-text:latest",
    "prompt": "주차 요금 안내 > 기본 요금\n승용차: 1일 5,000원..."
}
```

**Response:**
```json
{
    "embedding": [0.012, -0.034, 0.056, ...]  // 768차원 float 배열
}
```

---

## 64. 타이머/인터벌 총정리

### 64.1 서버 (server.js)
| 타이머 | 간격 | 용도 |
|--------|------|------|
| `setInterval(generateAvailability)` | 5분 | 주차 잔여현황 Mock 데이터 갱신 |
| `setTimeout` (preloadGeocode) | 1.1초 | Nominatim rate limit 준수 (주소 간 대기) |

### 64.2 클라이언트 — portal-ui.js
| 타이머 | 간격 | 용도 |
|--------|------|------|
| `setInterval(showSlide)` | 5초 | 메인 비주얼 슬라이더 자동 전환 |
| `setInterval(goNext)` | 5초 | 주차현황 카드 슬라이더 자동 이동 |

### 64.3 클라이언트 — chatbot.js
| 타이머 | 간격 | 용도 |
|--------|------|------|
| `setInterval` (스피커 상태 체크) | 200ms | TTS 재생 종료 감지 → 스피커 버튼 상태 복원 |

### 64.4 클라이언트 — manager.js
| 타이머 | 간격 | 용도 |
|--------|------|------|
| `setInterval(loadConversations + loadCounselorRequests)` | 30초 | 대화/상담 목록 자동 새로고침 |

---

## 65. 클라이언트 fetch 호출 총정리

### 65.1 portal-ui.js
| 호출 | Method | URL | 용도 |
|------|--------|-----|------|
| 좌표 로드 | GET | `/api/geocode` | 서버 캐시된 좌표 로드 |

### 65.2 auth.js
| 호출 | Method | URL | 용도 |
|------|--------|-----|------|
| 로그인 | POST | `/api/auth/login` | JWT 토큰 발급 |
| 회원가입 | POST | `/api/auth/signup` | 계정 생성 |
| 중복확인 | GET | `/api/auth/check-id/:id` | 아이디 중복 |

### 65.3 chatbot.js
| 호출 | Method | URL | 용도 |
|------|--------|-----|------|
| AI 채팅 | POST | `/api/chat` | SSE 스트리밍 대화 |
| TTS | POST | `/api/tts` | 음성 합성 |
| 혼잡 현황 | GET | `/api/availability` | 전체 잔여현황 |
| 날짜 상세 | GET | `/api/availability/:date` | 특정 날짜 잔여 |
| 예약 | POST | `/api/reserve` | 주차 예약 |
| 취소 | POST | `/api/cancel` | 예약 취소 |
| 상담원 | POST | `/api/counselor` | 상담원 연결 |

### 65.4 manager.js
| 호출 | Method | URL | 용도 |
|------|--------|-----|------|
| 자동 로그인 | POST | `/api/auth/login` | 관리자 토큰 발급 |
| 유저 목록 | GET | `/api/admin/users` | 전체 유저 |
| 유저 추가 | POST | `/api/admin/users` | 유저 생성 |
| 유저 수정 | PUT | `/api/admin/users/:id` | 유저 업데이트 |
| 유저 삭제 | DELETE | `/api/admin/users/:id` | 유저 제거 |
| 대화 목록 | GET | `/api/admin/conversations` | 대화 목록 |
| 대화 상세 | GET | `/api/admin/conversations/:sid` | 대화 내용 |
| 상담 목록 | GET | `/api/admin/counselor-requests` | 상담 요청 |
| 상담 처리 | POST | `/api/admin/counselor-requests/:sid/resolve` | 처리 완료 |

---

## 66. localStorage 키 총정리

| 키 | 저장 위치 | 값 | 용도 |
|-----|-----------|-----|------|
| `admin_token` | manager.js | JWT 문자열 | 관리자 자동 로그인 |
| `admin_read_msgs` | manager.js | `{ sessionId: true, ... }` JSON | 대화 읽음 상태 |

- 사용자 포털 (auth.js)은 localStorage 미사용 — 로그인 상태는 `window` 전역변수로만 유지
- 페이지 새로고침 시 로그인 풀림 (영속성 없음)

---

## 67. 데이터 모델 / 엔티티 스키마

### 67.1 User (유저)
```typescript
{
    id: string,        // 영문숫자 4~20자 (PK)
    pw: string,        // bcrypt 해시
    name: string,      // 실명
    phone: string,     // 전화번호
    car: string,       // 차량번호 (선택)
    role: 'admin' | 'user',
    status: 'active' | 'inactive',
    joinDate: string   // YYYY-MM-DD
}
```

### 67.2 Conversation (대화)
```typescript
{
    sessionId: string,           // crypto.randomUUID()
    createdAt: string,           // ISO 8601
    messages: [{
        role: 'user' | 'assistant',
        content: string,
        timestamp: string        // ISO 8601
    }],
    reservations: [Reservation],
    counselorRequested: boolean
}
```

### 67.3 Reservation (예약)
```typescript
{
    confirmNo: string,     // "AY" + 8자리 숫자
    date: string,          // YYYY-MM-DD
    carNumber: string,     // 차량번호
    amount: number,        // 결제금액 (0~5000)
    discountId: string,    // none|eco|multi|compact|disable|veteran
    status: 'confirmed' | 'cancelled',
    createdAt: string      // ISO 8601
}
```

### 67.4 CounselorRequest (상담 요청)
```typescript
{
    sessionId: string,
    requestedAt: string,   // ISO 8601
    status: 'pending' | 'resolved',
    lastMessage: string,
    resolvedAt?: string    // ISO 8601 (처리 시)
}
```

### 67.5 ParkingAvailability (주차 잔여현황)
```typescript
{
    [date: string]: {
        total: 50,
        reserved: number,
        available: number,
        closed: boolean,
        closedReason?: string  // 휴원 사유
    }
}
```

### 67.6 ParkingData (공영주차장)
```typescript
{
    name: string,
    type: 'outdoor' | 'street' | 'underground' | 'mechanical',
    area: 'manan' | 'dongan',
    used: number,
    total: number,
    addr: string,
    lat?: number,   // 서버 지오코딩으로 주입
    lng?: number
}
```

### 67.7 GeocodeCache (좌표 캐시)
```typescript
{
    [address: string]: {
        lat: number,
        lng: number
    }
}
```

### 67.8 RAG VectorEntry (벡터 캐시)
```typescript
{
    [cacheKey: string]: {   // "파일명::섹션제목"
        text: string,
        embedding: number[] // 768차원
    }
}
```

---

## 68. 날짜/시간 처리

### 68.1 서버 시간 기준
- 모든 날짜/시간은 **서버 시스템 시계** 기준
- `new Date().toISOString()` → UTC ISO 8601 형식
- `todayStr()` → `YYYY-MM-DD` (로컬 타임존)

### 68.2 주의: todayStr() 타임존 이슈
```javascript
function todayStr() { return new Date().toISOString().slice(0, 10); }
```
이 함수는 **UTC 기준** 날짜를 반환합니다. 한국시간(KST, UTC+9)과 차이가 있어:
- KST 2026-04-07 08:30 → UTC 2026-04-06T23:30 → todayStr() = `"2026-04-06"` (전날)
- 자정~오전 9시 사이에 날짜가 하루 밀림

### 68.3 날짜 비교
| 위치 | 비교 | 방식 |
|------|------|------|
| 예약 당일 불가 | `date <= today` | 문자열 비교 |
| 취소 기한 | `now > deadline` | Date 객체 비교 |
| 로그 복원 | today/yesterday | `todayStr()` + 1일 전 |
| 월 제한 | `date.startsWith(month)` | 문자열 prefix |

### 68.4 클라이언트 날짜 표시
```javascript
const d = new Date(date + 'T00:00:00');  // 로컬 타임존 강제
```
- `T00:00:00`를 붙여서 UTC 해석 방지 → 한국 시간대에서 올바른 날짜 표시

---

## 69. 페이지 로드 시퀀스 (클라이언트)

### 69.1 parking-portal/index.html 로드 순서
```
1. HTML 파싱 시작
2. <head> CSS/폰트 로드
   ├── style.css (2,545줄)
   ├── Font Awesome CDN
   └── Leaflet CSS CDN
3. Leaflet JS CDN 로드
4. <body> HTML 렌더링
5. <script> 순차 실행:
   ├── parking-data.js          → PARKING_DATA 전역 배열 생성
   ├── js/portal-ui.js          → IIFE 즉시 실행
   │   ├── 슬라이더 시작 (5초 인터벌)
   │   ├── 주차현황 카드 생성 + SVG 애니메이션
   │   ├── Leaflet 지도 초기화
   │   ├── GET /api/geocode → 좌표 로드 → 마커 생성
   │   └── 주차현황 슬라이더 시작 (5초 인터벌)
   ├── js/auth.js               → IIFE 즉시 실행
   │   └── 이벤트 리스너 등록 (로그인/회원가입)
   └── js/chatbot.js            → IIFE 즉시 실행
       ├── sessionId 생성 (crypto.randomUUID)
       ├── 챗봇 버튼/창 이벤트 등록
       └── 대기 (사용자 인터랙션 시작까지)
```

### 69.2 manager.html 로드 순서
```
1. HTML + CSS 로드
2. js/manager.js 실행 (IIFE)
   ├── ensureAuth() → localStorage 토큰 확인
   │   ├── 토큰 있음 → GET /api/admin/users로 유효성 검증
   │   └── 토큰 없음/만료 → POST /api/auth/login (자동 로그인)
   ├── loadUsers() → 유저 테이블 렌더링
   ├── loadConversations() → 대화 목록 렌더링
   ├── loadCounselorRequests() → 상담 요청 렌더링
   └── setInterval(30초) → 자동 새로고침
```

---

## 70. 혼잡도 판단 기준

### 70.1 수목원 주차장 (챗봇)
| 잔여 | 상태 | 뱃지 | 색상 |
|------|------|------|------|
| 0면 | 만차 | "만차" | 빨강 |
| 1~9면 | 혼잡 | "혼잡 N면" | 노랑 |
| 10면+ | 여유 | "여유 N면" | 초록 |
| 휴원 | 휴원 | "휴원" | 회색 |

### 70.2 공영주차장 (포털 지도/슬라이더)
| 점유율 | 상태 | 라벨 | 색상 |
|--------|------|------|------|
| ≥ 85% | crowded | 혼잡 | 빨강 |
| 60~84% | normal | 보통 | 주황 |
| < 60% | available | 여유 | 초록 |

### 70.3 두 기준의 차이
- 수목원: **절대값** 기준 (잔여 면수)
- 공영주차장: **비율** 기준 (점유율 퍼센트)
- 이유: 수목원은 50면 소규모 → 절대값이 더 직관적

---

## 71. 보안 취약점 전체 목록 (발견 순)

| # | 위치 | 심각도 | 설명 |
|---|------|--------|------|
| 1 | `server.js` L28 | **치명** | `express.static(ROOT)` → `.env`, `users.json`, 서버 소스코드 외부 접근 가능 |
| 2 | `manager.js` L24 | 높음 | 관리자 비밀번호 `roqkfwk00` 평문 하드코딩 |
| 3 | `index.html` L524 | 높음 | 테스트 계정 `AD / roqkfwk00` HTML에 노출 |
| 4 | `rag.js` L4 | 중간 | Ollama URL `172.31.0.210` 하드코딩 (내부 IP 노출) |
| 5 | `script.js` L1155 | 낮음 | `appendMsg` 미존재 함수 호출 (런타임 에러, 레거시) |
| 6 | `script.js` 전역 | 중간 | IIFE 미사용 → 전역 변수 오염 (레거시, 미사용) |
| 7 | `script.js` L89,99 | 중간 | `innerHTML`에 사용자 입력 직접 삽입 (XSS, 레거시) |
| 8 | `auth.js` | 낮음 | 로그인 상태 localStorage 미저장 → 새로고침 시 풀림 |
| 9 | `server.js` | 중간 | 월 1회 제한이 세션 기준 → 새 브라우저로 우회 가능 |
| 10 | `server.js` | 낮음 | `todayStr()` UTC 기준 → KST 자정~09시 사이 날짜 불일치 |
| 11 | CORS | 중간 | `cors()` 와일드카드 → 모든 도메인에서 API 호출 가능 |
| 12 | 확인번호 | 낮음 | `Date.now()` 기반 → 동시 예약 시 중복 가능성 |

---

## 72. Nominatim 좌표 중복 문제 (실측 데이터)

geocode_cache.json 실제 데이터를 분석한 결과, **33개 주소 중 동일 좌표로 겹치는 그룹이 다수** 존재합니다.

### 72.1 중복 좌표 그룹
| 좌표 | 겹치는 주차장 | 개수 |
|------|-------------|------|
| 37.3889, 126.9297 | 안양역, 안양6동2, 공업부지, 삼모루 | **4개** |
| 37.4306, 126.8990 | 비호교1, 비호교2, 관악역1~4 | **6개** |
| 37.4044, 126.9642 | 관양동, 호현마을1, 호현마을2 | **3개** |
| 37.3982, 126.9522 | 일번가, 샘모루초교, 덕현공원 | **3개** |
| 37.3784, 126.9620 | 충훈지하, 개나리놀이터 | **2개** |

### 72.2 원인
Nominatim이 한국 도로명주소를 정확히 해석하지 못해, 같은 도로명(예: "석수로")의 다른 번호를 모두 같은 좌표로 반환합니다.

### 72.3 영향
- 33개 중 **약 18개**(55%)가 부정확한 좌표
- 지도에서 여러 주차장이 같은 위치에 겹쳐 표시
- 사용자가 마커를 클릭해도 하나만 보임

---

## 73. 실제 로그 데이터 분석

### 73.1 chat 로그 (2026-04-06)
```jsonl
{"sessionId":"103ef629-...","role":"user","content":"노쇼 정책과 운영시간을 알려주세요","_ts":"2026-04-06T04:25:06.570Z"}
{"sessionId":"103ef629-...","role":"assistant","content":"\"당일 미입차\" 경우에는...","_ts":"2026-04-06T04:25:16.321Z"}
```
- 세션 1건, 메시지 2건 (질문 + 응답)
- 질문→응답 소요시간: **약 10초** (AI 스트리밍 포함)

### 73.2 reserve 로그 (2026-04-06)
```jsonl
{"confirmNo":"AY47742091","action":"confirm","userType":"guest","userId":null,"userName":"김민석","date":"2026-04-09","carNumber":"111가1234","discountId":"none","amount":5000,...}
{"confirmNo":"AY47880939","action":"confirm","userType":"member","userId":"AD","userName":"관리자","date":"2026-04-07","carNumber":"52가1212","discountId":"compact","amount":2500,...}
```
- 예약 2건: 비회원 1건 (5,000원), 회원 1건 (경차 감면 2,500원)
- 취소 로그 없음 (counselor 로그도 없음)

---

## 74. Git 저장소 정보

### 74.1 원격 저장소
| 항목 | 값 |
|------|-----|
| Remote | `origin` |
| URL | `https://github.com/dhmskim/anyang.git` |
| 브랜치 | `main` |
| 사용자 | `dhmskim` |

### 74.2 전체 커밋 이력 (10건)
| 해시 | 날짜 | 메시지 |
|------|------|--------|
| `57d9935` | 2026-04-06 | 작업 내역 문서 업데이트 |
| `3df6f3d` | 2026-04-06 | 예약 로그 개선: 예약번호별 구분, 회원/비회원 구분 |
| `7d5c1f8` | 2026-04-06 | 대화/예약/상담 데이터를 날짜별 .log 파일로 전환 |
| `e486710` | 2026-04-06 | 대화 내역 데이터 업데이트 |
| `0bb4bf4` | 2026-04-06 | 보안/코드 전면 개선, script.js 모듈 분할, 지도 위성뷰 + 좌표 캐시 |
| `7d02ef9` | 2026-04-06 | 로그인/회원가입, 관리자 유저관리, Edge TTS, 조회 기능 구현 |
| `242ac84` | 2026-04-03 | 2026-04-03 작업 내역 문서 추가 |
| `44968b4` | 2026-04-03 | 주차장 지도 Leaflet 위성뷰 연동 및 사이드바 UI 개선 |
| `bd092bb` | 2026-04-03 | 프로젝트 구조 개편 및 UI/정책 문서 개선 |
| `bf0c99e` | 2026-04-03 | **안양수목원 주차장 사전예약 챗봇 초기 커밋** |

### 74.3 개발 타임라인
| 날짜 | 커밋 수 | 주요 작업 |
|------|---------|-----------|
| 2026-04-03 | 4건 | 초기 커밋, 구조 개편, Leaflet 지도, 작업 문서 |
| 2026-04-06 | 6건 | 보안 개선, 모듈 분할, 로그인, TTS, 로그 시스템 |

---

## 75. CDN 외부 의존성

### 75.1 사용 중인 CDN
| 라이브러리 | 버전 | CDN URL | 용도 |
|-----------|------|---------|------|
| Font Awesome | 6.4.0 | `cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css` | 아이콘 |
| Leaflet CSS | 1.9.4 | `unpkg.com/leaflet@1.9.4/dist/leaflet.css` | 지도 스타일 |
| Leaflet JS | 1.9.4 | `unpkg.com/leaflet@1.9.4/dist/leaflet.js` | 지도 라이브러리 |

### 75.2 CDN 장애 시 영향
| CDN | 장애 시 영향 |
|-----|-------------|
| Font Awesome | 모든 아이콘 미표시 (기능은 정상) |
| Leaflet | 지도 섹션 완전 미작동 (initMap 스킵) |
| Esri 위성 타일 | 지도 배경 표시 안 됨 |
| CartoDB 라벨 | 지도 도로/지명 라벨 미표시 |

### 75.3 CDN 폴백 없음
현재 로컬 폴백이 없어, CDN 장애 시 graceful degradation이 제한적입니다.
Leaflet의 경우 `typeof L === 'undefined'` 체크가 있어 에러는 발생하지 않습니다.

---

## 76. Font Awesome 아이콘 사용 목록

### 76.1 포털 index.html (40개)
| 아이콘 | 용도 |
|--------|------|
| `fa-home` | 유틸바 홈 |
| `fa-parking` | 로고, 푸터, 지도 마커, 로그인 모달 |
| `fa-bars` / `fa-times` | 모바일 메뉴 토글 |
| `fa-chevron-left` / `fa-chevron-right` | 슬라이더 화살표, 배너 |
| `fa-pause` / `fa-play` | 슬라이더 일시정지 |
| `fa-search-location` | 퀵메뉴 - 주차장찾기 |
| `fa-credit-card` | 퀵메뉴 - 사전결제, 배너 |
| `fa-file-invoice-dollar` | 퀵메뉴 - 미납요금 |
| `fa-car-side` | 퀵메뉴 - 파킹패스, 배너 |
| `fa-calendar-check` | 퀵메뉴 - 월정기, 챗봇 예약 메뉴 |
| `fa-user-check` | 퀵메뉴 - 감면등록 |
| `fa-truck-pickup` | 퀵메뉴 - 견인차량 |
| `fa-percent` | 배너 - 감면대상 |
| `fa-plus` | 더보기, 상세보기 |
| `fa-info-circle` | 요금 안내, 챗봇 FAQ 메뉴 |
| `fa-search` | 지도 검색 |
| `fa-road` | 지도 필터 - 노상 |
| `fa-arrow-down` | 지도 필터 - 지하 |
| `fa-crosshairs` | 내 위치 |
| `fa-tree` | 챗봇 버튼, 챗봇 헤더 |
| `fa-volume-up` / `fa-volume-mute` | TTS 토글 |
| `fa-chart-bar` | 챗봇 혼잡현황 메뉴 |
| `fa-edit` | 챗봇 취소/변경 메뉴 |
| `fa-headset` | 상담원 연결 |
| `fa-paper-plane` | 채팅 전송 |
| `fa-user-plus` | 회원가입 모달 |
| `fa-check-circle` | 조회 결과 OK, 예약 완료 |
| `fa-exclamation-circle` | 조회 경고 |
| `fa-map-marker-alt` | 지도 팝업 주소 |

### 76.2 관리자 manager.html (12개)
| 아이콘 | 용도 |
|--------|------|
| `fa-tree` | 사이드바 로고 |
| `fa-users` | 유저관리 |
| `fa-comments` | 대화내역 |
| `fa-headset` | 상담원 요청 |
| `fa-book` | API 문서 |
| `fa-cog` | 기타 관리 |
| `fa-sign-out-alt` | 로그아웃 |
| `fa-search` | 유저 검색 |
| `fa-plus` | 유저 추가 |
| `fa-sync-alt` | 새로고침 |
| `fa-pen` | 유저 수정 |
| `fa-trash` | 유저 삭제 |

---

## 77. 모듈 간 의존 관계

### 77.1 의존 그래프
```
parking-data.js (전역 PARKING_DATA)
    │
    ▼
portal-ui.js (IIFE)
    ├── PARKING_DATA 읽기 (전역)
    ├── window.getStatus() 정의
    └── window.STATUS_LABELS 정의
    │
    ▼
auth.js (IIFE)
    ├── window.currentUser 정의
    └── window.authToken 정의
    │
    ▼
chatbot.js (IIFE)
    ├── window.currentUser 읽기 (auth.js)
    └── window.startReserve 정의 (HTML onclick에서 호출)
```

### 77.2 스크립트 로드 순서 (필수)
```html
<!-- 순서 변경 불가 -->
<script src="parking-data.js"></script>     <!-- 1. 데이터 -->
<script src="js/portal-ui.js"></script>      <!-- 2. UI (PARKING_DATA 필요) -->
<script src="js/auth.js"></script>           <!-- 3. 인증 (독립) -->
<script src="js/chatbot.js"></script>        <!-- 4. 챗봇 (currentUser 필요) -->
```
- `portal-ui.js`는 `PARKING_DATA`를 참조하므로 반드시 `parking-data.js` 뒤
- `chatbot.js`는 `window.currentUser`를 참조하므로 반드시 `auth.js` 뒤
- `auth.js`와 `portal-ui.js`는 상호 의존 없음

### 77.3 서버 모듈 의존
```
server.js
    └── require('./rag')  → { buildVectors, search }
```
- `rag.js`는 `server.js`에서만 사용
- `manager.js`, `user.js`는 서버에서 require하지 않음 (클라이언트 전용)

---

## 78. HTML 시맨틱 구조

### 78.1 index.html 시맨틱 태그 사용
```html
<body>
    <div class="top-util">          <!-- div (시맨틱 아님) -->
    <header class="header">          <!-- ✅ header -->
        <nav class="gnb">            <!-- ✅ nav -->
    <section class="main-visual">    <!-- ✅ section -->
    <section class="quick-service">  <!-- ✅ section -->
    <section class="vehicle-search"> <!-- ✅ section -->
    <section class="realtime-parking"> <!-- ✅ section -->
    <section class="service-banner"> <!-- ✅ section -->
    <section class="info-section">   <!-- ✅ section -->
    <section class="map-section">    <!-- ✅ section -->
    <section class="related-banner"> <!-- ✅ section -->
    <footer class="footer">          <!-- ✅ footer -->
        <address>                    <!-- ✅ address -->
```

### 78.2 manager.html 시맨틱 태그
```html
<body>
    <div class="admin-layout">
        <nav class="sidebar">        <!-- ✅ nav -->
        <main class="main-content">  <!-- ✅ main -->
            <section class="page">   <!-- ✅ section (5개) -->
```

### 78.3 Meta 태그
```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```
- `description`, `keywords`, `og:*` 메타 태그 없음
- `favicon` 미설정

---

## 79. 배포 환경

### 79.1 현재 환경
| 항목 | 값 |
|------|-----|
| OS | Windows 11 Home |
| 런타임 | Node.js |
| 실행 방식 | `start.bat` 더블클릭 또는 `node js/server.js` |
| 포트 | 3000 (로컬) |
| AI 서버 | Ollama (로컬 또는 `172.31.0.210`) |
| 데이터 | 파일 시스템 (JSON + .log) |
| HTTPS | 미적용 (HTTP only) |
| 프로세스 관리 | 없음 (콘솔 창 닫으면 종료) |
| 도메인 | localhost |

### 79.2 프로덕션 배포 시 필요 사항
| 항목 | 현재 | 필요 |
|------|------|------|
| HTTPS | 미적용 | SSL 인증서 + reverse proxy |
| 프로세스 관리 | 없음 | PM2 또는 systemd |
| 정적 파일 | Express static | Nginx static + API proxy |
| CORS | 와일드카드 | 특정 도메인만 허용 |
| 로그 | 파일 | 로그 로테이션 + 모니터링 |
| DB | JSON 파일 | MySQL/MariaDB |
| .env 보호 | 외부 접근 가능 | static 경로 제한 |
| Rate Limit | 메모리 | Redis 기반 |
| 모니터링 | 없음 | 헬스체크 엔드포인트 |

### 79.3 Ollama 모델 요구사항
| 모델 | 용도 | 크기 (추정) | VRAM |
|------|------|-----------|------|
| `qwen2.5:14b` | 답변 생성 | ~8GB | 10GB+ |
| `nomic-embed-text:latest` | 텍스트 임베딩 | ~274MB | 1GB |

---

## 80. 관리자 페이지 대화 읽음/안읽음 메커니즘

### 80.1 동작 원리
```javascript
// localStorage에 읽음 상태 저장
const readMessages = JSON.parse(localStorage.getItem('admin_read_msgs') || '{}');
// { "sessionId_1": true, "sessionId_2": true, ... }

// 대화 클릭 시 읽음 처리
function markAsRead(sid) {
    readMessages[sid] = true;
    localStorage.setItem('admin_read_msgs', JSON.stringify(readMessages));
}
```

### 80.2 UI 표현
| 상태 | 배경색 | 보더 | 뱃지 |
|------|--------|------|------|
| 안읽음 | 연노랑 `#fffde7` | 좌측 주황 `#ffa000` 3px | 빨간 원형 "1" |
| 읽음 | 기본 흰색 | 없음 | 없음 |

### 80.3 한계
- 브라우저별로 독립 (다른 브라우저에서는 전부 안읽음)
- localStorage 삭제 시 모든 읽음 상태 초기화
- 새 메시지가 추가되어도 기존 읽음 상태 유지 (메시지 수 변화 미감지)
