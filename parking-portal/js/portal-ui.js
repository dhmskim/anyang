// ===== 포털 UI (슬라이더, 탭, 모바일, 조회, 주차현황, 지도, 유관기관) =====
(function () {
    'use strict';

    // --- 메인 슬라이더 ---
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.querySelector('.slide-arrow.prev');
    const nextBtn = document.querySelector('.slide-arrow.next');
    const pauseBtn = document.getElementById('slidePauseBtn');
    const indicatorNum = document.querySelector('.indicator');
    let currentSlide = 0, slideTimer, isPaused = false;

    function showSlide(index) {
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        slides.forEach(s => s.classList.remove('active'));
        slides[index].classList.add('active');
        currentSlide = index;
        indicatorNum.textContent = index + 1;
    }
    function startSlider() { slideTimer = setInterval(() => showSlide(currentSlide + 1), 5000); }
    function stopSlider() { clearInterval(slideTimer); }

    prevBtn.addEventListener('click', () => { stopSlider(); showSlide(currentSlide - 1); if (!isPaused) startSlider(); });
    nextBtn.addEventListener('click', () => { stopSlider(); showSlide(currentSlide + 1); if (!isPaused) startSlider(); });
    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        if (isPaused) { stopSlider(); pauseBtn.innerHTML = '<i class="fas fa-play"></i>'; }
        else { startSlider(); pauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; }
    });
    startSlider();

    // --- 탭 전환 ---
    document.querySelectorAll('.search-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.search-tabs .tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        });
    });

    // --- 모바일 메뉴 ---
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const gnbList = document.querySelector('.gnb-list');
    mobileMenuBtn.addEventListener('click', () => {
        gnbList.classList.toggle('active');
        mobileMenuBtn.querySelector('i').className = gnbList.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
    });

    // --- 조회 기능 (XSS safe: textContent 사용) ---
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    document.getElementById('unpaidBtn').addEventListener('click', () => {
        const val = document.getElementById('unpaidInput').value.trim();
        const result = document.getElementById('unpaidResult');
        if (!val) { result.innerHTML = '<p class="result-warn"><i class="fas fa-exclamation-circle"></i> 차량번호를 입력해주세요.</p>'; return; }
        result.innerHTML = `<div class="result-card"><div class="result-icon ok"><i class="fas fa-check-circle"></i></div><div class="result-text"><strong>${escapeHtml(val)}</strong> 차량의 미납요금이 없습니다.</div></div>`;
    });

    document.getElementById('towBtn').addEventListener('click', () => {
        const val = document.getElementById('towInput').value.trim();
        const result = document.getElementById('towResult');
        if (!val) { result.innerHTML = '<p class="result-warn"><i class="fas fa-exclamation-circle"></i> 차량번호를 입력해주세요.</p>'; return; }
        result.innerHTML = `<div class="result-card"><div class="result-icon ok"><i class="fas fa-check-circle"></i></div><div class="result-text"><strong>${escapeHtml(val)}</strong> 차량은 견인 내역이 없습니다.</div></div>`;
    });

    document.getElementById('parkingSearchBtn').addEventListener('click', () => {
        const val = document.getElementById('parkingSearchInput').value.trim().toLowerCase();
        const result = document.getElementById('parkingSearchResult');
        if (!val) { result.innerHTML = '<p class="result-warn"><i class="fas fa-exclamation-circle"></i> 검색어를 입력해주세요.</p>'; return; }
        const found = PARKING_DATA.filter(p => p.name.toLowerCase().includes(val) || p.addr.toLowerCase().includes(val));
        if (found.length === 0) { result.innerHTML = '<p class="result-warn"><i class="fas fa-info-circle"></i> 검색 결과가 없습니다.</p>'; return; }
        result.innerHTML = found.map(p => {
            const status = window.getStatus(p.used, p.total);
            const remaining = p.total - p.used;
            return `<div class="result-parking"><span class="result-parking-name">${escapeHtml(p.name)}</span><span class="result-parking-addr">안양시 ${escapeHtml(p.addr)}</span><span class="result-parking-status ${status}">${window.STATUS_LABELS[status]} ${remaining}/${p.total}면</span></div>`;
        }).join('');
    });

    // --- 주차장 카드 & 슬라이더 ---
    const parkingTrack = document.getElementById('parkingGrid');
    const TYPE_LABELS = { outdoor: '노외', street: '노상', mechanical: '기계식', underground: '지하' };
    window.getStatus = function (used, total) {
        const pct = used / total;
        if (pct >= 0.85) return 'crowded';
        if (pct >= 0.6) return 'normal';
        return 'available';
    };
    window.STATUS_LABELS = { available: '여유', normal: '보통', crowded: '혼잡' };

    parkingTrack.innerHTML = PARKING_DATA.map(p => {
        const pct = Math.round(p.used / p.total * 100);
        const status = window.getStatus(p.used, p.total);
        return `<div class="parking-circle-card" data-used="${p.used}" data-total="${p.total}" data-area="${p.area}">
            <div class="circle-chart"><svg viewBox="0 0 120 120"><circle class="circle-bg" cx="60" cy="60" r="50"/><circle class="circle-fill" cx="60" cy="60" r="50"/></svg><div class="circle-center"><span class="circle-percent">${pct}%</span><span class="circle-status ${status}">${window.STATUS_LABELS[status]}</span></div></div>
            <div class="circle-info"><span class="badge-type ${p.type}">${TYPE_LABELS[p.type]}</span><h4>${p.name}</h4><p class="circle-count">주차 <strong>${p.used}</strong> / ${p.total}면</p><p class="circle-addr">${p.addr}</p></div>
        </div>`;
    }).join('');

    const CIRCUMFERENCE = 2 * Math.PI * 50;
    function getColorByPercent(pct) {
        let r, g, b;
        if (pct < 0.5) { const t = pct / 0.5; r = Math.round(26 + (230 - 26) * t); g = Math.round(122 + (168 - 122) * t); b = Math.round(58 - 58 * t); }
        else { const t = (pct - 0.5) / 0.5; r = Math.round(230 + (211 - 230) * t); g = Math.round(168 + (47 - 168) * t); b = Math.round(47 * t); }
        return `rgb(${r},${g},${b})`;
    }
    function animateCircles() {
        parkingTrack.querySelectorAll('.parking-circle-card').forEach(card => {
            const pct = parseInt(card.dataset.used) / parseInt(card.dataset.total);
            const fill = card.querySelector('.circle-fill');
            fill.style.strokeDasharray = CIRCUMFERENCE;
            fill.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
            fill.style.stroke = getColorByPercent(pct);
        });
    }

    const parkingViewport = document.querySelector('.parking-slider-viewport');
    const VISIBLE_COUNT = 3;
    let parkingIndex = 0, parkingMaxIndex = 0, parkingAutoTimer = null, currentFilter = 'all';

    function getVisibleCards() {
        return Array.from(parkingTrack.querySelectorAll('.parking-circle-card')).filter(c => currentFilter === 'all' || c.dataset.area === currentFilter);
    }
    function layoutSlider() {
        const allCards = parkingTrack.querySelectorAll('.parking-circle-card');
        const visibleCards = getVisibleCards();
        parkingMaxIndex = Math.max(0, visibleCards.length - VISIBLE_COUNT);
        if (parkingIndex > parkingMaxIndex) parkingIndex = 0;
        allCards.forEach(c => { c.style.display = (currentFilter === 'all' || c.dataset.area === currentFilter) ? '' : 'none'; });
        const gap = 16, cardWidth = (parkingViewport.offsetWidth - gap * (VISIBLE_COUNT - 1)) / VISIBLE_COUNT;
        visibleCards.forEach(c => { c.style.width = cardWidth + 'px'; c.style.minWidth = cardWidth + 'px'; c.style.marginRight = gap + 'px'; });
        parkingTrack.style.width = visibleCards.length * (cardWidth + gap) + 'px';
        parkingTrack.style.transform = `translateX(-${parkingIndex * (cardWidth + gap)}px)`;
        animateCircles();
    }
    function goNext() { parkingIndex = parkingIndex >= parkingMaxIndex ? 0 : parkingIndex + 1; layoutSlider(); }
    function goPrev() { parkingIndex = parkingIndex <= 0 ? parkingMaxIndex : parkingIndex - 1; layoutSlider(); }
    function resetAuto() { clearInterval(parkingAutoTimer); parkingAutoTimer = setInterval(goNext, 5000); }

    document.querySelector('.parking-prev').addEventListener('click', () => { goPrev(); resetAuto(); });
    document.querySelector('.parking-next').addEventListener('click', () => { goNext(); resetAuto(); });
    layoutSlider(); resetAuto();
    window.addEventListener('resize', () => layoutSlider());

    document.querySelectorAll('.area-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.area-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.area;
            parkingIndex = 0;
            layoutSlider(); resetAuto();
        });
    });

    // --- Leaflet 지도 + 안양시 공영주차장 마커 ---
    (function initMap() {
        const mapEl = document.getElementById('parkingMap');
        if (!mapEl || typeof L === 'undefined') return;

        const ANYANG_CENTER = [37.3950, 126.9350];
        const map = L.map('parkingMap', { zoomControl: false, attributionControl: false }).setView(ANYANG_CENTER, 13);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd', pane: 'overlayPane' }).addTo(map);
        L.control.zoom({ position: 'topright' }).addTo(map);

        // 안양수목원 마커
        const arboretumIcon = L.divIcon({
            className: 'parking-marker',
            html: '<div style="background:#2e7d32;color:#fff;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"><i class="fas fa-tree"></i></div>',
            iconSize: [38, 38], iconAnchor: [19, 19]
        });
        L.marker([37.4175, 126.9430], { icon: arboretumIcon, zIndexOffset: 1000 }).addTo(map)
            .bindPopup('<div style="font-family:inherit;line-height:1.6"><strong style="font-size:14px">서울대 안양수목원</strong><br><span style="font-size:12px;color:#666">안양시 만안구 안양동</span></div>');

        const resultList = document.getElementById('mapResultList');
        const resultCount = document.getElementById('mapResultCount');
        const allMarkers = [];
        const activeFilters = new Set(['outdoor', 'street', 'underground', 'mechanical']);

        function makePopup(p) {
            const pct = Math.round(p.used / p.total * 100);
            const status = window.getStatus(p.used, p.total);
            const remaining = p.total - p.used;
            const statusColor = status === 'available' ? '#2e7d32' : status === 'normal' ? '#e67e00' : '#d32f2f';
            return `<div style="min-width:220px;line-height:1.6;font-family:inherit">
                <strong style="font-size:14px">${escapeHtml(p.name)}</strong><br>
                <span style="font-size:12px;color:#666"><i class="fas fa-map-marker-alt"></i> 안양시 ${escapeHtml(p.addr)}</span>
                <div style="margin-top:8px">
                    <div style="background:#eee;border-radius:4px;height:8px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${statusColor};border-radius:4px"></div></div>
                    <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:12px">
                        <span style="color:#555">주차 ${p.used}/${p.total}면</span>
                        <span style="font-weight:700;color:${statusColor}">${window.STATUS_LABELS[status]} (잔여 ${remaining}면)</span>
                    </div>
                </div>
            </div>`;
        }

        function makeIcon(status) {
            const color = status === 'available' ? '#2e7d32' : status === 'normal' ? '#e67e00' : '#d32f2f';
            return L.divIcon({
                className: 'parking-marker',
                html: `<div class="pm-marker" style="background:${color}"><i class="fas fa-parking"></i></div>`,
                iconSize: [30, 30], iconAnchor: [15, 15]
            });
        }

        function renderAll() {
            const keyword = (document.getElementById('mapSearchInput').value || '').trim().toLowerCase();

            // 마커 전부 제거
            allMarkers.forEach(m => map.removeLayer(m.marker));
            allMarkers.length = 0;
            resultList.innerHTML = '';
            let count = 0;

            PARKING_DATA.forEach((p, idx) => {
                if (!activeFilters.has(p.type)) return;
                if (keyword && !p.name.toLowerCase().includes(keyword) && !p.addr.toLowerCase().includes(keyword)) return;

                const status = window.getStatus(p.used, p.total);
                const remaining = p.total - p.used;

                // 마커 (Nominatim 주소 기반 좌표가 없으면 표시 안 함 - 서버에서 지오코딩)
                // 현재는 PARKING_DATA에 좌표 없으므로 서버 지오코딩 API 사용
                // 좌표 있으면 마커 생성
                if (p.lat && p.lng) {
                    const marker = L.marker([p.lat, p.lng], { icon: makeIcon(status) }).addTo(map);
                    marker.bindPopup(makePopup(p), { maxWidth: 280 });
                    marker.bindTooltip(escapeHtml(p.name), { direction: 'top', offset: [0, -12] });
                    marker.on('click', () => highlightListItem(idx));
                    allMarkers.push({ marker, data: p, idx });
                }

                // 목록
                const div = document.createElement('div');
                div.className = 'map-result-item';
                div.dataset.idx = idx;
                div.innerHTML = `<div class="map-result-icon ${status}"><i class="fas fa-parking"></i></div>
                    <div class="map-result-info">
                        <h5>${escapeHtml(p.name)}</h5>
                        <p>안양시 ${escapeHtml(p.addr)}</p>
                        <div class="map-result-meta">
                            <div class="map-result-bar"><div class="map-result-bar-fill ${status}" style="width:${Math.round(p.used / p.total * 100)}%"></div></div>
                            <span class="map-result-slots ${status}">${window.STATUS_LABELS[status]} ${remaining}면</span>
                        </div>
                    </div>`;
                div.addEventListener('click', () => {
                    if (p.lat && p.lng) {
                        map.setView([p.lat, p.lng], 16, { animate: true });
                        const entry = allMarkers.find(m => m.idx === idx);
                        if (entry) setTimeout(() => entry.marker.openPopup(), 400);
                    }
                    highlightListItem(idx);
                });
                resultList.appendChild(div);
                count++;
            });

            resultCount.textContent = count + '개';
        }

        function highlightListItem(idx) {
            resultList.querySelectorAll('.map-result-item').forEach(el => el.classList.remove('active'));
            const target = resultList.querySelector(`[data-idx="${idx}"]`);
            if (target) { target.classList.add('active'); target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        }

        // 필터 칩
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const type = chip.dataset.type;
                if (type === 'all') {
                    const allActive = activeFilters.size === 4;
                    document.querySelectorAll('.filter-chip').forEach(c => { if (allActive) { c.classList.remove('active'); activeFilters.clear(); } else { c.classList.add('active'); ['outdoor', 'street', 'underground', 'mechanical'].forEach(t => activeFilters.add(t)); } });
                } else {
                    chip.classList.toggle('active');
                    if (activeFilters.has(type)) activeFilters.delete(type); else activeFilters.add(type);
                    const allChip = document.querySelector('.filter-chip[data-type="all"]');
                    if (activeFilters.size === 4) allChip.classList.add('active'); else allChip.classList.remove('active');
                }
                renderAll();
            });
        });

        document.getElementById('mapSearchInput').addEventListener('input', renderAll);

        // 내 위치 버튼
        document.getElementById('mapLocateBtn').addEventListener('click', () => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(pos => {
                map.setView([pos.coords.latitude, pos.coords.longitude], 16, { animate: true });
                L.circleMarker([pos.coords.latitude, pos.coords.longitude], { radius: 7, color: '#fff', fillColor: '#0055a5', fillOpacity: 1, weight: 2.5 }).addTo(map);
            });
        });

        // 서버 캐시에서 좌표 가져와서 마커 표시
        async function loadCoords() {
            try {
                const res = await fetch('/api/geocode');
                if (!res.ok) return;
                const cache = await res.json();
                PARKING_DATA.forEach(p => {
                    const key = '안양시 ' + p.addr;
                    if (cache[key] && !p.lat) {
                        p.lat = cache[key].lat;
                        p.lng = cache[key].lng;
                    }
                });
            } catch {}
            renderAll();
        }

        renderAll();
        loadCoords();
    })();

    // --- 유관기관 바로가기 ---
    const FAMILY_URLS = { '안양시청': 'https://www.anyang.go.kr', '안양도시공사': 'https://www.auc.or.kr', '경기도 교통정보센터': 'https://gits.gg.go.kr', '국토교통부': 'https://www.molit.go.kr', '한국교통안전공단': 'https://www.kotsa.or.kr' };
    const familyGoBtn = document.querySelector('.btn-go');
    const familySelect = document.getElementById('familySite');
    if (familyGoBtn && familySelect) {
        familyGoBtn.addEventListener('click', () => {
            const url = FAMILY_URLS[familySelect.value];
            if (url) window.open(url, '_blank');
        });
    }
})();
