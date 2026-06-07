CREATE TABLE Данные_входа (
    id SERIAL PRIMARY KEY,
    Логин VARCHAR(50) NOT NULL UNIQUE,
    Пароль VARCHAR(255) NOT NULL
);

CREATE TABLE Институт (
    id SERIAL PRIMARY KEY,
    Название VARCHAR(255) NOT NULL
);

CREATE TABLE Направление_обучения (
    id SERIAL PRIMARY KEY,
    Название VARCHAR(255) NOT NULL
);

CREATE TABLE Форма_обучения (
    id SERIAL PRIMARY KEY,
    Название VARCHAR(50) NOT NULL
);

CREATE TABLE Год_поступления (
    id SERIAL PRIMARY KEY,
    Год INT NOT NULL
);

CREATE TABLE Группа (
    id SERIAL PRIMARY KEY,
    Номер VARCHAR(20) NOT NULL,
    id_Год_Поступления INT,
    id_Институт INT,
    id_Направление_обучения INT,
    id_Форма_обучения INT,
    FOREIGN KEY(id_Год_Поступления) REFERENCES Год_поступления(id),
    FOREIGN KEY(id_Институт) REFERENCES Институт(id),
    FOREIGN KEY(id_Направление_обучения) REFERENCES Направление_обучения(id),
    FOREIGN KEY(id_Форма_обучения) REFERENCES Форма_обучения(id)
);

CREATE TABLE Регион (
    id SERIAL PRIMARY KEY,
    Название VARCHAR(255) NOT NULL
);

CREATE TABLE Населенный_пункт (
    id SERIAL PRIMARY KEY,
    Название VARCHAR(255) NOT NULL,
    id_Регион INT NOT NULL,
    FOREIGN KEY(id_Регион) REFERENCES Регион(id)
);

CREATE TABLE Улица (
    id SERIAL PRIMARY KEY,
    Название VARCHAR(255) NOT NULL,
    id_Населенный_пункт INT NOT NULL,
    FOREIGN KEY(id_Населенный_пункт) REFERENCES Населенный_пункт(id)
);

CREATE TABLE Должность (
    id SERIAL PRIMARY KEY,
    Название VARCHAR(100) NOT NULL
);

CREATE TABLE Заявление_в_бухгалтерию (
    id SERIAL PRIMARY KEY,
    Номер_протокола INT,
    Протокол_от DATE,
    Дата_написания DATE,
    Файл TEXT
);

CREATE TABLE Заявление_на_вступление (
    id SERIAL PRIMARY KEY,
    Дата DATE DEFAULT CURRENT_DATE,
    Файл TEXT
);

CREATE TABLE Мероприятие (
    id SERIAL PRIMARY KEY,
    Название VARCHAR(255) NOT NULL,
    Описание TEXT,
    Дата DATE,
    Время TIME,
    Тип VARCHAR(100),
    Место VARCHAR(255),
    Макс_участников INT DEFAULT 0,
    Статус VARCHAR(20) DEFAULT 'open',
    Разрешить_организатора BOOLEAN DEFAULT FALSE,
    Изображение TEXT,
    Требует_форму BOOLEAN DEFAULT FALSE,
    Поля_формы TEXT,
    Дата_создания TIMESTAMP DEFAULT NOW()
);

CREATE TABLE Студент (
    id SERIAL PRIMARY KEY,
    ФИО VARCHAR(255),
    Пол VARCHAR(10),
    Телефон VARCHAR(30),
    Дата_рождения DATE,
    Email VARCHAR(100),
    Спецификация_адреса VARCHAR(255),
    Аватар TEXT,
    Роль VARCHAR(50) DEFAULT 'Студент',
    is_admin BOOLEAN DEFAULT FALSE,
    id_Данные_входа INT NOT NULL,
    id_Группа INT,
    id_Улица INT,
    id_Заявление_в_бухгалтерию INT,
    id_Заявление_на_вступление INT,
    FOREIGN KEY(id_Данные_входа) REFERENCES Данные_входа(id),
    FOREIGN KEY(id_Группа) REFERENCES Группа(id),
    FOREIGN KEY(id_Улица) REFERENCES Улица(id),
    FOREIGN KEY(id_Заявление_в_бухгалтерию) REFERENCES Заявление_в_бухгалтерию(id),
    FOREIGN KEY(id_Заявление_на_вступление) REFERENCES Заявление_на_вступление(id)
);

CREATE TABLE Список_должностей (
    id SERIAL PRIMARY KEY,
    Количество INT,
    id_Должность INT NOT NULL,
    id_Студент INT NOT NULL,
    FOREIGN KEY(id_Должность) REFERENCES Должность(id),
    FOREIGN KEY(id_Студент) REFERENCES Студент(id)
);

CREATE TABLE Сертификат (
    id SERIAL PRIMARY KEY,
    Номер SERIAL,
    Роль VARCHAR(20) NOT NULL,
    Шаблон TEXT,
    id_Мероприятие INT NOT NULL,
    FOREIGN KEY(id_Мероприятие) REFERENCES Мероприятие(id) ON DELETE CASCADE,
    UNIQUE(id_Мероприятие, Роль)
);

CREATE TABLE Согласие_на_мероприятие (
    id SERIAL PRIMARY KEY,
    Номер INT,
    Дата DATE DEFAULT CURRENT_DATE,
    Роль_участника VARCHAR(20) DEFAULT 'участник',
    Статус VARCHAR(20) DEFAULT 'ожидание',
    Напоминание BOOLEAN DEFAULT FALSE,
    id_Мероприятие INT NOT NULL,
    id_Студент INT NOT NULL,
    FOREIGN KEY(id_Мероприятие) REFERENCES Мероприятие(id) ON DELETE CASCADE,
    FOREIGN KEY(id_Студент) REFERENCES Студент(id),
    UNIQUE(id_Мероприятие, id_Студент)
);

ALTER TABLE Студент
    ADD COLUMN id_Согласие_на_мероприятие INT,
    ADD CONSTRAINT fk_student_soglasie
        FOREIGN KEY(id_Согласие_на_мероприятие)
        REFERENCES Согласие_на_мероприятие(id);

CREATE TABLE Корпус (
    id SERIAL PRIMARY KEY,
    Название VARCHAR(255) NOT NULL,
    Адрес VARCHAR(255)
);

CREATE TABLE Аудитория (
    id SERIAL PRIMARY KEY,
    Название VARCHAR(100) NOT NULL,
    id_Корпус INT NOT NULL,
    FOREIGN KEY(id_Корпус) REFERENCES Корпус(id)
);

CREATE TABLE Протокол_собрания (
    id SERIAL PRIMARY KEY,
    Наименование_организации VARCHAR(255),
    Номер_протокола INT,
    Дата DATE,
    Повестка_собрания TEXT,
    Число_присутствующих INT,
    Результаты_голосования TEXT,
    Файл_название VARCHAR(255),
    Файл TEXT,
    Дата_загрузки TIMESTAMP DEFAULT NOW(),
    id_Аудитория INT,
    FOREIGN KEY(id_Аудитория) REFERENCES Аудитория(id)
);

CREATE TABLE Вопросы (
    id SERIAL PRIMARY KEY,
    Формулировка TEXT NOT NULL,
    Решение TEXT,
    Проголосовало_ЗА INT DEFAULT 0,
    Проголосовало_ПРОТИВ INT DEFAULT 0,
    Воздержались INT DEFAULT 0,
    Утверждение_на_должность BOOLEAN DEFAULT FALSE,
    id_Протокол_собрания INT NOT NULL,
    id_Студент INT,
    id_Должность INT,
    FOREIGN KEY(id_Протокол_собрания) REFERENCES Протокол_собрания(id) ON DELETE CASCADE,
    FOREIGN KEY(id_Студент) REFERENCES Студент(id),
    FOREIGN KEY(id_Должность) REFERENCES Должность(id)
);

CREATE TABLE Уведомления (
    id SERIAL PRIMARY KEY,
    Тип VARCHAR(50) NOT NULL,
    Сообщение TEXT,
    Мероприятие VARCHAR(255),
    Прочитано BOOLEAN DEFAULT FALSE,
    Дата TIMESTAMP DEFAULT NOW(),
    id_Студент INT NOT NULL,
    FOREIGN KEY(id_Студент) REFERENCES Студент(id) ON DELETE CASCADE
);

CREATE TABLE Документы_для_скачивания (
    id VARCHAR(50) PRIMARY KEY,
    Название VARCHAR(255) NOT NULL,
    Файл TEXT,
    Дата_добавления TIMESTAMP DEFAULT NOW()
);

CREATE TABLE Ожидающие_изменения_профиля (
    id VARCHAR(50) PRIMARY KEY,
    Старое_ФИО VARCHAR(255),
    Новое_ФИО VARCHAR(255),
    Старая_группа VARCHAR(50),
    Новая_группа VARCHAR(50),
    Старый_телефон VARCHAR(30),
    Новый_телефон VARCHAR(30),
    Старый_email VARCHAR(100),
    Новый_email VARCHAR(100),
    Старый_аватар TEXT,
    Новый_аватар TEXT,
    Статус VARCHAR(20) DEFAULT 'ожидание',
    Дата_создания TIMESTAMP DEFAULT NOW(),
    id_Студент INT NOT NULL,
    FOREIGN KEY(id_Студент) REFERENCES Студент(id)
);

CREATE TABLE Участники_группы (
    id SERIAL PRIMARY KEY,
    Имя VARCHAR(255) NOT NULL,
    id_Группа INT NOT NULL,
    id_Студент INT,
    FOREIGN KEY(id_Группа) REFERENCES Группа(id),
    FOREIGN KEY(id_Студент) REFERENCES Студент(id)
);

INSERT INTO Институт (Название) VALUES ('ИИТиФМО');

INSERT INTO Форма_обучения (Название) VALUES ('Очная');
INSERT INTO Форма_обучения (Название) VALUES ('Заочная');

INSERT INTO Год_поступления (Год) VALUES (2022);

INSERT INTO Направление_обучения (Название) VALUES ('Прикладная информатика');

INSERT INTO Группа (Номер, id_Год_Поступления, id_Институт, id_Направление_обучения, id_Форма_обучения)
VALUES ('3215д', 1, 1, 1, 1);

INSERT INTO Должность (Название) VALUES ('Председатель');
INSERT INTO Должность (Название) VALUES ('Заместитель');
INSERT INTO Должность (Название) VALUES ('Профорг');
INSERT INTO Должность (Название) VALUES ('Студент');

INSERT INTO Данные_входа (Логин, Пароль) VALUES ('admin', 'admin2025ppos');
INSERT INTO Студент (ФИО, id_Данные_входа, Роль, is_admin) VALUES ('Администратор', 1, 'Администратор', TRUE);

INSERT INTO Данные_входа (Логин, Пароль) VALUES ('ivanov', 'ivanov2025');
INSERT INTO Студент (ФИО, id_Данные_входа, id_Группа, Роль, is_admin) VALUES ('Иванов Иван Иванович', 2, 1, 'Студент', FALSE);
