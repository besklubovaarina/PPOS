const express = require('express');
const router = express.Router();
const pool = require('../db');

// Получить все мероприятия
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM "Мероприятие" ORDER BY "Дата"'
        );

        const events = result.rows.map(e => ({
            id: e.id.toString(),
            title: e["Название"],
            description: e["Описание"],
            date: new Date(e["Дата"]).toLocaleDateString('ru-RU'),
            time: e["Время"].substring(0, 5),
            type: e["Тип"],
            maxParticipants: e["Макс_участников"],
            status: e["Статус"]
        }));

        res.json({ success: true, events });
    } catch (error) {
        console.error('Ошибка:', error);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Создать мероприятие
router.post('/', async (req, res) => {
    try {
        const { title, date, time, type, description, maxParticipants } = req.body;

        const result = await pool.query(
            `INSERT INTO "Мероприятие" ("Название", "Описание", "Дата", "Время", "Тип", "Макс_участников")
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [title, description, date, time, type, maxParticipants || 0]
        );

        res.json({ success: true, event: result.rows[0] });
    } catch (error) {
        console.error('Ошибка:', error);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Записаться на мероприятие
router.post('/:id/enroll', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, studentId } = req.body;

        // Получаем пользователя
        const userResult = await pool.query(
            'SELECT id FROM "Пользователь" WHERE "Логин" = $1',
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.json({ success: false, error: 'Пользователь не найден' });
        }

        const userId = userResult.rows[0].id;

        // Получаем студента
        const studentResult = await pool.query(
            'SELECT id FROM "Студент" WHERE id_Пользователь = $1',
            [userId]
        );

        const studentIdDb = studentResult.rows[0]?.id;

        // Создаём согласие
        await pool.query(
            `INSERT INTO "Согласие_на_мероприятие" 
             ("Номер", "Дата", "Статус", id_Мероприятие, id_Студент)
             VALUES ($1, CURRENT_DATE, 'pending', $2, $3)`,
            [Math.floor(Math.random() * 1000), id, studentIdDb]
        );

        res.json({ success: true, message: 'Запись оформлена' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удалить мероприятие
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM "Мероприятие" WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Мероприятие удалено' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
