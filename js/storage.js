/**
 * storage.js — Работа с localStorage и sessionStorage
 * Все ключи хранения собраны здесь, чтобы не путаться в других файлах.
 */

const KEYS = {
    USERS:           'ppos_users',
    EVENTS:          'ppos_events',
    GROUP_MEMBERS:   'ppos_group_members',
    INST_GROUPS:     'ppos_institute_groups',
    APPLICATIONS:    'ppos_applications',
    PENDING_CHANGES: 'ppos_pending_changes',
    CURRENT_USER:    'ppos_current_user',
    NOTIFICATIONS:   'ppos_notifications',
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
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
}

/* ---------- Участники группы ---------- */
function getGroupMembersFromStorage() {
    const raw = localStorage.getItem(KEYS.GROUP_MEMBERS);
    return raw ? JSON.parse(raw) : null;
}

function saveGroupMembersToStorage(members) {
    localStorage.setItem(KEYS.GROUP_MEMBERS, JSON.stringify(members));
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
