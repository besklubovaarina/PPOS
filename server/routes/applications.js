const express = require('express');
const router = express.Router();
const pool = require('../db');

// Получить все заявки
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT с.id, с."Номер", с."Дата", с."Статус", 
                    м."Название" as Мероприятие, ст."ФИО" as Студент
             FROM "Согласие_на_мероприятие" с
             JOIN "Мероприятие" м ON с.id_Мероприятие = м.id
             JOIN "Студент" ст ON с.id_Студент = ст.id
             ORDER BY с."Дата" DESC`
        );

        const applications = result.rows.map(a => ({
            id: a.id.toString(),
            number: a["Номер"],
            date: new Date(a["Дата"]).toLocaleDateString('ru-RU'),
            status: a["Статус"],
            eventName: a["Мероприятие"],
            studentName: a["Студент"]
        }));

        res.json({ success: true, applications });
    } catch (error) {
        console.error('Ошибка:', error);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Одобрить заявку
router.put('/:id/approve', async (req, res) => {
    try {
        await pool.query(
            `UPDATE "Согласие_на_мероприятие" 
             SET "Статус" = 'approved', "Дата_одобрения" = CURRENT_DATE
             WHERE id = $1`,
            [req.params.id]
        );

        res.json({ success: true, message: 'Заявка одобрена' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Отклонить заявку
router.put('/:id/reject', async (req, res) => {
    try {
        await pool.query(
            `UPDATE "Согласие_на_мероприятие" 
             SET "Статус" = 'rejected'
             WHERE id = $1`,
            [req.params.id]
        );

        res.json({ success: true, message: 'Заявка отклонена' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
