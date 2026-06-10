// events.js — мероприятия
const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Все мероприятия
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM "Мероприятие" ORDER BY "Дата_создания" DESC'
        );
        const certResult = await pool.query(
            'SELECT "id_Мероприятие","Роль" FROM "Сертификат"'
        );
        const certMap = {};
        certResult.rows.forEach(c => {
            if (!certMap[c['id_Мероприятие']]) certMap[c['id_Мероприятие']] = [];
            certMap[c['id_Мероприятие']].push(c['Роль']);
        });

        const events = result.rows.map(e => {
            let formFields = [];
            try { formFields = JSON.parse(e['Поля_формы'] || '[]'); } catch (_) {}
            return {
                id:                 e.id.toString(),
                title:              e['Название'],
                description:        e['Описание']           || '',
                date:               e['Дата']               ? new Date(e['Дата']).toISOString().substring(0, 10) : '',
                time:               e['Время']              ? e['Время'].substring(0, 5) : '',
                type:               e['Тип']                || '',
                location:           e['Место']              || '',
                maxParticipants:    e['Макс_участников']    || 0,
                status:             e['Статус']             || 'открыто',
                allowOrganizerRole: e['Разрешить_организатора'],
                imageUrl:           e['Изображение']        || '',
                hasCertificate:     !!(certMap[e.id]?.length),
                requiresForm:       e['Требует_форму']      || false,
                formFields,
            };
        });
        res.json({ success: true, events });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Создать мероприятие
router.post('/', async (req, res) => {
    try {
        const { title, description, date, time, type, location,
                maxParticipants, status, allowOrganizerRole, imageUrl,
                requiresForm, formFields,
                certParticipantData, certOrganizerData } = req.body;

        const safeDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
        const safeTime = time && /^\d{2}:\d{2}/.test(time) ? time : null;

        const result = await pool.query(
            `INSERT INTO "Мероприятие"
             ("Название","Описание","Дата","Время","Тип","Место",
              "Макс_участников","Статус","Разрешить_организатора","Изображение",
              "Требует_форму","Поля_формы")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             RETURNING id`,
            [title, description, safeDate, safeTime, type, location,
             maxParticipants || 0, status || 'открыто',
             allowOrganizerRole || false, imageUrl || null,
             requiresForm || false,
             formFields ? (typeof formFields === 'string' ? formFields : JSON.stringify(formFields)) : '[]']
        );

        const eventId = result.rows[0].id;

        if (certParticipantData) {
            await pool.query(
                `INSERT INTO "Сертификат" ("Роль","Шаблон","id_Мероприятие")
                 VALUES ('участник',$1,$2)
                 ON CONFLICT ("id_Мероприятие","Роль") DO UPDATE SET "Шаблон"=$1`,
                [certParticipantData, eventId]
            );
        }
        if (certOrganizerData) {
            await pool.query(
                `INSERT INTO "Сертификат" ("Роль","Шаблон","id_Мероприятие")
                 VALUES ('организатор',$1,$2)
                 ON CONFLICT ("id_Мероприятие","Роль") DO UPDATE SET "Шаблон"=$1`,
                [certOrganizerData, eventId]
            );
        }

        res.json({ success: true, id: result.rows[0].id.toString() });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Редактировать мероприятие (полное обновление)
router.put('/:id', async (req, res) => {
    try {
        const { title, description, date, time, type, location,
                maxParticipants, status, allowOrganizerRole, imageUrl,
                requiresForm, formFields,
                certParticipantData, certOrganizerData } = req.body;

        await pool.query(
            `UPDATE "Мероприятие" SET
             "Название"=$1,"Описание"=$2,"Дата"=$3,"Время"=$4,"Тип"=$5,
             "Место"=$6,"Макс_участников"=$7,"Статус"=$8,
             "Разрешить_организатора"=$9,"Изображение"=$10,
             "Требует_форму"=$11,"Поля_формы"=$12
             WHERE id=$13`,
            [title, description, date || null, time || null, type, location,
             maxParticipants, status, allowOrganizerRole,
             imageUrl || null,
             requiresForm || false,
             formFields ? (typeof formFields === 'string' ? formFields : JSON.stringify(formFields)) : '[]',
             req.params.id]
        );

        if (certParticipantData !== undefined) {
            if (certParticipantData) {
                await pool.query(
                    `INSERT INTO "Сертификат" ("Роль","Шаблон","id_Мероприятие")
                     VALUES ('участник',$1,$2)
                     ON CONFLICT ("id_Мероприятие","Роль") DO UPDATE SET "Шаблон"=$1`,
                    [certParticipantData, req.params.id]
                );
            } else {
                await pool.query(
                    `DELETE FROM "Сертификат" WHERE "id_Мероприятие"=$1 AND "Роль"='участник'`,
                    [req.params.id]
                );
            }
        }
        if (certOrganizerData !== undefined) {
            if (certOrganizerData) {
                await pool.query(
                    `INSERT INTO "Сертификат" ("Роль","Шаблон","id_Мероприятие")
                     VALUES ('организатор',$1,$2)
                     ON CONFLICT ("id_Мероприятие","Роль") DO UPDATE SET "Шаблон"=$1`,
                    [certOrganizerData, req.params.id]
                );
            } else {
                await pool.query(
                    `DELETE FROM "Сертификат" WHERE "id_Мероприятие"=$1 AND "Роль"='организатор'`,
                    [req.params.id]
                );
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Обновить только статус мероприятия
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query(
            `UPDATE "Мероприятие" SET "Статус"=$1 WHERE id=$2`,
            [status, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удалить мероприятие
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM "Мероприятие" WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
