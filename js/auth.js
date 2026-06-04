/**
 * auth.js — Аутентификация: вход, выход, управление сессией
 */

/* ================================================================
   ПОКАЗ / СКРЫТИЕ ФОРМЫ ВХОДА
   ================================================================ */
function showLoginDialog() {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('login-error').classList.remove('show');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    setTimeout(() => document.getElementById('login-username').focus(), 100);
}

function closeLoginDialog() {
    document.getElementById('login-overlay').style.display = 'none';
}

/* ================================================================
   ОБРАБОТКА ВХОДА
   ================================================================ */
function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errorEl = document.getElementById('login-error');

    errorEl.classList.remove('show');

    if (!username || !password) {
        errorEl.textContent = 'Заполните все поля';
        errorEl.classList.add('show');
        return;
    }

    const users = getUsers();
    const user  = users[username];

    if (!user) {
        errorEl.textContent = 'Пользователь не найден';
        errorEl.classList.add('show');
        return;
    }

    if (user.password !== password) {
        errorEl.textContent = 'Неверный пароль';
        errorEl.classList.add('show');
        return;
    }

    // Сохраняем данные текущего пользователя в сессию
    const sessionUser = {
        username:       user.username,
        isAdmin:        user.isAdmin || false,
        fullName:       user.fullName || user.username,
        profileName:    user.fullName || user.username,
        groupNumber:    user.groupNumber || '',
        role:           user.role || 'Студент',
        phone:          user.phone || '',
        email:          user.email || '',
        avatarDataUrl:  user.avatarDataUrl || '',
        enrolledEvents: user.enrolledEvents || [],
        reminders:      user.reminders      || [],
        documents:      user.documents      || {},
    };

    setCurrentUser(sessionUser);
    closeLoginDialog();
    updateUIForAuth();
    showNotification('Добро пожаловать, ' + sessionUser.fullName + '!', 'success');

    // Показываем непрочитанные уведомления (одобрения/отказы)
    _showPendingNotifications(user.username);

    // Показываем напоминания о незарегистрированных мероприятиях
    setTimeout(checkAndShowReminders, 1500);
}

/* ================================================================
   ВЫХОД ИЗ СИСТЕМЫ
   ================================================================ */
function handleLogout() {
    if (!confirm('Вы уверены, что хотите выйти?')) return;

    const currentUser = getCurrentUser();
    if (currentUser && !currentUser.isAdmin) {
        // Сохраняем актуальный список записанных мероприятий обратно в базу
        const users = getUsers();
        if (users[currentUser.username]) {
            users[currentUser.username].enrolledEvents = currentUser.enrolledEvents || [];
            saveUsers(users);
        }
    }

    setCurrentUser(null);
    updateUIForAuth();
    showNotification('Вы вышли из системы', 'warning');
}

/* ================================================================
   ОТКРЫТИЕ ПРОФИЛЯ ИЛИ ФОРМЫ ВХОДА (кнопка в навигации)
   ================================================================ */
function openLoginOrProfile() {
    if (isLoggedIn()) {
        openProfileModal();
    } else {
        showLoginDialog();
    }
}

/* ================================================================
   ПОКАЗ УВЕДОМЛЕНИЙ ПОСЛЕ ВХОДА
   ================================================================ */

/**
 * Показывает непрочитанные уведомления об одобрении/отказе заявок.
 * @param {string} username
 */
function _showPendingNotifications(username) {
    const notifs = getUserNotifications(username);
    const unread = notifs.filter(n => !n.read);
    if (unread.length === 0) return;

    markNotificationsRead(username);
    unread.forEach((n, idx) => {
        setTimeout(() => {
            const type = n.type === 'approval' ? 'success' : 'error';
            showNotification(n.message, type);
        }, 1200 + idx * 1000);
    });
}

/* ================================================================
   ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ПОСЛЕ ВХОДА / ВЫХОДА
   ================================================================ */
function updateUIForAuth() {
    const loggedIn = isLoggedIn();
    const admin    = isAdmin();
    const user     = getCurrentUser();

    // Аватар и имя в навигации
    const navAvatar = document.getElementById('nav-avatar');
    const navName   = document.getElementById('nav-username');

    if (loggedIn && user) {
        navAvatar.src = user.avatarDataUrl || 'images/default-avatar.png';
        let nameHTML = user.fullName || 'Пользователь';
        if (admin) {
            nameHTML += ' <span class="admin-badge">ADMIN</span>';
        }
        navName.innerHTML = nameHTML;
    } else {
        navAvatar.src = 'images/default-avatar.png';
        navName.textContent = 'Войти';
    }

    // Кнопка выхода
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.style.display = loggedIn ? 'inline-block' : 'none';

    // Кнопки навигации — только для авторизованных
    const navAdminBtn    = document.getElementById('nav-admin-btn');
    const navMyEventsBtn = document.getElementById('nav-my-events-btn');

    if (navAdminBtn)     navAdminBtn.style.display    = admin                  ? 'inline-block' : 'none';
    if (navMyEventsBtn)  navMyEventsBtn.style.display = (loggedIn && !admin)   ? 'inline-block' : 'none';

    // Раздел групп института — только для администратора
    const instituteSection = document.getElementById('instituteGroups');
    if (instituteSection) instituteSection.style.display = admin ? '' : 'none';


    const myEventsSection = document.getElementById('myEvents');
    if (myEventsSection) myEventsSection.style.display = admin ? 'none' : '';

    // Кнопки редактирования (только для admin)
    const editBtns = document.querySelectorAll('.edit-btn-admin');
    editBtns.forEach(btn => {
        btn.style.display = admin ? 'inline-block' : 'none';
    });

    // Панель администратора
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) adminPanel.style.display = admin ? 'block' : 'none';

    // Перерендериваем основные секции
    renderAllEvents();
    renderMyEventsSection();
    renderInstituteGroupsSection();

    if (admin) {
        renderAdminPanel('changes');
    }
}
