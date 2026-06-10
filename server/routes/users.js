// users.js — студенты, группы, адрес, должности
const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Все студенты
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT с.id, д."Логин" as username, с."ФИО", с."email",
                    с."Телефон", с."Роль", с."is_admin",
                    г."Номер" as group_number,
                    и."Название" as institute
             FROM "Студент" с
             LEFT JOIN "Данные_входа" д ON с."id_Данные_входа" = д.id
             LEFT JOIN "Группа" г ON с."id_Группа" = г.id
             LEFT JOIN "Институт" и ON г."id_Институт" = и.id
             ORDER BY с."ФИО"`
        );
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Обновить профиль студента
router.put('/:username', async (req, res) => {
    try {
        const { fullName, groupNumber, phone, email, avatarData, gender, birthDate,
                regionId, settlementId, streetId, addressSpec } = req.body;

        // Находим id студента по логину
        const authR = await pool.query(
            'SELECT с.id FROM "Студент" с JOIN "Данные_входа" д ON с."id_Данные_входа"=д.id WHERE д."Логин"=$1',
            [req.params.username]
        );
        if (authR.rows.length === 0)
            return res.json({ success: false, error: 'Пользователь не найден' });
        const studentId = authR.rows[0].id;

        // Находим группу
        let groupId = null;
        if (groupNumber) {
            const grp = await pool.query('SELECT id FROM "Группа" WHERE "Номер"=$1', [groupNumber]);
            groupId = grp.rows[0]?.id || null;
        }

        await pool.query(
            `UPDATE "Студент" SET
             "ФИО"=$1, "Телефон"=$2, "email"=$3, "Аватар"=$4,
             "Пол"=$5, "Дата_рождения"=$6,
             "id_Группа"=$7, "id_Улица"=$8, "Спецификация_адреса"=$9
             WHERE id=$10`,
            [fullName, phone, email, avatarData || null,
             gender || null, birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : null,
             groupId, streetId || null, addressSpec || null, studentId]
        );

        // Возвращаем обновлённые данные
        const updated = await pool.query(
            `SELECT с.*, д."Логин", г."Номер" as group_number, и."Название" as institute
             FROM "Студент" с
             JOIN "Данные_входа" д ON с."id_Данные_входа"=д.id
             LEFT JOIN "Группа" г ON с."id_Группа"=г.id
             LEFT JOIN "Институт" и ON г."id_Институт"=и.id
             WHERE с.id=$1`,
            [studentId]
        );
        if (!updated.rows.length)
            return res.json({ success: false, error: 'Пользователь не найден' });
        const u = updated.rows[0];

        res.json({
            success: true,
            user: {
                username:      u['Логин'],
                fullName:      u['ФИО']          || '',
                groupNumber:   u['group_number'] || '',
                phone:         u['Телефон']      || '',
                email:         u['email']        || '',
                role:          u['Роль']         || 'Студент',
                isAdmin:       u['is_admin'],
                avatarDataUrl: u['Аватар']       || '',
                institute:     u['institute']    || '',
                studentId:     u['id'],
            }
        });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// ─── Адрес ─────────────────────────────────────

router.get('/address/regions', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM "Регион" ORDER BY "Название"');
        res.json({ success: true, regions: r.rows });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.get('/address/settlements/:regionId', async (req, res) => {
    try {
        const r = await pool.query(
            'SELECT * FROM "Населенный_пункт" WHERE "id_Регион"=$1 ORDER BY "Название"',
            [req.params.regionId]
        );
        res.json({ success: true, settlements: r.rows });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.get('/address/streets/:settlementId', async (req, res) => {
    try {
        const r = await pool.query(
            'SELECT * FROM "Улица" WHERE "id_Населенный_пункт"=$1 ORDER BY "Название"',
            [req.params.settlementId]
        );
        res.json({ success: true, streets: r.rows });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.post('/address/regions', async (req, res) => {
    try {
        const r = await pool.query(
            'INSERT INTO "Регион" ("Название") VALUES ($1) RETURNING *', [req.body.name]
        );
        res.json({ success: true, region: r.rows[0] });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.post('/address/settlements', async (req, res) => {
    try {
        const r = await pool.query(
            'INSERT INTO "Населенный_пункт" ("Название","id_Регион") VALUES ($1,$2) RETURNING *',
            [req.body.name, req.body.regionId]
        );
        res.json({ success: true, settlement: r.rows[0] });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.post('/address/streets', async (req, res) => {
    try {
        const r = await pool.query(
            'INSERT INTO "Улица" ("Название","id_Населенный_пункт") VALUES ($1,$2) RETURNING *',
            [req.body.name, req.body.settlementId]
        );
        res.json({ success: true, street: r.rows[0] });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

// ─── Группы ────────────────────────────────────

router.get('/groups', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT г.id, г."Номер", и."Название" as institute,
                    н."Название" as direction, ф."Название" as form,
                    го."Год" as year
             FROM "Группа" г
             LEFT JOIN "Институт" и ON г."id_Институт"=и.id
             LEFT JOIN "Направление_обучения" н ON г."id_Направление_обучения"=н.id
             LEFT JOIN "Форма_обучения" ф ON г."id_Форма_обучения"=ф.id
             LEFT JOIN "Год_поступления" го ON г."id_Год_Поступления"=го.id
             ORDER BY г."Номер"`
        );
        res.json({ success: true, groups: r.rows });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.get('/group/:groupName/members', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT уч.id, уч."Имя", д."Логин" as username, с."Аватар", с."Роль"
             FROM "Участники_группы" уч
             LEFT JOIN "Студент" с ON уч."id_Студент"=с.id
             LEFT JOIN "Данные_входа" д ON с."id_Данные_входа"=д.id
             JOIN "Группа" г ON уч."id_Группа"=г.id
             WHERE г."Номер"=$1
             ORDER BY уч."Имя"`,
            [req.params.groupName]
        );
        res.json({ success: true, members: r.rows });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.post('/group/:groupName/members', async (req, res) => {
    try {
        const grp = await pool.query('SELECT id FROM "Группа" WHERE "Номер"=$1', [req.params.groupName]);
        const groupId = grp.rows[0]?.id;
        const r = await pool.query(
            'INSERT INTO "Участники_группы" ("id_Группа","Имя","id_Студент") VALUES ($1,$2,$3) RETURNING *',
            [groupId, req.body.memberName, req.body.studentId || null]
        );
        res.json({ success: true, member: r.rows[0] });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.delete('/group/members/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM "Участники_группы" WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

// ─── Ожидающие изменения профиля ───────────────

router.get('/pending-changes', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT оп.*, д."Логин" as username
             FROM "Ожидающие_изменения_профиля" оп
             JOIN "Студент" с ON оп."id_Студент"=с.id
             JOIN "Данные_входа" д ON с."id_Данные_входа"=д.id
             WHERE оп."Статус"='ожидание'
             ORDER BY оп."Дата_создания" DESC`
        );
        res.json({ success: true, changes: r.rows });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.post('/pending-changes', async (req, res) => {
    try {
        const c = req.body;
        await pool.query(
            `INSERT INTO "Ожидающие_изменения_профиля"
             (id,"id_Студент","Старое_ФИО","Новое_ФИО",
              "Старая_группа","Новая_группа","Старый_телефон","Новый_телефон",
              "Старый_email","Новый_email","Старый_аватар","Новый_аватар")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [c.id, c.studentId,
             c.oldFullName, c.newFullName,
             c.oldGroup, c.newGroup,
             c.oldPhone, c.newPhone,
             c.oldEmail, c.newEmail,
             c.oldAvatar || null, c.newAvatar || null]
        );
        res.json({ success: true });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.put('/pending-changes/:id/:action', async (req, res) => {
    try {
        const { id, action } = req.params;

        if (action === 'approve') {
            const r = await pool.query(
                'SELECT * FROM "Ожидающие_изменения_профиля" WHERE id=$1', [id]
            );
            const c = r.rows[0];
            if (c) {
                let groupId = null;
                if (c['Новая_группа']) {
                    const grp = await pool.query('SELECT id FROM "Группа" WHERE "Номер"=$1', [c['Новая_группа']]);
                    groupId = grp.rows[0]?.id || null;
                }
                await pool.query(
                    `UPDATE "Студент" SET
                     "ФИО"=$1,"Телефон"=$2,"email"=$3,
                     "Аватар"=COALESCE($4,"Аватар"),"id_Группа"=COALESCE($5,"id_Группа")
                     WHERE id=$6`,
                    [c['Новое_ФИО'], c['Новый_телефон'], c['Новый_email'],
                     c['Новый_аватар'], groupId, c['id_Студент']]
                );
            }
        }

        await pool.query(
            'UPDATE "Ожидающие_изменения_профиля" SET "Статус"=$1 WHERE id=$2',
            [action === 'approve' ? 'одобрено' : 'отклонено', id]
        );
        res.json({ success: true });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

module.exports = router;
