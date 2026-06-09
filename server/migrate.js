/**
 * migrate.js — Начальное заполнение БД пользователями и мероприятиями.
 * Запускать один раз после создания схемы:
 *   node server/migrate.js
 * или через Render Shell:
 *   node migrate.js
 */

require('dotenv').config();
const pool = require('./db');

// Все пользователи из DEFAULT_USERS_LIST (data.js)
const USERS = [
    { username: 'admin',          password: 'admin2025ppos',        fullName: 'Администратор',                    groupNumber: '',      role: 'Администратор',   isAdmin: true  },
    { username: 'besklubova',     password: 'besklubova2025',       fullName: 'Бесклубова Арина Сергеевна',       groupNumber: '3215д', role: 'Председатель',    isAdmin: false },
    { username: 'rutts',          password: 'rutts2025',            fullName: 'Рутц Юлия Сергеевна',              groupNumber: '3215д', role: 'Активист профбюро', isAdmin: false },
    { username: 'anufriev',       password: 'anufriev2025',         fullName: 'Ануфриев Артем Александрович',     groupNumber: '3215д', role: 'Активист профбюро', isAdmin: false },
    { username: 'bulatov',        password: 'bulatov2025',          fullName: 'Булатов Иван Григорьевич',         groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'ganyukov',       password: 'ganyukov2025',         fullName: 'Ганюков Данил Андреевич',          groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'zaibert',        password: 'zaibert2025',          fullName: 'Зайберт Константин Валерьевич',   groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'kodylev',        password: 'kodylev2025',          fullName: 'Кодылев Андрей Александрович',    groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'kopasova',       password: 'kopasova2025',         fullName: 'Копасова Виктория Витальевна',    groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'kosenkov',       password: 'kosenkov2025',         fullName: 'Косенков Денис Алексеевич',       groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'kuznetsov',      password: 'kuznetsov2025',        fullName: 'Кузнецов Роман Романович',        groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'kucherov',       password: 'kucherov2025',         fullName: 'Кучеров Денис Евгеньевич',        groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'lisimenko',      password: 'lisimenko2025',        fullName: 'Лисименко Алексей Вячеславович',  groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'lityagina',      password: 'lityagina2025',        fullName: 'Литягина Анастасия Михайловна',   groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'lytar',          password: 'lytar2025',            fullName: 'Лытарь Алексей Александрович',    groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'malets',         password: 'malets2025',           fullName: 'Малец Дмитрий Евгеньевич',        groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'pinchuk',        password: 'pinchuk2025',          fullName: 'Пинчук Иван Сергеевич',           groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'starkova',       password: 'starkova2025',         fullName: 'Старкова Елизавета Юрьевна',      groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'udovik',         password: 'udovik2025',           fullName: 'Удовик Анастасия Александровна',  groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'fotin',          password: 'fotin2025',            fullName: 'Фотин Михаил Константинович',     groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'shinkorenko',    password: 'shinkorenko2025',      fullName: 'Шинкоренко Владислав Дмитриевич', groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'scherbakov',     password: 'scherbakov2025',       fullName: 'Щербаков Никита Сергеевич',       groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    { username: 'yakimov',        password: 'yakimov2025',          fullName: 'Якимов Михаил Александрович',     groupNumber: '3215д', role: 'Студент',         isAdmin: false },
    // 3221д
    { username: 'borisova',       password: 'borisova2025',         fullName: 'Борисова Татьяна Сергеевна',      groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    { username: 'brattseva',      password: 'brattseva2025',        fullName: 'Братцева Виктория Андреевна',     groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    { username: 'burov3221',      password: 'burov32212025',        fullName: 'Буров Иван Максимович',           groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    { username: 'volzhina',       password: 'volzhina2025',         fullName: 'Волжина Анастасия Андреевна',     groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    { username: 'gokshteter',     password: 'gokshteter2025',       fullName: 'Гокштетер Анастасия Матвеевна',   groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    { username: 'ilina',          password: 'ilina2025',            fullName: 'Ильина Виктория Алексеевна',      groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    { username: 'kapustin',       password: 'kapustin2025',         fullName: 'Капустин Богдан Вадимович',       groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    { username: 'komzarova',      password: 'komzarova2025',        fullName: 'Комзарова Лилия Сергеевна',       groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    { username: 'kuzub',          password: 'kuzub2025',            fullName: 'Кузуб Виктория Степановна',       groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    { username: 'medvedeva3221',  password: 'medvedeva32212025',    fullName: 'Медведева Валерия Вячеславовна',  groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    { username: 'nefedova',       password: 'nefedova2025',         fullName: 'Нефедова Екатерина Аркадьевна',   groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    { username: 'onoprienko',     password: 'onoprienko2025',       fullName: 'Оноприенко Екатерина Александровна', groupNumber: '3221д', role: 'Студент',      isAdmin: false },
    { username: 'prodolyakina',   password: 'prodolyakina2025',     fullName: 'Продолякина Анастасия Алексеевна', groupNumber: '3221д', role: 'Студент',        isAdmin: false },
    { username: 'prokhnau',       password: 'prokhnau2025',         fullName: 'Прохнау Елизавета Владимировна',  groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    { username: 'rolzing',        password: 'rolzing2025',          fullName: 'Рользинг Алина Юрьевна',          groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    { username: 'torlopova',      password: 'torlopova2025',        fullName: 'Торлопова Дарья Александровна',   groupNumber: '3221д', role: 'Студент',         isAdmin: false },
    // 3315д
    { username: 'bespalov',       password: 'bespalov2025',         fullName: 'Беспалов Никита Алексеевич',      groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'glukhonemykh',   password: 'glukhonemykh2025',     fullName: 'Глухонемых Павел Дмитриевич',     groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'zharonkin',      password: 'zharonkin2025',        fullName: 'Жаронкин Иван Андреевич',         groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'klepikov',       password: 'klepikov2025',         fullName: 'Клепиков Данил Александрович',    groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'klimov',         password: 'klimov2025',           fullName: 'Климов Артём Дмитриевич',         groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'kodirov',        password: 'kodirov2025',          fullName: 'Кодиров Халимджон Абдукодирович', groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'logvinova',      password: 'logvinova2025',        fullName: 'Логвинова Елена Андреевна',       groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'lyutaev',        password: 'lyutaev2025',          fullName: 'Лютаев Степан Евгеньевич',        groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'maslova',        password: 'maslova2025',          fullName: 'Маслова Елизавета Андреевна',     groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'medvedeva3315',  password: 'medvedeva33152025',    fullName: 'Медведева Вероника Вячеславовна', groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'miev',           password: 'miev2025',             fullName: 'Миев Сергей Дмитриевич',          groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'pigareva',       password: 'pigareva2025',         fullName: 'Пигарева Дарья Сергеевна',        groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'sergeev',        password: 'sergeev2025',          fullName: 'Сергеев Евгений Александрович',   groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'sergeenko',      password: 'sergeenko2025',        fullName: 'Сергеенко Кирилл Сергеевич',      groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'troshev',        password: 'troshev2025',          fullName: 'Трошев Александр Сергеевич',      groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'shilyaev',       password: 'shilyaev2025',         fullName: 'Шиляев Алексей Дмитриевич',       groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'engraf',         password: 'engraf2025',           fullName: 'Энграф Даниил Юрьевич',           groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'yaremenko',      password: 'yaremenko2025',        fullName: 'Ярёменко Иван Николаевич',        groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    { username: 'yarovoy',        password: 'yarovoy2025',          fullName: 'Яровой Алексей Максимович',       groupNumber: '3315д', role: 'Студент',         isAdmin: false },
    // 3321д
    { username: 'anegov',         password: 'anegov2025',           fullName: 'Анегов Владимир Евгеньевич',      groupNumber: '3321д', role: 'Студент',         isAdmin: false },
    { username: 'bersh',          password: 'bersh2025',            fullName: 'Берш Вероника Сергеевна',         groupNumber: '3321д', role: 'Студент',         isAdmin: false },
    { username: 'garkushin',      password: 'garkushin2025',        fullName: 'Гаркушин Степан Алексеевич',      groupNumber: '3321д', role: 'Студент',         isAdmin: false },
    { username: 'zhabina',        password: 'zhabina2025',          fullName: 'Жабина Ангелина Ивановна',        groupNumber: '3321д', role: 'Студент',         isAdmin: false },
    { username: 'zagainova',      password: 'zagainova2025',        fullName: 'Загайнова Софья Алексеевна',      groupNumber: '3321д', role: 'Студент',         isAdmin: false },
    { username: 'kabanov',        password: 'kabanov2025',          fullName: 'Кабанов Михаил Алексеевич',       groupNumber: '3321д', role: 'Студент',         isAdmin: false },
    { username: 'klimova',        password: 'klimova2025',          fullName: 'Климова Анастасия Евгеньевна',    groupNumber: '3321д', role: 'Студент',         isAdmin: false },
    { username: 'kudryavtseva',   password: 'kudryavtseva2025',     fullName: 'Кудрявцева Елизавета Александровна', groupNumber: '3321д', role: 'Студент',     isAdmin: false },
    { username: 'martyshkina',    password: 'martyshkina2025',      fullName: 'Мартышкина Маргарита Николаевна', groupNumber: '3321д', role: 'Студент',         isAdmin: false },
    { username: 'masaeva',        password: 'masaeva2025',          fullName: 'Масаева Ксения Александровна',    groupNumber: '3321д', role: 'Студент',         isAdmin: false },
    { username: 'pronevskaya',    password: 'pronevskaya2025',      fullName: 'Проневская Ольга Александровна',  groupNumber: '3321д', role: 'Студент',         isAdmin: false },
    { username: 'syreeva',        password: 'syreeva2025',          fullName: 'Сыреева Мария Валентиновна',      groupNumber: '3321д', role: 'Студент',         isAdmin: false },
    { username: 'fesik',          password: 'fesik2025',            fullName: 'Фесик Наталья Александровна',     groupNumber: '3321д', role: 'Студент',         isAdmin: false },
    // 3322д
    { username: 'astanovka',      password: 'astanovka2025',        fullName: 'Астановка Ярослав Олегович',      groupNumber: '3322д', role: 'Студент',         isAdmin: false },
    { username: 'kotovschikov',   password: 'kotovschikov2025',     fullName: 'Котовщиков Павел Александрович',  groupNumber: '3322д', role: 'Студент',         isAdmin: false },
    { username: 'luschay',        password: 'luschay2025',          fullName: 'Лущай Данил Витальевич',          groupNumber: '3322д', role: 'Студент',         isAdmin: false },
    { username: 'moldavsky',      password: 'moldavsky2025',        fullName: 'Молдавский Владислав Сергеевич',  groupNumber: '3322д', role: 'Студент',         isAdmin: false },
    { username: 'sarapulov',      password: 'sarapulov2025',        fullName: 'Сарапулов Даниил Алексеевич',     groupNumber: '3322д', role: 'Студент',         isAdmin: false },
    { username: 'senachin',       password: 'senachin2025',         fullName: 'Сеначин Владимир Андреевич',      groupNumber: '3322д', role: 'Студент',         isAdmin: false },
    { username: 'sukhorukova',    password: 'sukhorukova2025',      fullName: 'Сухорукова Яна Евгеньевна',       groupNumber: '3322д', role: 'Студент',         isAdmin: false },
    { username: 'cherepanov',     password: 'cherepanov2025',       fullName: 'Черепанов Олег Александрович',    groupNumber: '3322д', role: 'Студент',         isAdmin: false },
    // 3522д
    { username: 'batov',          password: 'batov2025',            fullName: 'Батов Григорий Иванович',         groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'vikulina',       password: 'vikulina2025',         fullName: 'Викулина Мария Сергеевна',        groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'golovina',       password: 'golovina2025',         fullName: 'Головина София Александровна',    groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'degtyarev',      password: 'degtyarev2025',        fullName: 'Дегтярёв Дмитрий Евгеньевич',    groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'kobzeva',        password: 'kobzeva2025',          fullName: 'Кобзева Виктория Алексеевна',     groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'kovalenko',      password: 'kovalenko2025',        fullName: 'Коваленко Полина Александровна',  groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'kozhevnikova',   password: 'kozhevnikova2025',     fullName: 'Кожевникова Кристина Владимировна', groupNumber: '3522д', role: 'Студент',      isAdmin: false },
    { username: 'korotkova',      password: 'korotkova2025',        fullName: 'Короткова Ирина Станиславовна',   groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'krasilnikova',   password: 'krasilnikova2025',     fullName: 'Красильникова Гера Юрьевна',      groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'lashina',        password: 'lashina2025',          fullName: 'Лашина Вероника Михайловна',      groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'nikulin',        password: 'nikulin2025',          fullName: 'Никулин Андрей Алексеевич',       groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'prytkova',       password: 'prytkova2025',         fullName: 'Прыткова Анна Валерьевна',        groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'sapozhnikova',   password: 'sapozhnikova2025',     fullName: 'Сапожникова Анастасия Александровна', groupNumber: '3522д', role: 'Студент',    isAdmin: false },
    { username: 'sitnikova',      password: 'sitnikova2025',        fullName: 'Ситникова Полина Сергеевна',      groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'strokova',       password: 'strokova2025',         fullName: 'Строкова Анна Евгеньевна',        groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'tembel',         password: 'tembel2025',           fullName: 'Тембель Екатерина Николаевна',    groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'ustyugova',      password: 'ustyugova2025',        fullName: 'Устюгова Светлана Викторовна',    groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'fadeeva',        password: 'fadeeva2025',          fullName: 'Фадеева Юлия Алексеевна',         groupNumber: '3522д', role: 'Активист профбюро', isAdmin: false },
    { username: 'feyler',         password: 'feyler2025',           fullName: 'Фейлер Екатерина Сергеевна',      groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'hobor',          password: 'hobor2025',            fullName: 'Хобор Олеся Юрьевна',             groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'shmarova',       password: 'shmarova2025',         fullName: 'Шмарова Светлана Евгеньевна',     groupNumber: '3522д', role: 'Студент',         isAdmin: false },
    { username: 'shuyskaya',      password: 'shuyskaya2025',        fullName: 'Шуйская Алиса Антоновна',         groupNumber: '3522д', role: 'Студент',         isAdmin: false },
];

// Группы из всех пользователей
const GROUPS = [...new Set(USERS.map(u => u.groupNumber).filter(Boolean))];

// Дефолтные мероприятия
const DEFAULT_EVENTS = [
    {
        title: 'Региональный этап «Студлидер»',
        date: '2025-04-26',
        time: '10:00',
        type: 'star',
        description: 'Региональный этап Всероссийского конкурса «Студенческий лидер». Конкурс проводится среди активистов студенческих профсоюзных организаций. В программе: защита проектов, командные игры, мастер-классы.',
        maxParticipants: 5,
        requiresForm: true,
        formFields: JSON.stringify([
            { id: 'f1_1', title: 'Ссылка на пост ВКонтакте', type: 'url', required: true, comment: 'Вставьте ссылку на ваш пост' },
            { id: 'f1_2', title: 'Почему должны выбрать именно вас?', type: 'textarea', required: true, comment: 'Расскажите о своих достижениях (200–500 слов)' },
        ]),
        allowOrganizerRole: false,
    },
    {
        title: 'Всероссийская школа «Лидер будущего»',
        date: '2025-09-30',
        time: '09:00',
        type: 'airplane',
        description: 'Недельная выездная школа для председателей и активистов профбюро вузов. Участие полностью оплачивается Общероссийским профсоюзом образования.',
        maxParticipants: 3,
        requiresForm: true,
        formFields: JSON.stringify([
            { id: 'f2_1', title: 'Презентация (файл)', type: 'file', required: true, comment: 'Загрузите файл .pptx или .pdf' },
            { id: 'f2_2', title: 'Ссылка на резюме или портфолио', type: 'url', required: false, comment: 'Необязательно' },
        ]),
        allowOrganizerRole: false,
    },
    {
        title: 'Донорская акция на базе АлтГПУ',
        date: '2025-05-15',
        time: '08:00',
        type: 'droplet',
        description: 'Ежегодная донорская акция в партнёрстве с Алтайской краевой станцией переливания крови. Предварительная запись обязательна.',
        maxParticipants: 0,
        requiresForm: false,
        formFields: '[]',
        allowOrganizerRole: false,
    },
    {
        title: 'Конкурс «Лучший студент АлтГПУ»',
        date: '2025-11-20',
        time: '14:00',
        type: 'star',
        description: 'Внутривузовский конкурс по номинациям: академические успехи, общественная деятельность, творчество, спорт.',
        maxParticipants: 10,
        requiresForm: true,
        formFields: JSON.stringify([
            { id: 'f4_1', title: 'Эссе о своих достижениях', type: 'textarea', required: true, comment: 'Расскажите о достижениях (300–600 слов)' },
            { id: 'f4_2', title: 'Средний балл за последнюю сессию', type: 'text', required: true, comment: 'Например: 4.8' },
        ]),
        allowOrganizerRole: false,
    },
];

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🚀 Начало миграции...');

        // 1. Создаём институт если нет
        await client.query(
            `INSERT INTO "Институт" ("Название") VALUES ('ИИТиФМО') ON CONFLICT DO NOTHING`
        );
        const instRes = await client.query(`SELECT id FROM "Институт" WHERE "Название"='ИИТиФМО'`);
        const instId  = instRes.rows[0].id;

        // 2. Форма обучения
        await client.query(
            `INSERT INTO "Форма_обучения" ("Название") VALUES ('Очная') ON CONFLICT DO NOTHING`
        );
        const formRes = await client.query(`SELECT id FROM "Форма_обучения" WHERE "Название"='Очная'`);
        const formId  = formRes.rows[0].id;

        // 3. Год поступления (несколько)
        for (const year of [2021, 2022, 2023, 2024]) {
            await client.query(
                `INSERT INTO "Год_поступления" ("Год") VALUES ($1) ON CONFLICT DO NOTHING`, [year]
            );
        }
        const yearRes = await client.query(`SELECT id FROM "Год_поступления" WHERE "Год"=2022`);
        const yearId  = yearRes.rows[0].id;

        // 4. Направление обучения
        await client.query(
            `INSERT INTO "Направление_обучения" ("Название") VALUES ('Прикладная информатика') ON CONFLICT DO NOTHING`
        );
        const dirRes = await client.query(`SELECT id FROM "Направление_обучения" WHERE "Название"='Прикладная информатика'`);
        const dirId  = dirRes.rows[0].id;

        // 5. Создаём все группы
        const groupMap = {};
        for (const grp of GROUPS) {
            const existing = await client.query(`SELECT id FROM "Группа" WHERE "Номер"=$1`, [grp]);
            if (existing.rows.length > 0) {
                groupMap[grp] = existing.rows[0].id;
            } else {
                const r = await client.query(
                    `INSERT INTO "Группа" ("Номер","id_Год_Поступления","id_Институт","id_Направление_обучения","id_Форма_обучения")
                     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
                    [grp, yearId, instId, dirId, formId]
                );
                groupMap[grp] = r.rows[0].id;
            }
        }
        console.log(`✅ Создано групп: ${Object.keys(groupMap).length}`);

        // 6. Должности
        for (const pos of ['Председатель', 'Заместитель', 'Профорг', 'Студент']) {
            await client.query(
                `INSERT INTO "Должность" ("Название") VALUES ($1) ON CONFLICT DO NOTHING`, [pos]
            );
        }

        // 7. Создаём пользователей
        let created = 0;
        for (const u of USERS) {
            // Проверяем, существует ли уже логин
            const exists = await client.query(
                `SELECT id FROM "Данные_входа" WHERE "Логин"=$1`, [u.username]
            );
            if (exists.rows.length > 0) continue;

            const authRes = await client.query(
                `INSERT INTO "Данные_входа" ("Логин","Пароль") VALUES ($1,$2) RETURNING id`,
                [u.username, u.password]
            );
            const authId = authRes.rows[0].id;

            const groupId = u.groupNumber ? groupMap[u.groupNumber] || null : null;

            await client.query(
                `INSERT INTO "Студент" ("ФИО","id_Данные_входа","id_Группа","Роль","is_admin")
                 VALUES ($1,$2,$3,$4,$5)`,
                [u.fullName, authId, groupId, u.role, u.isAdmin]
            );
            created++;
        }
        console.log(`✅ Создано пользователей: ${created}`);

        // 8. Создаём мероприятия (только если их нет)
        const evCount = await client.query(`SELECT COUNT(*) FROM "Мероприятие"`);
        if (parseInt(evCount.rows[0].count) === 0) {
            for (const ev of DEFAULT_EVENTS) {
                await client.query(
                    `INSERT INTO "Мероприятие"
                     ("Название","Описание","Дата","Время","Тип","Место",
                      "Макс_участников","Статус","Разрешить_организатора",
                      "Требует_форму","Поля_формы")
                     VALUES ($1,$2,$3,$4,$5,$6,$7,'открыто',$8,$9,$10)`,
                    [ev.title, ev.description, ev.date, ev.time, ev.type, '',
                     ev.maxParticipants, ev.allowOrganizerRole,
                     ev.requiresForm, ev.formFields]
                );
            }
            console.log(`✅ Создано мероприятий: ${DEFAULT_EVENTS.length}`);
        } else {
            console.log('ℹ️  Мероприятия уже существуют, пропускаем');
        }

        await client.query('COMMIT');
        console.log('✅ Миграция завершена успешно!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Ошибка миграции:', err);
        throw err;
    } finally {
        client.release();
        pool.end();
    }
}

migrate().catch(() => process.exit(1));
