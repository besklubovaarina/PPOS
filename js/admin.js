/**
 * admin.js — Панель администратора: заявки, пользователи, изменения профилей, статистика
 */

let currentAdminTab          = 'changes';
let currentApplicantsEventId = null;
let currentRoleFilter        = 'all'; // 'all' | 'participant' | 'organizer'

/* ================================================================
   РЕНДЕР ВСЕЙ ПАНЕЛИ
   ================================================================ */
function renderAdminPanel(tab) {
    currentAdminTab = tab || 'changes';

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
    currentApplicantsEventId = null;
    currentRoleFilter        = 'all';
    renderAdminPanel(tab);
}

function filterApplicantsByRole(role) {
    currentRoleFilter = role;
    renderAdminPanel(currentAdminTab);
}

/* ================================================================
   ВКЛАДКА: ОЖИДАЮЩИЕ ИЗМЕНЕНИЯ ПРОФИЛЕЙ
   ================================================================ */
async function renderAdminChanges(container) {
    container.innerHTML = '<p style="color:#6b7280;">Загрузка...</p>';
    const result = await apiGetPendingChanges();
    const pending = result.success ? result.changes : [];

    const normalize = c => ({
        id:          c.id,
        username:    c.username,
        timestamp:   c['Дата_создания'] ? new Date(c['Дата_создания']).toLocaleString('ru-RU') : '',
        oldFullName: c['Старое_ФИО'],
        newFullName: c['Новое_ФИО'],
        oldGroup:    c['Старая_группа'],
        newGroup:    c['Новая_группа'],
        oldPhone:    c['Старый_телефон'],
        newPhone:    c['Новый_телефон'],
        oldEmail:    c['Старый_email'],
        newEmail:    c['Новый_email'],
        oldAvatar:   c['Старый_аватар'],
        newAvatar:   c['Новый_аватар'],
    });

    let html = `<h3 style="color:#033b7c;margin-bottom:20px;font-size:22px;">
                    Ожидающие одобрения изменения (${pending.length})
                </h3>`;

    if (pending.length === 0) {
        html += '<p style="color:#6b7280;font-size:17px;">Нет ожидающих изменений</p>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="pending-block">';
    html += '<h4>Требуют вашего решения</h4>';

    pending.map(normalize).forEach(change => {
        const rows = [];
        if (change.oldFullName !== change.newFullName)
            rows.push(`ФИО: <em>${escapeHTML(change.oldFullName)}</em> → <strong>${escapeHTML(change.newFullName)}</strong>`);
        if (change.oldGroup !== change.newGroup)
            rows.push(`Группа: <em>${escapeHTML(change.oldGroup || '—')}</em> → <strong>${escapeHTML(change.newGroup || '—')}</strong>`);
        if (change.oldPhone !== change.newPhone)
            rows.push(`Телефон: <em>${escapeHTML(change.oldPhone || '—')}</em> → <strong>${escapeHTML(change.newPhone || '—')}</strong>`);
        if (change.oldEmail !== change.newEmail)
            rows.push(`Email: <em>${escapeHTML(change.oldEmail || '—')}</em> → <strong>${escapeHTML(change.newEmail || '—')}</strong>`);
        if (change.newAvatar && change.newAvatar !== change.oldAvatar)
            rows.push('<strong>Новый аватар загружен</strong>');

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

async function approveChange(changeId) {
    await apiResolvePendingChange(changeId, 'approve');
    renderAdminPanel(currentAdminTab);
    showNotification('Изменения одобрены', 'success');
}

async function rejectChange(changeId) {
    if (!confirm('Отклонить изменения?')) return;
    await apiResolvePendingChange(changeId, 'reject');
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
            <input type="text" class="form-input" placeholder="Поиск по имени или логину…"
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
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody id="users-tbody">`;

    list.forEach(u => {
        const roleClass = u.isAdmin
            ? 'badge-admin'
            : u.role === 'Председатель'   ? 'badge-chairman'
            : u.role === 'Активист профбюро' ? 'badge-activist'
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
                <td><span class="status-badge ${roleClass}">
                    ${escapeHTML(u.isAdmin ? 'Администратор' : (u.role || 'Студент'))}
                </span></td>
                <td style="text-align:center;">${(u.enrolledEvents || []).length}</td>
                <td>
                    <div class="data-table-actions">
                        <button class="btn-approve" onclick="adminEditUser('${u.username}')">Редактировать</button>
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
    const q    = query.toLowerCase();
    rows.forEach(row => {
        row.style.display = row.dataset.search.includes(q) ? '' : 'none';
    });
}

function adminEditUser(username) {
    const users = getUsers();
    const u     = users[username];
    if (!u) return;

    const roleSelectHTML = !u.isAdmin ? `
        <div style="margin-bottom:14px;">
            <label style="font-size:13px;color:#6b7280;font-weight:600;display:block;margin-bottom:6px;">РОЛЬ</label>
            <select id="admin-edit-role" class="form-input" style="margin-bottom:0;">
                <option value="Студент"            ${(u.role || 'Студент') === 'Студент'            ? 'selected' : ''}>Студент</option>
                <option value="Активист профбюро"  ${(u.role || '') === 'Активист профбюро'  ? 'selected' : ''}>Активист профбюро</option>
                <option value="Председатель"       ${(u.role || '') === 'Председатель'       ? 'selected' : ''}>Председатель</option>
            </select>
        </div>` : '';

    const titleEl2 = document.getElementById('description-modal-title');
    if (titleEl2) titleEl2.textContent = 'Данные пользователя';

    document.getElementById('modal-description').innerHTML = `
        <div style="text-align:center;margin-bottom:20px;">
            <img src="${u.avatarDataUrl || 'images/default-avatar.png'}"
                 alt="Аватар"
                 style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #163a6f;"
                 onerror="this.src='images/default-avatar.png'">
            <p style="margin-top:8px;font-size:15px;color:#6b7280;">Логин: <strong>${escapeHTML(u.username)}</strong></p>
        </div>
        <div style="margin-bottom:14px;">
            <label style="font-size:13px;color:#6b7280;font-weight:600;display:block;margin-bottom:6px;">ФИО</label>
            <input type="text" id="admin-edit-fullname" class="form-input" style="margin-bottom:0;"
                   value="${escapeHTML(u.fullName || '')}">
        </div>
        <div style="margin-bottom:14px;">
            <label style="font-size:13px;color:#6b7280;font-weight:600;display:block;margin-bottom:6px;">ГРУППА</label>
            <input type="text" id="admin-edit-group" class="form-input" style="margin-bottom:0;"
                   value="${escapeHTML(u.groupNumber || '')}">
        </div>
        <div style="margin-bottom:14px;">
            <label style="font-size:13px;color:#6b7280;font-weight:600;display:block;margin-bottom:6px;">ТЕЛЕФОН</label>
            <input type="tel" id="admin-edit-phone" class="form-input" style="margin-bottom:0;"
                   value="${escapeHTML(u.phone || '')}">
        </div>
        <div style="margin-bottom:14px;">
            <label style="font-size:13px;color:#6b7280;font-weight:600;display:block;margin-bottom:6px;">EMAIL</label>
            <input type="email" id="admin-edit-email" class="form-input" style="margin-bottom:0;"
                   value="${escapeHTML(u.email || '')}">
        </div>
        ${roleSelectHTML}
        <div style="display:flex;gap:12px;margin-top:20px;">
            <button class="btn-approve" style="flex:1;" onclick="adminSaveUserEdit('${escapeHTML(username)}')">Сохранить</button>
            <button class="btn-cancel" style="flex:1;" onclick="closeDescriptionModal()">Отмена</button>
        </div>
    `;
    document.getElementById('description-modal').style.display = 'flex';
}

function adminSaveUserEdit(username) {
    const users = getUsers();
    const u     = users[username];
    if (!u) return;

    const fullName   = document.getElementById('admin-edit-fullname')?.value.trim();
    const groupNumber= document.getElementById('admin-edit-group')?.value.trim();
    const phone      = document.getElementById('admin-edit-phone')?.value.trim();
    const email      = document.getElementById('admin-edit-email')?.value.trim();
    const roleEl     = document.getElementById('admin-edit-role');

    if (fullName   !== undefined) u.fullName    = fullName;
    if (groupNumber!== undefined) u.groupNumber = groupNumber;
    if (phone      !== undefined) u.phone       = phone;
    if (email      !== undefined) u.email       = email;
    if (roleEl && !u.isAdmin)     u.role        = roleEl.value;

    saveUsers(users);

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.username === username) {
        if (fullName    !== undefined) currentUser.fullName    = fullName;
        if (groupNumber !== undefined) currentUser.groupNumber = groupNumber;
        if (phone       !== undefined) currentUser.phone       = phone;
        if (email       !== undefined) currentUser.email       = email;
        if (roleEl && !u.isAdmin)      currentUser.role        = roleEl.value;
        setCurrentUser(currentUser);
        updateUIForAuth();
    }

    closeDescriptionModal();
    renderAdminPanel(currentAdminTab);
    showNotification(`Данные пользователя ${username} обновлены`, 'success');
}

function adminResetUser(username) {
    if (!confirm(`Сбросить данные пользователя ${username}? Будут удалены все его записи и загруженные документы.`)) return;

    const users = getUsers();
    if (users[username]) {
        users[username].enrolledEvents = [];
        users[username].documents      = {};
        users[username].avatarDataUrl  = '';
        saveUsers(users);
    }

    const apps = getApplications().filter(a => a.username !== username);
    saveApplications(apps);

    renderAdminPanel(currentAdminTab);
    showNotification(`Данные пользователя ${username} сброшены`, 'warning');
}

/* ================================================================
   ВКЛАДКА: ЗАЯВКИ — МАРШРУТИЗАЦИЯ
   ================================================================ */
function renderAdminApplications(container) {
    if (currentApplicantsEventId) {
        renderEventApplicants(container, currentApplicantsEventId);
    } else {
        renderApplicationsOverview(container);
    }
}

/* ================================================================
   ОБЗОР ЗАЯВОК ПО МЕРОПРИЯТИЯМ
   ================================================================ */
function renderApplicationsOverview(container) {
    const events = getEventsFromStorage() || DEFAULT_EVENTS;
    const apps   = getApplications();

    let html = `<h3 style="color:#033b7c;font-size:22px;margin-bottom:20px;">
                    Заявки по мероприятиям
                </h3>
                <div class="events-apps-overview">`;

    if (events.length === 0) {
        html += '<p style="color:#6b7280;font-size:17px;">Мероприятий пока нет</p>';
    } else {
        events.forEach(event => {
            const eventApps = apps.filter(a => a.eventId === event.id);
            const pending   = eventApps.filter(a => a.status === 'pending').length;
            const approved  = eventApps.filter(a => a.status === 'approved').length;
            const reserve   = eventApps.filter(a => a.status === 'reserve').length;
            const rejected  = eventApps.filter(a => a.status === 'rejected').length;

            html += `
                <div class="event-app-card">
                    <div class="event-app-card-header">
                        <div>
                            <h4 class="event-app-card-title">${escapeHTML(event.title)}</h4>
                            <p class="event-app-card-meta">
                                ${escapeHTML(event.date)} · ${escapeHTML(event.time)}
                                ${event.maxParticipants > 0
                                    ? ` · Мест: ${event.maxParticipants}${event.reserveCount > 0 ? `, резерв: ${event.reserveCount}` : ''}`
                                    : ' · Без ограничений'}
                            </p>
                        </div>
                        <span class="status-badge ${event.status === 'завершено' ? 'badge-pending' : event.status === 'закрыто' ? 'badge-rejected' : 'badge-approved'}">
                            ${event.status === 'завершено' ? 'Завершено' : event.status === 'закрыто' ? 'Закрыто' : 'Открыто'}
                        </span>
                    </div>

                    <div class="event-app-stats">
                        <span class="status-badge badge-pending">${pending} ожидают</span>
                        <span class="status-badge badge-approved">${approved} одобрено</span>
                        ${reserve  > 0 ? `<span class="status-badge badge-reserve">${reserve} резерв</span>` : ''}
                        ${rejected > 0 ? `<span class="status-badge badge-rejected">${rejected} отклонено</span>` : ''}
                    </div>

                    <div class="event-app-actions-row">
                        <button class="btn-approve"
                                onclick="currentApplicantsEventId='${event.id}';currentRoleFilter='all';renderAdminPanel('applications');">
                            Список участников
                        </button>
                        <button class="btn-export-excel" onclick="exportToExcel('${event.id}')">
                            Excel
                        </button>
                        <button class="btn-export-word"  onclick="exportToWord('${event.id}')">
                            Word
                        </button>
                        ${event.status === 'открыто'
                            ? `<button class="btn-reserve" onclick="adminCloseEvent('${event.id}')">Завершить прием заявок</button>`
                            : `<button class="btn-enroll" style="background:#10b981;border-color:#10b981;" onclick="adminReopenEvent('${event.id}')">Возобновить прием заявок</button>`
                        }
                    </div>
                </div>`;
        });
    }

    html += '</div>';
    container.innerHTML = html;
}

/* ================================================================
   СПИСОК УЧАСТНИКОВ КОНКРЕТНОГО МЕРОПРИЯТИЯ
   ================================================================ */
function renderEventApplicants(container, eventId) {
    const events = getEventsFromStorage() || DEFAULT_EVENTS;
    const event  = events.find(e => e.id === eventId);
    if (!event) { currentApplicantsEventId = null; renderApplicationsOverview(container); return; }

    const allApps = getApplications().filter(a => a.eventId === eventId);
    const users   = getUsers();

    const pending  = allApps.filter(a => a.status === 'pending').length;
    const approved = allApps.filter(a => a.status === 'approved').length;
    const reserve  = allApps.filter(a => a.status === 'reserve').length;
    const rejected = allApps.filter(a => a.status === 'rejected').length;

    // Применяем фильтр по роли
    const apps = (event.allowOrganizerRole && currentRoleFilter !== 'all')
        ? allApps.filter(a => (a.applicationRole || 'participant') === currentRoleFilter)
        : allApps;

    // Текстовые поля формы (для столбцов таблицы)
    const textFields = (event.formFields || []).filter(f => f.type !== 'file');
    const fileFields = (event.formFields || []).filter(f => f.type === 'file');

    let html = `
        <!-- Кнопка «Назад» -->
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px;flex-wrap:wrap;">
            <button class="btn-cancel"
                    style="padding:10px 18px;"
                    onclick="currentApplicantsEventId=null;renderAdminPanel('applications');">
                ← Назад
            </button>
            <h3 style="color:#033b7c;font-size:20px;margin:0;flex:1;">${escapeHTML(event.title)}</h3>
        </div>

        <!-- Сводка и кнопки экспорта -->
        <div style="display:flex;gap:14px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <span class="status-badge badge-pending">${pending} ожидают</span>
                <span class="status-badge badge-approved">${approved} одобрено</span>
                ${reserve  > 0 ? `<span class="status-badge badge-reserve">${reserve} резерв</span>` : ''}
                ${rejected > 0 ? `<span class="status-badge badge-rejected">${rejected} отклонено</span>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-left:auto;">
                <div style="display:flex;gap:6px;align-items:center;">
                    <span style="font-size:12px;font-weight:700;color:#065f46;width:44px;">Excel</span>
                    <button class="btn-export-excel" onclick="exportToExcel('${eventId}','all')">Все</button>
                    <button class="btn-export-excel" onclick="exportToExcel('${eventId}','approved')">Одобренные</button>
                    ${event.allowOrganizerRole ? `<button class="btn-export-excel" onclick="exportToExcel('${eventId}','organizer')">Организаторы</button>` : ''}
                </div>
                <div style="display:flex;gap:6px;align-items:center;">
                    <span style="font-size:12px;font-weight:700;color:#1e40af;width:44px;">Word</span>
                    <button class="btn-export-word"  onclick="exportToWord('${eventId}','all')">Все</button>
                    <button class="btn-export-word"  onclick="exportToWord('${eventId}','approved')">Одобренные</button>
                    ${event.allowOrganizerRole ? `<button class="btn-export-word"  onclick="exportToWord('${eventId}','organizer')">Организаторы</button>` : ''}
                </div>
            </div>
        </div>

        ${event.allowOrganizerRole ? `
        <!-- Фильтр по роли -->
        <div style="display:flex;gap:8px;margin-bottom:18px;">
            <button onclick="filterApplicantsByRole('all')"
                    style="padding:7px 18px;border-radius:20px;border:2px solid #064591;font-size:14px;font-weight:600;cursor:pointer;
                           background:${currentRoleFilter==='all'?'#064591':'#fff'};
                           color:${currentRoleFilter==='all'?'#fff':'#064591'};">
                Все
            </button>
            <button onclick="filterApplicantsByRole('participant')"
                    style="padding:7px 18px;border-radius:20px;border:2px solid #10b981;font-size:14px;font-weight:600;cursor:pointer;
                           background:${currentRoleFilter==='participant'?'#10b981':'#fff'};
                           color:${currentRoleFilter==='participant'?'#fff':'#10b981'};">
                Участники
            </button>
            <button onclick="filterApplicantsByRole('organizer')"
                    style="padding:7px 18px;border-radius:20px;border:2px solid #d97706;font-size:14px;font-weight:600;cursor:pointer;
                           background:${currentRoleFilter==='organizer'?'#d97706':'#fff'};
                           color:${currentRoleFilter==='organizer'?'#fff':'#d97706'};">
                Организаторы
            </button>
        </div>` : ''}`;

    if (apps.length === 0) {
        html += '<p style="color:#6b7280;font-size:17px;">Заявок пока нет</p>';
        container.innerHTML = html;
        return;
    }

    // Столбцы для текстовых полей
    const thTextFields = textFields.map(f => `<th>${escapeHTML(f.title)}</th>`).join('');
    const hasFiles     = fileFields.length > 0;

    html += `
        <div style="overflow-x:auto;">
        <table class="data-table">
            <thead>
                <tr>
                    <th>№</th>
                    <th>ФИО</th>
                    <th>Группа</th>
                    <th>Телефон</th>
                    <th>Дата подачи</th>
                    <th>Статус</th>
                    ${event.allowOrganizerRole ? '<th>Роль</th>' : ''}
                    ${thTextFields}
                    ${hasFiles ? '<th>Файлы</th>' : ''}
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>`;

    apps.forEach((app, idx) => {
        const u = users[app.username] || {};

        const statusMap = {
            approved: ['badge-approved', 'Одобрено'],
            rejected: ['badge-rejected', 'Отклонено'],
            pending:  ['badge-pending',  'Ожидает'],
            reserve:  ['badge-reserve',  'Резерв'],
        };
        const [badgeClass, statusLabel] = statusMap[app.status] || ['badge-pending', 'Ожидает'];

        // Значения текстовых полей формы
        const tdTextFields = textFields.map(f => {
            const val = (app.answers || {})[f.id] || '';
            if (!val) return '<td style="color:#9ca3af;">—</td>';
            if (f.type === 'url') {
                return `<td><a href="${escapeHTML(val)}" target="_blank" rel="noopener"
                              style="color:var(--blue-main);">${escapeHTML(val.slice(0, 50))}${val.length > 50 ? '…' : ''}</a></td>`;
            }
            return `<td>${escapeHTML(val)}</td>`;
        }).join('');

        // Кнопки файлов
        let tdFiles = '';
        if (hasFiles) {
            const appFiles = fileFields.filter(f => (app.answers || {})[f.id]);
            if (appFiles.length === 0) {
                tdFiles = '<td style="color:#9ca3af;">—</td>';
            } else {
                const btns = appFiles.map(f =>
                    `<button class="btn-file-dl"
                             onclick="downloadApplicantFile('${app.id}','${f.id}','${escapeHTML(app.username)}_${escapeHTML(f.title)}')">
                         ${escapeHTML(f.title)}
                     </button>`
                ).join('');
                const allBtn = appFiles.length > 1
                    ? `<button class="btn-file-dl btn-file-dl-all"
                               onclick="downloadAllApplicantFiles('${app.id}')">
                           Все файлы
                       </button>`
                    : '';
                tdFiles = `<td><div style="display:flex;flex-direction:column;gap:4px;">${btns}${allBtn}</div></td>`;
            }
        }

        // Кнопки действий
        const actions = [];
        if (app.status !== 'approved') {
            actions.push(`<button class="btn-approve" onclick="approveApplication('${app.id}')">Одобрить</button>`);
        }
        if (app.status !== 'reserve') {
            actions.push(`<button class="btn-reserve" onclick="setReserveApplication('${app.id}')">Резерв</button>`);
        }
        if (app.status !== 'rejected') {
            actions.push(`<button class="btn-reject" onclick="rejectApplication('${app.id}')">Отклонить</button>`);
        }

        html += `
            <tr>
                <td>${idx + 1}</td>
                <td>
                    <strong>${escapeHTML(app.fullName || u.fullName || app.username)}</strong>
                    ${app.username ? `<br><span style="font-size:12px;color:#6b7280;">${escapeHTML(app.username)}</span>` : ''}
                </td>
                <td>${escapeHTML(u.groupNumber || '—')}</td>
                <td>${escapeHTML(u.phone || '—')}</td>
                <td>${escapeHTML(app.date || '—')}</td>
                <td><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
                ${event.allowOrganizerRole ? `<td>${app.applicationRole === 'organizer' ? '<span class="status-badge badge-reserve">Организатор</span>' : '<span class="status-badge badge-approved">Участник</span>'}</td>` : ''}
                ${tdTextFields}
                ${tdFiles}
                <td>
                    <div class="data-table-actions" style="flex-direction:column;gap:4px;">
                        ${actions.join('')}
                    </div>
                </td>
            </tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

/* ================================================================
   ДЕЙСТВИЯ С ЗАЯВКАМИ
   ================================================================ */

async function approveApplication(appId) {
    const result = await apiUpdateApplication(appId, 'approve');
    if (!result.success && result.error !== 'Нет соединения с сервером') {
        showNotification('Ошибка: ' + (result.error || 'не удалось одобрить'), 'error');
        return;
    }

    const apps  = getApplications();
    const app   = apps.find(a => a.id === appId);
    if (!app) return;

    const events = getEventsFromStorage() || DEFAULT_EVENTS;
    const event  = events.find(e => e.id === app.eventId);

    app.status = 'approved';
    saveApplications(apps);

    addUserNotification(app.username, {
        type:       'одобрение',
        message:    `Ваша заявка на мероприятие «${event?.title || 'Мероприятие'}» одобрена!`,
        eventTitle: event?.title || '',
    });

    renderAdminPanel(currentAdminTab);
    showNotification('Заявка одобрена', 'success');
}

async function setReserveApplication(appId) {
    const result = await apiUpdateApplication(appId, 'reserve');
    if (!result.success && result.error !== 'Нет соединения с сервером') {
        showNotification('Ошибка: ' + (result.error || 'не удалось перевести в резерв'), 'error');
        return;
    }

    const apps = getApplications();
    const app  = apps.find(a => a.id === appId);
    if (!app) return;

    app.status = 'reserve';
    saveApplications(apps);

    renderAdminPanel(currentAdminTab);
    showNotification('Участник переведён в резервный список', '');
}

async function rejectApplication(appId) {
    if (!confirm('Отклонить заявку? Участник получит уведомление об отказе.')) return;

    const result = await apiUpdateApplication(appId, 'reject');
    if (!result.success && result.error !== 'Нет соединения с сервером') {
        showNotification('Ошибка: ' + (result.error || 'не удалось отклонить'), 'error');
        return;
    }

    const apps  = getApplications();
    const app   = apps.find(a => a.id === appId);
    if (!app) return;

    const events = getEventsFromStorage() || DEFAULT_EVENTS;
    const event  = events.find(e => e.id === app.eventId);

    app.status = 'rejected';
    saveApplications(apps);

    const users = getUsers();
    if (users[app.username]) {
        users[app.username].enrolledEvents =
            (users[app.username].enrolledEvents || []).filter(id => id !== app.eventId);
        saveUsers(users);
    }

    addUserNotification(app.username, {
        type:       'отклонение',
        message:    `К сожалению, ваша заявка на «${event?.title || 'Мероприятие'}» не прошла отбор.`,
        eventTitle: event?.title || '',
    });

    renderAdminPanel(currentAdminTab);
    showNotification('Заявка отклонена, уведомление отправлено', 'warning');
}

function adminCloseEvent(eventId) {
    if (!confirm('Завершить прием заявок на это мероприятие?')) return;

    const events = getEventsFromStorage() || [];
    const idx    = events.findIndex(e => e.id === eventId);
    if (idx === -1) return;

    events[idx].status = 'закрыто';
    saveEventsToStorage(events);

    // Обновляем статус на сервере
    apiUpdateEventStatus(eventId, 'закрыто');

    renderAdminPanel(currentAdminTab);
    showNotification('Прием заявок завершён', 'warning');
}

function adminReopenEvent(eventId) {
    if (!confirm('Возобновить прием заявок на это мероприятие?')) return;

    const events = getEventsFromStorage() || [];
    const idx    = events.findIndex(e => e.id === eventId);
    if (idx === -1) return;

    events[idx].status = 'открыто';
    saveEventsToStorage(events);

    // Обновляем статус на сервере
    apiUpdateEventStatus(eventId, 'открыто');

    renderAdminPanel(currentAdminTab);
    showNotification('Прием заявок возобновлён', 'success');
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

    const eventPopularity = events.map(e => ({
        title: e.title,
        count: apps.filter(a => a.eventId === e.id).length,
    })).sort((a, b) => b.count - a.count);

    const topEvent = eventPopularity[0];

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
        </div>`;

    if (topEvent && topEvent.count > 0) {
        html += `
            <div style="background:#e5f0ff;border-radius:16px;padding:24px;margin-top:20px;">
                <p style="font-size:14px;color:#6b7280;font-weight:600;text-transform:uppercase;margin-bottom:8px;">
                    Самое популярное мероприятие
                </p>
                <p style="font-size:20px;font-weight:700;color:#033b7c;margin-bottom:4px;">
                    ${escapeHTML(topEvent.title)}
                </p>
                <p style="color:#164469;font-size:16px;">${topEvent.count} заявок</p>
            </div>`;
    }

    html += `
        <div style="margin-top:24px;">
            <h4 style="color:#033b7c;margin-bottom:16px;">Заявки по мероприятиям:</h4>
            ${eventPopularity.slice(0, 8).map(item => `
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                    <div style="flex:1;min-width:0;">
                        <p style="font-size:15px;color:#163a6f;font-weight:500;
                                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escapeHTML(item.title)}
                        </p>
                    </div>
                    <div style="flex:0 0 120px;background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden;">
                        <div style="width:${appsCount > 0 ? Math.round(item.count / appsCount * 100) : 0}%;
                                    height:100%;background:var(--blue-main);border-radius:4px;"></div>
                    </div>
                    <span style="font-size:14px;font-weight:700;color:#033b7c;flex:0 0 30px;text-align:right;">
                        ${item.count}
                    </span>
                </div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr;gap:16px;margin-top:20px;">
            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:14px;padding:20px;">
                <p style="font-size:13px;color:#065f46;font-weight:600;text-transform:uppercase;">Всего заявок</p>
                <p style="font-size:32px;font-weight:700;color:#065f46;">${appsCount}</p>
            </div>
        </div>`;

    container.innerHTML = html;
}

/* ================================================================
   УПРАВЛЕНИЕ ГРУППАМИ ИНСТИТУТА
   ================================================================ */
let isEditingInstitute = false;
let currentInstituteTab = 'ИИТиФМО';

function renderInstituteGroupsSection() {
    const container = document.getElementById('institute-groups-content');
    if (!container) return;

    if (!isLoggedIn()) {
        container.innerHTML = `
            <div class="restricted-access">
                <span class="lock-icon">🔒</span>
                <p>Для просмотра групп необходимо войти в личный кабинет</p>
                <button class="login-prompt-btn" onclick="showLoginDialog()">Войти</button>
            </div>`;
        return;
    }

    const admin = isAdmin();
    const user  = getCurrentUser();

    if (!admin) {
        // Student: only show their own group
        const groupName = user?.groupNumber;
        if (!groupName) {
            container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:40px 0;">Группа не указана в профиле</p>';
            return;
        }

        const members = _getGroupMembers(groupName);
        const users   = getUsers();

        // Find the student's institute
        let instituteName = '';
        for (const [inst, groups] of Object.entries(INSTITUTE_GROUPS)) {
            if (groups.includes(groupName)) { instituteName = inst; break; }
        }

        let html = '';
        if (instituteName) {
            html += `<p style="font-weight:600;color:#6b7280;font-size:15px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">${escapeHTML(instituteName)}</p>`;
        }
        html += `<p style="font-weight:700;color:#033b7c;font-size:20px;margin-bottom:20px;">Ваша группа: ${escapeHTML(groupName)}</p>`;
        html += '<div class="grid-7">';
        members.forEach(m => {
            const ud = Object.values(users).find(u => u.fullName === m.name || u.username === m.username);
            const av = ud?.avatarDataUrl || 'images/default-avatar.png';
            const rl = ud?.role || 'Студент';
            html += `
                <div class="member-card">
                    <div class="member-avatar">
                        <img src="${av}" alt="${escapeHTML(m.name)}" onerror="this.src='images/default-avatar.png'">
                    </div>
                    <p class="member-name">${escapeHTML(m.name)}</p>
                    <span class="member-role-badge">${escapeHTML(rl)}</span>
                </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
        return;
    }

    // Admin: show institute tabs + groups grid
    const instName = currentInstituteTab;
    const groups   = _getInstGroups(instName);

    // Build tabs HTML
    let tabsHtml = '<div class="institute-tabs">';
    INSTITUTES.forEach(inst => {
        const active = inst.name === instName ? ' active' : '';
        tabsHtml += `<button class="inst-tab${active}" onclick="switchInstituteTab('${inst.name}')">${escapeHTML(inst.name)}</button>`;
    });
    tabsHtml += '</div>';

    // Build groups grid
    let gridHtml = '<div class="grid-6" style="margin-top:20px;">';
    groups.forEach(g => {
        const delBtn = isEditingInstitute
            ? `<button class="delete-badge" onclick="event.stopPropagation();deleteInstGroup('${escapeHTML(g)}','${escapeHTML(instName)}')" title="Удалить">✕</button>`
            : '';
        gridHtml += `
            <div class="member-card" style="cursor:pointer;" onclick="showGroupMembers('${escapeHTML(g)}')">
                <div class="group-avatar" style="cursor:pointer;position:relative;">
                    ${delBtn}
                    <p class="group-name" style="font-size:${g.length > 5 ? '28px' : '38px'};">${escapeHTML(g)}</p>
                </div>
            </div>`;
    });

    // Add button in edit mode
    if (isEditingInstitute) {
        gridHtml += `
            <div class="member-card">
                <button class="add-circle-btn dark" title="Добавить группу"
                        onclick="document.getElementById('add-group-form').style.display='block'">+</button>
                <p class="member-name">Добавить</p>
            </div>`;
    }
    gridHtml += '</div>';

    container.innerHTML = tabsHtml + gridHtml;
}

function switchInstituteTab(name) {
    currentInstituteTab = name;
    renderInstituteGroupsSection();
}

function _getInstGroups(instName) {
    const raw = localStorage.getItem('ppos_inst_' + instName);
    return raw ? JSON.parse(raw) : [...(INSTITUTE_GROUPS[instName] || [])];
}

function _saveInstGroups(instName, groups) {
    localStorage.setItem('ppos_inst_' + instName, JSON.stringify(groups));
}

function _getGroupMembers(groupName) {
    const stored = getGroupMembersFromStorage(groupName);
    if (stored) return stored;
    return DEFAULT_GROUP_MEMBERS_MAP[groupName] || [];
}

function showGroupMembers(groupName) {
    const members = _getGroupMembers(groupName);
    const users   = getUsers();

    if (members.length === 0) {
        showNotification('Состав группы ' + groupName + ' не добавлен', 'warning');
        return;
    }

    let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="color:#033b7c;font-size:22px;font-weight:700;">Группа ${escapeHTML(groupName)}</h3>
        </div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:20px;">`;

    members.forEach(m => {
        const ud = Object.values(users).find(u => u.fullName === m.name || u.username === m.username);
        const av = ud?.avatarDataUrl || 'images/default-avatar.png';
        const rl = ud?.role || 'Студент';
        html += `
            <div class="member-card">
                <div class="member-avatar">
                    <img src="${av}" alt="${escapeHTML(m.name)}" onerror="this.src='images/default-avatar.png'">
                </div>
                <p class="member-name">${escapeHTML(m.name)}</p>
                <span class="member-role-badge">${escapeHTML(rl)}</span>
            </div>`;
    });

    html += `</div>`;

    document.getElementById('modal-description').innerHTML = html;
    const titleEl = document.getElementById('description-modal-title');
    if (titleEl) titleEl.textContent = 'Группа ' + groupName;
    const mc = document.querySelector('#description-modal .modal-content');
    if (mc) mc.classList.add('wide');
    document.getElementById('description-modal').style.display = 'flex';
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

    const groups = _getInstGroups(currentInstituteTab);
    if (!groups.includes(name)) groups.push(name);
    _saveInstGroups(currentInstituteTab, groups);

    const input = document.getElementById('new-group-name');
    if (input) input.value = '';
    document.getElementById('add-group-form').style.display = 'none';

    renderInstituteGroupsSection();
    showNotification('Группа добавлена', 'success');
}

function cancelAddGroup() {
    document.getElementById('add-group-form').style.display = 'none';
}

function deleteInstGroup(groupName, instName) {
    if (!confirm('Удалить группу ' + groupName + '?')) return;
    const groups = _getInstGroups(instName).filter(g => g !== groupName);
    _saveInstGroups(instName, groups);
    renderInstituteGroupsSection();
    showNotification('Группа удалена', 'warning');
}
