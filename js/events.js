/**
 * events.js — Управление мероприятиями: отображение, регистрация, CRUD
 */

/* ================================================================
   СОСТОЯНИЕ
   ================================================================ */
let isEditingEvents          = false;
let currentSearchQuery       = '';
let currentTypeFilter        = 'all';
let currentRegistrationEventId = null; // ID мероприятия, на которое сейчас открыта форма
let adminEventAttachments    = [];

function _parseDate(s) {
    if (!s) return 0;
    const m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) return new Date(+m[3], +m[2]-1, +m[1]).getTime();
    return 0;
}

/* ================================================================
   ПРИКРЕПЛЁННЫЕ ФАЙЛЫ К МЕРОПРИЯТИЮ
   ================================================================ */

/** Рендерит список прикреплённых файлов в форме мероприятия. */
function renderEventAttachmentsList() {
    const container = document.getElementById('event-attachments-list');
    if (!container) return;
    if (adminEventAttachments.length === 0) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = adminEventAttachments.map(f => `
        <div style="display:flex;align-items:center;gap:10px;background:#f0f7ff;border-radius:10px;padding:8px 14px;margin-bottom:6px;border:1px solid #bfdef3;">
            <span style="flex:1;font-size:14px;color:#033b7c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                📎 ${escapeHTML(f.name)}
            </span>
            <button type="button" onclick="removeEventAttachment('${f.id}')"
                    style="flex:0 0 auto;background:none;border:none;color:#dc2626;cursor:pointer;font-size:18px;padding:0 4px;"
                    title="Удалить">✕</button>
        </div>`).join('');
}

/** Читает файлы из input и добавляет в adminEventAttachments. */
function handleEventAttachmentsAdd(input) {
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    const reads = files.map(file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = ev => {
            adminEventAttachments.push({
                id:   Date.now().toString() + Math.random().toString(36).slice(2),
                name: file.name,
                data: ev.target.result,
                type: file.type,
            });
            resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsDataURL(file);
    }));
    Promise.all(reads).then(() => {
        renderEventAttachmentsList();
        input.value = '';
    });
}

/** Удаляет прикреплённый файл по id. */
function removeEventAttachment(id) {
    adminEventAttachments = adminEventAttachments.filter(f => f.id !== id);
    renderEventAttachmentsList();
}

/** Скачивает прикреплённый файл из данных мероприятия. */
function downloadEventAttachment(eventId, fileId) {
    const events = getEventsFromStorage() || [];
    const event  = events.find(e => e.id === eventId);
    if (!event || !event.attachments) return;
    const file = event.attachments.find(f => f.id === fileId);
    if (!file || !file.data) return;
    const a = document.createElement('a');
    a.href     = file.data;
    a.download = file.name;
    a.click();
}

/* ================================================================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   ================================================================ */

/**
 * Экранирует HTML-спецсимволы для защиты от XSS.
 * @param {string} str
 */
function escapeHTML(str) {
    if (!str && str !== 0) return '';
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#039;');
}

/**
 * Возвращает HTML-иконку мероприятия по его типу.
 * @param {'star'|'airplane'|'droplet'} type
 * @param {string} eventId — нужен для уникального linearGradient
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
    return `<div class="droplet-icon"></div>`;
}

/**
 * Считает число активных участников мероприятия (не отклонённых).
 * @param {string} eventId
 */
function getParticipantsCount(eventId) {
    return getApplications().filter(a => a.eventId === eventId && a.status !== 'rejected').length;
}

/**
 * Возвращает статус-метку мероприятия в зависимости от заполненности.
 * @param {Object} event
 */
function getEventStatusBadge(event) {
    const count = getParticipantsCount(event.id);
    const max   = event.maxParticipants || 0;
    const admin = isAdmin();

    if (event.status === 'closed') {
        return `<span class="event-status-badge closed">Запись закрыта</span>`;
    }
    if (max > 0 && count >= max) {
        return `<span class="event-status-badge closed">Мест нет</span>`;
    }
    if (max > 0 && count >= max * 0.75) {
        return admin
            ? `<span class="event-status-badge limited">Мест мало: ${max - count} из ${max}</span>`
            : `<span class="event-status-badge limited">Мест мало</span>`;
    }
    if (max > 0) {
        return admin
            ? `<span class="event-status-badge open">Мест: ${max - count} из ${max}</span>`
            : `<span class="event-status-badge open">Есть места</span>`;
    }
    return `<span class="event-status-badge open">Без ограничений</span>`;
}

/** Возвращает текстовое название типа мероприятия. */
function getTypeLabel(type) {
    const labels = { star: 'Конкурс', airplane: 'Школа / Выезд', droplet: 'Акция' };
    return labels[type] || 'Мероприятие';
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

    const hasReminder = loggedIn && user
        ? (user.reminders || []).includes(event.id)
        : false;

    const count = getParticipantsCount(event.id);
    const max   = event.maxParticipants || 0;
    const full  = max > 0 && count >= max;

    // ---- Кнопка записи (администратор не записывается на мероприятия) ----
    let enrollBtn = '';
    if (admin) {
        // admins manage events, not enroll
    } else if (loggedIn) {
        if (isEnrolled) {
            enrollBtn = `<button class="btn-enroll enrolled" onclick="cancelEnroll('${event.id}')">Отменить запись</button>`;
        } else if (full || event.status === 'closed') {
            enrollBtn = `<button class="btn-enroll" disabled>Нет мест</button>`;
        } else {
            enrollBtn = `<button class="btn-enroll" onclick="openRegistrationModal('${event.id}')">Записаться</button>`;
        }
    } else {
        enrollBtn = `<button class="btn-info" onclick="showLoginDialog()">Войти для записи</button>`;
    }

    // ---- Кнопка «Напомнить» (только для незаписавшихся) ----
    let reminderBtn = '';
    if (loggedIn && !isEnrolled && event.status !== 'closed') {
        const reminderClass = hasReminder ? 'event-reminder-btn active' : 'event-reminder-btn';
        const reminderTitle = hasReminder ? 'Убрать напоминание' : 'Напомнить о регистрации';
        reminderBtn = `<button class="${reminderClass}" title="${reminderTitle}"
                               onclick="toggleReminder('${event.id}')">
                           ${hasReminder ? '🔔' : '🔕'}
                       </button>`;
    }

    // ---- Кнопка «Сертификат» (только в «Моих мероприятиях») ----
    const certBtn = showCertificate
        ? `<button class="btn-certificate" onclick="showCertificate('${event.id}')">Сертификат</button>`
        : '';

    // ---- Кнопки администратора в режиме редактирования ----
    const adminEditBtns = (admin && isEditingEvents)
        ? `<button class="btn-info"
                   style="background:rgba(6,69,145,0.6);border-color:rgba(6,69,145,0.7);"
                   onclick="openEditEventForm('${event.id}')">Изменить</button>
           <button class="btn-info"
                   style="background:rgba(239,68,68,0.7);border-color:rgba(239,68,68,0.8);"
                   onclick="confirmDeleteEvent('${event.id}')">Удалить</button>`
        : '';

    // ---- Прогресс-бар ----
    const progressBar = (admin && max > 0) ? `
        <div class="participants-bar">
            <div class="participants-bar-fill">
                <div class="participants-bar-inner"
                     style="width:${Math.min(100, Math.round(count / max * 100))}%"></div>
            </div>
        </div>` : '';

    // ---- Метка «Требуется форма» ----
    const formBadge = event.requiresForm
        ? `<span class="event-form-badge">Нужно заполнить форму</span>`
        : '';

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
                            ${(admin && max > 0) ? `
                            <div>
                                <p class="event-meta-label">Участников</p>
                                <p class="event-meta-value">${count} / ${max}</p>
                            </div>` : ''}
                        </div>
                        ${getEventStatusBadge(event)}
                        ${formBadge}
                        ${progressBar}
                    </div>
                </div>
                <div class="event-actions">
                    <button class="btn-info" onclick="showEventDescription('${event.id}')">Подробнее</button>
                    ${certBtn}
                    ${enrollBtn}
                    ${reminderBtn}
                    ${adminEditBtns}
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

    let events = getEventsFromStorage() || DEFAULT_EVENTS;

    if (currentSearchQuery) {
        const q = currentSearchQuery.toLowerCase();
        events = events.filter(e =>
            e.title.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q)
        );
    }

    if (currentTypeFilter !== 'all') {
        events = events.filter(e => e.type === currentTypeFilter);
    }

    events = events.sort((a, b) => _parseDate(a.date) - _parseDate(b.date));

    let html = '';
    if (events.length === 0) {
        html = '<p class="empty-state">Мероприятия не найдены</p>';
    } else {
        html = events.map(e => buildEventCardHTML(e)).join('');
    }

    if (isAdmin() && isEditingEvents) {
        html += `
            <button class="btn-add-event" onclick="openAddEventModal()">
                + Добавить мероприятие
            </button>`;
    }

    container.innerHTML = html;
}

/* ================================================================
   ФИЛЬТРАЦИЯ
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

    if (!isEditingEvents) {
        const modal = document.getElementById('event-form-modal');
        if (modal) modal.style.display = 'none';
        resetEventForm();
    }
    renderAllEvents();
}

/* ================================================================
   МОДАЛЬНОЕ ОКНО РЕГИСТРАЦИИ НА МЕРОПРИЯТИЕ
   ================================================================ */

/**
 * Открывает форму регистрации на мероприятие.
 * Если мероприятие не требует формы — только согласие.
 * @param {string} eventId
 */
function openRegistrationModal(eventId) {
    if (!isLoggedIn()) { showLoginDialog(); return; }

    const events = getEventsFromStorage() || DEFAULT_EVENTS;
    const event  = events.find(e => e.id === eventId);
    if (!event) return;

    // Проверяем: вдруг уже записан
    const user = getCurrentUser();
    if ((user.enrolledEvents || []).includes(eventId)) {
        showNotification('Вы уже записаны на это мероприятие', '');
        return;
    }

    // Проверяем лимит
    const count = getParticipantsCount(eventId);
    const max   = event.maxParticipants || 0;
    if (max > 0 && count >= max) {
        showNotification('К сожалению, мест больше нет', 'error');
        return;
    }

    currentRegistrationEventId = eventId;

    // Заголовок и мета-информация
    document.getElementById('reg-event-title').textContent = event.title;
    document.getElementById('reg-event-meta').innerHTML = `
        <span class="reg-meta-item">Дата: ${escapeHTML(event.date)}</span>
        <span class="reg-meta-item">Время: ${escapeHTML(event.time)}</span>
        ${max > 0 ? `<span class="reg-meta-item">Мест: ${max - count} из ${max}</span>` : ''}`;

    // Блок выбора роли (только для активистов и председателей)
    const roleBlock = document.getElementById('reg-role-block');
    if (roleBlock) {
        const showRole = user.role === 'Активист профбюро' || user.role === 'Председатель';
        roleBlock.style.display = showRole ? 'block' : 'none';
        // Сброс радио на "participant"
        const participantRadio = document.querySelector('input[name="reg-role"][value="participant"]');
        if (participantRadio) participantRadio.checked = true;
    }

    // Поля формы (если требуются)
    const fieldsContainer = document.getElementById('reg-form-fields');
    if (event.requiresForm && event.formFields && event.formFields.length > 0) {
        fieldsContainer.innerHTML = event.formFields.map(f => _buildRegFieldHTML(f)).join('');
        fieldsContainer.style.display = 'block';
    } else {
        fieldsContainer.innerHTML = '';
        fieldsContainer.style.display = 'none';
    }

    // Сброс ошибок и галочки
    document.getElementById('reg-consent-check').checked = false;
    const errDiv = document.getElementById('reg-errors');
    errDiv.style.display = 'none';
    errDiv.innerHTML     = '';

    document.getElementById('registration-modal').style.display = 'flex';
}

/** Строит HTML одного поля регистрационной формы. */
function _buildRegFieldHTML(field) {
    const required  = field.required ? ' <span style="color:#dc2626;">*</span>' : '';
    const hintHTML  = field.comment
        ? `<p class="form-hint">${escapeHTML(field.comment)}</p>`
        : '';

    let inputHTML = '';
    switch (field.type) {
        case 'textarea':
            inputHTML = `<textarea id="reg-field-${field.id}"
                                   class="form-input"
                                   rows="3"
                                   placeholder="${escapeHTML(field.comment || '')}"
                                   style="margin-bottom:0;"></textarea>`;
            break;
        case 'file':
            inputHTML = `<input type="file"
                                id="reg-field-${field.id}"
                                class="form-input"
                                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
                                multiple
                                style="margin-bottom:0;padding:8px;">`;
            break;
        case 'phone':
            inputHTML = `<input type="tel"
                                id="reg-field-${field.id}"
                                class="form-input"
                                placeholder="+79001234567"
                                style="margin-bottom:0;">`;
            break;
        case 'url':
            inputHTML = `<input type="url"
                                id="reg-field-${field.id}"
                                class="form-input"
                                placeholder="https://"
                                style="margin-bottom:0;">`;
            break;
        default: // text
            inputHTML = `<input type="text"
                                id="reg-field-${field.id}"
                                class="form-input"
                                placeholder="${escapeHTML(field.comment || '')}"
                                style="margin-bottom:0;">`;
    }

    return `
        <div class="reg-form-field-group">
            <label class="form-label" for="reg-field-${field.id}">
                ${escapeHTML(field.title)}${required}
            </label>
            ${hintHTML}
            ${inputHTML}
        </div>`;
}

/** Закрывает модальное окно регистрации. */
function closeRegistrationModal() {
    document.getElementById('registration-modal').style.display = 'none';
    currentRegistrationEventId = null;
}

/**
 * Обрабатывает отправку регистрационной формы.
 * Сначала собирает и валидирует данные,
 * файловые поля читает асинхронно через FileReader.
 */
function submitRegistration() {
    const eventId = currentRegistrationEventId;
    if (!eventId) return;

    const events = getEventsFromStorage() || DEFAULT_EVENTS;
    const event  = events.find(e => e.id === eventId);
    if (!event) return;

    const user = getCurrentUser();
    if (!user) return;

    // Собираем ответы
    const answers   = {};
    const fileReads = []; // промисы для файловых полей

    (event.formFields || []).forEach(field => {
        const el = document.getElementById(`reg-field-${field.id}`);
        if (!el) return;

        if (field.type === 'file') {
            const files = Array.from(el.files || []);
            answers[`__file_${field.id}`] = files; // временно (для валидации)
            if (files.length > 0) {
                fileReads.push(
                    Promise.all(files.map(file => new Promise(resolve => {
                        const reader  = new FileReader();
                        reader.onload = ev => resolve(ev.target.result);
                        reader.onerror = () => resolve(null);
                        reader.readAsDataURL(file);
                    }))).then(results => {
                        answers[field.id] = results.filter(Boolean);
                    })
                );
            }
        } else {
            answers[field.id] = el.value.trim();
        }
    });

    // Синхронная проверка (без файлов)
    const syncErrors = _validateRegistrationAnswers(event, answers);
    const consentOk  = document.getElementById('reg-consent-check')?.checked;
    if (!consentOk) {
        syncErrors.push('Необходимо дать согласие на обработку персональных данных');
    }

    if (syncErrors.length > 0) {
        _showRegErrors(syncErrors);
        return;
    }

    // Собираем выбранную роль
    const appRole = document.querySelector('input[name="reg-role"]:checked')?.value || 'participant';

    // Читаем файлы, затем финализируем
    Promise.all(fileReads).then(() => {
        // Удаляем временные __file_ ключи
        Object.keys(answers).forEach(k => {
            if (k.startsWith('__file_')) delete answers[k];
        });
        _finalizeRegistration(eventId, user, answers, event, appRole);
    });
}

/**
 * Валидирует ответы на форму регистрации.
 * @returns {string[]} - массив текстов ошибок
 */
function _validateRegistrationAnswers(event, answers) {
    const errors = [];
    if (!event.requiresForm || !event.formFields) return errors;

    event.formFields.forEach(field => {
        const value    = answers[field.id] || '';
        const fileRef  = answers[`__file_${field.id}`];

        if (field.required) {
            if (field.type === 'file') {
                if (!fileRef || fileRef.length === 0) errors.push(`«${field.title}»: необходимо прикрепить файл`);
            } else if (!value) {
                errors.push(`«${field.title}»: обязательное поле`);
            }
        }

        if (value) {
            if (field.type === 'phone') {
                const digits = value.replace(/\D/g, '');
                if (digits.length < 10 || digits.length > 11) {
                    errors.push(`«${field.title}»: неверный формат телефона — нужно 10–11 цифр (сейчас ${digits.length})`);
                }
            }
            if (field.type === 'url') {
                const startsCorrect = value.startsWith('http://') || value.startsWith('https://');
                if (!startsCorrect) {
                    errors.push(`«${field.title}»: ссылка должна начинаться с http:// или https://`);
                }
            }
        }
    });

    return errors;
}

/** Показывает список ошибок внутри модала регистрации. */
function _showRegErrors(errors) {
    const errDiv = document.getElementById('reg-errors');
    errDiv.style.display = 'block';
    errDiv.innerHTML = `
        <p style="font-weight:700;color:#dc2626;margin-bottom:8px;">
            Исправьте ошибки перед подачей заявки:
        </p>
        <ul style="margin:0;padding-left:20px;">
            ${errors.map(e => `<li style="color:#dc2626;font-size:15px;margin:3px 0;">${escapeHTML(e)}</li>`).join('')}
        </ul>`;
    errDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/** Сохраняет заявку и закрывает модал. Вызывается после чтения файлов. */
function _finalizeRegistration(eventId, user, answers, event, appRole = 'participant') {
    // Повторная проверка лимита (за время читатели FileReader могли успеть)
    const count = getParticipantsCount(eventId);
    const max   = event.maxParticipants || 0;
    if (max > 0 && count >= max) {
        showNotification('К сожалению, мест больше нет', 'error');
        closeRegistrationModal();
        return;
    }

    // Добавляем в список мероприятий пользователя
    if (!user.enrolledEvents) user.enrolledEvents = [];
    user.enrolledEvents.push(eventId);

    // Убираем из напоминаний
    if (user.reminders) {
        user.reminders = user.reminders.filter(id => id !== eventId);
    }

    // Создаём заявку
    const apps = getApplications();
    apps.push({
        id:              Date.now().toString(),
        username:        user.username,
        fullName:        user.fullName,
        eventId,
        date:            new Date().toLocaleDateString('ru-RU'),
        timestamp:       new Date().toISOString(),
        status:          'pending',
        consentGiven:    true,
        answers,
        applicationRole: appRole,
    });
    saveApplications(apps);

    // Обновляем сессию и хранилище пользователей
    setCurrentUser(user);
    const users = getUsers();
    if (users[user.username]) {
        users[user.username].enrolledEvents = user.enrolledEvents;
        if (user.reminders !== undefined) users[user.username].reminders = user.reminders;
        saveUsers(users);
    }

    closeRegistrationModal();
    renderAllEvents();
    showNotification('Заявка подана! Ожидайте подтверждения администратора', 'success');
}

/* ================================================================
   ОТМЕНА ЗАПИСИ (без формы — прямое действие)
   ================================================================ */
function cancelEnroll(eventId) {
    if (!isLoggedIn()) return;
    if (!confirm('Отменить запись на это мероприятие?')) return;

    const user = getCurrentUser();
    user.enrolledEvents = (user.enrolledEvents || []).filter(id => id !== eventId);

    // Удаляем все заявки студента на это мероприятие
    let apps = getApplications();
    apps = apps.filter(a => !(a.eventId === eventId && a.username === user.username));
    saveApplications(apps);

    setCurrentUser(user);
    const users = getUsers();
    if (users[user.username]) {
        users[user.username].enrolledEvents = user.enrolledEvents;
        saveUsers(users);
    }

    renderAllEvents();
    showNotification('Запись отменена', 'warning');
}

/* ================================================================
   НАПОМИНАНИЯ
   ================================================================ */

/**
 * Переключает напоминание о мероприятии.
 * Если напоминание уже есть — убирает. Если нет — добавляет.
 * @param {string} eventId
 */
function toggleReminder(eventId) {
    if (!isLoggedIn()) { showLoginDialog(); return; }

    const user = getCurrentUser();
    if (!user.reminders) user.reminders = [];

    const has = user.reminders.includes(eventId);
    if (has) {
        user.reminders = user.reminders.filter(id => id !== eventId);
        showNotification('Напоминание убрано', 'warning');
    } else {
        user.reminders.push(eventId);
        showNotification('Напоминание установлено — уведомим о регистрации', 'success');
    }

    setCurrentUser(user);
    const users = getUsers();
    if (users[user.username]) {
        users[user.username].reminders = user.reminders;
        saveUsers(users);
    }

    renderAllEvents();
}

/**
 * Проверяет напоминания текущего пользователя и показывает уведомления.
 * Вызывается при входе и при инициализации.
 */
function checkAndShowReminders() {
    const user = getCurrentUser();
    if (!user || !user.reminders || user.reminders.length === 0) return;

    const events   = getEventsFromStorage() || DEFAULT_EVENTS;
    const enrolled = user.enrolledEvents || [];

    const remind = user.reminders
        .map(id => events.find(e => e.id === id))
        .filter(e => e && e.status !== 'closed' && !enrolled.includes(e.id));

    if (remind.length === 0) return;

    setTimeout(() => {
        remind.forEach((ev, idx) => {
            setTimeout(() => {
                showNotification(`Напоминание: не забудьте записаться на «${ev.title}»!`, 'warning');
            }, idx * 1100);
        });
    }, 600);
}

/* ================================================================
   ДОБАВЛЕНИЕ / РЕДАКТИРОВАНИЕ МЕРОПРИЯТИЯ (ADMIN)
   ================================================================ */

let currentEditEventId = null; // null = режим добавления, строка = редактирование

/** Открывает форму для редактирования существующего мероприятия. */
function openEditEventForm(eventId) {
    const events = getEventsFromStorage() || DEFAULT_EVENTS;
    const event  = events.find(e => e.id === eventId);
    if (!event) return;

    currentEditEventId = eventId;

    document.getElementById('event-form-title').textContent       = 'Редактировать мероприятие';
    document.getElementById('event-form-submit-btn').textContent   = 'Сохранить изменения';
    document.getElementById('new-event-title').value               = event.title       || '';
    document.getElementById('new-event-date').value                = event.date        || '';
    document.getElementById('new-event-time').value                = event.time        || '';
    document.getElementById('new-event-type').value                = event.type        || 'star';
    document.getElementById('new-event-max').value                 = event.maxParticipants || 0;
    document.getElementById('new-event-description').value         = event.description  || '';

    const requiresForm = !!(event.requiresForm && event.formFields?.length > 0);
    document.getElementById('new-event-requires-form').checked     = requiresForm;

    // Восстанавливаем поля формы
    adminFormFields = event.formFields ? event.formFields.map(f => ({ ...f })) : [];
    toggleEventFormBuilder(requiresForm);

    // Восстанавливаем прикреплённые файлы
    adminEventAttachments = (event.attachments || []).map(f => ({ ...f }));
    renderEventAttachmentsList();

    // Показываем секцию статуса и задаём значение
    const statusSection = document.getElementById('event-status-section');
    if (statusSection) statusSection.style.display = 'block';
    const statusEl = document.getElementById('new-event-status');
    if (statusEl) statusEl.value = event.status || 'open';

    const certCb = document.getElementById('new-event-has-certificate');
    if (certCb) certCb.checked = !!event.hasCertificate;

    document.getElementById('event-form-modal').style.display = 'flex';
}

/** Сохраняет новое или изменённое мероприятие. */
function addEvent() {
    const title       = document.getElementById('new-event-title')?.value.trim();
    const date        = document.getElementById('new-event-date')?.value.trim();
    const time        = document.getElementById('new-event-time')?.value.trim();
    const type        = document.getElementById('new-event-type')?.value           || 'star';
    const desc        = document.getElementById('new-event-description')?.value.trim() || '';
    const max         = parseInt(document.getElementById('new-event-max')?.value)   || 0;
    const needsForm       = document.getElementById('new-event-requires-form')?.checked || false;
    const hasCertificate  = document.getElementById('new-event-has-certificate')?.checked || false;

    if (!title) { showNotification('Введите название мероприятия', 'error'); return; }
    if (!date)  { showNotification('Введите дату мероприятия', 'error'); return; }
    if (!time)  { showNotification('Введите время мероприятия', 'error'); return; }

    if (needsForm) {
        for (const field of adminFormFields) {
            if (!field.title.trim()) {
                showNotification('Укажите заголовок для каждого поля формы', 'error');
                return;
            }
        }
    }

    const formFields = needsForm ? adminFormFields.map(f => ({ ...f })) : [];

    const events = getEventsFromStorage() || [];

    if (currentEditEventId) {
        // Режим редактирования
        const status = document.getElementById('new-event-status')?.value || 'open';
        const idx = events.findIndex(e => e.id === currentEditEventId);
        if (idx !== -1) {
            events[idx] = {
                ...events[idx],
                title,
                date,
                time,
                type,
                description:     desc,
                maxParticipants: max,
                reserveCount:    events[idx].reserveCount || 0,
                requiresForm:    needsForm,
                formFields,
                status,
                hasCertificate,
                attachments:     adminEventAttachments.map(f => ({ ...f })),
            };
        }
        showNotification('Мероприятие обновлено', 'success');
    } else {
        // Режим добавления
        events.push({
            id:              Date.now().toString(),
            title,
            date,
            time,
            type,
            description:     desc,
            maxParticipants: max,
            reserveCount:    0,
            requiresForm:    needsForm,
            formFields,
            status:          'open',
            hasCertificate,
            attachments:     adminEventAttachments.map(f => ({ ...f })),
        });
        showNotification('Мероприятие добавлено', 'success');
    }

    saveEventsToStorage(events);
    cancelAddEvent();
    renderAllEvents();
}

/** Закрывает модал создания/редактирования мероприятия, сбрасывает форму. */
function cancelAddEvent() {
    const modal = document.getElementById('event-form-modal');
    if (modal) modal.style.display = 'none';
    resetEventForm();
    renderAllEvents();
}

/** Сбрасывает все поля формы мероприятия. */
function resetEventForm() {
    currentEditEventId = null;
    adminFormFields    = [];

    const ids = ['new-event-title', 'new-event-date', 'new-event-time',
                 'new-event-description', 'new-event-max'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    const typeEl = document.getElementById('new-event-type');
    if (typeEl) typeEl.value = 'star';

    const cbEl = document.getElementById('new-event-requires-form');
    if (cbEl) cbEl.checked = false;

    const titleEl = document.getElementById('event-form-title');
    if (titleEl) titleEl.textContent = 'Добавить мероприятие';

    const submitEl = document.getElementById('event-form-submit-btn');
    if (submitEl) submitEl.textContent = 'Добавить мероприятие';

    toggleEventFormBuilder(false);

    // Сброс прикреплённых файлов
    adminEventAttachments = [];
    renderEventAttachmentsList();

    // Скрываем и сбрасываем секцию статуса
    const statusSection = document.getElementById('event-status-section');
    if (statusSection) statusSection.style.display = 'none';
    const statusEl = document.getElementById('new-event-status');
    if (statusEl) statusEl.value = 'open';

    const certCb = document.getElementById('new-event-has-certificate');
    if (certCb) certCb.checked = false;
}

/* ================================================================
   КОНСТРУКТОР ФОРМЫ РЕГИСТРАЦИИ (поля задаёт admin)
   ================================================================ */
let adminFormFields = [];

/** Показывает/скрывает конструктор полей при изменении чекбокса. */
function toggleEventFormBuilder(show) {
    const builder = document.getElementById('event-form-builder');
    if (builder) builder.style.display = show ? 'block' : 'none';
    if (show) renderFormBuilder();
}

/** Рендерит список полей в конструкторе. */
function renderFormBuilder() {
    const container = document.getElementById('form-fields-container');
    if (!container) return;

    if (adminFormFields.length === 0) {
        container.innerHTML = '<p class="form-builder-empty">Нет полей. Нажмите «+ Добавить поле»</p>';
        return;
    }

    container.innerHTML = adminFormFields.map((field, idx) => `
        <div class="form-field-row">
            <div class="form-field-row-header">
                <span style="font-weight:700;color:#033b7c;">Поле ${idx + 1}</span>
                <button type="button" class="field-remove-btn"
                        onclick="removeFormField('${field.id}')">✕ Удалить поле</button>
            </div>

            <div class="form-row">
                <div>
                    <label class="form-label">Заголовок поля *</label>
                    <input type="text"
                           class="form-input"
                           value="${escapeHTML(field.title)}"
                           placeholder="например: Ссылка на пост ВКонтакте"
                           oninput="updateFormField('${field.id}', 'title', this.value)"
                           style="margin-bottom:0;">
                </div>
                <div>
                    <label class="form-label">Тип поля</label>
                    <select class="form-input"
                            style="margin-bottom:0;"
                            onchange="updateFormField('${field.id}', 'type', this.value)">
                        <option value="text"     ${field.type === 'text'     ? 'selected' : ''}>Текст (одна строка)</option>
                        <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Текст (абзац)</option>
                        <option value="url"      ${field.type === 'url'      ? 'selected' : ''}>Ссылка (URL)</option>
                        <option value="file"     ${field.type === 'file'     ? 'selected' : ''}>Прикрепить файл(ы)</option>
                    </select>
                </div>
            </div>

            <div style="height:10px;"></div>

            <label class="form-label">Подсказка / комментарий к полю</label>
            <input type="text"
                   class="form-input"
                   value="${escapeHTML(field.comment || '')}"
                   placeholder="Что нужно написать, какой формат ожидается..."
                   oninput="updateFormField('${field.id}', 'comment', this.value)"
                   style="margin-bottom:0;">

            <div style="height:10px;"></div>
            <label class="consent-label" style="font-size:15px;gap:8px;">
                <input type="checkbox"
                       ${field.required ? 'checked' : ''}
                       onchange="updateFormField('${field.id}', 'required', this.checked)">
                <span>Обязательное поле</span>
            </label>
        </div>`
    ).join('<div class="form-field-divider"></div>');
}

/** Добавляет новое пустое поле в конструктор. */
function addFormField() {
    adminFormFields.push({
        id:       Date.now().toString() + Math.random().toString(36).slice(2),
        title:    '',
        type:     'text',
        required: true,
        comment:  '',
    });
    renderFormBuilder();
}

/** Удаляет поле из конструктора по его ID. */
function removeFormField(fieldId) {
    adminFormFields = adminFormFields.filter(f => f.id !== fieldId);
    renderFormBuilder();
}

/** Обновляет свойство поля в конструкторе. */
function updateFormField(fieldId, property, value) {
    const field = adminFormFields.find(f => f.id === fieldId);
    if (field) field[property] = value;
}

/** Открывает модал для добавления нового мероприятия. */
function openAddEventModal() {
    resetEventForm();
    document.getElementById('event-form-modal').style.display = 'flex';
}

/* ================================================================
   СЕКЦИЯ «МОИ МЕРОПРИЯТИЯ» (главная страница)
   ================================================================ */
function renderMyEventsSection() {
    const container = document.getElementById('my-events-content');
    if (!container) return;

    if (isAdmin()) { container.innerHTML = ''; return; }

    if (!isLoggedIn()) {
        container.innerHTML = `
            <div class="restricted-access">
                <span class="lock-icon">🔒</span>
                <p>Для просмотра ваших мероприятий необходимо войти в личный кабинет</p>
                <button class="login-prompt-btn" onclick="showLoginDialog()">Войти</button>
            </div>`;
        return;
    }

    const user        = getCurrentUser();
    const enrolledIds = user.enrolledEvents || [];
    const allEvents   = getEventsFromStorage() || DEFAULT_EVENTS;
    const myEvents    = allEvents.filter(e => enrolledIds.includes(e.id));

    if (myEvents.length === 0) {
        container.innerHTML = '<p class="empty-state">Вы пока не записаны ни на одно мероприятие</p>';
        return;
    }

    const apps = getApplications();
    container.innerHTML = myEvents.map(e => {
        const myApp = apps.find(a => a.eventId === e.id && a.username === user.username);
        const canSeeCert = e.hasCertificate && e.status === 'completed' && myApp?.status === 'approved';
        return buildEventCardHTML(e, canSeeCert);
    }).join('');
}

/* ================================================================
   УДАЛЕНИЕ МЕРОПРИЯТИЯ
   ================================================================ */
function confirmDeleteEvent(eventId) {
    if (!confirm('Удалить это мероприятие? Все связанные заявки также будут удалены.')) return;

    let events = getEventsFromStorage() || [];
    events = events.filter(e => e.id !== eventId);
    saveEventsToStorage(events);

    let apps = getApplications();
    apps = apps.filter(a => a.eventId !== eventId);
    saveApplications(apps);

    renderAllEvents();
    showNotification('Мероприятие удалено', 'warning');
}

/* ================================================================
   ОПИСАНИЕ МЕРОПРИЯТИЯ (модал)
   ================================================================ */
function showEventDescription(eventId) {
    const events = getEventsFromStorage() || DEFAULT_EVENTS;
    const event  = events.find(e => e.id === eventId);
    if (!event) return;

    const count = getParticipantsCount(eventId);
    const max   = event.maxParticipants || 0;

    const fieldsInfo = event.requiresForm && event.formFields?.length > 0
        ? `<hr style="border:none;border-top:2px solid #e5e7eb;margin-bottom:18px;">
           <p style="font-weight:700;color:#033b7c;margin-bottom:10px;">Для участия нужно заполнить:</p>
           <ul style="margin:0;padding-left:20px;">${
               event.formFields.map(f => `<li style="font-size:15px;color:#163a6f;margin:4px 0;">
                   ${escapeHTML(f.title)} ${f.required ? '<em style="color:#dc2626;">(обязательно)</em>' : ''}
                   ${f.comment ? `<br><span style="font-size:13px;color:#6b7280;">${escapeHTML(f.comment)}</span>` : ''}
               </li>`).join('')
           }</ul>`
        : '';

    const attachHtml = event.attachments?.length > 0 ? `
        <hr style="border:none;border-top:2px solid #e5e7eb;margin:18px 0;">
        <p style="font-weight:700;color:#033b7c;margin-bottom:10px;">Прикреплённые материалы:</p>
        <div style="display:flex;flex-direction:column;gap:6px;">
            ${event.attachments.map(f => `
                <button class="btn-file-dl" style="text-align:left;padding:8px 14px;font-size:14px;"
                        onclick="downloadEventAttachment('${event.id}','${f.id}')">
                    📎 ${escapeHTML(f.name)}
                </button>`).join('')}
        </div>` : '';

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
                <p style="font-size:18px;color:#163a6f;font-weight:600;">
                    ${max > 0 ? count + ' / ' + max : 'Без ограничений'}
                </p>
            </div>
            ${(event.reserveCount || 0) > 0 ? `
            <div>
                <p style="font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;">Резерв</p>
                <p style="font-size:18px;color:#163a6f;font-weight:600;">${event.reserveCount} мест</p>
            </div>` : ''}
        </div>
        <hr style="border:none;border-top:2px solid #e5e7eb;margin-bottom:20px;">
        <p style="line-height:1.8;color:#163a6f;font-size:17px;">
            ${escapeHTML(event.description) || 'Описание не указано'}
        </p>
        ${fieldsInfo}
        ${attachHtml}`;

    document.getElementById('description-modal').style.display = 'flex';
}

function closeDescriptionModal() {
    document.getElementById('description-modal').style.display = 'none';
}

/* ================================================================
   СЕРТИФИКАТ УЧАСТНИКА
   ================================================================ */
function showCertificate(eventId) {
    const user = getCurrentUser();
    if (!user) return;

    const events = getEventsFromStorage() || DEFAULT_EVENTS;
    const event  = events.find(e => e.id === eventId);
    if (!event) return;

    if (event.status !== 'completed') {
        showNotification('Сертификат будет доступен после завершения мероприятия', 'warning');
        return;
    }

    const apps  = getApplications();
    const myApp = apps.find(a => a.eventId === eventId && a.username === user.username);
    if (!myApp || myApp.status !== 'approved') {
        showNotification('Сертификат доступен только участникам с одобренной заявкой', 'warning');
        return;
    }

    const isOrganizer = myApp.applicationRole === 'organizer';
    const certImage   = isOrganizer
        ? 'images/certificate-organizer.png'
        : 'images/certificate-participant.png';

    const nameTopPercent = isOrganizer ? '36' : '41';
    const nameSize       = isOrganizer ? '24px' : '28px';
    const dateTopPercent = isOrganizer ? '81' : '79';

    const certHTML = `
        <div style="text-align:center;">
            <div class="certificate-container" id="cert-print-area"
                 style="background:url('${certImage}') center/cover no-repeat,linear-gradient(135deg,#fdf6e3 0%,#f5e6c8 100%);">
                <div class="cert-name-overlay" style="top:${nameTopPercent}%;font-size:${nameSize};">
                    ${escapeHTML(user.fullName)}
                </div>
                <div class="cert-date-overlay" style="top:${dateTopPercent}%;font-size:16px;">
                    ${escapeHTML(event.date)}
                </div>
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
            <title>Сертификат</title>
            <style>
                @media print { button { display: none !important; } }
                body { margin:0; padding:20px; display:flex; justify-content:center;
                       align-items:center; min-height:100vh; font-family:Arial,sans-serif;
                       background:#fff; }
                .certificate-container {
                    position:relative; display:block;
                    max-width:800px; width:100%;
                    aspect-ratio:1.414/1; min-height:400px;
                    border-radius:8px; box-shadow:0 4px 24px rgba(0,0,0,.18);
                    -webkit-print-color-adjust:exact; print-color-adjust:exact;
                }
                .cert-name-overlay {
                    position:absolute; left:50%; transform:translate(-50%,-50%);
                    text-align:center; width:80%;
                    font-family:'Times New Roman',serif; font-weight:700;
                    color:#1a1a1a; text-transform:uppercase; letter-spacing:1px; line-height:1.3;
                }
                .cert-date-overlay {
                    position:absolute; left:50%; transform:translateX(-50%);
                    text-align:center; font-family:'Times New Roman',serif;
                    color:#333; letter-spacing:2px;
                }
            </style>
        </head>
        <body>${area.outerHTML}</body>
        </html>`);
    printWin.document.close();
    setTimeout(() => printWin.print(), 600);
}
