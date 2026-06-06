-- =====================================================================
-- СХЕМА БАЗЫ ДАННЫХ — ППОС АлтГПУ
-- Согласована с ERD-моделью дипломной работы
-- Запустить один раз в pgAdmin → база PPOS → Query Tool → F5
-- =====================================================================


-- ───────────────────────────────────────────────
-- БЛОК 1: СПРАВОЧНИКИ
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Институт" (
    id        SERIAL PRIMARY KEY,
    "Название" VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Направление_обучения" (
    id        SERIAL PRIMARY KEY,
    "Название" VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Форма_обучения" (
    id        SERIAL PRIMARY KEY,
    "Название" VARCHAR(50) NOT NULL  -- очная, заочная, очно-заочная
);

CREATE TABLE IF NOT EXISTS "Год_поступления" (
    id     SERIAL PRIMARY KEY,
    "Год"  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "Группа" (
    id                       SERIAL PRIMARY KEY,
    "Номер"                  VARCHAR(20) NOT NULL,
    "id_Год_Поступления"     INTEGER REFERENCES "Год_поступления"(id),
    "id_Институт"            INTEGER REFERENCES "Институт"(id),
    "id_Направление_обучения" INTEGER REFERENCES "Направление_обучения"(id),
    "id_Форма_обучения"      INTEGER REFERENCES "Форма_обучения"(id)
);

CREATE TABLE IF NOT EXISTS "Должность" (
    id        SERIAL PRIMARY KEY,
    "Название" VARCHAR(100) NOT NULL
);


-- ───────────────────────────────────────────────
-- БЛОК 2: АДРЕС (Регион → Населённый пункт → Улица)
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Регион" (
    id        SERIAL PRIMARY KEY,
    "Название" VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Населенный_пункт" (
    id          SERIAL PRIMARY KEY,
    "Название"  VARCHAR(255) NOT NULL,
    "id_Регион" INTEGER REFERENCES "Регион"(id)
);

CREATE TABLE IF NOT EXISTS "Улица" (
    id                    SERIAL PRIMARY KEY,
    "Название"            VARCHAR(255) NOT NULL,
    "id_Населенный_пункт" INTEGER REFERENCES "Населенный_пункт"(id)
);


-- ───────────────────────────────────────────────
-- БЛОК 3: АУТЕНТИФИКАЦИЯ
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Данные_входа" (
    id       SERIAL PRIMARY KEY,
    "Логин"  VARCHAR(50) UNIQUE NOT NULL,
    "Пароль" VARCHAR(255) NOT NULL
);


-- ───────────────────────────────────────────────
-- БЛОК 4: ДОКУМЕНТЫ СТУДЕНТА
-- (создаются ДО таблицы Студент — он ссылается на них)
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Заявление_в_бухгалтерию" (
    id                SERIAL PRIMARY KEY,
    "Номер_протокола" INTEGER,
    "Протокол_от"     DATE,
    "Дата_написания"  DATE,
    "Файл"            TEXT    -- данные файла (base64), загружается студентом
);

-- Заявление_на_вступление ссылается на Студент,
-- поэтому FK добавляем после создания Студент (см. ниже)
CREATE TABLE IF NOT EXISTS "Заявление_на_вступление" (
    id          SERIAL PRIMARY KEY,
    "Дата"      DATE DEFAULT CURRENT_DATE,
    "Файл"      TEXT,     -- данные файла (base64)
    "id_Студент" INTEGER  -- FK добавим позже через ALTER TABLE
);


-- ───────────────────────────────────────────────
-- БЛОК 5: СТУДЕНТ
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Студент" (
    id                    SERIAL PRIMARY KEY,
    "ФИО"                 VARCHAR(255),
    "Пол"                 VARCHAR(10),
    "Телефон"             VARCHAR(30),
    "Дата_рождения"       DATE,
    "Email"               VARCHAR(100),
    "Спецификация_адреса" VARCHAR(255),  -- номер квартиры/дома

    -- Связи из ERD
    "id_Группа"                INTEGER REFERENCES "Группа"(id),
    "id_Данные_входа"           INTEGER REFERENCES "Данные_входа"(id),
    "id_Улица"                  INTEGER REFERENCES "Улица"(id),
    "id_Заявление_в_бухгалтерию" INTEGER REFERENCES "Заявление_в_бухгалтерию"(id),
    "id_Заявление_на_вступление" INTEGER, -- FK добавим после

    -- Дополнительные поля для веб-приложения
    "Аватар"   TEXT,              -- фото профиля (base64)
    "Роль"     VARCHAR(50) DEFAULT 'Студент',  -- Студент / Председатель / и т.д.
    "is_admin" BOOLEAN   DEFAULT FALSE
);

-- Теперь замыкаем круговые связи
ALTER TABLE "Заявление_на_вступление"
    ADD CONSTRAINT fk_zayavl_student
    FOREIGN KEY ("id_Студент") REFERENCES "Студент"(id);

ALTER TABLE "Студент"
    ADD CONSTRAINT fk_student_zayavl_vstup
    FOREIGN KEY ("id_Заявление_на_вступление") REFERENCES "Заявление_на_вступление"(id);


-- ───────────────────────────────────────────────
-- БЛОК 6: ДОЛЖНОСТИ СТУДЕНТОВ
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Список_должностей" (
    id            SERIAL PRIMARY KEY,
    "Количество"  INTEGER,
    "id_Должность" INTEGER REFERENCES "Должность"(id),
    "id_Студент"   INTEGER REFERENCES "Студент"(id)
);


-- ───────────────────────────────────────────────
-- БЛОК 7: МЕРОПРИЯТИЯ
-- (базовые поля из ERD + расширение для веб-приложения)
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Мероприятие" (
    id          SERIAL PRIMARY KEY,

    -- Поля из ERD-модели
    "Название"   VARCHAR(255) NOT NULL,
    "Описание"   TEXT,
    "Дата"       DATE,
    "Время"      TIME,

    -- Расширение для веб-приложения
    "Тип"                    VARCHAR(100),
    "Место"                  VARCHAR(255),
    "Макс_участников"        INTEGER  DEFAULT 0,
    "Статус"                 VARCHAR(20) DEFAULT 'open',
    -- open      = открыта запись
    -- closed    = запись закрыта
    -- completed = мероприятие завершено
    "Разрешить_организатора" BOOLEAN DEFAULT FALSE,
    "Изображение"            TEXT,
    "Дата_создания"          TIMESTAMP DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- БЛОК 7а: СЕРТИФИКАТЫ
-- Отдельная сущность: один сертификат = один шаблон для одной роли
-- Номер хранится только в БД, на платформе не отображается
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Сертификат" (
    id               SERIAL PRIMARY KEY,
    "Номер"          SERIAL,                  -- учётный номер, только в БД
    "Роль"           VARCHAR(20) NOT NULL,    -- участник / организатор
    "Дата"           DATE DEFAULT CURRENT_DATE, -- дата загрузки шаблона
    "Шаблон"         TEXT,                    -- base64 изображения шаблона
    "id_Мероприятие" INTEGER REFERENCES "Мероприятие"(id) ON DELETE CASCADE,
    UNIQUE("id_Мероприятие", "Роль")          -- одна роль = один шаблон на мероприятие
);


-- ───────────────────────────────────────────────
-- БЛОК 8: СОГЛАСИЕ / ЗАЯВКА НА МЕРОПРИЯТИЕ
-- В ERD: Согласие_на_обработку_перс_данных_на_мероприятие
-- В веб-приложении это одновременно:
--   • юридическое согласие на обработку персональных данных
--   • заявка студента на участие в мероприятии
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Согласие_на_обработку_перс_данных_на_мероприятие" (
    id              SERIAL PRIMARY KEY,

    -- Поля из ERD-модели
    "Номер"          INTEGER,
    "Дата"           DATE DEFAULT CURRENT_DATE,
    "id_Мероприятие" INTEGER REFERENCES "Мероприятие"(id) ON DELETE CASCADE,

    -- Расширение для веб-приложения
    "id_Студент"     INTEGER REFERENCES "Студент"(id),
    "Роль_участника" VARCHAR(20) DEFAULT 'participant',
    -- participant = участник
    -- organizer   = организатор
    "Статус"         VARCHAR(20) DEFAULT 'pending',
    -- pending  = ожидает одобрения
    -- approved = одобрено
    -- rejected = отклонено
    -- reserve  = в резерве
    "Напоминание"    BOOLEAN DEFAULT FALSE,

    UNIQUE("id_Мероприятие", "id_Студент")
);

-- Теперь добавляем nullable FK в Студент (как в ERD)
ALTER TABLE "Студент"
    ADD COLUMN IF NOT EXISTS "id_Согласие_на_обработку_перс_данных_на_мероприятие"
    INTEGER REFERENCES "Согласие_на_обработку_перс_данных_на_мероприятие"(id);


-- ───────────────────────────────────────────────
-- БЛОК 9: ПРОТОКОЛЫ СОБРАНИЙ
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Корпус" (
    id        SERIAL PRIMARY KEY,
    "Название" VARCHAR(255) NOT NULL,
    "Адрес"    VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "Аудитория" (
    id         SERIAL PRIMARY KEY,
    "Название" VARCHAR(100) NOT NULL,
    "id_Корпус" INTEGER REFERENCES "Корпус"(id)
);

CREATE TABLE IF NOT EXISTS "Протокол_собрания" (
    id                         SERIAL PRIMARY KEY,

    -- Поля из ERD-модели
    "Наименование_организации" VARCHAR(255),
    "Номер_протокола"          INTEGER,
    "Дата"                     DATE,
    "Повестка_собрания"        TEXT,
    "Число_присутствующих"     INTEGER,
    "Результаты_голосования"   TEXT,
    "id_Аудитория"             INTEGER REFERENCES "Аудитория"(id),

    -- Расширение для веб-приложения (хранение файла протокола)
    "Файл_название"            VARCHAR(255),
    "Файл"                     TEXT,     -- данные файла (base64)
    "Дата_загрузки"            TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Вопросы" (
    id                           SERIAL PRIMARY KEY,
    "Формулировка"               TEXT,
    "Решение"                    TEXT,
    "Проголосовало_ЗА"           INTEGER DEFAULT 0,
    "Проголосовало_ПРОТИВ"       INTEGER DEFAULT 0,
    "Воздержались"               INTEGER DEFAULT 0,
    "Утверждение_на_должность"   BOOLEAN DEFAULT FALSE,
    "id_Протокол_собрания"       INTEGER REFERENCES "Протокол_собрания"(id) ON DELETE CASCADE,
    "id_Студент"                 INTEGER REFERENCES "Студент"(id),
    "id_Должность"               INTEGER REFERENCES "Должность"(id)
);


-- ───────────────────────────────────────────────
-- БЛОК 10: ДОПОЛНИТЕЛЬНЫЕ ТАБЛИЦЫ ВЕБ-ПРИЛОЖЕНИЯ
-- (не в ERD, но нужны для функционала платформы)
-- ───────────────────────────────────────────────

-- Уведомления студентов (одобрение/отклонение заявок)
CREATE TABLE IF NOT EXISTS "Уведомления" (
    id           SERIAL PRIMARY KEY,
    "id_Студент" INTEGER REFERENCES "Студент"(id) ON DELETE CASCADE,
    "Тип"        VARCHAR(50),   -- approval / rejection / reserve
    "Сообщение"  TEXT,
    "Мероприятие" VARCHAR(255),
    "Прочитано"  BOOLEAN   DEFAULT FALSE,
    "Дата"       TIMESTAMP DEFAULT NOW()
);

-- Документы для скачивания (загружает администратор, видят все студенты)
CREATE TABLE IF NOT EXISTS "Документы_для_скачивания" (
    id               VARCHAR(50) PRIMARY KEY,
    "Название"        VARCHAR(255) NOT NULL,
    "Файл"            TEXT,
    "Дата_добавления" TIMESTAMP DEFAULT NOW()
);

-- Ожидающие изменения профиля (студент подаёт → admin одобряет)
CREATE TABLE IF NOT EXISTS "Ожидающие_изменения_профиля" (
    id              VARCHAR(50) PRIMARY KEY,
    "id_Студент"    INTEGER REFERENCES "Студент"(id),
    "Тип"           VARCHAR(50),
    "Старое_ФИО"    VARCHAR(255),
    "Новое_ФИО"     VARCHAR(255),
    "Старая_группа" VARCHAR(50),
    "Новая_группа"  VARCHAR(50),
    "Старый_телефон" VARCHAR(30),
    "Новый_телефон"  VARCHAR(30),
    "Старый_email"   VARCHAR(100),
    "Новый_email"    VARCHAR(100),
    "Старый_аватар"  TEXT,
    "Новый_аватар"   TEXT,
    "Статус"         VARCHAR(20) DEFAULT 'pending',
    "Дата_создания"  TIMESTAMP   DEFAULT NOW()
);

-- Участники группы (отображение в профиле)
CREATE TABLE IF NOT EXISTS "Участники_группы" (
    id           SERIAL PRIMARY KEY,
    "id_Группа"  INTEGER REFERENCES "Группа"(id),
    "Имя"        VARCHAR(255) NOT NULL,
    "id_Студент" INTEGER REFERENCES "Студент"(id)
);


-- ───────────────────────────────────────────────
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- ───────────────────────────────────────────────

-- Институт
INSERT INTO "Институт" ("Название")
VALUES ('Институт информационных технологий')
ON CONFLICT DO NOTHING;

-- Форма обучения
INSERT INTO "Форма_обучения" ("Название") VALUES ('Очная')   ON CONFLICT DO NOTHING;
INSERT INTO "Форма_обучения" ("Название") VALUES ('Заочная') ON CONFLICT DO NOTHING;

-- Год поступления
INSERT INTO "Год_поступления" ("Год") VALUES (2022) ON CONFLICT DO NOTHING;

-- Направление
INSERT INTO "Направление_обучения" ("Название")
VALUES ('Прикладная информатика')
ON CONFLICT DO NOTHING;

-- Группа
INSERT INTO "Группа" ("Номер", "id_Год_Поступления", "id_Институт", "id_Направление_обучения", "id_Форма_обучения")
VALUES ('3215д', 1, 1, 1, 1)
ON CONFLICT DO NOTHING;

-- Должности
INSERT INTO "Должность" ("Название") VALUES ('Председатель')    ON CONFLICT DO NOTHING;
INSERT INTO "Должность" ("Название") VALUES ('Заместитель')     ON CONFLICT DO NOTHING;
INSERT INTO "Должность" ("Название") VALUES ('Профорг')         ON CONFLICT DO NOTHING;
INSERT INTO "Должность" ("Название") VALUES ('Рядовой участник') ON CONFLICT DO NOTHING;

-- Аккаунт администратора
INSERT INTO "Данные_входа" ("Логин", "Пароль")
VALUES ('admin', 'admin2025ppos')
ON CONFLICT ("Логин") DO NOTHING;

INSERT INTO "Студент" ("ФИО", "id_Данные_входа", "Роль", "is_admin")
VALUES ('Администратор', 1, 'Администратор', TRUE)
ON CONFLICT DO NOTHING;

-- Тестовый студент
INSERT INTO "Данные_входа" ("Логин", "Пароль")
VALUES ('ivanov', 'ivanov2025')
ON CONFLICT ("Логин") DO NOTHING;

INSERT INTO "Студент" ("ФИО", "id_Данные_входа", "id_Группа", "Роль", "is_admin")
VALUES ('Иванов Иван Иванович', 2, 1, 'Студент', FALSE)
ON CONFLICT DO NOTHING;
