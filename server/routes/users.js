const express = require('express');
const router = express.Router();
const pool = require('../db');

// Получить список группы
router.get('/group', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM "Студент" ORDER BY "ФИО"'
        );

        const members = result.rows.map(s => ({
            id: s.id.toString(),
            name: s["ФИО"]
        }));

        res.json({ success: true, members });
    } catch (error) {
        console.error('Ошибка:', error);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Получить группы института
router.get('/institute-groups', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM "Группа" ORDER BY "Номер"'
        );

        const groups = result.rows.map(g => ({
            id: g.id.toString(),
            name: g["Номер"]
        }));

        res.json({ success: true, groups });
    } catch (error) {
        console.error('Ошибка:', error);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Обновить профиль
router.put('/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { fullName, phone, email, avatarDataUrl } = req.body;

        // Находим пользователя
        const userResult = await pool.query(
            'SELECT id FROM "Пользователь" WHERE "Логин" = $1',
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.json({ success: false, error: 'Пользователь не найден' });
        }

        const userId = userResult.rows[0].id;

        // Обновляем аватар
        if (avatarDataUrl) {
            await pool.query(
                'UPDATE "Пользователь" SET "Аватар" = $1 WHERE id = $2',
                [avatarDataUrl, userId]
            );
        }

        // Обновляем студента
        await pool.query(
            `UPDATE "Студент" 
             SET "ФИО" = COALESCE($1, "ФИО"),
                 "Телефон" = COALESCE($2, "Телефон"),
                 "Email" = COALESCE($3, "Email")
             WHERE id_Пользователь = $4`,
            [fullName, phone, email, userId]
        );

        res.json({ success: true, message: 'Профиль обновлён' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Получить всех пользователей (для админа)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u."Логин", s."ФИО", g."Номер" as Группа, u."Роль"
             FROM "Пользователь" u
             LEFT JOIN "Студент" s ON s.id_Пользователь = u.id
             LEFT JOIN "Группа" g ON s.id_Группа = g.id
             ORDER BY s."ФИО"`
        );

        res.json({ success: true, users: result.rows });
    } catch (error) {
        console.error('Ошибка:', error);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
