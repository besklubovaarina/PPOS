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
        const events = result.rows.map(e => ({
            id:                  e.id.toString(),
            title:               e['Название'],
            description:         e['Описание']        || '',
            date:                e['Дата']             ? new Date(e['Дата']).toLocaleDateString('ru-RU') : '',
            time:                e['Время']            ? e['Время'].substring(0,5) : '',
            type:                e['Тип']              || '',
            location:            e['Место']            || '',
            maxParticipants:     e['Макс_участников']  || 0,
            status:              e['Статус']           || 'open',
            hasCertificate:      e['Есть_сертификат'],
            allowOrganizerRole:  e['Разрешить_организатора'],
            imageUrl:            e['Изображение']      || '',
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
                maxParticipants, status, hasCertificate,
                allowOrganizerRole, imageUrl,
                certParticipantData, certOrganizerData } = req.body;

        const result = await pool.query(
            `INSERT INTO "Мероприятие"
             ("Название","Описание","Дата","Время","Тип","Место",
              "Макс_участников","Статус","Есть_сертификат",
              "Разрешить_организатора","Изображение",
              "Шаблон_сертификата_участника","Шаблон_сертификата_организатора")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING id`,
            [title, description, date || null, time || null, type, location,
             maxParticipants || 0, status || 'open',
             hasCertificate || false, allowOrganizerRole || false,
             imageUrl || null, certParticipantData || null, certOrganizerData || null]
        );

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
                maxParticipants, status, hasCertificate,
                allowOrganizerRole, imageUrl,
                certParticipantData, certOrganizerData } = req.body;

        await pool.query(
            `UPDATE "Мероприятие" SET
             "Название"=$1,"Описание"=$2,"Дата"=$3,"Время"=$4,"Тип"=$5,
             "Место"=$6,"Макс_участников"=$7,"Статус"=$8,
             "Есть_сертификат"=$9,"Разрешить_организатора"=$10,
             "Изображение"=$11,"Шаблон_сертификата_участника"=$12,
             "Шаблон_сертификата_организатора"=$13
             WHERE id=$14`,
            [title, description, date || null, time || null, type, location,
             maxParticipants, status, hasCertificate, allowOrganizerRole,
             imageUrl || null, certParticipantData, certOrganizerData, req.params.id]
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
