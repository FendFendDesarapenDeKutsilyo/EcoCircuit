CREATE DATABASE IF NOT EXISTS ecocircuit_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ecocircuit_db;

CREATE TABLE IF NOT EXISTS users (
    id            INT            AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255)   NOT NULL UNIQUE,
    name          VARCHAR(100)   NOT NULL,
    password_hash VARCHAR(255)   NOT NULL,
    user_type     ENUM(
                    'institutional',
                    'general'
                  )              NOT NULL,
    role          ENUM(
                    'student',
                    'staff',
                    'professor',
                    'admin'
                  )              NULL DEFAULT NULL,

    -- Timestamps
    created_at    DATETIME       NOT NULL DEFAULT NOW(),
    last_login    DATETIME       NULL DEFAULT NULL,

    -- Indexes for fast lookups
    INDEX idx_users_email     (email),
    INDEX idx_users_user_type (user_type),
    INDEX idx_users_role      (role)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Stores all registered EcoCircuit user accounts';

CREATE TABLE IF NOT EXISTS devices (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NOT NULL,

    -- Device identification
    device_type     ENUM(
                      'laptop',
                      'smartphone',
                      'desktop',
                      'tablet',
                      'peripheral',
                      'other'
                    )               NOT NULL,
    brand           VARCHAR(100)    NOT NULL,
    model           VARCHAR(100)    NOT NULL,
    serial_number   VARCHAR(100)    NULL DEFAULT NULL,

    -- Financial data for repair analysis
    new_price       DECIMAL(10, 2)  NULL DEFAULT NULL
                    COMMENT 'Current market price of a new equivalent device (PHP)',
    repair_cost     DECIMAL(10, 2)  NULL DEFAULT NULL
                    COMMENT 'Estimated cost to repair the device (PHP)',
    repair_ratio    DECIMAL(6,  4)  NULL DEFAULT NULL
                    COMMENT 'repair_cost / new_price — computed by ElectronicDevice.getRepairRatio()',
    repair_threshold DECIMAL(4, 2)  NULL DEFAULT NULL
                    COMMENT 'Device-type-aware threshold from REPAIR_THRESHOLDS',

    -- Physical condition (stored as JSON for flexibility)
    conditions      JSON            NULL DEFAULT NULL
                    COMMENT 'Key-value flags: hasPower, screenIntact, batteryHealth, etc.',

    -- Lifecycle status and recommendation
    status          ENUM(
                      'pending_assessment',
                      'for_repair',
                      'for_recycling',
                      'repaired',
                      'recycled',
                      'donated'
                    )               NOT NULL DEFAULT 'pending_assessment',
    recommendation  ENUM(
                      'repair',
                      'recycle',
                      'assess'
                    )               NULL DEFAULT NULL
                    COMMENT 'Final recommendation from ElectronicDevice.getRecommendation()',

    -- Soft delete flag
    is_archived     TINYINT(1)      NOT NULL DEFAULT 0
                    COMMENT '1 = device has been transferred, donated, or recycled',

    -- Timestamps
    created_at      DATETIME        NOT NULL DEFAULT NOW(),
    updated_at      DATETIME        NULL ON UPDATE NOW(),

    -- Foreign key and indexes
    CONSTRAINT fk_devices_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_devices_user_id    (user_id),
    INDEX idx_devices_status     (status),
    INDEX idx_devices_type       (device_type),
    INDEX idx_devices_is_archived(is_archived)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Stores electronic device records submitted for assessment';

CREATE TABLE IF NOT EXISTS activity_logs (
    id              INT          AUTO_INCREMENT PRIMARY KEY,
    user_id         INT          NOT NULL,

    -- Module interaction data
    module_accessed ENUM(
                      'TIPID',
                      'TECH-CARE',
                      'TRANSFER'
                    )            NOT NULL,
    strategy_used   VARCHAR(60)  NULL DEFAULT NULL
                    COMMENT 'RepairStrategy applied during TECH-CARE session, if any',

    -- Timestamp (immutable after insert)
    created_at      DATETIME     NOT NULL DEFAULT NOW(),

    -- Foreign key and indexes
    CONSTRAINT fk_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_logs_user_id        (user_id),
    INDEX idx_logs_module_accessed(module_accessed),
    INDEX idx_logs_created_at     (created_at)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Immutable log of all EcoCircuit module interactions per user';


CREATE TABLE IF NOT EXISTS diagnostic_results (
    id              INT          AUTO_INCREMENT PRIMARY KEY,
    user_id         INT          NOT NULL,
    device_id       INT          NOT NULL,

    -- Decision Tree traversal output
    path_taken      JSON         NOT NULL
                    COMMENT 'Array of question-answer pairs traversed in the Decision Tree',
    recommendation  VARCHAR(255) NOT NULL
                    COMMENT 'Final recommendation produced at the terminal Decision Tree node',

    -- Soft delete flag
    is_active       TINYINT(1)   NOT NULL DEFAULT 1
                    COMMENT '0 = result has been superseded or logically removed',

    -- Timestamps
    created_at      DATETIME     NOT NULL DEFAULT NOW(),
    updated_at      DATETIME     NULL ON UPDATE NOW(),

    -- Foreign keys and indexes
    CONSTRAINT fk_diag_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_diag_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_diag_user_id  (user_id),
    INDEX idx_diag_device_id(device_id),
    INDEX idx_diag_is_active(is_active),
    INDEX idx_diag_created_at(created_at)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8mb4
COLLATE = utf8mb4_unicode_ci
COMMENT = 'Stores Decision Tree session outputs and recommendations per user';


-- List all created tables
SHOW TABLES;

-- Confirm column structure of each table
DESCRIBE users;
DESCRIBE devices;
DESCRIBE activity_logs;
DESCRIBE diagnostic_results;