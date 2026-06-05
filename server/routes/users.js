// users.js — пользователи и группы
const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Получить всех пользователей
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id,username,full_name,group_number,role,is_admin,email,phone,institute FROM users ORDER BY full_name'
        );
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Обновить профиль
router.put('/:username', async (req, res) => {
    try {
        const { fullName, groupNumber, phone, email, avatarData, institute } = req.body;

        await pool.query(
            `UPDATE users SET
             full_name=$1, group_number=$2, phone=$3,
             email=$4, avatar_data=$5, institute=$6
             WHERE username=$7`,
            [fullName, groupNumber, phone, email, avatarData || null, institute || null, req.params.username]
        );

        // Возвращаем обновлённого пользователя
        const result = await pool.query(
            'SELECT * FROM users WHERE username=$1', [req.params.username]
        );
        const u = result.rows[0];

        res.json({
            success: true,
            user: {
                username:      u.username,
                fullName:      u.full_name    || '',
                groupNumber:   u.group_number || '',
                phone:         u.phone        || '',
                email:         u.email        || '',
                role:          u.role         || 'Студент',
                isAdmin:       u.is_admin,
                avatarDataUrl: u.avatar_data  || '',
                institute:     u.institute    || '',
            }
        });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Получить участников группы
router.get('/group/:groupName', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM group_members WHERE group_name=$1 ORDER BY member_name',
            [req.params.groupName]
        );
        res.json({ success: true, members: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Добавить участника в группу
router.post('/group/:groupName/members', async (req, res) => {
    try {
        const { memberName, memberUsername } = req.body;
        const result = await pool.query(
            `INSERT INTO group_members (group_name, member_name, member_username)
             VALUES ($1,$2,$3) RETURNING *`,
            [req.params.groupName, memberName, memberUsername || '']
        );
        res.json({ success: true, member: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удалить участника из группы
router.delete('/group/members/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM group_members WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Ожидающие изменения профилей
router.get('/pending-changes', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM pending_changes WHERE status='pending' ORDER BY created_at DESC`
        );
        res.json({ success: true, changes: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Сохранить ожидающее изменение
router.post('/pending-changes', async (req, res) => {
    try {
        const c = req.body;
        await pool.query(
            `INSERT INTO pending_changes
             (id, username, type, old_full_name, new_full_name,
              old_group, new_group, old_phone, new_phone,
              old_email, new_email, old_avatar, new_avatar)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [c.id, c.username, c.type,
             c.oldFullName, c.newFullName,
             c.oldGroup, c.newGroup,
             c.oldPhone, c.newPhone,
             c.oldEmail, c.newEmail,
             c.oldAvatar || null, c.newAvatar || null]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Применить / отклонить изменение профиля
router.put('/pending-changes/:id/:action', async (req, res) => {
    try {
        const { id, action } = req.params;

        if (action === 'approve') {
            const r = await pool.query(
                'SELECT * FROM pending_changes WHERE id=$1', [id]
            );
            const c = r.rows[0];
            if (c) {
                await pool.query(
                    `UPDATE users SET full_name=$1, group_number=$2,
                     phone=$3, email=$4, avatar_data=COALESCE($5, avatar_data)
                     WHERE username=$6`,
                    [c.new_full_name, c.new_group, c.new_phone,
                     c.new_email, c.new_avatar, c.username]
                );
            }
        }

        await pool.query(
            `UPDATE pending_changes SET status=$1 WHERE id=$2`,
            [action === 'approve' ? 'approved' : 'rejected', id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
