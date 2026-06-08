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

    document.getElementById('profile-modal').style.display = 'flex';

    if (isAdmin()) {
        ['my-events', 'my-group'].forEach(t => {
            const btn = document.getElementById('profile-tab-' + t);
            if (btn) btn.style.display = 'none';
        });
        const docBtn = document.getElementById('profile-tab-documents');
        if (docBtn) docBtn.style.display = '';
        switchProfileTab('info');
    } else {
        ['my-events', 'my-group', 'documents'].forEach(t => {
            const btn = document.getElementById('profile-tab-' + t);
            if (btn) btn.style.display = '';
        });
        renderMyEventsInProfile();
        renderGroupInProfile();
        switchProfileTab('info');
    }
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
    if (tab === 'documents') renderDocumentPane();
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

    const apps = getApplications();
    const html = myEvents.map(event => {
        const myApp = apps.find(a => a.eventId === event.id && a.username === user.username);
        const statusBadge = myApp
            ? `<span class="status-badge badge-${myApp.status === 'approved' ? 'approved' : myApp.status === 'rejected' ? 'rejected' : 'pending'}">
                ${myApp.status === 'approved' ? 'Одобрено' : myApp.status === 'rejected' ? 'Отклонено' : 'Ожидает'}
               </span>`
            : '';

        const canSeeCert = event.hasCertificate && event.status === 'completed' && myApp?.status === 'approved';
        const certBtn = canSeeCert
            ? `<button class="btn-certificate" onclick="showCertificate('${event.id}')">Сертификат</button>`
            : '';
        const cancelBtn = event.status !== 'completed'
            ? `<button class="btn-cancel" style="padding:10px 18px;font-size:15px;border-radius:25px;"
                       onclick="cancelEnroll('${event.id}');closeProfileModal();">Отменить</button>`
            : '';

        return `
            <div style="background:#f0f7ff;border-radius:16px;padding:20px;margin-bottom:14px;border:1px solid #bfdef3;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
                <div style="flex:1;">
                    <p style="font-weight:700;color:#033b7c;font-size:17px;margin-bottom:6px;">${escapeHTML(event.title)}</p>
                    <p style="color:#6b7280;font-size:14px;">${escapeHTML(_formatDate(event.date))} · ${escapeHTML(event.time)}</p>
                    <div style="margin-top:8px;">${statusBadge}</div>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    ${certBtn}
                    ${cancelBtn}
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
    const user2   = getCurrentUser();
    const grp     = user2?.groupNumber || '';
    const members = (grp ? getGroupMembersFromStorage(grp) : null) || DEFAULT_GROUP_MEMBERS_MAP[grp] || DEFAULT_GROUP_MEMBERS;
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
    const grp = getCurrentUser()?.groupNumber;
    let members = (grp ? getGroupMembersFromStorage(grp) : null) || getGroupMembersFromStorage() || [];
    members = members.filter(m => m.id !== memberId);
    saveGroupMembersToStorage(members, getCurrentUser()?.groupNumber);
    renderGroupInProfile();
    showNotification('Участник удалён', 'warning');
}

function addMemberFromProfile() {
    const name     = document.getElementById('profile-new-member-name')?.value.trim();
    const username = document.getElementById('profile-new-member-username')?.value.trim();

    if (!name) { showNotification('Введите ФИО участника', 'error'); return; }

    const grp = getCurrentUser()?.groupNumber;
    const members = (grp ? getGroupMembersFromStorage(grp) : null) || getGroupMembersFromStorage() || [];
    members.push({ id: Date.now().toString(), name, username: username || '' });
    saveGroupMembersToStorage(members, getCurrentUser()?.groupNumber);

    document.getElementById('profile-add-member-form').style.display = 'none';
    document.getElementById('profile-new-member-name').value = '';
    document.getElementById('profile-new-member-username').value = '';

    renderGroupInProfile();
    showNotification('Участник добавлен', 'success');
}

/* ================================================================
   ВКЛАДКА ДОКУМЕНТОВ — РЕНДЕР
   ================================================================ */
function renderDocumentPane() {
    const container = document.getElementById('docs-pane-content');
    if (!container) return;

    if (isAdmin()) {
        _renderDocsPaneAdmin(container);
    } else {
        _renderDocsPaneStudent(container);
    }
}

function _docStatusHtml(meta) {
    if (!meta) return `<span style="color:var(--gray-500);font-size:13px;">Не загружен</span>`;
    const name = meta.name ? ` · ${escapeHTML(meta.name)}` : '';
    return `<span style="color:var(--green);font-size:13px;font-weight:600;">Загружен ✓${name}</span>`;
}

function _renderDocsPaneStudent(container) {
    const user = getCurrentUser();
    const docs = (user && user.documents) || {};
    const extra = docs.extraFiles || [];

    const extraListHtml = extra.length
        ? extra.map((f, i) => `
            <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
                <span style="font-size:13px;flex:1;color:#163a6f;">📎 ${escapeHTML(f.name)}</span>
                <button onclick="downloadDocFromDB('${escapeHTML(f.id)}','${escapeHTML(f.name).replace(/'/g,'\\\'')}',event)"
                        style="background:none;border:none;color:var(--blue-main);cursor:pointer;font-size:14px;font-weight:600;padding:2px 6px;" title="Скачать">↓</button>
                <button onclick="removeExtraDoc(${i})"
                        style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:18px;line-height:1;" title="Удалить">✕</button>
            </div>`).join('')
        : '';

    container.innerHTML = `
        <p style="color:#163a6f;font-size:16px;margin-bottom:20px;line-height:1.6;">
            Для участия в мероприятиях ППОС необходимо состоять в профсоюзе.
        </p>
        <div class="documents-section" style="padding:0;background:transparent;">

            <!-- Заявление в бухгалтерию -->
            <div class="doc-card">
                <span class="doc-icon">📝</span>
                <div class="doc-info" style="flex:1;">
                    <strong>Заявление в бухгалтерию</strong>
                    <div style="margin-top:4px;">${_docStatusHtml(docs.accounting)}</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <a href="files/zayavlenie-shablon.docx" download
                       style="padding:7px 14px;border-radius:8px;border:1.5px solid var(--blue-main);color:var(--blue-main);font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap;">
                        ↓ Шаблон
                    </a>
                    <label style="cursor:pointer;">
                        <span class="file-input-btn" style="padding:7px 14px;font-size:13px;">Загрузить</span>
                        <input type="file" accept="image/*,.pdf" style="display:none;"
                               onchange="uploadDocument('accounting', event)">
                    </label>
                </div>
            </div>

            <!-- Заявление на вступление -->
            <div class="doc-card">
                <span class="doc-icon">✍️</span>
                <div class="doc-info" style="flex:1;">
                    <strong>Заявление на вступление в профсоюз</strong>
                    <div style="margin-top:4px;">${_docStatusHtml(docs.join)}</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <a href="files/zayavlenie-shablon.docx" download
                       style="padding:7px 14px;border-radius:8px;border:1.5px solid var(--blue-main);color:var(--blue-main);font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap;">
                        ↓ Шаблон
                    </a>
                    <label style="cursor:pointer;">
                        <span class="file-input-btn" style="padding:7px 14px;font-size:13px;">Загрузить</span>
                        <input type="file" accept="image/*,.pdf" style="display:none;"
                               onchange="uploadDocument('join', event)">
                    </label>
                </div>
            </div>

            <!-- Загрузить документы -->
            <div class="doc-card" style="flex-direction:column;align-items:flex-start;gap:10px;">
                <div style="display:flex;align-items:center;gap:10px;width:100%;">
                    <span class="doc-icon">📎</span>
                    <div style="flex:1;">
                        <strong>Загрузить документы</strong>
                        <div style="color:var(--gray-500);font-size:12px;margin-top:2px;">JPG, PDF, DOC, DOCX</div>
                    </div>
                    <label style="cursor:pointer;">
                        <span class="file-input-btn" style="padding:7px 14px;font-size:13px;">Загрузить</span>
                        <input type="file" accept="image/*,.pdf,.doc,.docx" style="display:none;"
                               onchange="uploadExtraDoc(event)">
                    </label>
                </div>
                ${extraListHtml ? `<div style="width:100%;padding-left:42px;">${extraListHtml}</div>` : ''}
            </div>

        </div>

        ${_renderDownloadableDocsSection(false)}`;
}

function _renderDocsPaneAdmin(container) {
    container.innerHTML = _renderDownloadableDocsSection(true);
}

function _renderDownloadableDocsSection(adminMode) {
    const docs = getDownloadableDocs();

    const itemsHtml = docs.length
        ? docs.map(d => `
            <div class="doc-card">
                <span class="doc-icon">📄</span>
                <div class="doc-info" style="flex:1;">
                    <strong>${escapeHTML(d.name)}</strong>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button onclick="downloadServerDoc('${escapeHTML(d.id)}','${escapeHTML(d.name).replace(/'/g,'\\\'')}',event)"
                            style="padding:7px 14px;border-radius:8px;border:1.5px solid var(--blue-main);color:var(--blue-main);background:transparent;font-size:13px;font-weight:600;cursor:pointer;">
                        ↓ Скачать
                    </button>
                    ${adminMode ? `<button onclick="adminDeleteDownloadableDoc('${d.id}')"
                        style="padding:7px 12px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;">Удалить</button>` : ''}
                </div>
            </div>`).join('')
        : `<p style="color:var(--gray-500);font-size:15px;">Документы не добавлены</p>`;

    const adminUpload = adminMode ? `
        <div style="margin-top:14px;">
            <label style="cursor:pointer;">
                <span class="file-input-btn" style="font-size:14px;padding:9px 18px;">+ Добавить документ</span>
                <input type="file" accept=".pdf,.doc,.docx" style="display:none;"
                       onchange="adminUploadDownloadableDoc(this)">
            </label>
            <p style="color:var(--gray-500);font-size:13px;margin-top:8px;">PDF или DOCX — будет доступен студентам для скачивания</p>
        </div>` : '';

    return `
        <div style="margin-top:${adminMode ? 0 : 24}px;">
            <h4 style="color:#033b7c;font-size:17px;font-weight:700;margin-bottom:14px;">
                Документы для скачивания
            </h4>
            <div class="documents-section" style="padding:0;background:transparent;">
                ${itemsHtml}
            </div>
            ${adminUpload}
        </div>`;
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
   ЗАГРУЗКА ДОКУМЕНТА (IndexedDB — без ограничений localStorage)
   ================================================================ */
function uploadDocument(type, event) {
    const file = event.target.files[0];
    if (!file) return;

    const MAX = 50 * 1024 * 1024;
    if (file.size > MAX) { showNotification('Файл слишком большой. Максимум 50 МБ на один файл', 'error'); return; }

    const reader = new FileReader();
    reader.onload = ev => {
        const user = getCurrentUser();
        if (!user) return;

        const id = `doc_${user.username}_${type}`;
        DocsDB.set(id, ev.target.result).then(() => {
            if (!user.documents) user.documents = {};
            user.documents[type] = { name: file.name, id };
            setCurrentUser(user);
            const users = getUsers();
            if (users[user.username]) { users[user.username].documents = user.documents; saveUsers(users); }
            renderDocumentPane();
            showNotification('Документ загружен', 'success');
        }).catch(() => showNotification('Ошибка при сохранении файла', 'error'));
    };
    reader.readAsDataURL(file);
}

/* ================================================================
   ЗАГРУЗКА ДОПОЛНИТЕЛЬНЫХ ДОКУМЕНТОВ СТУДЕНТОМ
   ================================================================ */
function uploadExtraDoc(event) {
    const file = event.target.files[0];
    if (!file) return;

    const MAX = 50 * 1024 * 1024;
    if (file.size > MAX) { showNotification('Файл слишком большой. Максимум 50 МБ на один файл', 'error'); return; }

    const reader = new FileReader();
    reader.onload = ev => {
        const user = getCurrentUser();
        if (!user) return;

        const id = `extradoc_${user.username}_${Date.now()}`;
        DocsDB.set(id, ev.target.result).then(() => {
            if (!user.documents) user.documents = {};
            if (!Array.isArray(user.documents.extraFiles)) user.documents.extraFiles = [];
            user.documents.extraFiles.push({ name: file.name, id });
            setCurrentUser(user);
            const users = getUsers();
            if (users[user.username]) { users[user.username].documents = user.documents; saveUsers(users); }
            renderDocumentPane();
            showNotification('Документ загружен', 'success');
        }).catch(() => showNotification('Ошибка при сохранении файла', 'error'));
    };
    reader.readAsDataURL(file);
}

function removeExtraDoc(index) {
    const user = getCurrentUser();
    if (!user || !user.documents?.extraFiles) return;

    const removed = user.documents.extraFiles.splice(index, 1)[0];
    if (removed?.id) DocsDB.remove(removed.id).catch(() => {});

    setCurrentUser(user);
    const users = getUsers();
    if (users[user.username]) { users[user.username].documents = user.documents; saveUsers(users); }
    renderDocumentPane();
}

/* ================================================================
   УПРАВЛЕНИЕ ДОКУМЕНТАМИ ДЛЯ СКАЧИВАНИЯ (АДМИНИСТРАТОР)
   ================================================================ */
function adminUploadDownloadableDoc(input) {
    const file = input.files[0];
    if (!file) return;

    const MAX = 50 * 1024 * 1024;
    if (file.size > MAX) { showNotification('Файл слишком большой. Максимум 50 МБ на один файл', 'error'); return; }

    const reader = new FileReader();
    reader.onload = async ev => {
        const id = 'dloc_' + Date.now();
        try {
            const r = await apiUploadDownloadableDoc({ id, name: file.name, fileData: ev.target.result });
            if (!r.success) throw new Error(r.error || 'Ошибка сервера');
            const docs = getDownloadableDocs();
            docs.push({ id, name: file.name });
            saveDownloadableDocs(docs);
            renderDocumentPane();
            showNotification('Документ добавлен', 'success');
        } catch (err) {
            showNotification('Ошибка при сохранении: ' + err.message, 'error');
        }
    };
    reader.readAsDataURL(file);
}

async function adminDeleteDownloadableDoc(id) {
    if (!confirm('Удалить документ?')) return;
    try {
        await apiDeleteDownloadableDoc(id);
    } catch (_) {}
    saveDownloadableDocs(getDownloadableDocs().filter(d => d.id !== id));
    renderDocumentPane();
    showNotification('Документ удалён', 'warning');
}

/* ================================================================
   СКАЧИВАНИЕ ДОКУМЕНТА С СЕРВЕРА (для документов администратора)
   ================================================================ */
async function downloadServerDoc(id, name, e) {
    if (e) e.preventDefault();
    try {
        const r = await apiGetDownloadableDocData(id);
        if (!r.success || !r.data) { showNotification('Файл не найден на сервере', 'error'); return; }
        const a = document.createElement('a');
        a.href     = r.data;
        a.download = r.name || name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (err) {
        showNotification('Ошибка при загрузке файла', 'error');
    }
}

/* ================================================================
   СКАЧИВАНИЕ ФАЙЛА ИЗ IndexedDB
   ================================================================ */
function downloadDocFromDB(id, name, e) {
    if (e) e.preventDefault();
    DocsDB.get(id).then(dataUrl => {
        if (!dataUrl) { showNotification('Файл не найден', 'error'); return; }
        const a = document.createElement('a');
        a.href     = dataUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }).catch(() => showNotification('Ошибка при загрузке файла', 'error'));
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
