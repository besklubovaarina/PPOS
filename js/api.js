/**
 * api.js — Все запросы к серверу (http://localhost:3000/api)
 */

const API_BASE = '/api';

async function apiFetch(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    try {
        const res = await fetch(API_BASE + path, opts);
        return res.json();
    } catch (e) {
        console.error('API:', path, e);
        return { success: false, error: 'Нет соединения с сервером' };
    }
}

/* ── Авторизация ─────────────────────────────────────────── */
function apiLogin(username, password) {
    return apiFetch('POST', '/auth/login', { username, password });
}

function apiRegister(data) {
    return apiFetch('POST', '/auth/register', data);
}

/* ── Мероприятия ─────────────────────────────────────────── */
function apiGetEvents() {
    return apiFetch('GET', '/events');
}

function apiCreateEvent(data) {
    return apiFetch('POST', '/events', data);
}

function apiUpdateEvent(id, data) {
    return apiFetch('PUT', '/events/' + id, data);
}

function apiDeleteEvent(id) {
    return apiFetch('DELETE', '/events/' + id);
}

/* ── Заявки на мероприятия ───────────────────────────────── */
function apiGetApplications(studentId) {
    return apiFetch('GET', '/applications/student/' + studentId);
}

function apiGetAllApplications() {
    return apiFetch('GET', '/applications');
}

function apiCreateApplication(data) {
    return apiFetch('POST', '/applications', data);
}

function apiUpdateApplication(id, action) {
    return apiFetch('PUT', '/applications/' + id + '/' + action);
}

function apiDeleteApplication(eventId, studentId) {
    return apiFetch('DELETE', '/applications/event/' + eventId + '/student/' + studentId);
}

function apiUpdateEventStatus(id, status) {
    return apiFetch('PATCH', '/events/' + id + '/status', { status });
}

/* ── Пользователи ────────────────────────────────────────── */
function apiGetUsers() {
    return apiFetch('GET', '/users');
}

function apiUpdateUser(username, data) {
    return apiFetch('PUT', '/users/' + username, data);
}

/* ── Уведомления ─────────────────────────────────────────── */
function apiGetNotifications(studentId) {
    return apiFetch('GET', '/notifications/' + studentId);
}

function apiMarkNotificationsRead(studentId) {
    return apiFetch('PUT', '/notifications/' + studentId + '/read');
}

/* ── Ожидающие изменения профиля ─────────────────────────── */
function apiGetPendingChanges() {
    return apiFetch('GET', '/users/pending-changes');
}

function apiCreatePendingChange(data) {
    return apiFetch('POST', '/users/pending-changes', data);
}

function apiResolvePendingChange(id, action) {
    return apiFetch('PUT', '/users/pending-changes/' + id + '/' + action);
}

/* ── Сертификаты ─────────────────────────────────────────── */
function apiGetCertTemplate(eventId, role) {
    return apiFetch('GET', '/certificates/event/' + eventId + '/' + role);
}

function apiSaveCertTemplate(eventId, role, templateData) {
    return apiFetch('POST', '/certificates', { eventId, role, templateData });
}

/* ── Документы для скачивания ────────────────────────────── */
function apiGetDownloadableDocs() {
    return apiFetch('GET', '/documents/downloadable');
}

function apiUploadDownloadableDoc(data) {
    return apiFetch('POST', '/documents/downloadable', data);
}

function apiDeleteDownloadableDoc(id) {
    return apiFetch('DELETE', '/documents/downloadable/' + id);
}

/* ── Группы ──────────────────────────────────────────────── */
function apiGetGroups() {
    return apiFetch('GET', '/users/groups');
}

function apiGetGroupMembers(groupName) {
    return apiFetch('GET', '/users/group/' + encodeURIComponent(groupName) + '/members');
}

function apiAddGroupMember(groupName, data) {
    return apiFetch('POST', '/users/group/' + encodeURIComponent(groupName) + '/members', data);
}

function apiDeleteGroupMember(id) {
    return apiFetch('DELETE', '/users/group/members/' + id);
}
