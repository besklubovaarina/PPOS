// applications.js — заявки на мероприятия
// GET    /api/applications               — все заявки (для admin)
// GET    /api/applications/event/:id     — заявки на конкретное мероприятие
// POST   /api/applications               — подать заявку
// PUT    /api/applications/:id/approve   — одобрить
// PUT    /api/applications/:id/reject    — отклонить
// PUT    /api/applications/:id/reserve   — в резерв
// DELETE /api/applications/:id           — удалить (отмена записи)

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Все заявки
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, e.title as event_title, e.date as event_date
             FROM applications a
             JOIN events e ON a.event_id = e.id
             ORDER BY a.created_at DESC`
        );
        res.json({ success: true, applications: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Заявки конкретного мероприятия
router.get('/event/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, u.full_name, u.group_number
             FROM applications a
             JOIN users u ON a.username = u.username
             WHERE a.event_id = $1
             ORDER BY a.created_at`,
            [req.params.id]
        );
        res.json({ success: true, applications: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Заявки конкретного пользователя
router.get('/user/:username', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, e.title as event_title, e.date, e.time, e.status as event_status
             FROM applications a
             JOIN events e ON a.event_id = e.id
             WHERE a.username = $1
             ORDER BY a.created_at DESC`,
            [req.params.username]
        );
        res.json({ success: true, applications: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Подать заявку
router.post('/', async (req, res) => {
    try {
        const { event_id, username, role } = req.body;

        // Проверяем — нет ли уже заявки
        const exists = await pool.query(
            'SELECT id FROM applications WHERE event_id=$1 AND username=$2',
            [event_id, username]
        );
        if (exists.rows.length > 0) {
            return res.json({ success: false, error: 'Вы уже подали заявку' });
        }

        const result = await pool.query(
            `INSERT INTO applications (event_id, username, role, status)
             VALUES ($1, $2, $3, 'pending') RETURNING *`,
            [event_id, username, role || 'participant']
        );

        res.json({ success: true, application: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Одобрить заявку
router.put('/:id/approve', async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE applications SET status='approved' WHERE id=$1 RETURNING *`,
            [req.params.id]
        );
        const app = result.rows[0];

        // Создаём уведомление студенту
        await pool.query(
            `INSERT INTO notifications (username, type, message, event_title)
             SELECT $1, 'approval', 'Ваша заявка одобрена', e.title
             FROM events e WHERE e.id = $2`,
            [app.username, app.event_id]
        );

        res.json({ success: true, message: 'Заявка одобрена' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Отклонить заявку
router.put('/:id/reject', async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE applications SET status='rejected' WHERE id=$1 RETURNING *`,
            [req.params.id]
        );
        const app = result.rows[0];

        await pool.query(
            `INSERT INTO notifications (username, type, message, event_title)
             SELECT $1, 'rejection', 'Ваша заявка отклонена', e.title
             FROM events e WHERE e.id = $2`,
            [app.username, app.event_id]
        );

        res.json({ success: true, message: 'Заявка отклонена' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// В резерв
router.put('/:id/reserve', async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE applications SET status='reserve' WHERE id=$1 RETURNING *`,
            [req.params.id]
        );
        const app = result.rows[0];

        await pool.query(
            `INSERT INTO notifications (username, type, message, event_title)
             SELECT $1, 'reserve', 'Вы добавлены в резервный список', e.title
             FROM events e WHERE e.id = $2`,
            [app.username, app.event_id]
        );

        res.json({ success: true, message: 'Заявка в резерве' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удалить заявку (отмена)
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM applications WHERE id=$1', [req.params.id]);
        res.json({ success: true, message: 'Заявка отменена' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удалить все заявки пользователя на мероприятие
router.delete('/event/:eventId/user/:username', async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM applications WHERE event_id=$1 AND username=$2',
            [req.params.eventId, req.params.username]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
