// applications.js — Согласие_на_мероприятие
// (заявки студентов на участие в мероприятиях)
const express = require('express');
const router  = express.Router();
const pool    = require('../db');

const TABLE = '"Согласие_на_мероприятие"';

// Все заявки (для admin)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT с.id, с."Номер", с."Дата", с."Статус", с."Роль_участника",
                    с."id_Мероприятие" as event_id,
                    с."id_Студент" as student_id,
                    м."Название" as event_title,
                    м."Дата" as event_date,
                    ст."ФИО" as full_name,
                    ст."Телефон" as phone,
                    ст."email" as email,
                    г."Номер" as group_number,
                    д."Логин" as username
             FROM ${TABLE} с
             JOIN "Мероприятие" м ON с."id_Мероприятие" = м.id
             JOIN "Студент" ст    ON с."id_Студент" = ст.id
             LEFT JOIN "Группа" г ON ст."id_Группа" = г.id
             LEFT JOIN "Данные_входа" д ON ст."id_Данные_входа" = д.id
             ORDER BY с."Дата" DESC`
        );
        res.json({ success: true, applications: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Заявки на конкретное мероприятие
router.get('/event/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT с.id, с."Статус", с."Роль_участника", с."Дата",
                    ст."ФИО" as full_name,
                    ст."Телефон" as phone,
                    ст."email" as email,
                    г."Номер" as group_number,
                    д."Логин" as username
             FROM ${TABLE} с
             JOIN "Студент" ст    ON с."id_Студент" = ст.id
             LEFT JOIN "Группа" г ON ст."id_Группа" = г.id
             LEFT JOIN "Данные_входа" д ON ст."id_Данные_входа" = д.id
             WHERE с."id_Мероприятие" = $1
             ORDER BY с."Дата"`,
            [req.params.id]
        );
        res.json({ success: true, applications: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Заявки конкретного студента
router.get('/student/:studentId', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT с.id, с."Статус", с."Роль_участника",
                    с."id_Мероприятие" as event_id,
                    м."Название" as event_title,
                    м."Дата", м."Время",
                    м."Статус" as event_status
             FROM ${TABLE} с
             JOIN "Мероприятие" м ON с."id_Мероприятие" = м.id
             WHERE с."id_Студент" = $1
             ORDER BY с."Дата" DESC`,
            [req.params.studentId]
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
        const { eventId, studentId, role } = req.body;

        const exists = await pool.query(
            `SELECT id FROM ${TABLE} WHERE "id_Мероприятие"=$1 AND "id_Студент"=$2`,
            [eventId, studentId]
        );
        if (exists.rows.length > 0)
            return res.json({ success: false, error: 'Вы уже подали заявку' });

        const result = await pool.query(
            `INSERT INTO ${TABLE} ("id_Мероприятие","id_Студент","Роль_участника","Статус")
             VALUES ($1,$2,$3,'ожидание') RETURNING id`,
            [eventId, studentId, role || 'участник']
        );

        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Одобрить
router.put('/:id/approve', async (req, res) => {
    try {
        const r = await pool.query(
            `UPDATE ${TABLE} SET "Статус"='одобрено' WHERE id=$1 RETURNING "id_Студент","id_Мероприятие"`,
            [req.params.id]
        );
        if (!r.rows.length) return res.json({ success: false, error: 'Заявка не найдена' });
        const { id_Студент, id_Мероприятие } = r.rows[0];

        await pool.query(
            `INSERT INTO "Уведомления" ("id_Студент","Тип","Сообщение","Мероприятие")
             SELECT $1,'одобрение','Ваша заявка одобрена',м."Название"
             FROM "Мероприятие" м WHERE м.id=$2`,
            [id_Студент, id_Мероприятие]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Отклонить
router.put('/:id/reject', async (req, res) => {
    try {
        const r = await pool.query(
            `UPDATE ${TABLE} SET "Статус"='отклонено' WHERE id=$1 RETURNING "id_Студент","id_Мероприятие"`,
            [req.params.id]
        );
        if (!r.rows.length) return res.json({ success: false, error: 'Заявка не найдена' });
        const { id_Студент, id_Мероприятие } = r.rows[0];

        await pool.query(
            `INSERT INTO "Уведомления" ("id_Студент","Тип","Сообщение","Мероприятие")
             SELECT $1,'отклонение','Ваша заявка отклонена',м."Название"
             FROM "Мероприятие" м WHERE м.id=$2`,
            [id_Студент, id_Мероприятие]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// В резерв
router.put('/:id/reserve', async (req, res) => {
    try {
        const r = await pool.query(
            `UPDATE ${TABLE} SET "Статус"='резерв' WHERE id=$1 RETURNING "id_Студент","id_Мероприятие"`,
            [req.params.id]
        );
        if (!r.rows.length) return res.json({ success: false, error: 'Заявка не найдена' });
        const { id_Студент, id_Мероприятие } = r.rows[0];

        await pool.query(
            `INSERT INTO "Уведомления" ("id_Студент","Тип","Сообщение","Мероприятие")
             SELECT $1,'резерв','Вы добавлены в резервный список',м."Название"
             FROM "Мероприятие" м WHERE м.id=$2`,
            [id_Студент, id_Мероприятие]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Отменить запись
router.delete('/event/:eventId/student/:studentId', async (req, res) => {
    try {
        await pool.query(
            `DELETE FROM ${TABLE} WHERE "id_Мероприятие"=$1 AND "id_Студент"=$2`,
            [req.params.eventId, req.params.studentId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
