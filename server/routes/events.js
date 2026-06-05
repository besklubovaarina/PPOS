// events.js — мероприятия
// GET  /api/events          — список всех мероприятий
// POST /api/events          — создать (только admin)
// PUT  /api/events/:id      — редактировать
// DELETE /api/events/:id    — удалить

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Получить все мероприятия
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM events ORDER BY created_at DESC'
        );
        res.json({ success: true, events: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Получить одно мероприятие
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM events WHERE id = $1', [req.params.id]
        );
        if (result.rows.length === 0)
            return res.json({ success: false, error: 'Мероприятие не найдено' });
        res.json({ success: true, event: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Создать мероприятие
router.post('/', async (req, res) => {
    try {
        const {
            title, description, date, time, type, location,
            max_participants, status, has_certificate,
            allow_organizer_role, image_url,
            cert_participant_data, cert_organizer_data
        } = req.body;

        const result = await pool.query(
            `INSERT INTO events
             (title, description, date, time, type, location,
              max_participants, status, has_certificate,
              allow_organizer_role, image_url,
              cert_participant_data, cert_organizer_data)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING *`,
            [title, description, date, time, type, location,
             max_participants || 0, status || 'open',
             has_certificate || false, allow_organizer_role || false,
             image_url || null, cert_participant_data || null, cert_organizer_data || null]
        );

        res.json({ success: true, event: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Редактировать мероприятие
router.put('/:id', async (req, res) => {
    try {
        const {
            title, description, date, time, type, location,
            max_participants, status, has_certificate,
            allow_organizer_role, image_url,
            cert_participant_data, cert_organizer_data
        } = req.body;

        await pool.query(
            `UPDATE events SET
             title=$1, description=$2, date=$3, time=$4, type=$5,
             location=$6, max_participants=$7, status=$8,
             has_certificate=$9, allow_organizer_role=$10,
             image_url=$11, cert_participant_data=$12, cert_organizer_data=$13
             WHERE id=$14`,
            [title, description, date, time, type, location,
             max_participants, status, has_certificate,
             allow_organizer_role, image_url,
             cert_participant_data, cert_organizer_data, req.params.id]
        );

        res.json({ success: true, message: 'Мероприятие обновлено' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удалить мероприятие
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Мероприятие удалено' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
