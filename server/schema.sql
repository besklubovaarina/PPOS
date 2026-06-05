-- =====================================================
-- СХЕМА БАЗЫ ДАННЫХ — ППОС АлтГПУ
-- Запустить один раз в pgAdmin (Query Tool на базе PPOS)
-- =====================================================

-- Пользователи (студенты + администратор)
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50)  UNIQUE NOT NULL,
    password        VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    group_number    VARCHAR(50),
    phone           VARCHAR(30),
    email           VARCHAR(100),
    role            VARCHAR(50)  DEFAULT 'Студент',
    is_admin        BOOLEAN      DEFAULT FALSE,
    avatar_data     TEXT,
    institute       VARCHAR(255),
    created_at      TIMESTAMP    DEFAULT NOW()
);

-- Мероприятия
CREATE TABLE IF NOT EXISTS events (
    id                    SERIAL PRIMARY KEY,
    title                 VARCHAR(255) NOT NULL,
    description           TEXT,
    date                  VARCHAR(20),
    time                  VARCHAR(10),
    type                  VARCHAR(100),
    location              VARCHAR(255),
    max_participants      INTEGER  DEFAULT 0,
    status                VARCHAR(20) DEFAULT 'open',
    has_certificate       BOOLEAN DEFAULT FALSE,
    allow_organizer_role  BOOLEAN DEFAULT FALSE,
    image_url             TEXT,
    cert_participant_data TEXT,
    cert_organizer_data   TEXT,
    created_at            TIMESTAMP DEFAULT NOW()
);

-- Заявки на мероприятия
CREATE TABLE IF NOT EXISTS applications (
    id         SERIAL PRIMARY KEY,
    event_id   INTEGER REFERENCES events(id) ON DELETE CASCADE,
    username   VARCHAR(50) NOT NULL,
    role       VARCHAR(20) DEFAULT 'participant',
    status     VARCHAR(20) DEFAULT 'pending',
    reminder   BOOLEAN     DEFAULT FALSE,
    created_at TIMESTAMP   DEFAULT NOW(),
    UNIQUE(event_id, username)
);

-- Уведомления
CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(50) NOT NULL,
    type        VARCHAR(50),
    message     TEXT,
    event_title VARCHAR(255),
    read        BOOLEAN   DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Документы для скачивания (добавляет администратор)
CREATE TABLE IF NOT EXISTS downloadable_docs (
    id         VARCHAR(50) PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    file_data  TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Загруженные документы студентов (заявления)
CREATE TABLE IF NOT EXISTS user_documents (
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(50) NOT NULL,
    doc_type   VARCHAR(50),
    name       VARCHAR(255),
    file_data  TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(username, doc_type)
);

-- Ожидающие изменения профилей (студент → ждёт одобрения админа)
CREATE TABLE IF NOT EXISTS pending_changes (
    id            VARCHAR(50) PRIMARY KEY,
    username      VARCHAR(50) NOT NULL,
    type          VARCHAR(50),
    old_full_name VARCHAR(255),
    new_full_name VARCHAR(255),
    old_group     VARCHAR(50),
    new_group     VARCHAR(50),
    old_phone     VARCHAR(30),
    new_phone     VARCHAR(30),
    old_email     VARCHAR(100),
    new_email     VARCHAR(100),
    old_avatar    TEXT,
    new_avatar    TEXT,
    status        VARCHAR(20) DEFAULT 'pending',
    created_at    TIMESTAMP   DEFAULT NOW()
);

-- Участники групп
CREATE TABLE IF NOT EXISTS group_members (
    id               SERIAL PRIMARY KEY,
    group_name       VARCHAR(50)  NOT NULL,
    member_name      VARCHAR(255) NOT NULL,
    member_username  VARCHAR(50)  DEFAULT ''
);

-- =====================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ: администратор и тестовый студент
-- =====================================================

INSERT INTO users (username, password, full_name, role, is_admin)
VALUES ('admin', 'admin2025ppos', 'Администратор', 'Администратор', TRUE)
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, full_name, group_number, role, is_admin)
VALUES ('ivanov', 'ivanov2025', 'Иванов Иван Иванович', '3215д', 'Студент', FALSE)
ON CONFLICT (username) DO NOTHING;
