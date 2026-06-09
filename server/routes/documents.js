// documents.js — заявления, протоколы собраний, документы для скачивания
const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ─── Документы для скачивания (admin управляет) ───────────────────

router.get('/downloadable', async (req, res) => {
    try {
        const r = await pool.query(
            'SELECT id,"Название","Дата_добавления" FROM "Документы_для_скачивания" ORDER BY "Дата_добавления" DESC'
        );
        res.json({ success: true, docs: r.rows });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.get('/downloadable/:id/data', async (req, res) => {
    try {
        const r = await pool.query(
            'SELECT "Название","Файл" FROM "Документы_для_скачивания" WHERE id=$1', [req.params.id]
        );
        if (r.rows.length === 0) return res.json({ success: false, error: 'Файл не найден' });
        res.json({ success: true, name: r.rows[0]['Название'], data: r.rows[0]['Файл'] });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.post('/downloadable', async (req, res) => {
    try {
        const { id, name, fileData } = req.body;
        await pool.query(
            'INSERT INTO "Документы_для_скачивания" (id,"Название","Файл") VALUES ($1,$2,$3)',
            [id, name, fileData]
        );
        res.json({ success: true });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.delete('/downloadable/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM "Документы_для_скачивания" WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

// ─── Заявление в бухгалтерию ─────────────────────────────────────

router.post('/accounting/:studentId', async (req, res) => {
    try {
        const { name, fileData } = req.body;
        const r = await pool.query(
            `INSERT INTO "Заявление_в_бухгалтерию" ("Дата_написания","Файл")
             VALUES (CURRENT_DATE,$1) RETURNING id`,
            [fileData]
        );
        await pool.query(
            'UPDATE "Студент" SET "id_Заявление_в_бухгалтерию"=$1 WHERE id=$2',
            [r.rows[0].id, req.params.studentId]
        );
        res.json({ success: true, docId: r.rows[0].id });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.get('/accounting/:studentId/data', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT з."Файл", з."Дата_написания"
             FROM "Заявление_в_бухгалтерию" з
             JOIN "Студент" с ON с."id_Заявление_в_бухгалтерию"=з.id
             WHERE с.id=$1`,
            [req.params.studentId]
        );
        if (r.rows.length === 0) return res.json({ success: false });
        res.json({ success: true, data: r.rows[0]['Файл'] });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

// ─── Заявление на вступление в профсоюз ─────────────────────────

router.post('/join/:studentId', async (req, res) => {
    try {
        const { fileData } = req.body;
        const r = await pool.query(
            `INSERT INTO "Заявление_на_вступление" ("Дата","Файл","id_Студент")
             VALUES (CURRENT_DATE,$1,$2) RETURNING id`,
            [fileData, req.params.studentId]
        );
        await pool.query(
            'UPDATE "Студент" SET "id_Заявление_на_вступление"=$1 WHERE id=$2',
            [r.rows[0].id, req.params.studentId]
        );
        res.json({ success: true, docId: r.rows[0].id });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.get('/join/:studentId/data', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT з."Файл", з."Дата"
             FROM "Заявление_на_вступление" з
             JOIN "Студент" с ON с."id_Заявление_на_вступление"=з.id
             WHERE с.id=$1`,
            [req.params.studentId]
        );
        if (r.rows.length === 0) return res.json({ success: false });
        res.json({ success: true, data: r.rows[0]['Файл'] });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

// ─── Протоколы собраний ──────────────────────────────────────────

router.get('/protocols', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT п.id, п."Номер_протокола", п."Дата",
                    п."Повестка_собрания",
                    п."Дата_загрузки",
                    а."Название" as auditorium,
                    к."Название" as building
             FROM "Протокол_собрания" п
             LEFT JOIN "Аудитория" а ON п."id_Аудитория"=а.id
             LEFT JOIN "Корпус" к ON а."id_Корпус"=к.id
             ORDER BY п."Дата" DESC`
        );
        res.json({ success: true, protocols: r.rows });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.post('/protocols', async (req, res) => {
    try {
        const { number, date, agenda, presentCount } = req.body;
        const r = await pool.query(
            `INSERT INTO "Протокол_собрания"
             ("Номер_протокола","Дата","Повестка_собрания","Число_присутствующих")
             VALUES ($1,$2,$3,$4) RETURNING id`,
            [number, date || null, agenda, presentCount || 0]
        );
        res.json({ success: true, id: r.rows[0].id });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

router.delete('/protocols/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM "Протокол_собрания" WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.json({ success: false, error: 'Ошибка сервера' }); }
});

module.exports = router;
