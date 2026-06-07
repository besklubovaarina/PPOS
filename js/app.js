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
    const result = await apiGetEvents();
    if (!result.success || !result.events) return;

    const statusMap = { 'открыто': 'open', 'закрыто': 'closed', 'завершено': 'completed' };

    const events = result.events.map(e => ({
        id:                 e.id,
        title:              e.title,
        description:        e.description        || '',
        date:               e.date               || '',
        time:               e.time               || '',
        type:               e.type               || '',
        location:           e.location           || '',
        maxParticipants:    e.maxParticipants     || 0,
        status:             statusMap[e.status]  || e.status || 'open',
        allowOrganizerRole: e.allowOrganizerRole || false,
        imageUrl:           e.imageUrl           || '',
        hasCertificate:     e.hasCertificate     || false,
        reserveCount:       0,
        requiresForm:       false,
        formFields:         [],
    }));

    saveEventsToStorage(events);
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
