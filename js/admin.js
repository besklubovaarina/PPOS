/**
 * admin.js — Панель администратора: заявки, пользователи, изменения профилей
 */

let currentAdminTab = 'changes';

/* ================================================================
   РЕНДЕР ВСЕЙ ПАНЕЛИ
   ================================================================ */
function renderAdminPanel(tab) {
    currentAdminTab = tab || 'changes';

    // Синхронизируем активную вкладку
    document.querySelectorAll('#adminPanel .tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === currentAdminTab);
    });

    const container = document.getElementById('admin-content');
    if (!container) return;

    switch (currentAdminTab) {
        case 'changes':      renderAdminChanges(container);      break;
        case 'users':        renderAdminUsers(container);        break;
        case 'applications': renderAdminApplications(container); break;
        case 'stats':        renderAdminStats(container);        break;
        default:             renderAdminChanges(container);
    }
}

function switchAdminTab(tab) {
    renderAdminPanel(tab);
}

/* ================================================================
   ВКЛАДКА: ОЖИДАЮЩИЕ ИЗМЕНЕНИЯ ПРОФИЛЕЙ
   ================================================================ */
function renderAdminChanges(container) {
    const pending = getPendingChanges();

    let html = `<h3 style="color:#033b7c;margin-bottom:20px;font-size:22px;">
                    Ожидающие одобрения изменения (${pending.length})
                </h3>`;

    if (pending.length === 0) {
        html += '<p style="color:#6b7280;font-size:17px;">Нет ожидающих изменений</p>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="pending-block">';
    html += `<h4>Требуют вашего решения</h4>`;

    pending.forEach(change => {
        const rows = [];
        if (change.oldFullName !== change.newFullName) {
            rows.push(`ФИО: <em>${escapeHTML(change.oldFullName)}</em> → <strong>${escapeHTML(change.newFullName)}</strong>`);
        }
        if (change.oldGroup !== change.newGroup) {
            rows.push(`Группа: <em>${escapeHTML(change.oldGroup || '—')}</em> → <strong>${escapeHTML(change.newGroup || '—')}</strong>`);
        }
        if (change.oldPhone !== change.newPhone) {
            rows.push(`Телефон: <em>${escapeHTML(change.oldPhone || '—')}</em> → <strong>${escapeHTML(change.newPhone || '—')}</strong>`);
        }
        if (change.oldEmail !== change.newEmail) {
            rows.push(`Email: <em>${escapeHTML(change.oldEmail || '—')}</em> → <strong>${escapeHTML(change.newEmail || '—')}</strong>`);
        }
        if (change.newAvatar && change.newAvatar !== change.oldAvatar) {
            rows.push(`<strong>Новый аватар загружен</strong>`);
        }

        const avatarPreview = change.newAvatar
            ? `<img src="${change.newAvatar}" alt="Новый аватар"
                    style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #163a6f;margin-right:12px;vertical-align:middle;">`
            : '';

        html += `
            <div class="change-item">
                <div class="change-info">
                    <div style="display:flex;align-items:center;margin-bottom:8px;">
                        ${avatarPreview}
                        <div>
                            <strong>${escapeHTML(change.username)}</strong>
                            <span style="color:#6b7280;font-size:13px;margin-left:10px;">${escapeHTML(change.timestamp)}</span>
                        </div>
                    </div>
                    ${rows.map(r => `<p style="margin:3px 0;font-size:14px;">${r}</p>`).join('')}
                </div>
                <div class="change-actions">
                    <button class="btn-approve" onclick="approveChange('${change.id}')">✓ Одобрить</button>
                    <button class="btn-reject"  onclick="rejectChange('${change.id}')">✕ Отклонить</button>
                </div>
            </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

function approveChange(changeId) {
    const pending = getPendingChanges();
    const idx     = pending.findIndex(c => c.id === changeId);
    if (idx === -1) return;

    applyProfileChange(pending[idx]);
    pending.splice(idx, 1);
    savePendingChanges(pending);

    renderAdminPanel(currentAdminTab);
    showNotification('Изменения одобрены', 'success');
}

function rejectChange(changeId) {
    if (!confirm('Отклонить изменения?')) return;
    const pending = getPendingChanges();
    const idx     = pending.findIndex(c => c.id === changeId);
    if (idx === -1) return;

    pending.splice(idx, 1);
    savePendingChanges(pending);

    renderAdminPanel(currentAdminTab);
    showNotification('Изменения отклонены', 'warning');
}

/* ================================================================
   ВКЛАДКА: ПОЛЬЗОВАТЕЛИ
   ================================================================ */
function renderAdminUsers(container) {
    const users = getUsers();
    const list  = Object.values(users);

    let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="color:#033b7c;font-size:22px;">Пользователи (${list.length})</h3>
            <input type="text" class="form-input" placeholder="Поиск по имени или логину..."
                   style="max-width:300px;margin-bottom:0;padding:10px 16px;"
                   oninput="filterUsersTable(this.value)">
        </div>
        <div style="overflow-x:auto;">
        <table class="data-table" id="users-table">
            <thead>
                <tr>
                    <th>Аватар</th>
                    <th>Логин</th>
                    <th>ФИО</th>
                    <th>Группа</th>
                    <th>Роль</th>
                    <th>Мероприятий</th>
                    <th>Документы</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody id="users-tbody">`;

    list.forEach(u => {
        const docsCount = Object.keys(u.documents || {}).length;
        const roleClass = u.isAdmin
            ? 'badge-admin'
            : u.role === 'Председатель'
                ? 'badge-chairman'
                : u.role === 'Активист профбюро'
                    ? 'badge-activist'
                    : 'badge-student';

        html += `
            <tr data-search="${(u.fullName + ' ' + u.username).toLowerCase()}">
                <td>
                    <img src="${u.avatarDataUrl || 'images/default-avatar.png'}"
                         alt="Аватар"
                         style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #bfdef3;"
                         onerror="this.src='images/default-avatar.png'">
                </td>
                <td style="font-weight:600;">${escapeHTML(u.username)}</td>
                <td>${escapeHTML(u.fullName || '—')}</td>
                <td>${escapeHTML(u.groupNumber || '—')}</td>
                <td><span class="status-badge ${roleClass}">${escapeHTML(u.isAdmin ? 'Администратор' : (u.role || 'Студент'))}</span></td>
                <td style="text-align:center;">${(u.enrolledEvents || []).length}</td>
                <td style="text-align:center;">${docsCount} / 3</td>
                <td>
                    <div class="data-table-actions">
                        <button class="btn-approve" onclick="adminViewUser('${u.username}')">Просмотр</button>
                        ${!u.isAdmin ? `<button class="btn-reject" onclick="adminResetUser('${u.username}')">Сброс</button>` : ''}
                    </div>
                </td>
            </tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function filterUsersTable(query) {
    const rows = document.querySelectorAll('#users-tbody tr[data-search]');
    const q = query.toLowerCase();
    rows.forEach(row => {
        row.style.display = row.dataset.search.includes(q) ? '' : 'none';
    });
}

function adminViewUser(username) {
    const users = getUsers();
    const u = users[username];
    if (!u) return;

    const docsHTML = ['consent', 'accounting', 'join'].map(key => {
        const labels = { consent: 'Согласие на обработку данных', accounting: 'Заявление в бухгалтерию', join: 'Заявление на вступление' };
        const hasDoc = !!(u.documents && u.documents[key]);
        return `<p style="margin:4px 0;font-size:15px;">
            ${labels[key]}: <strong style="color:${hasDoc ? 'var(--green)' : 'var(--gray-500)'}">
            ${hasDoc ? 'Загружен ✓' : 'Не загружен'}</strong>
        </p>`;
    }).join('');

    const eventsFromStorage = getEventsFromStorage() || DEFAULT_EVENTS;
    const enrolledEvents = (u.enrolledEvents || []).map(id => {
        const ev = eventsFromStorage.find(e => e.id === id);
        return ev ? ev.title : id;
    });

    document.getElementById('modal-description').innerHTML = `
        <div style="text-align:center;margin-bottom:20px;">
            <img src="${u.avatarDataUrl || 'images/default-avatar.png'}"
                 alt="Аватар"
                 style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #163a6f;"
                 onerror="this.src='images/default-avatar.png'">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div><p style="font-size:13px;color:#6b7280;font-weight:600;">ЛОГИН</p><p style="font-size:16px;font-weight:700;color:#033b7c;">${escapeHTML(u.username)}</p></div>
            <div><p style="font-size:13px;color:#6b7280;font-weight:600;">РОЛЬ</p><p style="font-size:16px;font-weight:700;color:#033b7c;">${escapeHTML(u.isAdmin ? 'Администратор' : (u.role || 'Студент'))}</p></div>
            <div><p style="font-size:13px;color:#6b7280;font-weight:600;">ФИО</p><p style="font-size:16px;color:#163a6f;">${escapeHTML(u.fullName || '—')}</p></div>
            <div><p style="font-size:13px;color:#6b7280;font-weight:600;">ГРУППА</p><p style="font-size:16px;color:#163a6f;">${escapeHTML(u.groupNumber || '—')}</p></div>
            <div><p style="font-size:13px;color:#6b7280;font-weight:600;">ТЕЛЕФОН</p><p style="font-size:16px;color:#163a6f;">${escapeHTML(u.phone || '—')}</p></div>
            <div><p style="font-size:13px;color:#6b7280;font-weight:600;">EMAIL</p><p style="font-size:16px;color:#163a6f;">${escapeHTML(u.email || '—')}</p></div>
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
        <p style="font-weight:700;color:#033b7c;margin-bottom:8px;">Документы:</p>
        ${docsHTML}
        ${enrolledEvents.length > 0 ? `
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
        <p style="font-weight:700;color:#033b7c;margin-bottom:8px;">Записан на мероприятия:</p>
        ${enrolledEvents.map(t => `<p style="font-size:15px;color:#163a6f;margin:3px 0;">• ${escapeHTML(t)}</p>`).join('')}` : ''}
    `;
    document.getElementById('description-modal').style.display = 'flex';
}

function adminResetUser(username) {
    if (!confirm(`Сбросить данные пользователя ${username}? Будут удалены все его записи на мероприятия и загруженные документы.`)) return;

    const users = getUsers();
    if (users[username]) {
        users[username].enrolledEvents = [];
        users[username].documents      = {};
        users[username].avatarDataUrl  = '';
        saveUsers(users);
    }

    // Удаляем заявки пользователя
    const apps = getApplications().filter(a => a.username !== username);
    saveApplications(apps);

    renderAdminPanel(currentAdminTab);
    showNotification(`Данные пользователя ${username} сброшены`, 'warning');
}

/* ================================================================
   ВКЛАДКА: ЗАЯВКИ НА МЕРОПРИЯТИЯ
   ================================================================ */
function renderAdminApplications(container) {
    const apps   = getApplications();
    const events = getEventsFromStorage() || DEFAULT_EVENTS;

    let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
            <h3 style="color:#033b7c;font-size:22px;">Заявки на мероприятия (${apps.length})</h3>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
                <select class="filter-select" onchange="filterApplications(this.value)" id="app-status-filter">
                    <option value="all">Все статусы</option>
                    <option value="pending">Ожидают</option>
                    <option value="approved">Одобрены</option>
                    <option value="rejected">Отклонены</option>
                </select>
                <select class="filter-select" onchange="filterApplicationsByEvent(this.value)" id="app-event-filter">
                    <option value="all">Все мероприятия</option>
                    ${events.map(e => `<option value="${e.id}">${escapeHTML(e.title)}</option>`).join('')}
                </select>
            </div>
        </div>`;

    if (apps.length === 0) {
        html += '<p style="color:#6b7280;font-size:17px;">Заявок пока нет</p>';
        container.innerHTML = html;
        return;
    }

    html += `
        <div style="overflow-x:auto;">
        <table class="data-table" id="apps-table">
            <thead>
                <tr>
                    <th>Участник</th>
                    <th>Мероприятие</th>
                    <th>Дата подачи</th>
                    <th>Статус</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody id="apps-tbody">`;

    apps.forEach(app => {
        const event     = events.find(e => e.id === app.eventId);
        const statusMap = {
            approved: ['badge-approved', 'Одобрено'],
            rejected: ['badge-rejected', 'Отклонено'],
            pending:  ['badge-pending',  'Ожидает'],
        };
        const [badgeClass, statusLabel] = statusMap[app.status] || ['badge-pending', 'Ожидает'];

        html += `
            <tr data-status="${app.status}" data-event="${app.eventId}">
                <td>
                    <strong>${escapeHTML(app.fullName || app.username)}</strong>
                    ${app.fullName ? `<br><span style="font-size:13px;color:#6b7280;">${escapeHTML(app.username)}</span>` : ''}
                </td>
                <td>${event ? escapeHTML(event.title) : '<em style="color:#6b7280;">Мероприятие удалено</em>'}</td>
                <td>${escapeHTML(app.date)}</td>
                <td><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
                <td>
                    <div class="data-table-actions">
                        ${app.status === 'pending' ? `
                            <button class="btn-approve" onclick="approveApplication('${app.id}')">✓</button>
                            <button class="btn-reject"  onclick="rejectApplication('${app.id}')">✕</button>
                        ` : `<span style="color:#6b7280;font-size:13px;">—</span>`}
                    </div>
                </td>
            </tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function filterApplications(statusValue) {
    const rows = document.querySelectorAll('#apps-tbody tr[data-status]');
    rows.forEach(row => {
        const matchStatus = statusValue === 'all' || row.dataset.status === statusValue;
        const eventFilter = document.getElementById('app-event-filter')?.value || 'all';
        const matchEvent  = eventFilter === 'all' || row.dataset.event === eventFilter;
        row.style.display = (matchStatus && matchEvent) ? '' : 'none';
    });
}

function filterApplicationsByEvent(eventValue) {
    const rows = document.querySelectorAll('#apps-tbody tr[data-event]');
    rows.forEach(row => {
        const matchEvent  = eventValue === 'all' || row.dataset.event === eventValue;
        const statusFilter = document.getElementById('app-status-filter')?.value || 'all';
        const matchStatus  = statusFilter === 'all' || row.dataset.status === statusFilter;
        row.style.display  = (matchStatus && matchEvent) ? '' : 'none';
    });
}

function approveApplication(appId) {
    const apps = getApplications();
    const app  = apps.find(a => a.id === appId);
    if (!app) return;

    app.status = 'approved';
    saveApplications(apps);

    renderAdminPanel(currentAdminTab);
    showNotification('Заявка одобрена', 'success');
}

function rejectApplication(appId) {
    if (!confirm('Отклонить заявку?')) return;
    const apps = getApplications();
    const app  = apps.find(a => a.id === appId);
    if (!app) return;

    app.status = 'rejected';
    saveApplications(apps);

    renderAdminPanel(currentAdminTab);
    showNotification('Заявка отклонена', 'warning');
}

/* ================================================================
   ВКЛАДКА: СТАТИСТИКА
   ================================================================ */
function renderAdminStats(container) {
    const users   = getUsers();
    const events  = getEventsFromStorage() || DEFAULT_EVENTS;
    const apps    = getApplications();
    const pending = getPendingChanges();

    const usersCount    = Object.keys(users).length - 1; // без admin
    const eventsCount   = events.length;
    const appsCount     = apps.length;
    const approvedCount = apps.filter(a => a.status === 'approved').length;
    const pendingCount  = pending.length;

    // Самое популярное мероприятие
    const eventPopularity = events.map(e => ({
        title: e.title,
        count: apps.filter(a => a.eventId === e.id).length,
    })).sort((a, b) => b.count - a.count);

    const topEvent = eventPopularity[0];

    // Число студентов с заполненными документами
    const docsComplete = Object.values(users).filter(u => {
        const docs = u.documents || {};
        return Object.keys(docs).length >= 3;
    }).length;

    let html = `
        <h3 style="color:#033b7c;font-size:22px;margin-bottom:24px;">Общая статистика платформы</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${usersCount}</div>
                <div class="stat-label">Студентов</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${eventsCount}</div>
                <div class="stat-label">Мероприятий</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${approvedCount}</div>
                <div class="stat-label">Одобренных заявок</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color:var(--amber);">${pendingCount}</div>
                <div class="stat-label">На проверке</div>
            </div>
        </div>`;

    if (topEvent && topEvent.count > 0) {
        html += `
            <div style="background:#e5f0ff;border-radius:16px;padding:24px;margin-top:20px;">
                <p style="font-size:14px;color:#6b7280;font-weight:600;text-transform:uppercase;margin-bottom:8px;">
                    Самое популярное мероприятие
                </p>
                <p style="font-size:20px;font-weight:700;color:#033b7c;margin-bottom:4px;">${escapeHTML(topEvent.title)}</p>
                <p style="color:#164469;font-size:16px;">${topEvent.count} заявок</p>
            </div>`;
    }

    // Статистика по типам мероприятий
    html += `
        <div style="margin-top:24px;">
            <h4 style="color:#033b7c;margin-bottom:16px;">Заявки по мероприятиям:</h4>
            ${eventPopularity.slice(0, 8).map(item => `
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                    <div style="flex:1;min-width:0;">
                        <p style="font-size:15px;color:#163a6f;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escapeHTML(item.title)}
                        </p>
                    </div>
                    <div style="flex:0 0 120px;background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden;">
                        <div style="width:${appsCount > 0 ? Math.round(item.count / appsCount * 100) : 0}%;height:100%;background:var(--blue-main);border-radius:4px;"></div>
                    </div>
                    <span style="font-size:14px;font-weight:700;color:#033b7c;flex:0 0 30px;text-align:right;">${item.count}</span>
                </div>`).join('')}
        </div>`;

    html += `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;">
            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:14px;padding:20px;">
                <p style="font-size:13px;color:#065f46;font-weight:600;text-transform:uppercase;">Всего заявок</p>
                <p style="font-size:32px;font-weight:700;color:#065f46;">${appsCount}</p>
            </div>
            <div style="background:#fefce8;border:1px solid #fde047;border-radius:14px;padding:20px;">
                <p style="font-size:13px;color:#78350f;font-weight:600;text-transform:uppercase;">Документы сданы</p>
                <p style="font-size:32px;font-weight:700;color:#78350f;">${docsComplete}</p>
            </div>
        </div>`;

    container.innerHTML = html;
}

/* ================================================================
   УПРАВЛЕНИЕ ГРУППАМИ ИНСТИТУТА (из группового раздела)
   ================================================================ */
let isEditingInstitute = false;

function renderInstituteGroupsSection() {
    const container = document.getElementById('institute-groups-content');
    if (!container) return;

    if (!isLoggedIn()) {
        container.innerHTML = `
            <div class="restricted-access">
                <span class="lock-icon">🔒</span>
                <p>Для просмотра групп института необходимо войти в личный кабинет</p>
                <button class="login-prompt-btn" onclick="showLoginDialog()">Войти</button>
            </div>`;
        return;
    }

    const admin  = isAdmin();
    const groups = getInstGroupsFromStorage() || DEFAULT_INST_GROUPS;

    let html = '<div class="grid-6">';

    groups.forEach(g => {
        html += `
            <div class="member-card">
                <div class="group-avatar" style="position:relative;">
                    ${(admin && isEditingInstitute)
                        ? `<button class="delete-badge" onclick="deleteInstGroup('${g.id}')">✕</button>`
                        : ''}
                    <p class="group-name">${escapeHTML(g.name)}</p>
                </div>
            </div>`;
    });

    if (admin && isEditingInstitute) {
        html += `
            <div class="member-card">
                <button class="add-circle-btn dark" title="Добавить группу"
                        onclick="document.getElementById('add-group-form').style.display='block'">
                    +
                </button>
                <p class="member-name">Добавить</p>
            </div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

function toggleInstituteEdit() {
    isEditingInstitute = !isEditingInstitute;
    const btn = document.getElementById('institute-edit-btn');
    if (btn) btn.textContent = isEditingInstitute ? 'Готово' : 'Редактировать';

    const form = document.getElementById('add-group-form');
    if (!isEditingInstitute && form) form.style.display = 'none';

    renderInstituteGroupsSection();
}

function addInstGroup() {
    const name = document.getElementById('new-group-name')?.value.trim();
    if (!name) { showNotification('Введите номер группы', 'error'); return; }

    const groups = getInstGroupsFromStorage() || [];
    groups.push({ id: Date.now().toString(), name });
    saveInstGroupsToStorage(groups);

    const input = document.getElementById('new-group-name');
    if (input) input.value = '';
    document.getElementById('add-group-form').style.display = 'none';

    renderInstituteGroupsSection();
    showNotification('Группа добавлена', 'success');
}

function cancelAddGroup() {
    document.getElementById('add-group-form').style.display = 'none';
}

function deleteInstGroup(groupId) {
    if (!confirm('Удалить группу?')) return;
    let groups = getInstGroupsFromStorage() || [];
    groups = groups.filter(g => g.id !== groupId);
    saveInstGroupsToStorage(groups);
    renderInstituteGroupsSection();
    showNotification('Группа удалена', 'warning');
}
