// notifications.js — уведомления студентов
const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Уведомления студента по его id
router.get('/:studentId', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT id,"Тип","Сообщение","Мероприятие","Прочитано","Дата"
             FROM "Уведомления"
             WHERE "id_Студент"=$1
             ORDER BY "Дата" DESC LIMIT 100`,
            [req.params.studentId]
        );
        res.json({ success: true, notifications: r.rows });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

// Пометить все как прочитанные
router.put('/:studentId/read', async (req, res) => {
    try {
        await pool.query(
            'UPDATE "Уведомления" SET "Прочитано"=TRUE WHERE "id_Студент"=$1',
            [req.params.studentId]
        );
        res.json({ success: true });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

module.exports = router;
