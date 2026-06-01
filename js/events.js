/**
 * events.js — Управление мероприятиями: отображение, запись, CRUD
 */

/* ================================================================
   СОСТОЯНИЕ СЕКЦИИ МЕРОПРИЯТИЙ
   ================================================================ */
let isEditingEvents = false;
let currentSearchQuery = '';
let currentTypeFilter  = 'all';

/* ================================================================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   ================================================================ */

/**
 * Возвращает HTML-иконку мероприятия по его типу.
 * @param {string} type - 'star' | 'airplane' | 'droplet'
 * @param {string} eventId - уникальный id (нужен для linearGradient)
 */
function getEventIconHTML(type, eventId) {
    if (type === 'star') {
        return `
            <svg class="star-svg" viewBox="0 0 144 144">
                <defs>
                    <linearGradient id="star-grad-${eventId}" x1="57" x2="131" y1="-31" y2="143">
                        <stop stop-color="white"/>
                        <stop offset="1" stop-color="#108FE5"/>
                    </linearGradient>
                </defs>
                <path d="M72 3L89.6 51.5L142 55.2L100.5 88.9L113.3 140.3L72 113.4L30.7 140.3L43.5 88.9L1.9 55.2L54.4 51.5Z"
                      fill="url(#star-grad-${eventId})"
                      stroke="rgba(255,255,255,0.4)"
                      stroke-width="1.5"/>
            </svg>`;
    }
    if (type === 'airplane') {
        return `<img src="images/airplane-icon.png" alt="Самолёт" style="width:95px;height:95px;opacity:0.92;">`;
    }
    // droplet по умолчанию
    return `<div class="droplet-icon"></div>`;
}

/**
 * Считает текущее число участников мероприятия из заявок.
 * @param {string} eventId
 */
function getParticipantsCount(eventId) {
    const apps = getApplications();
    return apps.filter(a => a.eventId === eventId && a.status !== 'rejected').length;
}

/**
 * Возвращает статус-метку мероприятия в зависимости от заполненности.
 * @param {Object} event
 */
function getEventStatusBadge(event) {
    const count = getParticipantsCount(event.id);
    const max   = event.maxParticipants || 0;

    if (event.status === 'closed') {
        return `<span class="event-status-badge closed">Запись закрыта</span>`;
    }
    if (max > 0 && count >= max) {
        return `<span class="event-status-badge closed">Мест нет</span>`;
    }
    if (max > 0 && count >= max * 0.75) {
        return `<span class="event-status-badge limited">Мест мало: ${max - count} из ${max}</span>`;
    }
    if (max > 0) {
        return `<span class="event-status-badge open">Мест: ${max - count} из ${max}</span>`;
    }
    return `<span class="event-status-badge open">Без ограничений</span>`;
}

/* ================================================================
   ПОСТРОЕНИЕ HTML КАРТОЧКИ МЕРОПРИЯТИЯ
   ================================================================ */
function buildEventCardHTML(event, showCertificate = false) {
    const user      = getCurrentUser();
    const loggedIn  = isLoggedIn();
    const admin     = isAdmin();

    const isEnrolled = loggedIn && user
        ? (user.enrolledEvents || []).includes(event.id)
        : false;

    const count = getParticipantsCount(event.id);
    const max   = event.maxParticipants || 0;
    const full  = max > 0 && count >= max;

    // Кнопка записи
    let enrollBtn = '';
    if (loggedIn) {
        if (isEnrolled) {
            enrollBtn = `<button class="btn-enroll enrolled" onclick="toggleEnroll('${event.id}')">Отменить запись</button>`;
        } else if (full || event.status === 'closed') {
            enrollBtn = `<button class="btn-enroll" disabled>Нет мест</button>`;
        } else {
            enrollBtn = `<button class="btn-enroll" onclick="toggleEnroll('${event.id}')">Записаться</button>`;
        }
    } else {
        enrollBtn = `<button class="btn-info" onclick="showLoginDialog()">Войти для записи</button>`;
    }

    // Кнопка «Сертификат» (только в «Моих мероприятиях» в ЛК)
    const certBtn = showCertificate
        ? `<button class="btn-certificate" onclick="showCertificate('${event.id}')">🏆 Сертификат</button>`
        : '';

    // Кнопка удаления (только для admin в режиме редактирования)
    const deleteBtn = (admin && isEditingEvents)
        ? `<button class="btn-info" style="background:rgba(239,68,68,0.7);border-color:rgba(239,68,68,0.8);" onclick="confirmDeleteEvent('${event.id}')">Удалить</button>`
        : '';

    // Прогресс-бар участников
    const progressBar = max > 0 ? `
        <div class="participants-bar">
            <div class="participants-bar-fill">
                <div class="participants-bar-inner"
                     style="width:${Math.min(100, Math.round(count / max * 100))}%"></div>
            </div>
        </div>` : '';

    return `
        <div class="event-card" data-event-id="${event.id}">
            <img src="images/event-bg-${event.type === 'airplane' ? 'airplane' : 'default'}.png"
                 class="event-bg"
                 onerror="this.style.display='none'">
            <div class="event-overlay"></div>
            <div class="event-content">
                <div class="event-info">
                    <div class="event-icon">
                        ${getEventIconHTML(event.type, event.id)}
                    </div>
                    <div class="event-details">
                        <h3>${escapeHTML(event.title)}</h3>
                        <div class="event-meta">
                            <div>
                                <p class="event-meta-label">Дата</p>
                                <p class="event-meta-value">${escapeHTML(event.date)}</p>
                            </div>
                            <div>
                                <p class="event-meta-label">Время</p>
                                <p class="event-meta-value">${escapeHTML(event.time)}</p>
                            </div>
                            ${max > 0 ? `
                            <div>
                                <p class="event-meta-label">Участников</p>
                                <p class="event-meta-value">${count} / ${max}</p>
                            </div>` : ''}
                        </div>
                        ${getEventStatusBadge(event)}
                        ${progressBar}
                    </div>
                </div>
                <div class="event-actions">
                    <button class="btn-info" onclick="showEventDescription('${event.id}')">Подробнее</button>
                    ${certBtn}
                    ${enrollBtn}
                    ${deleteBtn}
                </div>
            </div>
        </div>`;
}

/* ================================================================
   РЕНДЕР СЕКЦИИ «ВСЕ МЕРОПРИЯТИЯ»
   ================================================================ */
function renderAllEvents() {
    const container = document.getElementById('all-events-container');
    if (!container) return;

    // Получаем мероприятия из хранилища
    let events = getEventsFromStorage() || DEFAULT_EVENTS;

    // Фильтрация по поиску
    if (currentSearchQuery) {
        const q = currentSearchQuery.toLowerCase();
        events = events.filter(e =>
            e.title.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q)
        );
    }

    // Фильтрация по типу
    if (currentTypeFilter !== 'all') {
        events = events.filter(e => e.type === currentTypeFilter);
    }

    let html = '';

    if (events.length === 0) {
        html = '<p class="empty-state">Мероприятия не найдены</p>';
    } else {
        html = events.map(e => buildEventCardHTML(e)).join('');
    }

    // Кнопка «Добавить мероприятие» (admin, режим редактирования)
    if (isAdmin() && isEditingEvents) {
        html += `
            <button class="btn-add-event"
                    onclick="document.getElementById('add-event-form').style.display='block';this.style.display='none'">
                + Добавить мероприятие
            </button>`;
    }

    container.innerHTML = html;
}

/* ================================================================
   ПРИМЕНЕНИЕ ФИЛЬТРОВ
   ================================================================ */
function applyEventsSearch() {
    currentSearchQuery = document.getElementById('events-search')?.value?.trim() || '';
    renderAllEvents();
}

function applyEventsTypeFilter() {
    currentTypeFilter = document.getElementById('events-type-filter')?.value || 'all';
    renderAllEvents();
}

/* ================================================================
   РЕЖИМ РЕДАКТИРОВАНИЯ (ADMIN)
   ================================================================ */
function toggleEventsEdit() {
    isEditingEvents = !isEditingEvents;
    const btn = document.getElementById('events-edit-btn');
    if (btn) btn.textContent = isEditingEvents ? 'Готово' : 'Редактировать';

    // Прячем форму при выходе из режима редактирования
    const form = document.getElementById('add-event-form');
    if (!isEditingEvents && form) form.style.display = 'none';

    renderAllEvents();
}

/* ================================================================
   ДОБАВЛЕНИЕ МЕРОПРИЯТИЯ
   ================================================================ */
function addEvent() {
    const title = document.getElementById('new-event-title')?.value.trim();
    const date  = document.getElementById('new-event-date')?.value.trim();
    const time  = document.getElementById('new-event-time')?.value.trim();
    const type  = document.getElementById('new-event-type')?.value || 'star';
    const desc  = document.getElementById('new-event-description')?.value.trim() || '';
    const max   = parseInt(document.getElementById('new-event-max')?.value) || 0;

    if (!title) { showNotification('Введите название мероприятия', 'error'); return; }
    if (!date)  { showNotification('Введите дату мероприятия', 'error'); return; }
    if (!time)  { showNotification('Введите время мероприятия', 'error'); return; }

    const events = getEventsFromStorage() || [];
    const newEvent = {
        id:              Date.now().toString(),
        title,
        date,
        time,
        type,
        description:     desc,
        maxParticipants: max,
        status:          'open',
        enrolledUsernames: [],
    };

    events.push(newEvent);
    saveEventsToStorage(events);

    cancelAddEvent();
    renderAllEvents();
    showNotification('Мероприятие добавлено', 'success');
}

function cancelAddEvent() {
    const form = document.getElementById('add-event-form');
    if (form) form.style.display = 'none';

    // Сброс полей формы
    ['new-event-title', 'new-event-date', 'new-event-time',
     'new-event-description', 'new-event-max'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const typeEl = document.getElementById('new-event-type');
    if (typeEl) typeEl.value = 'star';

    renderAllEvents();
}

/* ================================================================
   УДАЛЕНИЕ МЕРОПРИЯТИЯ
   ================================================================ */
function confirmDeleteEvent(eventId) {
    if (!confirm('Удалить это мероприятие? Все связанные заявки также будут удалены.')) return;

    let events = getEventsFromStorage() || [];
    events = events.filter(e => e.id !== eventId);
    saveEventsToStorage(events);

    // Удаляем связанные заявки
    let apps = getApplications();
    apps = apps.filter(a => a.eventId !== eventId);
    saveApplications(apps);

    renderAllEvents();
    showNotification('Мероприятие удалено', 'warning');
}

/* ================================================================
   ЗАПИСЬ / ОТМЕНА ЗАПИСИ НА МЕРОПРИЯТИЕ
   ================================================================ */
function toggleEnroll(eventId) {
    if (!isLoggedIn()) {
        showLoginDialog();
        return;
    }

    const user   = getCurrentUser();
    const events = getEventsFromStorage() || [];
    const event  = events.find(e => e.id === eventId);
    if (!event) return;

    const enrolled = (user.enrolledEvents || []).includes(eventId);

    if (enrolled) {
        // Отменяем запись
        user.enrolledEvents = user.enrolledEvents.filter(id => id !== eventId);

        // Удаляем pending-заявку из списка
        let apps = getApplications();
        apps = apps.filter(a => !(a.eventId === eventId && a.username === user.username && a.status === 'pending'));
        saveApplications(apps);

        showNotification('Запись отменена', 'warning');
    } else {
        // Проверяем лимит
        const count = getParticipantsCount(eventId);
        const max   = event.maxParticipants || 0;
        if (max > 0 && count >= max) {
            showNotification('К сожалению, мест больше нет', 'error');
            return;
        }

        // Записываем
        if (!user.enrolledEvents) user.enrolledEvents = [];
        user.enrolledEvents.push(eventId);

        // Создаём заявку
        const apps = getApplications();
        apps.push({
            id:        Date.now().toString(),
            username:  user.username,
            fullName:  user.fullName,
            eventId,
            date:      new Date().toLocaleDateString('ru-RU'),
            status:    'pending',
        });
        saveApplications(apps);

        showNotification('Вы записаны! Ожидайте подтверждения', 'success');
    }

    // Обновляем сессию и хранилище пользователей
    setCurrentUser(user);
    const users = getUsers();
    if (users[user.username]) {
        users[user.username].enrolledEvents = user.enrolledEvents;
        saveUsers(users);
    }

    renderAllEvents();
}

/* ================================================================
   МОДАЛЬНОЕ ОКНО — ОПИСАНИЕ МЕРОПРИЯТИЯ
   ================================================================ */
function showEventDescription(eventId) {
    const events = getEventsFromStorage() || [];
    const event  = events.find(e => e.id === eventId);
    if (!event) return;

    const count = getParticipantsCount(eventId);
    const max   = event.maxParticipants || 0;

    document.getElementById('modal-description').innerHTML = `
        <p style="font-size:16px;color:#6b7280;margin-bottom:16px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
            ${getTypeLabel(event.type)}
        </p>
        <h3 style="color:#033b7c;margin-bottom:20px;font-size:24px;">${escapeHTML(event.title)}</h3>
        <div style="display:flex;gap:24px;margin-bottom:20px;flex-wrap:wrap;">
            <div>
                <p style="font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;">Дата</p>
                <p style="font-size:18px;color:#163a6f;font-weight:600;">${escapeHTML(event.date)}</p>
            </div>
            <div>
                <p style="font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;">Время</p>
                <p style="font-size:18px;color:#163a6f;font-weight:600;">${escapeHTML(event.time)}</p>
            </div>
            <div>
                <p style="font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;">Участники</p>
                <p style="font-size:18px;color:#163a6f;font-weight:600;">${max > 0 ? count + ' / ' + max : 'Без ограничений'}</p>
            </div>
        </div>
        <hr style="border:none;border-top:2px solid #e5e7eb;margin-bottom:20px;">
        <p style="line-height:1.8;color:#163a6f;font-size:17px;">${escapeHTML(event.description) || 'Описание не указано'}</p>
    `;

    document.getElementById('description-modal').style.display = 'flex';
}

function closeDescriptionModal() {
    document.getElementById('description-modal').style.display = 'none';
}

function getTypeLabel(type) {
    const labels = { star: 'Конкурс', airplane: 'Школа / Выезд', droplet: 'Акция' };
    return labels[type] || 'Мероприятие';
}

/* ================================================================
   СЕРТИФИКАТ УЧАСТНИКА
   ================================================================ */
function showCertificate(eventId) {
    const user = getCurrentUser();
    if (!user) return;

    const events = getEventsFromStorage() || [];
    const event  = events.find(e => e.id === eventId);
    if (!event) return;

    const isOrganizer = user.role === 'Председатель' || user.role === 'Активист профбюро';
    const certImage   = isOrganizer
        ? 'images/certificate-organizer.png'
        : 'images/certificate-participant.png';

    const nameTopPercent = isOrganizer ? '36' : '41';
    const nameSize       = isOrganizer ? '24px' : '28px';
    const dateTopPercent = isOrganizer ? '81' : '79';

    const certHTML = `
        <div class="certificate-container" id="cert-print-area">
            <img src="${certImage}" alt="Сертификат" onerror="this.style.display='none'">
            <div class="cert-name-overlay" style="top:${nameTopPercent}%;font-size:${nameSize};">
                ${escapeHTML(user.fullName)}
            </div>
            <div class="cert-date-overlay" style="top:${dateTopPercent}%;font-size:16px;">
                ${escapeHTML(event.date)}
            </div>
        </div>
        <div style="text-align:center;margin-top:24px;">
            <button class="btn-submit" style="max-width:360px;display:inline-block;" onclick="printCertificate()">
                Распечатать сертификат
            </button>
        </div>`;

    document.getElementById('certificate-content').innerHTML = certHTML;
    document.getElementById('certificate-modal').style.display = 'flex';
}

function closeCertificateModal() {
    document.getElementById('certificate-modal').style.display = 'none';
}

function printCertificate() {
    const area = document.getElementById('cert-print-area');
    if (!area) return;

    const printWin = window.open('', '_blank', 'width=900,height=700');
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Сертификат участника</title>
            <style>
                @media print { button { display: none !important; } }
                body {
                    margin: 0;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    font-family: Arial, sans-serif;
                }
                .certificate-container {
                    position: relative;
                    display: inline-block;
                    max-width: 800px;
                    width: 100%;
                }
                .certificate-container img { width: 100%; border-radius: 8px; }
                .cert-name-overlay {
                    position: absolute;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    width: 80%;
                    font-family: 'Times New Roman', serif;
                    font-weight: 700;
                    color: #1a1a1a;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    line-height: 1.3;
                }
                .cert-date-overlay {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    text-align: center;
                    font-family: 'Times New Roman', serif;
                    color: #333;
                    letter-spacing: 2px;
                }
            </style>
        </head>
        <body>${area.outerHTML}</body>
        </html>`);
    printWin.document.close();
    setTimeout(() => printWin.print(), 600);
}

/* ================================================================
   ВСПОМОГАТЕЛЬНАЯ: экранирование HTML
   ================================================================ */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
