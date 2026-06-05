// documents.js — документы студентов и документы для скачивания
const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Получить документы для скачивания
router.get('/downloadable', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, created_at FROM downloadable_docs ORDER BY created_at DESC'
        );
        res.json({ success: true, docs: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Скачать конкретный документ (возвращает data)
router.get('/downloadable/:id/data', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT name, file_data FROM downloadable_docs WHERE id=$1', [req.params.id]
        );
        if (result.rows.length === 0)
            return res.json({ success: false, error: 'Файл не найден' });
        res.json({ success: true, name: result.rows[0].name, data: result.rows[0].file_data });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Добавить документ для скачивания (только admin)
router.post('/downloadable', async (req, res) => {
    try {
        const { id, name, fileData } = req.body;
        await pool.query(
            'INSERT INTO downloadable_docs (id, name, file_data) VALUES ($1,$2,$3)',
            [id, name, fileData]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удалить документ для скачивания
router.delete('/downloadable/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM downloadable_docs WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Загрузить документ студента (заявление)
router.post('/user/:username', async (req, res) => {
    try {
        const { docType, name, fileData } = req.body;
        await pool.query(
            `INSERT INTO user_documents (username, doc_type, name, file_data)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (username, doc_type) DO UPDATE
             SET name=$3, file_data=$4`,
            [req.params.username, docType, name, fileData]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Получить документы студента
router.get('/user/:username', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, doc_type, name, created_at FROM user_documents WHERE username=$1',
            [req.params.username]
        );
        res.json({ success: true, docs: result.rows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удалить документ студента
router.delete('/user/:username/:id', async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM user_documents WHERE id=$1 AND username=$2',
            [req.params.id, req.params.username]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: 'Ошибка сервера' });
    }
});

module.exports = router;
