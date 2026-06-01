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
});

/* ================================================================
   ИНИЦИАЛИЗАЦИЯ ПЛАТФОРМЫ
   ================================================================ */
function init() {
    // 1. Заполняем хранилище дефолтными данными (если запускаем первый раз)
    initDefaultData();

    // 2. Отрисовываем мероприятия (доступны всем)
    renderAllEvents();

    // 3. Отрисовываем группы института (требует авторизации внутри)
    renderInstituteGroupsSection();

    // 4. Применяем состояние авторизации
    updateUIForAuth();

    console.log('ППОС АлтГПУ — платформа инициализирована');
}

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', init);
