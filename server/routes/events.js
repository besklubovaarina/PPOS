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
        // Для каждого мероприятия проверяем наличие сертификатов
        const certResult = await pool.query(
            'SELECT "id_Мероприятие","Роль" FROM "Сертификат"'
        );
        const certMap = {};
        certResult.rows.forEach(c => {
            if (!certMap[c['id_Мероприятие']]) certMap[c['id_Мероприятие']] = [];
            certMap[c['id_Мероприятие']].push(c['Роль']);
        });

        const events = result.rows.map(e => ({
            id:                 e.id.toString(),
            title:              e['Название'],
            description:        e['Описание']       || '',
            date:               e['Дата']            ? new Date(e['Дата']).toLocaleDateString('ru-RU') : '',
            time:               e['Время']           ? e['Время'].substring(0,5) : '',
            type:               e['Тип']             || '',
            location:           e['Место']           || '',
            maxParticipants:    e['Макс_участников'] || 0,
            status:             e['Статус']          || 'open',
            allowOrganizerRole: e['Разрешить_организатора'],
            imageUrl:           e['Изображение']     || '',
            // Есть сертификат = есть хотя бы один шаблон в таблице Сертификат
            hasCertificate:     !!(certMap[e.id]?.length),
        }));
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
                certParticipantData, certOrganizerData } = req.body;

        const result = await pool.query(
            `INSERT INTO "Мероприятие"
             ("Название","Описание","Дата","Время","Тип","Место",
              "Макс_участников","Статус","Разрешить_организатора","Изображение")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             RETURNING id`,
            [title, description, date || null, time || null, type, location,
             maxParticipants || 0, status || 'open',
             allowOrganizerRole || false, imageUrl || null]
        );

        const eventId = result.rows[0].id;

        // Сохраняем шаблоны сертификатов в отдельную таблицу
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

// Редактировать мероприятие
router.put('/:id', async (req, res) => {
    try {
        const { title, description, date, time, type, location,
                maxParticipants, status, allowOrganizerRole, imageUrl,
                certParticipantData, certOrganizerData } = req.body;

        await pool.query(
            `UPDATE "Мероприятие" SET
             "Название"=$1,"Описание"=$2,"Дата"=$3,"Время"=$4,"Тип"=$5,
             "Место"=$6,"Макс_участников"=$7,"Статус"=$8,
             "Разрешить_организатора"=$9,"Изображение"=$10
             WHERE id=$11`,
            [title, description, date || null, time || null, type, location,
             maxParticipants, status, allowOrganizerRole,
             imageUrl || null, req.params.id]
        );

        // Обновляем шаблоны сертификатов
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
