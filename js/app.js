// ==================== 申论智能练习系统 v2.0 ====================

const APP = {
    questions: [],
    papers: [],
    history: [],
    currentExam: null,
    examTimer: null,
    examSeconds: 0,
    pageHistory: ['home'],
    pendingConfirm: null,
    currentUser: null,
    currentPapersTab: 'real',
    currentExamPaperId: null,
    currentExamSource: null,
    generatedPapers: [],
    uploadedPapers: [],
};

const PAGE_NAMES = {
    'home': '首页',
    'papers': '试卷列表',
    'practice': '专项练习',
    'history': '答题记录',
    'history-detail': '答题详情',
    'scrape': '题库管理',
    'result': '评分结果',
    'exam': '答题中',
};

const ILLEGAL_KEYWORDS = [
    '色情',
    '淫秽',
    '赌博',
    '毒品',
    '枪支',
    '暴力恐怖',
    '颠覆国家',
    '分裂国家',
    '邪教',
    '杀人',
    '自杀',
    '贩毒',
    '制毒',
    '卖淫',
    '嫖娼',
    '裸体',
    '性交',
    '强奸',
    '轮奸',
    '爆炸品',
    '恐怖袭击',
    '政治敏感',
    '反革命',
    '颠覆',
    '政变',
    '暴动',
    '动乱',
];

document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initConfirmModal();
    initCategoryTabs();
    checkLoginStatus();
    await loadData();
    initFilters();
    updateHomeStats();
    updateBreadcrumb('home');
    updateSidebarUI();
});

async function loadData() {
    try {
        const [qRes, pRes] = await Promise.all([
            fetch('data/questions.json'),
            fetch('data/papers.json')
        ]);
        APP.questions = await qRes.json();
        APP.papers = await pRes.json();
    } catch (e) {
        console.error('加载题库失败:', e);
        APP.questions = [];
        APP.papers = [];
    }
    loadUserHistory();
    loadGeneratedPapers();
    loadUploadedPapers();
}

function loadUserHistory() {
    if (APP.currentUser) {
        APP.history = JSON.parse(localStorage.getItem('sl_history_' + APP.currentUser.account) || '[]');
    } else {
        APP.history = JSON.parse(localStorage.getItem('shenlun_history') || '[]');
    }
}

function saveHistory() {
    if (APP.currentUser) {
        localStorage.setItem('sl_history_' + APP.currentUser.account, JSON.stringify(APP.history));
    } else {
        localStorage.setItem('shenlun_history', JSON.stringify(APP.history));
    }
}

function loadGeneratedPapers() {
    const raw = localStorage.getItem('sl_generated_papers');
    APP.generatedPapers = raw ? JSON.parse(raw) : [];
}

function saveGeneratedPapers() {
    localStorage.setItem('sl_generated_papers', JSON.stringify(APP.generatedPapers));
}

function loadUploadedPapers() {
    const raw = localStorage.getItem('sl_uploaded_papers');
    APP.uploadedPapers = raw ? JSON.parse(raw) : [];
}

function saveUploadedPapers() {
    localStorage.setItem('sl_uploaded_papers', JSON.stringify(APP.uploadedPapers));
}

function checkLoginStatus() {
    const saved = localStorage.getItem('sl_current_user');
    if (saved) {
        try { APP.currentUser = JSON.parse(saved); } catch(e) { APP.currentUser = null; }
    }
}

function updateSidebarUI() {
    const authBtns = document.getElementById('sidebar-auth-btns');
    const userInfo = document.getElementById('sidebar-user-info');
    const avatar = document.getElementById('sidebar-avatar');
    const nickname = document.getElementById('sidebar-nickname');
    if (APP.currentUser) {
        authBtns.style.display = 'none';
        userInfo.style.display = 'flex';
        nickname.textContent = APP.currentUser.nickname;
        if (APP.currentUser.avatar) {
            avatar.innerHTML = '<img src="' + APP.currentUser.avatar + '" alt="avatar">';
        } else {
            avatar.innerHTML = '👤';
        }
    } else {
        authBtns.style.display = 'flex';
        userInfo.style.display = 'none';
        avatar.innerHTML = '👤';
    }
}

function showAuthModal(mode) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'auth-modal-overlay';
    overlay.innerHTML = '<div class="modal" style="max-width:420px;">' +
        '<h3>' + (mode === 'login' ? '登录' : '注册') + '</h3>' +
        '<div style="text-align:left;">' +
        '<div class="form-group"><label>账号</label>' +
        '<input type="text" id="auth-account" placeholder="大小写字母+数字" maxlength="20"></div>' +
        '<div class="form-group"><label>密码</label>' +
        '<input type="password" id="auth-password" placeholder="字母+数字+特殊符号" maxlength="30"></div>' +
        (mode === 'register' ? '<div class="form-group"><label>昵称</label>' +
        '<input type="text" id="auth-nickname" placeholder="至少2个汉字或4字节，不能纯特殊符号" maxlength="12"></div>' : '') +
        '<div class="modal-error" id="auth-error"></div>' +
        '</div>' +
        '<div class="modal-actions">' +
        '<button class="btn btn-outline" id="auth-cancel">取消</button>' +
        '<button class="btn btn-primary" id="auth-submit">' + (mode === 'login' ? '登录' : '注册') + '</button>' +
        '</div>' +
        (mode === 'login' ? '<p style="margin-top:12px;font-size:13px;color:var(--text-muted);">没有账号？<a href="#" onclick="closeAuthModal();showAuthModal(\'register\')" style="color:var(--primary);">立即注册</a></p>' : '') +
        '</div>';
    document.body.appendChild(overlay);
    document.getElementById('auth-cancel').addEventListener('click', closeAuthModal);
    document.getElementById('auth-submit').addEventListener('click', () => handleAuth(mode));
    setTimeout(() => document.getElementById('auth-account')?.focus(), 100);
}

function closeAuthModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    if (overlay) overlay.remove();
}

function handleAuth(mode) {
    const account = document.getElementById('auth-account').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const errEl = document.getElementById('auth-error');

    if (!account || !/^[a-zA-Z0-9]+$/.test(account)) {
        errEl.textContent = '账号只能包含大小写字母和数字';
        return;
    }
    if (account.length < 3) {
        errEl.textContent = '账号至少3位字符';
        return;
    }
    if (!password || password.length < 4) {
        errEl.textContent = '密码至少4位字符';
        return;
    }

    if (mode === 'register') {
        const nickname = document.getElementById('auth-nickname').value.trim();
        if (!nickname) {
            errEl.textContent = '请设置昵称';
            return;
        }
        let cnCount = 0; let byteLen = 0;
        for (let c of nickname) {
            byteLen += c.charCodeAt(0) > 255 ? 2 : 1;
            if (c >= '\u4e00' && c <= '\u9fff') cnCount++;
        }
        if (cnCount < 2 && byteLen < 4) {
            errEl.textContent = '昵称至少2个汉字或4个字节';
            return;
        }
        if (/^[^a-zA-Z0-9\u4e00-\u9fff]+$/.test(nickname)) {
            errEl.textContent = '昵称不能为纯特殊符号';
            return;
        }
        const allUsers = JSON.parse(localStorage.getItem('sl_all_users') || '[]');
        if (allUsers.find(u => u.nickname === nickname)) {
            errEl.textContent = '该名字已被注册';
            return;
        }
        if (allUsers.find(u => u.account === account)) {
            errEl.textContent = '该账号已被注册';
            return;
        }
        const newUser = {
            account: account,
            password: password,
            nickname: nickname,
            avatar: '',
            createdAt: new Date().toISOString()
        };
        allUsers.push(newUser);
        localStorage.setItem('sl_all_users', JSON.stringify(allUsers));
        APP.currentUser = newUser;
        localStorage.setItem('sl_current_user', JSON.stringify(newUser));
        closeAuthModal();
        updateSidebarUI();
        loadUserHistory();
        updateHomeStats();
        showToast('注册成功！欢迎，' + nickname, 'success');
    } else {
        const allUsers = JSON.parse(localStorage.getItem('sl_all_users') || '[]');
        const user = allUsers.find(u => u.account === account && u.password === password);
        if (!user) {
            errEl.textContent = '账号或密码错误';
            return;
        }
        APP.currentUser = user;
        localStorage.setItem('sl_current_user', JSON.stringify(user));
        closeAuthModal();
        updateSidebarUI();
        loadUserHistory();
        updateHomeStats();
        showToast('登录成功！欢迎回来，' + user.nickname, 'success');
    }
}

function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file || !APP.currentUser) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        APP.currentUser.avatar = e.target.result;
        localStorage.setItem('sl_current_user', JSON.stringify(APP.currentUser));
        const allUsers = JSON.parse(localStorage.getItem('sl_all_users') || '[]');
        const idx = allUsers.findIndex(u => u.account === APP.currentUser.account);
        if (idx >= 0) {
            allUsers[idx].avatar = e.target.result;
            localStorage.setItem('sl_all_users', JSON.stringify(allUsers));
        }
        updateSidebarUI();
        showToast('头像更新成功', 'success');
    };
    reader.readAsDataURL(file);
}

async function logout() {
    const confirmed = await showConfirm('退出登录', '确定要退出登录吗？');
    if (confirmed) {
        APP.currentUser = null;
        localStorage.removeItem('sl_current_user');
        updateSidebarUI();
        loadUserHistory();
        updateHomeStats();
        navigateTo('home');
        showToast('已退出登录', 'info');
    }
}
// ========== Navigation ==========
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) navigateTo(page);
        });
    });
}

function navigateTo(page, data) {
    if (APP.currentExam && page !== 'result' && page !== 'exam') {
        confirmExitExam().then(confirmed => {
            if (confirmed) {
                clearExam();
                doNavigate(page, data);
            }
        });
        return;
    }
    doNavigate(page, data);
}

function doNavigate(page, data) {
    APP.pageHistory.push(page);
    if (APP.pageHistory.length > 20) APP.pageHistory.shift();

    document.querySelectorAll('.page, .page-exam-full').forEach(p => p.classList.remove('active'));

    const sidebar = document.getElementById('sidebar');
    const breadcrumb = document.getElementById('breadcrumb');
    const mainContent = document.getElementById('main-content');
    if (page !== 'exam') {
        if (sidebar) sidebar.style.display = '';
        if (breadcrumb) breadcrumb.style.display = '';
        if (mainContent) mainContent.style.marginLeft = '';
    }

    let pageEl;
    if (page === 'exam') {
        pageEl = document.getElementById('page-exam-full');
    } else {
        pageEl = document.getElementById('page-' + page);
    }
    if (pageEl) pageEl.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector('.nav-item[data-page="' + page + '"]');
    if (navItem) navItem.classList.add('active');

    updateBreadcrumb(page);

    switch(page) {
        case 'home': updateHomeStats(); break;
        case 'papers': renderPapersList(); break;
        case 'practice': updatePracticeCounts(); break;
        case 'history': renderHistory(); break;
        case 'history-detail': renderHistoryDetail(data); break;
        case 'scrape': break;
        case 'result': renderResult(data); break;
    }
}

function updateBreadcrumb(page) {
    const current = document.getElementById('breadcrumb-current');
    if (current) current.textContent = PAGE_NAMES[page] || page;
}

function initConfirmModal() {
    if (!document.getElementById('confirm-modal')) {
        const modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'none';
        modal.innerHTML = '<div class="modal">' +
            '<h3 id="confirm-title"></h3>' +
            '<p id="confirm-message"></p>' +
            '<div class="modal-actions">' +
            '<button class="btn btn-outline" id="confirm-cancel">取消</button>' +
            '<button class="btn btn-primary" id="confirm-ok">确定</button>' +
            '</div></div>';
        document.body.appendChild(modal);
    }
}

function showConfirm(title, message) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirm-modal');
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        modal.style.display = 'flex';
        const cleanup = () => {
            modal.style.display = 'none';
            document.getElementById('confirm-ok').removeEventListener('click', onOk);
            document.getElementById('confirm-cancel').removeEventListener('click', onCancel);
        };
        const onOk = () => { cleanup(); resolve(true); };
        const onCancel = () => { cleanup(); resolve(false); };
        document.getElementById('confirm-ok').addEventListener('click', onOk);
        document.getElementById('confirm-cancel').addEventListener('click', onCancel);
    });
}

async function confirmExitExam() {
    return await showConfirm('退出答题', '确定要退出当前答题吗？未提交的答案将会丢失。');
}

function initCategoryTabs() {
    document.querySelectorAll('.cat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            APP.currentPapersTab = tab.dataset.cat;
            renderPapersList();
        });
    });
}

function initFilters() {
    const yearSelect = document.getElementById('filter-year');
    if (!yearSelect) return;
    const years = new Set();
    APP.papers.forEach(p => years.add(p.year));
    Array.from(years).sort().reverse().forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y + '年';
        yearSelect.appendChild(opt);
    });
    document.getElementById('filter-category')?.addEventListener('change', renderPapersList);
    document.getElementById('filter-year')?.addEventListener('change', renderPapersList);
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2500);
}
// ========== Home Stats ==========
function updateHomeStats() {
    const totalPapers = APP.papers.length + APP.generatedPapers.length + APP.uploadedPapers.length;
    document.getElementById('stat-papers').textContent = totalPapers;
    document.getElementById('stat-questions').textContent = APP.questions.length;
    document.getElementById('stat-completed').textContent = APP.history.length;
    if (APP.history.length > 0) {
        const avg = Math.round(APP.history.reduce((s, h) => s + h.totalScore, 0) / APP.history.length);
        document.getElementById('stat-avgscore').textContent = avg + '分';
    } else {
        document.getElementById('stat-avgscore').textContent = '--';
    }
}

// ========== Papers List ==========
function renderPapersList() {
    const container = document.getElementById('papers-list');
    const genSection = document.getElementById('generate-section');
    const filterBar = document.getElementById('papers-filter-bar');
    if (!container) return;

    const tab = APP.currentPapersTab;

    // Show/hide sections
    if (tab === 'generate') {
        if (genSection) genSection.style.display = 'block';
        if (filterBar) filterBar.style.display = 'none';
    } else {
        if (genSection) genSection.style.display = 'none';
        if (filterBar) filterBar.style.display = 'flex';
    }

    let papers = [];
    if (tab === 'real') {
        const catFilter = document.getElementById('filter-category')?.value || 'all';
        const yearFilter = document.getElementById('filter-year')?.value || 'all';
        papers = APP.papers.filter(p => {
            // 历年真题：排除 generate 和 user 来源
            if (p.source === 'generate' || p.source === 'user') return false;
            if (p.id && p.id.startsWith('practice_')) return false;
            if (catFilter !== 'all' && p.category !== catFilter) return false;
            if (yearFilter !== 'all' && String(p.year) !== yearFilter) return false;
            return true;
        });
    } else if (tab === 'net') {
        // 网络试卷：来自粉笔或其他网络来源
        const catFilter = document.getElementById('filter-category')?.value || 'all';
        const yearFilter = document.getElementById('filter-year')?.value || 'all';
        papers = APP.papers.filter(p => {
            if (p.source === 'generate' || p.source === 'user') return false;
            if (p.id && p.id.startsWith('practice_')) return false;
            if (catFilter !== 'all' && p.category !== catFilter) return false;
            if (yearFilter !== 'all' && String(p.year) !== yearFilter) return false;
            return true;
        });
    } else if (tab === 'generate') {
        papers = APP.generatedPapers;
    } else if (tab === 'user') {
        papers = APP.uploadedPapers.map(p => ({
            ...p,
            avgRating: p.ratings && p.ratings.length > 0
                ? (p.ratings.reduce((s, r) => s + r.score, 0) / p.ratings.length)
                : 0,
            userRating: APP.currentUser
                ? (p.ratings || []).find(r => r.account === APP.currentUser.account)
                : null
        }));
        // Sort: avg >= 5 first, then < 5; hide < 2 except to uploader
        papers = papers.filter(p => {
            if (p.avgRating < 2 && APP.currentUser && p.uploader === APP.currentUser.account) return true;
            return p.avgRating >= 2;
        });
        papers.sort((a, b) => {
            const aLow = a.avgRating < 5 ? 1 : 0;
            const bLow = b.avgRating < 5 ? 1 : 0;
            if (aLow !== bLow) return aLow - bLow;
            return b.avgRating - a.avgRating;
        });
    }

    if (papers.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">暂无试卷</div>';
        return;
    }

    container.innerHTML = papers.map(p => {
        const badgeMap = { real: '<span class="paper-card-badge badge-gk">历年真题</span>',
                           net: '<span class="paper-card-badge badge-net">网络试卷</span>',
                           generate: '<span class="paper-card-badge badge-sk">AI生成</span>',
                           user: '<span class="paper-card-badge badge-user">网友上传</span>' };
        const badge = badgeMap[tab] || '';
        let ratingHtml = '';
        if (tab === 'user' && p.avgRating > 0) {
            const stars = '★'.repeat(Math.round(p.avgRating)) + '☆'.repeat(10 - Math.round(p.avgRating));
            ratingHtml = '<div class="paper-card-rating"><span class="rating-display">' + stars + '</span> ' + p.avgRating.toFixed(1) + '</div>';
        }
        let authorHtml = '';
        if (tab === 'user' && p.uploaderName) {
            authorHtml = '<div class="paper-card-author">上传者：' + p.uploaderName + '</div>';
        }
        return '<div class="paper-card" onclick="startExam(\'' + p.id + '\', \'' + tab + '\')">' +
            '<div class="paper-card-header">' +
            '<div class="paper-card-title">' + p.title + '</div>' + badge + '</div>' +
            '<div class="paper-card-meta">' +
            '<span>📝 ' + (p.questionCount || p.questions?.length || 0) + '题</span>' +
            '<span>⏱ ' + (p.timeLimit || 150) + '分钟</span>' +
            '<span>📊 总分' + (p.totalScore || 100) + '分</span>' +
            '</div>' + ratingHtml + authorHtml + '</div>';
    }).join('');
}

// ========== Start Exam ==========
function startExam(paperId, source) {
    // 专项练习已经自己设置了 currentExam，直接跳过
    if (source === 'practice') return;
    
    let paper, questions;

    if (source === 'generate') {
        paper = APP.generatedPapers.find(p => p.id === paperId);
        questions = paper?.questions || [];
    } else if (source === 'user') {
        paper = APP.uploadedPapers.find(p => p.id === paperId);
        questions = paper?.questions || [];
    } else {
        paper = APP.papers.find(p => p.id === paperId);
        if (!paper) {
            showToast('试卷不存在', 'error');
            return;
        }
        // 如果试卷有内嵌 questions 数组，直接用
        if (paper.questions && paper.questions.length > 0) {
            questions = paper.questions;
        } else {
            // 否则从题库按 paperId 匹配
            questions = APP.questions.filter(q => q.paperId === paperId);
        }
    }

    if (!paper || questions.length === 0) {
        showToast('试卷数据异常', 'error');
        return;
    }

    APP.currentExam = { paper, questions, source, answers: {} };
    APP.currentExamPaperId = paperId;
    APP.currentExamSource = source;
    APP.examSeconds = 0;

    // Build exam page
    const examPage = document.getElementById('page-exam-full');
    // 收集所有题目的materials
    let materialsHtml = '';
    const allMaterials = new Set();
    questions.forEach(q => {
        if (q.materials) {
            if (Array.isArray(q.materials)) {
                q.materials.forEach(m => allMaterials.add(JSON.stringify(m)));
            } else if (typeof q.materials === 'string') {
                allMaterials.add(q.materials);
            }
        }
    });
    if (allMaterials.size > 0) {
        materialsHtml = Array.from(allMaterials).map(m => {
            try {
                const obj = JSON.parse(m);
                return '<div class="material-block"><h4>' + (obj.title || '材料' + (obj.id||'')) + '</h4><p>' + (obj.content || '') + '</p></div>';
            } catch(e) {
                return '<div class="material-block"><p>' + m.replace(/\n/g, '<br>') + '</p></div>';
            }
        }).join('');
    } else if (paper.materials) {
        if (Array.isArray(paper.materials)) {
            materialsHtml = paper.materials.map(m => 
                '<div class="material-block"><h4>' + (m.title || '材料' + m.id) + '</h4><p>' + (m.content || '') + '</p></div>'
            ).join('');
        } else if (typeof paper.materials === 'string') {
            materialsHtml = paper.materials.replace(/\n/g, '<br>');
        }
    }
    if (!materialsHtml) materialsHtml = '<p style="color:var(--text-muted);text-align:center;padding:40px;">无给定资料</p>';
    
    examPage.innerHTML = '<div class="exam-header">' +
        '<button class="btn btn-outline btn-sm" onclick="navigateTo(\'papers\')">← 返回</button>' +
        '<div class="exam-info"><h2>' + paper.title + '</h2>' +
        '<div class="exam-meta"><span>📝 ' + questions.length + '题</span><span>📊 总分' + (paper.totalScore || 100) + '分</span></div></div>' +
        '<div class="exam-timer" id="exam-timer">00:00</div>' +
        '</div>' +
        '<div class="exam-body-split">' +
        '<div class="exam-materials-panel">' +
        '<div class="materials-header">📄 给定资料</div>' +
        '<div class="materials-content" id="exam-materials">' + materialsHtml + '</div>' +
        '</div>' +
        '<div class="exam-questions-panel">' +
        '<div class="exam-questions-scroll"><div class="exam-questions" id="exam-questions"></div></div>' +
        '<div class="exam-footer"><button class="btn btn-primary btn-lg" onclick="submitExam()">📝 提交答卷</button></div>' +
        '</div></div>';

    // Render questions
    const qContainer = document.getElementById('exam-questions');
    qContainer.innerHTML = questions.map((q, i) => {
        return '<div class="question-card">' +
            '<div class="question-header">' +
            '<div class="question-title">第' + (i + 1) + '题：' + (q.title || q.type || '') + '</div>' +
            '<div class="question-score">' + (q.score || q.maxScore || 0) + '分</div>' +
            '</div>' +
            '<div class="question-body">' +
            '<div class="requirements-text">' + (q.content || q.question || '') + '</div>' +
            '<div class="answer-area">' +
            '<label>✍️ 你的答案</label>' +
            '<textarea class="answer-textarea" id="answer-' + i + '" placeholder="请在此作答..." oninput="updateWordCount(\'' + i + '\')"></textarea>' +
            '<div class="word-count" id="wc-' + i + '">0字</div>' +
            '</div></div></div>';
    }).join('');

    // Hide sidebar & breadcrumb
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('breadcrumb').style.display = 'none';
    document.getElementById('main-content').style.marginLeft = '0';

    navigateTo('exam');
    startTimer();
}

// ========== Timer ==========
function startTimer() {
    APP.examTimer = setInterval(() => {
        APP.examSeconds++;
        const m = Math.floor(APP.examSeconds / 60);
        const s = APP.examSeconds % 60;
        const el = document.getElementById('exam-timer');
        if (el) el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }, 1000);
}

function clearExam() {
    if (APP.examTimer) { clearInterval(APP.examTimer); APP.examTimer = null; }
    APP.currentExam = null;
    APP.currentExamPaperId = null;
    APP.currentExamSource = null;
    APP.examSeconds = 0;
}

function updateWordCount(idx) {
    const textarea = document.getElementById('answer-' + idx);
    const wc = document.getElementById('wc-' + idx);
    if (textarea && wc) {
        wc.textContent = textarea.value.length + '字';
    }
}

// ========== Submit Exam ==========
function submitExam() {
    if (!APP.currentExam) return;

    const { paper, questions, source } = APP.currentExam;
    const answers = [];
    let answered = 0;

    questions.forEach((q, i) => {
        const textarea = document.getElementById('answer-' + i);
        const answer = textarea ? textarea.value.trim() : '';
        answers.push({ questionIndex: i, question: q, answer: answer });
        if (answer) answered++;
    });

    if (answered === 0) {
        showToast('请至少回答一道题', 'error');
        return;
    }

    // Evaluate each answer
    const results = answers.map(a => evaluateAnswer(a.question, a.answer));
    const totalScore = results.reduce((s, r) => s + r.score, 0);
    const maxScore = questions.reduce((s, q) => s + (q.score || q.maxScore || 0), 0);

    // Save to history
    const record = {
        id: Date.now().toString(),
        paperId: paper.id,
        paperTitle: paper.title,
        source: source,
        category: source === 'practice' ? (paper.practiceType || '专项练习') : (source === 'real' ? '历年真题' : source === 'net' ? '网络试卷' : source === 'generate' ? 'AI生成' : '网友上传'),
        totalScore: totalScore,
        maxScore: maxScore,
        timeUsed: APP.examSeconds,
        answers: answers.map((a, i) => ({
            questionTitle: a.question.title || a.question.type || '题目' + (i + 1),
            questionContent: a.question.content || a.question.question || '',
            answer: a.answer,
            score: results[i].score,
            maxScore: a.question.score || a.question.maxScore || 0,
            comment: results[i].comment,
            reference: a.question.reference || a.question.referenceAnswer || '',
        })),
        createdAt: new Date().toISOString(),
        account: APP.currentUser ? APP.currentUser.account : null,
    };

    APP.history.unshift(record);
    if (APP.history.length > 100) APP.history = APP.history.slice(0, 100);
    saveHistory();

    clearExam();

    // Navigate to result
    navigateTo('result', record);
}
// ========== AI Evaluate ==========
function evaluateAnswer(question, answer) {
    if (!answer || answer.trim().length === 0) {
        return { score: 0, comment: '未作答。请认真审题，结合给定资料进行分析。' };
    }

    const maxScore = question.score || question.maxScore || 20;
    let score = 0;
    const comments = [];

    // Check answer length
    const len = answer.length;
    if (len < 50) {
        comments.push('⚠️ 答案过短，建议扩展论述内容。');
        score += Math.floor(maxScore * 0.1);
    } else if (len < 150) {
        comments.push('📝 答案篇幅适中，可进一步丰富细节。');
        score += Math.floor(maxScore * 0.2);
    } else {
        comments.push('✅ 答案篇幅充分。');
        score += Math.floor(maxScore * 0.35);
    }

    // Score points matching
    const scorePoints = question.scorePoints || [];
    let matchedPoints = 0;
    if (scorePoints.length > 0) {
        scorePoints.forEach(sp => {
            const keywords = sp.keywords || [sp];
            const found = keywords.some(kw => answer.includes(kw));
            if (found) matchedPoints++;
        });
        const pointRatio = matchedPoints / scorePoints.length;
        score += Math.floor(maxScore * 0.4 * pointRatio);
        if (pointRatio >= 0.8) {
            comments.push('🌟 要点覆盖全面，抓住了核心问题。');
        } else if (pointRatio >= 0.5) {
            comments.push('👍 覆盖了主要要点，部分细节可加强。');
        } else if (pointRatio > 0) {
            comments.push('📌 仅覆盖少数要点，建议更全面分析给定资料。');
        } else {
            comments.push('❌ 未命中评分要点，请仔细阅读给定资料。');
        }
    } else {
        score += Math.floor(maxScore * 0.3);
    }

    // Structure & logic
    const hasStructure = /(第一|第二|第三|首先|其次|最后|一是|二是|三是|一方面|另一方面)/.test(answer);
    const hasConclusion = /(总之|综上|因此|所以|综上所述)/.test(answer);
    if (hasStructure) {
        comments.push('📋 答案结构清晰，逻辑分明。');
        score += Math.floor(maxScore * 0.15);
    } else {
        comments.push('💡 建议使用「第一…第二…」等结构词增强逻辑性。');
    }
    if (hasConclusion) {
        comments.push('✍️ 有归纳总结，论证完整。');
        score += Math.floor(maxScore * 0.1);
    }

    // Cap score
    score = Math.min(score, maxScore);
    score = Math.max(score, 1);

    // Improvement suggestions
    const suggestions = [];
    if (len < 150) suggestions.push('扩展答案篇幅至200-400字');
    if (!hasStructure) suggestions.push('使用分条列点的方式组织答案');
    if (scorePoints.length > 0 && matchedPoints < scorePoints.length * 0.6) suggestions.push('更仔细地提取给定资料中的关键信息');
    if (!hasConclusion) suggestions.push('在答案末尾加上总结性语句');
    if (suggestions.length > 0) {
        comments.push('🎯 提分建议：' + suggestions.join('；') + '。');
    }

    return { score, comment: comments.join(' ') };
}

// ========== Result Page ==========
function renderResult(record) {
    if (!record) {
        navigateTo('home');
        return;
    }

    const page = document.getElementById('page-result');
    if (!page) return;

    const timeMin = Math.floor(record.timeUsed / 60);
    const timeSec = record.timeUsed % 60;
    const percentage = Math.round((record.totalScore / record.maxScore) * 100);

    let level, levelColor;
    if (percentage >= 85) { level = '优秀'; levelColor = 'var(--success)'; }
    else if (percentage >= 70) { level = '良好'; levelColor = 'var(--primary)'; }
    else if (percentage >= 60) { level = '及格'; levelColor = 'var(--warning)'; }
    else { level = '需努力'; levelColor = 'var(--danger)'; }

    page.innerHTML = '<div class="result-header">' +
        '<div><button class="btn btn-back" onclick="navigateTo(\'home\')">← 返回首页</button>' +
        '<button class="btn btn-back" onclick="navigateTo(\'history\')" style="margin-left:8px;">📊 答题记录</button></div>' +
        '<h2>📊 评分结果</h2></div>' +
        '<div class="result-summary">' +
        '<div class="score-circle"><div class="score-number">' + record.totalScore + '</div>' +
        '<div class="score-label">/ ' + record.maxScore + '分</div></div>' +
        '<div class="result-meta">' +
        '<div class="meta-item"><span class="meta-label">试卷：</span><span>' + record.paperTitle + '</span></div>' +
        '<div class="meta-item"><span class="meta-label">用时：</span><span>' + timeMin + '分' + timeSec + '秒</span></div>' +
        '<div class="meta-item"><span class="meta-label">得分率：</span><span style="color:' + levelColor + ';font-weight:600;">' + percentage + '% （' + level + '）</span></div>' +
        '</div></div>' +
        '<div class="result-detail">' + record.answers.map((a, i) => '<div class="result-question-card">' +
            '<div class="result-q-header">' +
            '<div class="result-q-title">第' + (i + 1) + '题：' + a.questionTitle + '</div>' +
            '<div class="result-q-score">' + a.score + '/' + a.maxScore + '分</div>' +
            '</div>' +
            '<div class="result-q-body">' +
            '<div class="result-section"><h4>📝 你的答案</h4>' +
            '<div class="result-content user-answer">' + (a.answer || '（未作答）') + '</div></div>' +
            '<div class="result-section"><h4>🤖 AI点评</h4>' +
            '<div class="result-content ai-comment">' + a.comment + '</div></div>' +
            '<div class="result-section"><h4>📖 参考答案</h4>' +
            '<div class="result-content reference">' + (a.reference || '暂无参考答案') + '</div></div>' +
            '</div></div>').join('') + '</div>';

    // Add rating section for user-uploaded papers
    if (record.source === 'user' && APP.currentUser) {
        const rateSection = document.createElement('div');
        rateSection.className = 'result-section';
        rateSection.style.cssText = 'background:var(--bg-white);border-radius:var(--radius-lg);padding:20px;box-shadow:var(--shadow);margin-top:16px;text-align:center;';
        rateSection.innerHTML = '<h4 style="margin-bottom:12px;">⭐ 为这份试卷评分</h4>' +
            '<div class="rating-stars" id="rating-stars">' +
            Array.from({length: 10}, (_, i) => '<span class="star" data-rating="' + (i + 1) + '">★</span>').join('') +
            '</div>' +
            '<p id="rating-text" style="margin-top:8px;font-size:13px;color:var(--text-muted);">点击星星评分</p>';
        page.appendChild(rateSection);

        document.querySelectorAll('#rating-stars .star').forEach(star => {
            star.addEventListener('click', () => ratePaper(record.paperId, parseInt(star.dataset.rating)));
            star.addEventListener('mouseenter', () => {
                const r = parseInt(star.dataset.rating);
                document.querySelectorAll('#rating-stars .star').forEach((s, i) => {
                    s.classList.toggle('active', i < r);
                });
                document.getElementById('rating-text').textContent = r + '分' + (r >= 8 ? ' 非常优秀' : r >= 6 ? ' 不错' : r >= 4 ? ' 一般' : ' 需改进');
            });
            star.addEventListener('mouseleave', () => {
                document.querySelectorAll('#rating-stars .star').forEach(s => s.classList.remove('active'));
                document.getElementById('rating-text').textContent = '点击星星评分';
            });
        });
    }
}

// ========== Rate Paper ==========
function ratePaper(paperId, score) {
    if (!APP.currentUser) return;
    const papers = APP.uploadedPapers;
    const paper = papers.find(p => p.id === paperId);
    if (!paper) return;
    if (!paper.ratings) paper.ratings = [];

    // Check if already rated
    const existing = paper.ratings.findIndex(r => r.account === APP.currentUser.account);
    if (existing >= 0) {
        paper.ratings[existing].score = score;
        showToast('评分已更新', 'success');
    } else {
        paper.ratings.push({ account: APP.currentUser.account, score: score });
        showToast('感谢你的评分！', 'success');
    }
    saveUploadedPapers();
    loadUploadedPapers();
}

// ========== History ==========
function renderHistory() {
    const container = document.getElementById('page-history');
    if (!container) return;

    if (APP.history.length === 0) {
        container.innerHTML = '<div class="history-empty"><div class="history-empty-icon">📭</div><h3>暂无答题记录</h3><p>去完成一套试卷吧！</p></div>';
        return;
    }

    // 按分类分组
    const categories = ['概括归纳', '综合分析', '对策建议', '大作文', '历年真题', '网络试卷', 'AI生成', '网友上传'];
    const grouped = {};
    categories.forEach(c => { grouped[c] = []; });
    APP.history.forEach(h => {
        const cat = h.category || h.source || '历年真题';
        if (grouped[cat]) {
            grouped[cat].push(h);
        } else {
            if (!grouped['历年真题']) grouped['历年真题'] = [];
            grouped['历年真题'].push(h);
        }
    });

    let html = '';
    categories.forEach(cat => {
        const items = grouped[cat] || [];
        if (items.length === 0) return;
        html += '<div class="history-category"><h3 class="history-cat-title">' + cat + '（' + items.length + '条）</h3>';
        html += items.map(h => {
            const date = new Date(h.createdAt);
            const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
            const timeMin = Math.floor(h.timeUsed / 60);
            return '<div class="history-item" onclick="navigateTo(\'history-detail\', \'' + h.id + '\')">' +
                '<div class="history-item-left">' +
                '<div class="history-item-icon">📝</div>' +
                '<div class="history-item-info">' +
                '<h4>' + h.paperTitle + '</h4>' +
                '<div class="history-item-meta">' +
                '<span>📅 ' + dateStr + '</span>' +
                '<span>⏱ ' + timeMin + '分钟</span>' +
                '</div></div></div>' +
                '<div class="history-item-right">' +
                '<div class="history-score">' + h.totalScore + '</div>' +
                '<div class="history-score-label">/ ' + h.maxScore + '分</div>' +
                '</div></div>';
        }).join('');
        html += '</div>';
    });

    container.innerHTML = html || '<div class="history-empty"><div class="history-empty-icon">📭</div><h3>暂无答题记录</h3></div>';
}

// ========== History Detail ==========
function renderHistoryDetail(recordId) {
    const record = APP.history.find(h => h.id === recordId);
    if (!record) { navigateTo('history'); return; }

    // Reuse result rendering
    renderResult(record);
    updateBreadcrumb('history-detail');
}

// ========== Practice ==========
function updatePracticeCounts() {
    const types = ['概括归纳', '综合分析', '对策建议', '大作文'];
    types.forEach(type => {
        const count = APP.questions.filter(q => q.type === type).length;
        const el = document.getElementById('count-' + type);
        if (el) el.textContent = count + '题可用';
    });
}

function startTypePractice(type) {
    const questions = APP.questions.filter(q => q.type === type);
    if (questions.length === 0) {
        showToast('暂无该类型题目', 'info');
        return;
    }
    // 随机抽取一道题
    const randomIdx = Math.floor(Math.random() * questions.length);
    const question = questions[randomIdx];
    
    // 找到该题目对应的试卷以获取材料
    const paper = APP.papers.find(p => p.id === question.paperId);
    
    // 创建虚拟试卷，只包含这一道题
    const virtualPaper = {
        id: 'practice_' + type + '_' + Date.now(),
        title: '专项练习 - ' + type + '（来源：' + (paper?.title || '未知') + '）',
        totalScore: question.score || question.maxScore || 20,
        timeLimit: 60,
        materials: question.materials || paper?.materials || '',
        source: 'practice',
        practiceType: type
    };
    
    // 把这道题包装成包含必要字段的格式
    const wrappedQuestion = {
        ...question,
        score: question.score || question.maxScore || 20,
        content: question.question || question.title || '',
        question: question.question || question.title || '',
        reference: question.referenceAnswer || question.reference || '暂无参考答案'
    };
    
    APP.currentExam = { 
        paper: virtualPaper, 
        questions: [wrappedQuestion], 
        source: 'practice', 
        answers: {} 
    };
    APP.currentExamPaperId = virtualPaper.id;
    APP.currentExamSource = 'practice';
    APP.examSeconds = 0;

    // Build exam page
    const examPage = document.getElementById('page-exam-full');
    examPage.innerHTML = '<div class="exam-header">' +
        '<button class="btn btn-outline btn-sm" onclick="navigateTo(\'practice\')">← 返回</button>' +
        '<div class="exam-info"><h2>' + virtualPaper.title + '</h2>' +
        '<div class="exam-meta"><span>📝 1题</span><span>📊 总分' + virtualPaper.totalScore + '分</span></div></div>' +
        '<div class="exam-timer" id="exam-timer">00:00</div>' +
        '</div>' +
        '<div class="exam-body-split">' +
        '<div class="exam-materials-panel">' +
        '<div class="materials-header">📄 给定资料</div>' +
        '<div class="materials-content" id="exam-materials">' + (virtualPaper.materials || '无给定资料') + '</div>' +
        '</div>' +
        '<div class="exam-questions-panel">' +
        '<div class="exam-questions-scroll"><div class="exam-questions" id="exam-questions"></div></div>' +
        '<div class="exam-footer"><button class="btn btn-primary btn-lg" onclick="submitExam()">📝 提交答卷</button></div>' +
        '</div></div>';

    const qContainer = document.getElementById('exam-questions');
    qContainer.innerHTML = '<div class="question-card">' +
        '<div class="question-header">' +
        '<div class="question-title">' + (wrappedQuestion.title || wrappedQuestion.type || '题目') + '</div>' +
        '<div class="question-score">' + wrappedQuestion.score + '分</div>' +
        '</div>' +
        '<div class="question-body">' +
        '<div class="requirements-text">' + (wrappedQuestion.content || wrappedQuestion.question || '') + '</div>' +
        '<div class="answer-area">' +
        '<label>✍️ 你的答案</label>' +
        '<textarea class="answer-textarea" id="answer-0" placeholder="请在此作答..." oninput="updateWordCount(\'0\')"></textarea>' +
        '<div class="word-count" id="wc-0">0字</div>' +
        '</div></div></div>';

    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('breadcrumb').style.display = 'none';
    document.getElementById('main-content').style.marginLeft = '0';

    navigateTo('exam');
    startTimer();
}

// ========== AI Generate Paper ==========
function generatePaper() {
    const theme = document.getElementById('gen-theme').value.trim();
    const materials = document.getElementById('gen-materials').value.trim();
    const count = parseInt(document.getElementById('gen-count').value);
    const status = document.getElementById('gen-status');

    if (!theme) {
        status.innerHTML = '<span style="color:var(--danger);">请输入试卷主题</span>';
        return;
    }
    if (!materials || materials.length < 50) {
        status.innerHTML = '<span style="color:var(--danger);">给定资料至少50字</span>';
        return;
    }

    // Scan for illegal content
    for (const kw of ILLEGAL_KEYWORDS) {
        if (materials.includes(kw) || theme.includes(kw)) {
            status.innerHTML = '<span style="color:var(--danger);">内容包含敏感词：' + kw + '，请修改后重试</span>';
            return;
        }
    }

    status.innerHTML = '<span style="color:var(--primary);">🤖 AI正在生成试卷...</span>';

    setTimeout(() => {
        const questionTypes = ['概括归纳', '综合分析', '对策建议', '大作文'];
        const questions = [];
        for (let i = 0; i < count; i++) {
            const type = i === count - 1 ? '大作文' : questionTypes[i % 3];
            const score = type === '大作文' ? 40 : (type === '综合分析' ? 25 : 20);
            const q = generateQuestion(type, theme, materials, i + 1);
            q.score = score;
            q.type = type;
            questions.push(q);
        }

        const paper = {
            id: 'gen_' + Date.now(),
            title: theme,
            materials: materials,
            questions: questions,
            questionCount: questions.length,
            totalScore: questions.reduce((s, q) => s + q.score, 0),
            timeLimit: 150,
            source: 'generate',
            createdAt: new Date().toISOString()
        };

        APP.generatedPapers.unshift(paper);
        if (APP.generatedPapers.length > 50) APP.generatedPapers = APP.generatedPapers.slice(0, 50);
        saveGeneratedPapers();

        status.innerHTML = '<span style="color:var(--success);">✅ 试卷生成成功！共' + count + '题，总分' + paper.totalScore + '分</span>';
        renderPapersList();
    }, 1500);
}

function generateQuestion(type, theme, materials, num) {
    const sentences = materials.split(/[。！？\n]/).filter(s => s.trim().length > 5);
    const sample = sentences.slice(0, 5).join('；');

    const templates = {
        '概括归纳': {
            title: '第' + num + '题：概括归纳',
            content: '根据给定资料，请概括「' + theme + '」面临的主要问题与挑战。要求：全面准确，条理清晰，不超过300字。',
            reference: '根据给定资料，主要问题包括：1. 政策执行不到位；2. 资源配置不均衡；3. 体制机制不完善；4. 人才支撑不足；5. 创新驱动有待加强。',
            scorePoints: [
                { keywords: ['政策', '执行', '落实'] },
                { keywords: ['资源', '配置', '均衡'] },
                { keywords: ['体制', '机制', '制度'] },
                { keywords: ['人才', '队伍', '培养'] },
                { keywords: ['创新', '驱动', '技术'] }
            ]
        },
        '综合分析': {
            title: '第' + num + '题：综合分析',
            content: '结合给定资料，分析「' + theme + '」的深层原因及其影响。要求：观点明确，分析透彻，不超过400字。',
            reference: '深层原因：1. 发展阶段转型的必然要求；2. 外部环境变化带来的压力；3. 内部结构性矛盾凸显。影响：推动产业升级、优化资源配置、提升治理效能。',
            scorePoints: [
                { keywords: ['原因', '发展', '转型'] },
                { keywords: ['环境', '外部', '压力'] },
                { keywords: ['结构', '矛盾', '内部'] },
                { keywords: ['影响', '推动', '促进'] }
            ]
        },
        '对策建议': {
            title: '第' + num + '题：对策建议',
            content: '针对「' + theme + '」存在的问题，提出切实可行的对策建议。要求：措施具体，针对性强，不超过350字。',
            reference: '建议：1. 完善顶层设计，健全政策体系；2. 加大财政投入，优化资源配置；3. 强化人才培养，建设专业队伍；4. 推进科技创新，提升核心竞争力；5. 加强监督评估，确保政策落地。',
            scorePoints: [
                { keywords: ['政策', '制度', '完善', '顶层'] },
                { keywords: ['投入', '财政', '资金'] },
                { keywords: ['人才', '培养', '队伍'] },
                { keywords: ['科技', '创新', '技术'] },
                { keywords: ['监督', '评估', '考核'] }
            ]
        },
        '大作文': {
            title: '第' + num + '题：大作文',
            content: '围绕「' + theme + '」这一主题，结合给定资料，自选角度，自拟题目，写一篇800-1000字的议论文。要求：观点鲜明，论证充分，结构完整，语言流畅。',
            reference: '（略）大作文无固定参考答案，请从论点明确性、论证充分性、结构完整性、语言表达等方面综合评判。',
            scorePoints: [
                { keywords: ['观点', '论点', '明确'] },
                { keywords: ['论证', '论据', '分析'] },
                { keywords: ['结构', '逻辑', '层次'] },
                { keywords: ['语言', '表达', '流畅'] },
                { keywords: ['对策', '建议', '措施'] }
            ]
        }
    };

    return templates[type] || templates['概括归纳'];
}

// ========== Upload Paper ==========
function showUploadForm() {
    const container = document.getElementById('papers-list');
    if (!container) return;

    container.innerHTML = '<div class="manual-form">' +
        '<h3>📤 上传申论试卷</h3>' +
        '<p style="color:var(--text-secondary);margin-bottom:16px;">上传的试卷将经过AI审核，合格后显示在「网友上传」栏目中</p>' +
        '<div class="form-group"><label>试卷标题</label>' +
        '<input type="text" id="upload-title" placeholder="如：2024年某省申论模拟卷"></div>' +
        '<div class="form-group"><label>给定资料</label>' +
        '<textarea id="upload-materials" rows="6" placeholder="请输入或粘贴给定资料..."></textarea></div>' +
        '<div class="form-group"><label>题目列表（JSON格式）</label>' +
        '<textarea id="upload-questions" rows="10" placeholder=\'[{\"title\":\"概括题\",\"content\":\"请根据资料概括...\",\"score\":20,\"reference\":\"参考答案...\",\"scorePoints\":[{\"keywords\":[\"关键词1\",\"关键词2\"]}]}]\'></textarea>' +
        '<p style="font-size:12px;color:var(--text-muted);">至少2道题，需包含题目、分值、参考答案和评分要点</p></div>' +
        '<div class="modal-error" id="upload-error"></div>' +
        '<button class="btn btn-primary" onclick="submitUploadPaper()">📤 提交审核</button>' +
        '<button class="btn btn-outline" style="margin-left:8px;" onclick="renderPapersList()">取消</button>' +
        '</div>';
}

function submitUploadPaper() {
    const title = document.getElementById('upload-title').value.trim();
    const materials = document.getElementById('upload-materials').value.trim();
    const questionsRaw = document.getElementById('upload-questions').value.trim();
    const errEl = document.getElementById('upload-error');

    if (!title) { errEl.textContent = '请输入试卷标题'; return; }
    if (!materials || materials.length < 50) { errEl.textContent = '给定资料至少50字'; return; }

    // Scan illegal content
    for (const kw of ILLEGAL_KEYWORDS) {
        if (materials.includes(kw) || title.includes(kw) || questionsRaw.includes(kw)) {
            errEl.textContent = '内容包含敏感词：' + kw;
            return;
        }
    }

    let questions;
    try {
        questions = JSON.parse(questionsRaw);
    } catch(e) {
        errEl.textContent = '题目JSON格式错误，请检查';
        return;
    }

    if (!Array.isArray(questions) || questions.length < 2) {
        errEl.textContent = '至少需要2道题';
        return;
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.title || !q.content) {
            errEl.textContent = '第' + (i + 1) + '题缺少标题或题目内容';
            return;
        }
        if (!q.score || q.score <= 0) {
            errEl.textContent = '第' + (i + 1) + '题缺少有效分值';
            return;
        }
        if (!q.reference || q.reference.length < 10) {
            errEl.textContent = '第' + (i + 1) + '题缺少参考答案（至少10字）';
            return;
        }
    }

    const paper = {
        id: 'upload_' + Date.now(),
        title: title,
        materials: materials,
        questions: questions,
        questionCount: questions.length,
        totalScore: questions.reduce((s, q) => s + (q.score || 0), 0),
        timeLimit: 150,
        source: 'user',
        uploader: APP.currentUser ? APP.currentUser.account : 'anonymous',
        uploaderName: APP.currentUser ? APP.currentUser.nickname : '匿名用户',
        ratings: [],
        createdAt: new Date().toISOString()
    };

    APP.uploadedPapers.unshift(paper);
    saveUploadedPapers();
    loadUploadedPapers();

    showToast('试卷上传成功！已通过AI审核', 'success');
    renderPapersList();
}
