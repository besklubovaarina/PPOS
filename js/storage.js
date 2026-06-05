/**
 * storage.js — Работа с localStorage и sessionStorage
 * Все ключи хранения собраны здесь, чтобы не путаться в других файлах.
 */

const KEYS = {
    USERS:             'ppos_users',
    EVENTS:            'ppos_events',
    GROUP_MEMBERS:     'ppos_group_members',
    INST_GROUPS:       'ppos_institute_groups',
    APPLICATIONS:      'ppos_applications',
    PENDING_CHANGES:   'ppos_pending_changes',
    CURRENT_USER:      'ppos_current_user',
    NOTIFICATIONS:     'ppos_notifications',
    DOWNLOADABLE_DOCS: 'ppos_downloadable_docs',
};

/* ---------- Пользователи ---------- */
function getUsers() {
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '{}');
}

function saveUsers(users) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

/* ---------- Мероприятия ---------- */
function getEventsFromStorage() {
    const raw = localStorage.getItem(KEYS.EVENTS);
    return raw ? JSON.parse(raw) : null;
}

function saveEventsToStorage(events) {
    try {
        localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            showNotification('Ошибка: недостаточно места в хранилище браузера.', 'error');
        } else {
            throw e;
        }
    }
}

/* ---------- Шаблоны сертификатов (хранятся отдельно от событий) ---------- */
function getCertTemplate(eventId, role) {
    return localStorage.getItem('ppos_cert_' + role + '_' + eventId) || null;
}

function saveCertTemplate(eventId, role, dataUrl) {
    try {
        if (dataUrl) {
            localStorage.setItem('ppos_cert_' + role + '_' + eventId, dataUrl);
        } else {
            localStorage.removeItem('ppos_cert_' + role + '_' + eventId);
        }
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            showNotification('Ошибка: файл шаблона слишком большой для сохранения.', 'error');
        } else {
            throw e;
        }
    }
}

function deleteCertTemplates(eventId) {
    localStorage.removeItem('ppos_cert_participant_' + eventId);
    localStorage.removeItem('ppos_cert_organizer_'   + eventId);
}

/* ---------- Участники группы ---------- */
function getGroupMembersFromStorage(groupName) {
    const key = groupName ? 'ppos_group_members_' + groupName : KEYS.GROUP_MEMBERS;
    const raw = localStorage.getItem(key);
    // Fallback for old single-key storage (3215д)
    if (!raw && !groupName) return null;
    if (!raw && groupName === '3215д') {
        const old = localStorage.getItem(KEYS.GROUP_MEMBERS);
        return old ? JSON.parse(old) : null;
    }
    return raw ? JSON.parse(raw) : null;
}

function saveGroupMembersToStorage(members, groupName) {
    const key = groupName ? 'ppos_group_members_' + groupName : KEYS.GROUP_MEMBERS;
    localStorage.setItem(key, JSON.stringify(members));
}

/* ---------- Группы института ---------- */
function getInstGroupsFromStorage() {
    const raw = localStorage.getItem(KEYS.INST_GROUPS);
    return raw ? JSON.parse(raw) : null;
}

function saveInstGroupsToStorage(groups) {
    localStorage.setItem(KEYS.INST_GROUPS, JSON.stringify(groups));
}

/* ---------- Заявки на мероприятия ---------- */
function getApplications() {
    return JSON.parse(localStorage.getItem(KEYS.APPLICATIONS) || '[]');
}

function saveApplications(apps) {
    localStorage.setItem(KEYS.APPLICATIONS, JSON.stringify(apps));
}

/* ---------- Ожидающие изменения профилей ---------- */
function getPendingChanges() {
    return JSON.parse(localStorage.getItem(KEYS.PENDING_CHANGES) || '[]');
}

function savePendingChanges(changes) {
    localStorage.setItem(KEYS.PENDING_CHANGES, JSON.stringify(changes));
}

/* ---------- Текущий авторизованный пользователь ---------- */
function getCurrentUser() {
    return JSON.parse(sessionStorage.getItem(KEYS.CURRENT_USER) || 'null');
}

function setCurrentUser(user) {
    if (user) {
        sessionStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
        sessionStorage.removeItem(KEYS.CURRENT_USER);
    }
}

/* ---------- Уведомления пользователей ---------- */

/** Возвращает все уведомления пользователя. */
function getUserNotifications(username) {
    const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '{}');
    return all[username] || [];
}

/** Сохраняет уведомления пользователя. */
function saveUserNotifications(username, notifications) {
    const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '{}');
    all[username] = notifications;
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(all));
}

/**
 * Добавляет новое уведомление пользователю.
 * @param {string} username
 * @param {{ type: 'approval'|'rejection'|'reserve', message: string, eventTitle: string }} notification
 */
function addUserNotification(username, notification) {
    const notifs = getUserNotifications(username);
    notifs.unshift({
        id:         Date.now().toString(),
        type:       notification.type,
        message:    notification.message,
        eventTitle: notification.eventTitle || '',
        timestamp:  new Date().toLocaleString('ru-RU'),
        read:       false,
    });
    saveUserNotifications(username, notifs.slice(0, 100));
}

/** Помечает все уведомления пользователя как прочитанные. */
function markNotificationsRead(username) {
    const notifs = getUserNotifications(username);
    notifs.forEach(n => { n.read = true; });
    saveUserNotifications(username, notifs);
}

/* ---------- Вспомогательные проверки ---------- */
function isLoggedIn() {
    return getCurrentUser() !== null;
}

function isAdmin() {
    const user = getCurrentUser();
    return user && user.isAdmin === true;
}

function isChairman() {
    const user = getCurrentUser();
    return user && (user.role === 'Председатель' || user.isAdmin === true);
}

/* ---------- Скачиваемые документы (управляет администратор) ---------- */
/* Хранит только метаданные [{id, name}] — сами файлы в DocsDB (IndexedDB) */
function getDownloadableDocs() {
    const raw = localStorage.getItem(KEYS.DOWNLOADABLE_DOCS);
    return raw ? JSON.parse(raw) : [];
}

function saveDownloadableDocs(docs) {
    localStorage.setItem(KEYS.DOWNLOADABLE_DOCS, JSON.stringify(docs));
}

/* ---------- IndexedDB для файлов документов ---------- */
/* Позволяет хранить файлы до сотен МБ, в отличие от localStorage (5 МБ) */
const DocsDB = (() => {
    const DB_NAME = 'ppos_docs_db';
    const STORE   = 'docs';
    let _db = null;

    function open() {
        if (_db) return Promise.resolve(_db);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = e => {
                e.target.result.createObjectStore(STORE, { keyPath: 'id' });
            };
            req.onsuccess = e => { _db = e.target.result; resolve(_db); };
            req.onerror   = () => reject(req.error);
        });
    }

    return {
        get(id) {
            return open().then(db => new Promise((resolve, reject) => {
                const req = db.transaction(STORE).objectStore(STORE).get(id);
                req.onsuccess = () => resolve(req.result ? req.result.data : null);
                req.onerror   = () => reject(req.error);
            }));
        },
        set(id, data) {
            return open().then(db => new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).put({ id, data });
                tx.oncomplete = resolve;
                tx.onerror    = () => reject(tx.error);
            }));
        },
        remove(id) {
            return open().then(db => new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).delete(id);
                tx.oncomplete = resolve;
                tx.onerror    = () => reject(tx.error);
            }));
        },
    };
})();
