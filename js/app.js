/**
 * app.js — Точка входа: инициализация и вспомогательные функции
 */

/* ================================================================
   УВЕДОМЛЕНИЯ (TOAST)
   ================================================================ */
/**
 * Показывает всплывающее уведомление.
 * @param {string} message - текст уведомления
 * @param {'success'|'error'|'warning'|''} type - тип (влияет на цвет)
 */
function showNotification(message, type = '') {
    const n = document.createElement('div');
    n.className = 'notification' + (type ? ' ' + type : '');
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3200);
}

/* ================================================================
   ПРОКРУТКА К СЕКЦИИ
   ================================================================ */
function scrollToSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ================================================================
   ЗАКРЫТИЕ МОДАЛОК ПО Escape
   ================================================================ */
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeDescriptionModal();
    closeCertificateModal();
    closeLoginDialog();
    closeProfileModal();
    closeRegistrationModal();
    cancelAddEvent();
});

/* ================================================================
   ЗАГРУЗКА ДАННЫХ С СЕРВЕРА В localStorage
   ================================================================ */
async function _prefetchFromServer() {
    const [evResult, appResult, docsResult] = await Promise.all([
        apiGetEvents(),
        apiGetAllApplications(),
        apiGetDownloadableDocs(),
    ]);

    if (evResult.success && evResult.events) {
        const events = evResult.events.map(e => ({
            id:                 String(e.id),
            title:              e.title,
            description:        e.description        || '',
            date:               e.date               || '',
            time:               e.time               || '',
            type:               e.type               || '',
            location:           e.location           || '',
            maxParticipants:    e.maxParticipants     || 0,
            status:             e.status || 'открыто',
            allowOrganizerRole: e.allowOrganizerRole || false,
            imageUrl:           e.imageUrl           || '',
            hasCertificate:     e.hasCertificate     || false,
            reserveCount:       0,
            requiresForm:       e.requiresForm       || false,
            formFields:         Array.isArray(e.formFields) ? e.formFields : [],
        }));
        saveEventsToStorage(events);
    }

    if (appResult.success && appResult.applications) {
        const apps = appResult.applications.map(a => ({
            id:              String(a.id),
            username:        a.username  || '',
            fullName:        a.full_name || '',
            eventId:         String(a.event_id),
            date:            a['Дата'] ? new Date(a['Дата']).toLocaleDateString('ru-RU') : '',
            timestamp:       a['Дата'] || '',
            status:          a['Статус']         || 'ожидание',
            consentGiven:    true,
            answers:         {},
            applicationRole: a['Роль_участника'] || 'участник',
            groupNumber:     a.group_number      || '',
            phone:           a.phone             || '',
            email:           a.email             || '',
        }));
        saveApplications(apps);

        // Синхронизируем enrolledEvents текущего пользователя с данными сервера
        const currentUser = getCurrentUser();
        if (currentUser) {
            currentUser.enrolledEvents = apps
                .filter(a => a.username === currentUser.username)
                .map(a => a.eventId);
            setCurrentUser(currentUser);
        }
    }

    if (docsResult.success && docsResult.docs) {
        const docs = docsResult.docs.map(d => ({
            id:   String(d.id),
            name: d['Название'] || d.name || '',
        }));
        saveDownloadableDocs(docs);
    }
}

/* ================================================================
   ИНИЦИАЛИЗАЦИЯ ПЛАТФОРМЫ
   ================================================================ */
async function init() {
    // 1. Загружаем данные с сервера в localStorage
    await _prefetchFromServer();

    // 2. Заполняем хранилище дефолтными данными (если запускаем первый раз)
    initDefaultData();

    // 3. Отрисовываем мероприятия (доступны всем)
    renderAllEvents();

    // 4. Отрисовываем группы института (требует авторизации внутри)
    renderInstituteGroupsSection();

    // 5. Применяем состояние авторизации
    updateUIForAuth();

    console.log('ППОС АлтГПУ — платформа инициализирована');
}

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', init);
