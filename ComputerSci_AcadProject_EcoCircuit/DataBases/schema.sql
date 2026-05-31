CREATE DATABASE IF NOT EXISTS ecocircuit_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ecocircuit_db;

-- ── USERS TABLE ─────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INT            AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255)   NOT NULL UNIQUE,
    name          VARCHAR(100)   NOT NULL,
    password_hash VARCHAR(255)   NOT NULL,
    user_type     ENUM('institutional','general') NOT NULL,
    role          ENUM('student','staff','professor','admin') NULL DEFAULT NULL,

    -- Easter egg flag: 1 = this account triggers the easter egg on login
    is_easter_egg TINYINT(1)     NOT NULL DEFAULT 0,

    created_at    DATETIME       NOT NULL DEFAULT NOW(),
    last_login    DATETIME       NULL DEFAULT NULL,

    INDEX idx_users_email     (email),
    INDEX idx_users_user_type (user_type),
    INDEX idx_users_role      (role)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Stores all registered EcoCircuit user accounts';


-- ── DEVICES TABLE ────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
    id               INT            AUTO_INCREMENT PRIMARY KEY,
    user_id          INT            NOT NULL,
    device_type      ENUM('laptop','smartphone','desktop','tablet','peripheral','other') NOT NULL,
    brand            VARCHAR(100)   NOT NULL,
    model            VARCHAR(100)   NOT NULL,
    serial_number    VARCHAR(100)   NULL DEFAULT NULL,
    new_price        DECIMAL(10,2)  NULL DEFAULT NULL,
    repair_cost      DECIMAL(10,2)  NULL DEFAULT NULL,
    repair_ratio     DECIMAL(6,4)   NULL DEFAULT NULL,
    repair_threshold DECIMAL(4,2)   NULL DEFAULT NULL,
    conditions       JSON           NULL DEFAULT NULL,
    status           ENUM('pending_assessment','for_repair','for_recycling','repaired','recycled','donated')
                                    NOT NULL DEFAULT 'pending_assessment',
    recommendation   ENUM('repair','recycle','assess') NULL DEFAULT NULL,
    is_archived      TINYINT(1)     NOT NULL DEFAULT 0,
    created_at       DATETIME       NOT NULL DEFAULT NOW(),
    updated_at       DATETIME       NULL ON UPDATE NOW(),

    CONSTRAINT fk_devices_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    INDEX idx_devices_user_id    (user_id),
    INDEX idx_devices_status     (status),
    INDEX idx_devices_type       (device_type),
    INDEX idx_devices_is_archived(is_archived)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- ── ACTIVITY LOGS TABLE ──────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
    id              INT         AUTO_INCREMENT PRIMARY KEY,
    user_id         INT         NOT NULL,
    module_accessed ENUM('TIPID','TECH-CARE','TRANSFER') NOT NULL,
    strategy_used   VARCHAR(60) NULL DEFAULT NULL,
    created_at      DATETIME    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    INDEX idx_logs_user_id        (user_id),
    INDEX idx_logs_module_accessed(module_accessed),
    INDEX idx_logs_created_at     (created_at)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- ── DIAGNOSTIC RESULTS TABLE ─────────────────
CREATE TABLE IF NOT EXISTS diagnostic_results (
    id             INT          AUTO_INCREMENT PRIMARY KEY,
    user_id        INT          NOT NULL,
    device_id      INT          NOT NULL,
    path_taken     JSON         NOT NULL,
    recommendation VARCHAR(255) NOT NULL,
    is_active      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at     DATETIME     NOT NULL DEFAULT NOW(),
    updated_at     DATETIME     NULL ON UPDATE NOW(),

    CONSTRAINT fk_diag_user
        FOREIGN KEY (user_id)   REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_diag_device
        FOREIGN KEY (device_id) REFERENCES devices(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    INDEX idx_diag_user_id   (user_id),
    INDEX idx_diag_device_id (device_id),
    INDEX idx_diag_is_active (is_active),
    INDEX idx_diag_created_at(created_at)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

-------------------------------------
-- SEED DATA — PRE-LOADED USER ACCOUNTS
--
-- Passwords are bcrypt-hashed (12 rounds).
-- DO NOT change these hashes — they match
-- the credentials listed in the project docs.
-- email
-- password
--
-- Institutional accounts:
--   mocklastnamexyz@national-u.edu.ph
--   ecocircuit404
--   radiosilencelu@national-u.edu.ph
--   greatestFather666
--
-- Public accounts:
--   mockdataname@gmail.com
--   mockdatapasswordEcoCircuit
--
-- Easter Egg account (is_easter_egg = 1):
--   wifies@sfawtde.com
--   dontturnleftatthecrossroads
--------------------------------------------

INSERT IGNORE INTO users
    (email, name, password_hash, user_type, role, is_easter_egg, created_at)
VALUES

-- Institutional User 1
(
    'mocklastnamexyz@national-u.edu.ph',
    'Mocklastnamexyz',
    '$2b$12$4X5yZKKaHT86JXrz4gXQi.lbu4UmkKc2HPf3RCq8XPv1AlshEhvkm',
    'institutional',
    'student',
    0,
    NOW()
),

-- Institutional User 2
(
    'radiosilencelu@national-u.edu.ph',
    'Radiosilencelu',
    '$2b$12$WeYrTl2TarPFvQfEB68dIuH7Cz.8dXHY6H3FtG0EhaRBE9afWljBK',
    'institutional',
    'student',
    0,
    NOW()
),

-- Public User
(
    'mockdataname@gmail.com',
    'Mockdataname',
    '$2b$12$9qC/jSrjubLPvV/82wX8buWCmGv3m6dfnAjMySXvv4OWHiXOKPozO',
    'general',
    NULL,
    0,
    NOW()
),

-- Easter Egg User
(
    'wifies@sfawtde.com',
    'Wifies',
    '$2b$12$EPNf9rxZP.a2W9OVU1Mu4ObJmgYHKMXXmd3B73z2J2THUSR.4tU9i',
    'general',
    NULL,
    1,
    NOW()
);


-- Verification
SHOW TABLES;
SELECT id, email, user_type, role, is_easter_egg FROM users;