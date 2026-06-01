/**
 * profile.js — Личный кабинет: просмотр и редактирование профиля,
 *              мои мероприятия, участники группы, документы
 */

/* ================================================================
   ОТКРЫТИЕ ЛИЧНОГО КАБИНЕТА
   ================================================================ */
function openProfileModal() {
    const user = getCurrentUser();
    if (!user) {
        showLoginDialog();
        return;
    }

    // Заполняем поля профиля
    document.getElementById('profile-fullname-input').value = user.fullName       || '';
    document.getElementById('profile-group-input').value    = user.groupNumber    || '';
    document.getElementById('profile-phone-input').value    = user.phone          || '';
    document.getElementById('profile-email-input').value    = user.email          || '';
    document.getElementById('profile-role-display').textContent = user.role       || 'Студент';

    const avatarEl = document.getElementById('profile-avatar-preview');
    avatarEl.src   = user.avatarDataUrl || 'images/default-avatar.png';

    // Статус документов
    renderDocumentStatuses(user);

    // Мои мероприятия
    renderMyEventsInProfile();

    // Моя группа
    renderGroupInProfile();

    document.getElementById('profile-modal').style.display = 'flex';
    switchProfileTab('info');
}

function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

/* ================================================================
   ВКЛАДКИ В ПРОФИЛЕ
   ================================================================ */
function switchProfileTab(tab) {
    const tabs = ['info', 'my-events', 'my-group', 'documents'];
    tabs.forEach(t => {
        const tabBtn  = document.getElementById('profile-tab-' + t);
        const tabPane = document.getElementById('profile-pane-' + t);
        if (tabBtn)  tabBtn.classList.toggle('active', t === tab);
        if (tabPane) tabPane.style.display = t === tab ? 'block' : 'none';
    });
}

/* ================================================================
   МОИ МЕРОПРИЯТИЯ (вкладка в профиле)
   ================================================================ */
function renderMyEventsInProfile() {
    const container = document.getElementById('profile-pane-my-events');
    if (!container) return;

    const user = getCurrentUser();
    if (!user) return;

    const enrolledIds = user.enrolledEvents || [];
    const allEvents   = getEventsFromStorage() || DEFAULT_EVENTS;
    const myEvents    = allEvents.filter(e => enrolledIds.includes(e.id));

    if (myEvents.length === 0) {
        container.innerHTML = '<p class="empty-state" style="padding:40px 0;font-size:18px;">Вы пока не записаны ни на одно мероприятие</p>';
        return;
    }

    const html = myEvents.map(event => {
        const count = getParticipantsCount(event.id);
        const apps  = getApplications();
        const myApp = apps.find(a => a.eventId === event.id && a.username === user.username);
        const statusBadge = myApp
            ? `<span class="status-badge badge-${myApp.status === 'approved' ? 'approved' : myApp.status === 'rejected' ? 'rejected' : 'pending'}">
                ${myApp.status === 'approved' ? 'Одобрено' : myApp.status === 'rejected' ? 'Отклонено' : 'Ожидает'}
               </span>`
            : '';

        return `
            <div style="background:#f0f7ff;border-radius:16px;padding:20px;margin-bottom:14px;border:1px solid #bfdef3;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
                <div style="flex:1;">
                    <p style="font-weight:700;color:#033b7c;font-size:17px;margin-bottom:6px;">${escapeHTML(event.title)}</p>
                    <p style="color:#6b7280;font-size:14px;">${escapeHTML(event.date)} · ${escapeHTML(event.time)}</p>
                    <div style="margin-top:8px;">${statusBadge}</div>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button class="btn-certificate" onclick="showCertificate('${event.id}')">Сертификат</button>
                    <button class="btn-cancel" style="padding:10px 18px;font-size:15px;border-radius:25px;"
                            onclick="toggleEnroll('${event.id}');closeProfileModal();">Отменить</button>
                </div>
            </div>`;
    }).join('');

    container.innerHTML = html;
}

/* ================================================================
   МОЯ ГРУППА (вкладка в профиле)
   ================================================================ */
let isEditingGroupInProfile = false;

function renderGroupInProfile() {
    const container = document.getElementById('profile-pane-my-group');
    if (!container) return;

    const admin   = isAdmin();
    const members = getGroupMembersFromStorage() || DEFAULT_GROUP_MEMBERS;
    const users   = getUsers();

    let html = '<div class="grid-7" style="margin-bottom:20px;">';

    members.forEach(member => {
        const userData  = Object.values(users).find(u => u.fullName === member.name || u.username === member.username);
        const avatarSrc = userData?.avatarDataUrl || 'images/default-avatar.png';
        const roleLabel = userData?.role || 'Студент';

        html += `
            <div class="member-card">
                <div class="member-avatar" style="position:relative;">
                    <img src="${avatarSrc}"
                         alt="${escapeHTML(member.name)}"
                         onerror="this.src='images/default-avatar.png'">
                    ${(admin && isEditingGroupInProfile)
                        ? `<button class="delete-badge" onclick="deleteMemberFromGroup('${member.id}')">✕</button>`
                        : ''}
                </div>
                <p class="member-name">${escapeHTML(member.name)}</p>
                <span class="member-role-badge">${escapeHTML(roleLabel)}</span>
            </div>`;
    });

    if (admin && isEditingGroupInProfile) {
        html += `
            <div class="member-card">
                <button class="add-circle-btn" title="Добавить участника"
                        onclick="document.getElementById('profile-add-member-form').style.display='block'">
                    +
                </button>
                <p class="member-name">Добавить</p>
            </div>`;
    }

    html += '</div>';

    // Форма добавления участника
    html += `
        <div id="profile-add-member-form" class="form-container" style="display:none;">
            <h3>Добавить участника</h3>
            <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
                <div style="flex:1;">
                    <label class="form-label">ФИО участника</label>
                    <input type="text" id="profile-new-member-name" class="form-input"
                           placeholder="Фамилия Имя Отчество" style="margin-bottom:0;">
                </div>
                <div style="flex:1;">
                    <label class="form-label">Логин (если есть)</label>
                    <input type="text" id="profile-new-member-username" class="form-input"
                           placeholder="username" style="margin-bottom:0;">
                </div>
            </div>
            <div class="form-actions" style="margin-top:14px;">
                <button class="btn-submit" onclick="addMemberFromProfile()">Добавить</button>
                <button class="btn-cancel" onclick="document.getElementById('profile-add-member-form').style.display='none'">Отмена</button>
            </div>
        </div>`;

    // Кнопка редактирования для admin
    if (admin) {
        html = `
            <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
                <button class="edit-btn" onclick="toggleGroupEditInProfile()">
                    ${isEditingGroupInProfile ? 'Готово' : 'Редактировать'}
                </button>
            </div>` + html;
    }

    container.innerHTML = html;
}

function toggleGroupEditInProfile() {
    isEditingGroupInProfile = !isEditingGroupInProfile;
    renderGroupInProfile();
}

function deleteMemberFromGroup(memberId) {
    if (!confirm('Удалить участника из группы?')) return;
    let members = getGroupMembersFromStorage() || [];
    members = members.filter(m => m.id !== memberId);
    saveGroupMembersToStorage(members);
    renderGroupInProfile();
    showNotification('Участник удалён', 'warning');
}

function addMemberFromProfile() {
    const name     = document.getElementById('profile-new-member-name')?.value.trim();
    const username = document.getElementById('profile-new-member-username')?.value.trim();

    if (!name) { showNotification('Введите ФИО участника', 'error'); return; }

    const members = getGroupMembersFromStorage() || [];
    members.push({ id: Date.now().toString(), name, username: username || '' });
    saveGroupMembersToStorage(members);

    document.getElementById('profile-add-member-form').style.display = 'none';
    document.getElementById('profile-new-member-name').value = '';
    document.getElementById('profile-new-member-username').value = '';

    renderGroupInProfile();
    showNotification('Участник добавлен', 'success');
}

/* ================================================================
   СТАТУСЫ ДОКУМЕНТОВ
   ================================================================ */
function renderDocumentStatuses(user) {
    const docs = user.documents || {};
    const docTypes = [
        { key: 'consent',    icon: '📋', label: 'Согласие на обработку данных' },
        { key: 'accounting', icon: '📝', label: 'Заявление в бухгалтерию' },
        { key: 'join',       icon: '✍️',  label: 'Заявление на вступление' },
    ];

    docTypes.forEach(dt => {
        const statusEl = document.getElementById('doc-status-' + dt.key);
        if (statusEl) {
            statusEl.textContent  = docs[dt.key] ? 'Загружен ✓' : 'Не загружен';
            statusEl.style.color  = docs[dt.key] ? 'var(--green)' : 'var(--gray-500)';
        }
    });
}

/* ================================================================
   ЗАГРУЗКА АВАТАРА
   ================================================================ */
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showNotification('Файл слишком большой. Максимум 5 МБ', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
        document.getElementById('profile-avatar-preview').src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

/* ================================================================
   ЗАГРУЗКА ДОКУМЕНТА
   ================================================================ */
function uploadDocument(type, event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        showNotification('Файл слишком большой. Максимум 10 МБ', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
        const user = getCurrentUser();
        if (!user) return;

        if (!user.documents) user.documents = {};
        user.documents[type] = ev.target.result;
        setCurrentUser(user);

        // Сохраняем в базу пользователей
        const users = getUsers();
        if (users[user.username]) {
            users[user.username].documents = user.documents;
            saveUsers(users);
        }

        renderDocumentStatuses(user);
        showNotification('Документ загружен', 'success');
    };
    reader.readAsDataURL(file);
}

/* ================================================================
   СОХРАНЕНИЕ ИЗМЕНЕНИЙ ПРОФИЛЯ
   ================================================================ */
function saveProfileChanges() {
    const user = getCurrentUser();
    if (!user) return;

    const newFullName = document.getElementById('profile-fullname-input')?.value.trim() || user.fullName;
    const newGroup    = document.getElementById('profile-group-input')?.value.trim()    || user.groupNumber;
    const newPhone    = document.getElementById('profile-phone-input')?.value.trim();
    const newEmail    = document.getElementById('profile-email-input')?.value.trim();
    const newAvatar   = document.getElementById('profile-avatar-preview')?.src;

    const isNewAvatar = newAvatar && !newAvatar.includes('default-avatar');

    const change = {
        id:          Date.now().toString(),
        username:    user.username,
        type:        'profile_update',
        timestamp:   new Date().toLocaleString('ru-RU'),
        status:      'pending',
        oldFullName: user.fullName,
        newFullName,
        oldGroup:    user.groupNumber,
        newGroup,
        oldPhone:    user.phone,
        newPhone,
        oldEmail:    user.email,
        newEmail,
        oldAvatar:   user.avatarDataUrl,
        newAvatar:   isNewAvatar ? newAvatar : user.avatarDataUrl,
    };

    if (isAdmin()) {
        // Администратор применяет изменения немедленно
        applyProfileChange(change);
        showNotification('Профиль обновлён', 'success');
    } else {
        // Студент отправляет на одобрение
        const pending = getPendingChanges();
        pending.push(change);
        savePendingChanges(pending);
        showNotification('Изменения отправлены на одобрение администратору', 'success');
    }

    closeProfileModal();
    updateUIForAuth();
}

/* ================================================================
   ПРИМЕНЕНИЕ ИЗМЕНЕНИЯ ПРОФИЛЯ (вызывается из admin.js и здесь)
   ================================================================ */
function applyProfileChange(change) {
    // Обновляем базу пользователей
    const users = getUsers();
    if (users[change.username]) {
        const u = users[change.username];
        u.fullName    = change.newFullName;
        u.profileName = change.newFullName;
        u.groupNumber = change.newGroup;
        u.phone       = change.newPhone;
        u.email       = change.newEmail;
        if (change.newAvatar) u.avatarDataUrl = change.newAvatar;
        saveUsers(users);
    }

    // Если изменяемый пользователь — текущий, обновляем сессию
    const current = getCurrentUser();
    if (current && current.username === change.username) {
        current.fullName    = change.newFullName;
        current.profileName = change.newFullName;
        current.groupNumber = change.newGroup;
        current.phone       = change.newPhone;
        current.email       = change.newEmail;
        if (change.newAvatar) current.avatarDataUrl = change.newAvatar;
        setCurrentUser(current);
    }

    updateUIForAuth();
}
