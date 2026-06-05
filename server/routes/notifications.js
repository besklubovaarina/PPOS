// notifications.js — уведомления пользователей
const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Получить уведомления пользователя
router.get('/:username', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM notifications WHERE username=$1 ORDER BY created_at DESC LIMIT 100`,
            [req.params.username]
        );
        res.json({ success: true, notifications: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Пометить все уведомления как прочитанные
router.put('/:username/read', async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET read=TRUE WHERE username=$1',
            [req.params.username]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
