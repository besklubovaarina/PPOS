// auth.js — вход и регистрация
const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Вход: ищем по логину в Данные_входа → берём студента
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const result = await pool.query(
            `SELECT д.id as auth_id, д."Логин", д."Пароль",
                    с.id as student_id, с."ФИО", с."Телефон", с."email",
                    с."Аватар", с."Роль", с."is_admin",
                    г."Номер" as group_number,
                    и."Название" as institute
             FROM "Данные_входа" д
             JOIN "Студент" с ON с."id_Данные_входа" = д.id
             LEFT JOIN "Группа" г ON с."id_Группа" = г.id
             LEFT JOIN "Институт" и ON г."id_Институт" = и.id
             WHERE д."Логин" = $1`,
            [username]
        );

        if (result.rows.length === 0)
            return res.json({ success: false, error: 'Пользователь не найден' });

        const row = result.rows[0];

        if (row['Пароль'] !== password)
            return res.json({ success: false, error: 'Неверный пароль' });

        res.json({
            success: true,
            user: {
                username:      row['Логин'],
                fullName:      row['ФИО']          || '',
                groupNumber:   row['group_number'] || '',
                phone:         row['Телефон']      || '',
                email:         row['email']        || '',
                role:          row['Роль']         || 'Студент',
                isAdmin:       row['is_admin'],
                avatarDataUrl: row['Аватар']       || '',
                institute:     row['institute']    || '',
                studentId:     row['student_id'],
                enrolledEvents: [],
            }
        });

    } catch (err) {
        console.error('Ошибка входа:', err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Регистрация
router.post('/register', async (req, res) => {
    try {
        const { username, password, fullName, groupNumber } = req.body;

        if (!username || !password)
            return res.json({ success: false, error: 'Логин и пароль обязательны' });

        // Проверяем занят ли логин
        const exists = await pool.query(
            'SELECT id FROM "Данные_входа" WHERE "Логин" = $1', [username]
        );
        if (exists.rows.length > 0)
            return res.json({ success: false, error: 'Такой логин уже занят' });

        // Создаём запись входа
        const authResult = await pool.query(
            'INSERT INTO "Данные_входа" ("Логин","Пароль") VALUES ($1,$2) RETURNING id',
            [username, password]
        );
        const authId = authResult.rows[0].id;

        // Находим группу если передана
        let groupId = null;
        if (groupNumber) {
            const grp = await pool.query(
                'SELECT id FROM "Группа" WHERE "Номер" = $1', [groupNumber]
            );
            groupId = grp.rows[0]?.id || null;
        }

        // Создаём студента
        await pool.query(
            `INSERT INTO "Студент" ("ФИО","id_Данные_входа","id_Группа")
             VALUES ($1,$2,$3)`,
            [fullName || '', authId, groupId]
        );

        res.json({ success: true, message: 'Регистрация прошла успешно' });

    } catch (err) {
        console.error('Ошибка регистрации:', err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
