const express = require('express');
const router = express.Router();
const pool = require('../db');

// Вход в систему
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const result = await pool.query(
            'SELECT * FROM "Пользователь" WHERE "Логин" = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.json({ success: false, error: 'Пользователь не найден' });
        }

        const user = result.rows[0];

        if (user["Пароль"] !== password) {
            return res.json({ success: false, error: 'Неверный пароль' });
        }

        // Получаем данные студента
        const studentResult = await pool.query(
            'SELECT * FROM "Студент" WHERE id_Пользователь = $1',
            [user.id]
        );

        const student = studentResult.rows[0] || {};

        // Получаем группу
        let groupNumber = '';
        if (student.id_Группа) {
            const groupResult = await pool.query(
                'SELECT "Номер" FROM "Группа" WHERE id = $1',
                [student.id_Группа]
            );
            groupNumber = groupResult.rows[0]?.["Номер"] || '';
        }

        res.json({
            success: true,
            user: {
                username: user["Логин"],
                isAdmin: user["Роль"] === 'admin',
                profileName: student["ФИО"] || user["Логин"],
                avatarDataUrl: user["Аватар"] || '',
                fullName: student["ФИО"] || '',
                groupNumber: groupNumber,
                phone: student["Телефон"] || '',
                email: student["Email"] || '',
                role: 'Студент'
            }
        });

    } catch (error) {
        console.error('Ошибка входа:', error);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
