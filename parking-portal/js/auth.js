// ===== 로그인/회원가입 (서버 API 연동, XSS safe) =====
(function () {
    'use strict';

    const loginOverlay = document.getElementById('loginOverlay');
    const loginClose = document.getElementById('loginClose');
    const loginSubmit = document.getElementById('loginSubmit');
    const testLoginBtn = document.getElementById('testLoginBtn');
    const testAccount = document.getElementById('testAccount');
    const loginIdInput = document.getElementById('loginId');
    const loginPwInput = document.getElementById('loginPw');
    const utilRight = document.getElementById('utilRight');

    const signupOverlay = document.getElementById('signupOverlay');
    const signupCloseBtn = document.getElementById('signupClose');
    const signupSubmitBtn = document.getElementById('signupSubmit');
    const idCheckBtn = document.getElementById('idCheckBtn');
    const agreeAll = document.getElementById('agreeAll');
    const agreeItems = document.querySelectorAll('.agree-item');

    // 전역 로그인 상태
    window.currentUser = null;
    window.authToken = null;
    let idChecked = false;

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- 로그인 모달 ---
    function bindLoginBtn() {
        const btn = document.getElementById('loginBtn');
        if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); loginOverlay.classList.add('open'); loginIdInput.focus(); });
        const sbtn = document.getElementById('signupBtn');
        if (sbtn) sbtn.addEventListener('click', (e) => { e.preventDefault(); signupOverlay.classList.add('open'); });
    }
    bindLoginBtn();

    loginClose.addEventListener('click', () => loginOverlay.classList.remove('open'));
    loginOverlay.addEventListener('click', (e) => { if (e.target === loginOverlay) loginOverlay.classList.remove('open'); });

    function doLogin(userData, token) {
        window.currentUser = userData;
        window.authToken = token;
        loginOverlay.classList.remove('open');
        utilRight.innerHTML = `
            <span class="util-user"><i class="fas fa-user-circle"></i>
            <strong>${escapeHtml(userData.name)}</strong>님
            <button class="logout-btn" id="logoutBtn">로그아웃</button></span>
            <span class="divider">|</span><a href="#">마이페이지</a>`;
        document.getElementById('logoutBtn').addEventListener('click', doLogout);
    }

    function doLogout() {
        window.currentUser = null;
        window.authToken = null;
        utilRight.innerHTML = `
            <a href="#" id="loginBtn">로그인</a><span class="divider">|</span>
            <a href="#" id="signupBtn">회원가입</a><span class="divider">|</span>
            <a href="#">마이페이지</a>`;
        bindLoginBtn();
    }

    // --- 서버 로그인 ---
    loginSubmit.addEventListener('click', async () => {
        const id = loginIdInput.value.trim();
        const pw = loginPwInput.value.trim();
        if (!id || !pw) { alert('아이디와 비밀번호를 입력하세요.'); return; }
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, pw })
            });
            const data = await res.json();
            if (data.success) {
                doLogin(data.user, data.token);
            } else {
                alert(data.error || '로그인에 실패했습니다.');
            }
        } catch {
            alert('서버에 연결할 수 없습니다.');
        }
    });

    loginPwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginSubmit.click(); });

    // --- 테스트 계정 ---
    testLoginBtn.addEventListener('click', () => {
        const val = testAccount.value;
        if (!val) { alert('테스트 계정을 선택하세요.'); return; }
        const [id, pw] = val.split('|');
        loginIdInput.value = id;
        loginPwInput.value = pw;
        loginSubmit.click();
    });

    // --- 회원가입 모달 ---
    signupCloseBtn.addEventListener('click', () => signupOverlay.classList.remove('open'));
    signupOverlay.addEventListener('click', (e) => { if (e.target === signupOverlay) signupOverlay.classList.remove('open'); });
    document.getElementById('goLoginBtn').addEventListener('click', (e) => {
        e.preventDefault();
        signupOverlay.classList.remove('open');
        loginOverlay.classList.add('open');
        loginIdInput.focus();
    });

    // 아이디 중복확인 (서버 API)
    idCheckBtn.addEventListener('click', async () => {
        const id = document.getElementById('signupId').value.trim();
        const msg = document.getElementById('idMsg');
        if (!/^[a-zA-Z0-9]{4,20}$/.test(id)) {
            msg.textContent = '영문, 숫자 4~20자로 입력해주세요.';
            msg.className = 'field-msg err';
            idChecked = false;
            return;
        }
        try {
            const res = await fetch('/api/auth/check-id/' + encodeURIComponent(id));
            const data = await res.json();
            if (data.available) {
                msg.textContent = '사용 가능한 아이디입니다.';
                msg.className = 'field-msg ok';
                idChecked = true;
            } else {
                msg.textContent = '이미 사용 중인 아이디입니다.';
                msg.className = 'field-msg err';
                idChecked = false;
            }
        } catch {
            msg.textContent = '서버 확인 실패';
            msg.className = 'field-msg err';
        }
    });

    document.getElementById('signupId').addEventListener('input', () => { idChecked = false; document.getElementById('idMsg').textContent = ''; });

    // 비밀번호 검증
    document.getElementById('signupPw').addEventListener('input', () => {
        const pw = document.getElementById('signupPw').value;
        const msg = document.getElementById('pwMsg');
        if (!pw) { msg.textContent = ''; return; }
        if (pw.length < 8 || !/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) { msg.textContent = '영문, 숫자 포함 8자 이상'; msg.className = 'field-msg err'; }
        else { msg.textContent = '사용 가능'; msg.className = 'field-msg ok'; }
    });
    document.getElementById('signupPwConfirm').addEventListener('input', () => {
        const pw = document.getElementById('signupPw').value, pwc = document.getElementById('signupPwConfirm').value;
        const msg = document.getElementById('pwConfirmMsg');
        if (!pwc) { msg.textContent = ''; return; }
        msg.textContent = pw === pwc ? '일치' : '불일치';
        msg.className = pw === pwc ? 'field-msg ok' : 'field-msg err';
    });

    // 전체 동의
    agreeAll.addEventListener('change', () => agreeItems.forEach(i => i.checked = agreeAll.checked));
    agreeItems.forEach(i => i.addEventListener('change', () => { agreeAll.checked = [...agreeItems].every(x => x.checked); }));

    // 서버 회원가입
    signupSubmitBtn.addEventListener('click', async () => {
        const id = document.getElementById('signupId').value.trim();
        const pw = document.getElementById('signupPw').value;
        const pwc = document.getElementById('signupPwConfirm').value;
        const name = document.getElementById('signupName').value.trim();
        const phone = document.getElementById('signupPhone').value.trim();
        const car = document.getElementById('signupCar').value.trim();
        const requiredAgrees = [...agreeItems].slice(0, 2);

        if (!id) { alert('아이디를 입력해주세요.'); return; }
        if (!idChecked) { alert('아이디 중복확인을 해주세요.'); return; }
        if (pw.length < 8 || !/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) { alert('비밀번호를 올바르게 입력해주세요.'); return; }
        if (pw !== pwc) { alert('비밀번호가 일치하지 않습니다.'); return; }
        if (!name) { alert('이름을 입력해주세요.'); return; }
        if (!phone) { alert('휴대폰 번호를 입력해주세요.'); return; }
        if (!requiredAgrees.every(a => a.checked)) { alert('필수 약관에 동의해주세요.'); return; }

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, pw, name, phone, car })
            });
            const data = await res.json();
            if (data.success) {
                alert('회원가입이 완료되었습니다!');
                signupOverlay.classList.remove('open');
                loginIdInput.value = id;
                loginPwInput.value = '';
                loginOverlay.classList.add('open');
                loginPwInput.focus();
            } else {
                alert(data.error || '회원가입에 실패했습니다.');
            }
        } catch {
            alert('서버에 연결할 수 없습니다.');
        }
    });
})();
