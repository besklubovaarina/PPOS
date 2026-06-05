// auth.js — вход и регистрация
// Маршруты: POST /api/auth/login, POST /api/auth/register

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Вход в систему
// Фронтенд отправляет { username, password }
// Сервер проверяет в таблице users и возвращает данные пользователя
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.json({ success: false, error: 'Пользователь не найден' });
        }

        const user = result.rows[0];

        if (user.password !== password) {
            return res.json({ success: false, error: 'Неверный пароль' });
        }

        // Возвращаем данные в том же формате, что ожидает фронтенд
        res.json({
            success: true,
            user: {
                username:     user.username,
                fullName:     user.full_name    || '',
                groupNumber:  user.group_number || '',
                phone:        user.phone        || '',
                email:        user.email        || '',
                role:         user.role         || 'Студент',
                isAdmin:      user.is_admin,
                avatarDataUrl: user.avatar_data || '',
                institute:    user.institute    || '',
                enrolledEvents: [],
            }
        });

    } catch (err) {
        console.error('Ошибка входа:', err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Регистрация нового пользователя
router.post('/register', async (req, res) => {
    try {
        const { username, password, fullName, groupNumber } = req.body;

        if (!username || !password) {
            return res.json({ success: false, error: 'Логин и пароль обязательны' });
        }

        // Проверяем — не занят ли логин
        const exists = await pool.query(
            'SELECT id FROM users WHERE username = $1', [username]
        );
        if (exists.rows.length > 0) {
            return res.json({ success: false, error: 'Такой логин уже занят' });
        }

        await pool.query(
            `INSERT INTO users (username, password, full_name, group_number)
             VALUES ($1, $2, $3, $4)`,
            [username, password, fullName || '', groupNumber || '']
        );

        res.json({ success: true, message: 'Регистрация прошла успешно' });

    } catch (err) {
        console.error('Ошибка регистрации:', err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
