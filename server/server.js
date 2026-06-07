const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// Разрешаем запросы с фронтенда (другой порт при локальной разработке)
app.use(cors());

// Парсим JSON — лимит 50МБ для загрузки файлов
app.use(express.json({ limit: '50mb' }));

// Отдаём статический фронтенд из родительской директории
app.use(express.static(path.join(__dirname, '..')));

// Логируем каждый входящий запрос
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Подключаем маршруты
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/events',        require('./routes/events'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/applications',  require('./routes/applications'));
app.use('/api/documents',     require('./routes/documents'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/certificates',  require('./routes/certificates'));

// Проверочный маршрут — чтобы убедиться что сервер работает
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Сервер ППОС работает' });
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
    console.log(`📋 Проверка: http://localhost:${PORT}/api/health`);
});
