// certificates.js — шаблоны сертификатов мероприятий
// GET    /api/certificates/event/:id          — шаблоны мероприятия
// GET    /api/certificates/event/:id/:role    — шаблон конкретной роли
// POST   /api/certificates                    — сохранить шаблон
// DELETE /api/certificates/event/:id/:role    — удалить шаблон

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Все шаблоны мероприятия
router.get('/event/:id', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT id, "Роль" FROM "Сертификат" WHERE "id_Мероприятие"=$1`,
            [req.params.id]
        );
        res.json({ success: true, certificates: r.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Шаблон конкретной роли (возвращает base64)
router.get('/event/:id/:role', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT "Шаблон" FROM "Сертификат"
             WHERE "id_Мероприятие"=$1 AND "Роль"=$2`,
            [req.params.id, req.params.role]
        );
        if (r.rows.length === 0)
            return res.json({ success: false, error: 'Шаблон не найден' });
        res.json({ success: true, template: r.rows[0]['Шаблон'] });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Сохранить шаблон (создать или обновить)
router.post('/', async (req, res) => {
    try {
        const { eventId, role, template } = req.body;

        await pool.query(
            `INSERT INTO "Сертификат" ("Роль","Шаблон","id_Мероприятие")
             VALUES ($1,$2,$3)
             ON CONFLICT ("id_Мероприятие","Роль")
             DO UPDATE SET "Шаблон"=$2`,
            [role, template, eventId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удалить шаблон
router.delete('/event/:id/:role', async (req, res) => {
    try {
        await pool.query(
            `DELETE FROM "Сертификат" WHERE "id_Мероприятие"=$1 AND "Роль"=$2`,
            [req.params.id, req.params.role]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
