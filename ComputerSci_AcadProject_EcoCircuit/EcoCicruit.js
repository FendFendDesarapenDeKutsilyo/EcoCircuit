'use strict';

/** NOTE: EXPORTS component must always be placed at the end of the code. 
 * Please do not alter this section unless explicitly authorized. 
*/

/*
* Data Base & Data entities declaration and validation.
*/

const mysql     = require('mysql2/promise');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

/*
  Validates that all required environment variables are present.
  Crashes the process early with a clear message if any are missing.
 */
function validateEnvironment() {
    const required = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missing  = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error(
            `[EcoCircuit] Missing required environment variables: ${missing.join(', ')}.\n` +
            `             Please check your .env file before starting the server.`
        );
        process.exit(1);
    }

    console.log('[EcoCircuit] Environment variables validated successfully.');
}

validateEnvironment();


//** CONSTANTS & ENUMS **//

/** User communities (options)
 * INSTITUTIONAL [students, staff, professors, university personel]
 * GENERAL [outsiders, public users]
*/
const UserType = Object.freeze ({
    INSTITUTIONAL : 'institutional',
    GENERAL       : 'general',
});

/** Roles within the institutional community */
const InstitutionalRole = Object.freeze ({
    STUDENT   : 'student',
    STAFF     : 'staff',
    PROFESSOR : 'professor',
    ADMIN     : 'admin',
});

/** Device lifecycle states */
const DeviceStatus = Object.freeze ({
    FOR_REPAIR    : 'for_repair',
    FOR_RECYCLING : 'for_recycling',
    REPAIRED      : 'repaired',
    RECYCLED      : 'recycled',
    DONATED       : 'donated',
    PENDING       : 'pending_assessment',
});

/**TIPID vars procedure:
 * Repair-cost threshold per device type.
 * If repair cost exceeds this ratio of the new device price,
 * recycling or disposal is recommended over repair.
 * Different device types have different economic lifespans,
 * so a single global threshold is insufficient.
 * 50% Rule = default
 */
const REPAIR_THRESHOLDS = Object.freeze ({
    laptop      : 0.50,
    smartphone  : 0.40,
    desktop     : 0.55,
    tablet      : 0.45,
    peripheral  : 0.35,
    default     : 0.50,
});

/**
 * Valid device types (only) accepted by the system.
 * Used for input validation in Validator.deviceSubmission().
 */
const VALID_DEVICE_TYPES = Object.freeze ([
    'laptop',
    'smartphone',
    'desktop',
    'tablet',
    'peripheral',
    'other',
]);

/**
 * Valid module identifiers corresponding to the three core modules.
 */
const ModuleType = Object.freeze ({
    TIPID    : 'TIPID',
    TECHCARE : 'TECH-CARE',
    TRANSFER : 'TRANSFER',
});

/** INSTITUTIONAL EMAIL & VALID LOGIN CREDENTIALS IN .env*/
const INSTITUTIONAL_DOMAINS = (process.env.INSTITUTIONAL_DOMAINS || 'national-u.edu.ph')
    .split(',')
    .map(d => d.trim().toLowerCase());

/** JWT configuration — secret is guaranteed non-null after validateEnvironment() */
const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const BCRYPT_ROUNDS  = 12;


/* DATABASE STUFF */

/** Database Connection Pool */
const db = mysql.createPool({
    host               : process.env.DB_HOST,
    port               : parseInt(process.env.DB_PORT || '3306'),
    user               : process.env.DB_USER,
    password           : process.env.DB_PASSWORD,
    database           : process.env.DB_NAME,
    waitForConnections : true,
    connectionLimit    : 10,
    queueLimit         : 0,
});

/**
 * Verifies database connectivity on startup.
 * The system will not proceed if the database is unreachable.
 * With Error Handling for database connection.
 */
async function initDatabase() {
    try {
        const conn = await db.getConnection();
        console.log('[EcoCircuit] Database connected successfully.');
        conn.release();
    } catch (err) {
        console.error('[EcoCircuit] Database connection failed:', err.message);
        process.exit(1);
    }
}

/* ERROR HANDLING */

class AppError extends Error {
    /**
     * @param {string} message      [Human-readable description of the error]
     * @param {number} [status=500] [HTTP status code]
     * @param {string} [code]       [Optional machine-readable error code]
     */
    constructor(message, status = 500, code = null) {
        super(message);
        this.name      = 'AppError';
        this.status    = status;
        this.code      = code || `ERR_${status}`;
        this.timestamp = new Date().toISOString();
    }

    /**
     * Serializes the error to a safe API response body.
     * Stack traces are never exposed to the client.
     * @returns {Object}
     */
    toResponse() {
        return {
            error     : this.name,
            message   : this.message,
            code      : this.code,
            timestamp : this.timestamp,
        };
    }
}


//** VALIDATION UTILITIES */

/**
 * Stateless validation helpers used across the entire system.
 * Centralizing validation here ensures rules are consistent
 * and easy to update in one place.
 */
const Validator = {
    /**
     * Validates an email address format.
     * @param {string} email
     * @returns {{ valid: boolean, value?: string, reason?: string }}
     */
    email(email) {
        if (!email || typeof email !== 'string') {
            return { valid: false, reason: 'Email is required.' };
        }
        const trimmed = email.trim().toLowerCase();
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!pattern.test(trimmed)) {
            return { valid: false, reason: 'Invalid email format.' };
        }
        return { valid: true, value: trimmed };
    },

    /**
     * Checks whether an email belongs to a registered institutional domain.
     * @param {string} email
     * @returns {boolean}
     */
    isInstitutionalEmail(email) {
        const domain = email.trim().toLowerCase().split('@')[1] || '';
        return INSTITUTIONAL_DOMAINS.includes(domain);
    },

    /**
     * Validates a password against minimum security requirements.
     * Requirements: at least 8 characters, one uppercase letter, one number.
     * @param {string} password
     * @returns {{ valid: boolean, reason?: string }}
     */
    password(password) {
        if (!password || password.length < 8) {
            return { valid: false, reason: 'Password must be at least 8 characters.' };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, reason: 'Password must contain at least one uppercase letter.' };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, reason: 'Password must contain at least one number.' };
        }
        return { valid: true };
    },

    /**
     * Validates a user's full name.
     * Accepts letters, spaces, hyphens, apostrophes, and periods only.
     * @param {string} name
     * @returns {{ valid: boolean, value?: string, reason?: string }}
     */
    name(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, reason: 'Full name is required.' };
        }
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            return { valid: false, reason: 'Name must be at least 2 characters.' };
        }
        if (trimmed.length > 100) {
            return { valid: false, reason: 'Name must not exceed 100 characters.' };
        }
        if (!/^[a-zA-Z\s\-'.]+$/.test(trimmed)) {
            return { valid: false, reason: 'Name must contain letters and basic punctuation only.' };
        }
        return { valid: true, value: trimmed };
    },

    /**
     * Validates the fields required when submitting a device for assessment.
     * Checks device type against the known VALID_DEVICE_TYPES list.
     * @param {Object} fields
     * @returns {{ valid: boolean, reason?: string }}
     */
    deviceSubmission(fields) {
        const { deviceType, brand, model, newPrice, repairCost } = fields;

        if (!deviceType || !brand || !model) {
            return { valid: false, reason: 'Device type, brand, and model are required.' };
        }
        if (!VALID_DEVICE_TYPES.includes(deviceType.toLowerCase())) {
            return {
                valid  : false,
                reason : `Device type must be one of: ${VALID_DEVICE_TYPES.join(', ')}.`,
            };
        }
        if (newPrice !== undefined && (isNaN(newPrice) || Number(newPrice) < 0)) {
            return { valid: false, reason: 'New price must be a non-negative number.' };
        }
        if (repairCost !== undefined && (isNaN(repairCost) || Number(repairCost) < 0)) {
            return { valid: false, reason: 'Repair cost must be a non-negative number.' };
        }
        return { valid: true };
    },
};


/* SESSION MANAGEMENT (Client-Side / Browser)
      NOTE: This class runs in the BROWSER,
      not in Node.js. Keep it in a separate
      client-side bundle or script tag.

      */

/**
 * Manages the active user session in the browser using localStorage.
 * Works alongside the JWT issued by the server.
 * The token is stored here and sent as a Bearer token on every API request.
 */
class UserSession {
    #userId;
    #userName;
    #userType;
    #role;
    #selectedDevice;
    #authToken;
    #expiresAt;

    /** Storage key used in localStorage */
    static #STORAGE_KEY = 'ecocircuit_session';

    /** Session duration in milliseconds — mirrors JWT_EXPIRES_IN (8 hours) */
    static #SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

    constructor() {
        this.#userId         = null;
        this.#userName       = null;
        this.#userType       = null;
        this.#role           = null;
        this.#selectedDevice = null;
        this.#authToken      = null;
        this.#expiresAt      = null;
        this.#loadFromStorage();
    }

    /* --- Getters (read-only public access) --- */
    get userId()         { return this.#userId; }
    get userName()       { return this.#userName; }
    get userType()       { return this.#userType; }
    get role()           { return this.#role; }
    get selectedDevice() { return this.#selectedDevice; }
    get authToken()      { return this.#authToken; }

    /**
     * Returns true only if the user has a valid, non-expired session.
     * @returns {boolean}
     */
    isLoggedIn() {
        return (
            this.#userId    !== null &&
            this.#authToken !== null &&
            Date.now() < this.#expiresAt
        );
    }

    /**
     * Returns true if the user belongs to the institutional community.
     * This gate features are exclusive to NU students, staff, or professors.
     * @returns {boolean}
     */
    canAccessInstitutionalFeatures() {
        return this.#userType === UserType.INSTITUTIONAL;
    }

    /**
     * Called after a successful API login response.
     * Stores the user data and JWT in localStorage with a client-side expiry.
     * @param {Object} sessionData
     * @param {number|string} sessionData.userId
     * @param {string}        sessionData.userName
     * @param {string}        sessionData.userType   - UserType value
     * @param {string|null}   sessionData.role       - InstitutionalRole or null
     * @param {string}        sessionData.token      - JWT from server
     */
    login({ userId, userName, userType, role, token }) {
        this.#userId         = userId;
        this.#userName       = userName;
        this.#userType       = userType;
        this.#role           = role ?? null;
        this.#authToken      = token;
        this.#expiresAt      = Date.now() + UserSession.#SESSION_DURATION_MS;
        this.#saveToStorage();
    }

    /**
     * Updates the currently selected device type for the active session.
     * Used when the user selects a device before entering a module.
     * @param {string} deviceType - A value from VALID_DEVICE_TYPES
     */
    setDevice(deviceType) {
        this.#selectedDevice = deviceType;
        this.#saveToStorage();
    }

    /**
     * Clears all session data from memory and localStorage.
     * Called on explicit logout or session expiry.
     */
    logout() {
        this.#userId         = null;
        this.#userName       = null;
        this.#userType       = null;
        this.#role           = null;
        this.#selectedDevice = null;
        this.#authToken      = null;
        this.#expiresAt      = null;
        localStorage.removeItem(UserSession.#STORAGE_KEY);
    }

    /* --- Private Storage Helpers --- */

    #saveToStorage() {
        const payload = {
            userId         : this.#userId,
            userName       : this.#userName,
            userType       : this.#userType,
            role           : this.#role,
            selectedDevice : this.#selectedDevice,
            authToken      : this.#authToken,
            expiresAt      : this.#expiresAt,
        };
        localStorage.setItem(UserSession.#STORAGE_KEY, JSON.stringify(payload));
    }

    #loadFromStorage() {
        const raw = localStorage.getItem(UserSession.#STORAGE_KEY);
        if (!raw) return;
        try {
            const data = JSON.parse(raw);

            // Enforce client-side expiry — clear if session has timed out
            if (!data.expiresAt || Date.now() > data.expiresAt) {
                localStorage.removeItem(UserSession.#STORAGE_KEY);
                return;
            }

            this.#userId         = data.userId         ?? null;
            this.#userName       = data.userName       ?? null;
            this.#userType       = data.userType       ?? null;
            this.#role           = data.role           ?? null;
            this.#selectedDevice = data.selectedDevice ?? null;
            this.#authToken      = data.authToken      ?? null;
            this.#expiresAt      = data.expiresAt      ?? null;
        } catch {
            // Corrupt storage entry — reset cleanly to prevent bad state
            localStorage.removeItem(UserSession.#STORAGE_KEY);
        }
    }
}

/** Global session instance (browser only) */
const activeSession = new UserSession();


/* ABSTRACT BASE CLASSES */

/**
 * Abstract base class for all EcoCircuit modules.
 * Concrete modules (TipidModule, TechCareModule, TransferModule)
 * must extend this class and implement execute() and getDescription().
 *
 * @abstract
 */
class Module {
    #moduleId;

    /**
     * @param {string} moduleId - Unique identifier for the module instance
     */
    constructor(moduleId) {
        if (new.target === Module) {
            throw new AppError(
                'Module is abstract and cannot be instantiated directly.',
                500,
                'ERR_ABSTRACT_CLASS'
            );
        }
        if (!moduleId || typeof moduleId !== 'string') {
            throw new AppError('A valid moduleId string is required.', 400, 'ERR_MISSING_MODULE_ID');
        }
        this.#moduleId = moduleId;
    }

    /** Returns the unique identifier of this module instance. */
    getModuleId() { return this.#moduleId; }

    /**
     * Returns a human-readable description of this module's purpose.
     * Must be implemented by every concrete module subclass.
     * @abstract
     * @returns {string}
     */
    getDescription() {
        throw new AppError('getDescription() must be implemented by the subclass.', 500, 'ERR_NOT_IMPLEMENTED');
    }

    /**
     * Executes the module's primary interaction logic.
     * Must be implemented by every concrete module subclass.
     * @abstract
     * @returns {void}
     */
    execute() {
        throw new AppError('execute() must be implemented by the subclass.', 500, 'ERR_NOT_IMPLEMENTED');
    }
}

/**
 * Abstract base class for all module factories.
 * Concrete factories (TipidFactory, TechCareFactory, TransferFactory)
 * must extend this class and implement createModule() and getModuleType().
 *
 * @abstract
 */
class ModuleFactory {
    constructor() {
        if (new.target === ModuleFactory) {
            throw new AppError(
                'ModuleFactory is abstract and cannot be instantiated directly.',
                500,
                'ERR_ABSTRACT_CLASS'
            );
        }
    }

    /**
     * Returns the module type identifier this factory is responsible for.
     * Must be implemented by every concrete factory subclass.
     * @abstract
     * @returns {string} - A value from ModuleType
     */
    getModuleType() {
        throw new AppError('getModuleType() must be implemented by the subclass.', 500, 'ERR_NOT_IMPLEMENTED');
    }

    /**
     * Creates and returns a fully configured module instance.
     * Must be implemented by every concrete factory subclass.
     * @abstract
     * @returns {Module}
     */
    createModule() {
        throw new AppError('createModule() must be implemented by the subclass.', 500, 'ERR_NOT_IMPLEMENTED');
    }
}

/*Notes here and there I sleep na ayaw ko na unti nalang AI ko na ito lahat deputek na buhay*/

/**
 * Abstract base class simulating a RepairStrategy interface.
 * All concrete strategy classes (DIYRepairStrategy,
 * ProfessionalRepairStrategy, RefurbishStrategy, DisposeStrategy)
 * must extend this class and implement all three methods.
 *
 * @abstract
 */
class RepairStrategy {
    constructor() {
        if (new.target === RepairStrategy) {
            throw new AppError(
                'RepairStrategy is abstract and cannot be instantiated directly.',
                500,
                'ERR_ABSTRACT_CLASS'
            );
        }
    }

    /**
     * Returns the name of this strategy.
     * @abstract
     * @returns {string}
     */
    getStrategyName() {
        throw new AppError('getStrategyName() must be implemented by the subclass.', 500, 'ERR_NOT_IMPLEMENTED');
    }

    /**
     * Executes the strategy's core logic for the given device.
     * @abstract
     * @param {ElectronicDevice} device
     * @returns {void}
     */
    execute(device) {
        throw new AppError('execute() must be implemented by the subclass.', 500, 'ERR_NOT_IMPLEMENTED');
    }

    /**
     * Returns a human-readable recommendation string for the user.
     * @abstract
     * @returns {string}
     */
    getRecommendation() {
        throw new AppError('getRecommendation() must be implemented by the subclass.', 500, 'ERR_NOT_IMPLEMENTED');
    }
}


/* OTHER MAIN DATA ENTITIES */

/**
 * Represents a physical electronic device submitted to EcoCircuit
 * for assessment, repair guidance, or disposal recommendation.
 *
 * Encapsulation is enforced through private fields.
 * All external access goes through defined getters and methods.
 *  #financials;    // { newPrice, repairCost }
    #conditions;    // { hasPower, screenIntact, batteryHealth, ... }
    #metadata;      // { deviceType, brand, model, serialNumber, submittedBy }
    #status;        // DeviceStatus enum value
 */
class ElectronicDevice {
    #financials;
    #conditions;
    #metadata;
    #status;
    /**
     * @param {Object} [financials]  - Cost-related data for repair analysis
     * @param {Object} [conditions]  - Physical condition flags assessed by user
     * @param {Object} [metadata]    - Identifying information about the device
     * @param {string} [status]      - Initial DeviceStatus (defaults to PENDING)
     */
    constructor(
        financials = {},
        conditions = {},
        metadata   = {},
        status     = DeviceStatus.PENDING
    ) {
        this.#financials = financials;
        this.#conditions = conditions;
        this.#metadata   = metadata;
        this.#status     = status;
    }

    /* --- Financial Analysis --- */

    /**
     * Returns the device-type-aware repair cost threshold.
     * Different device types have different economic lifespans,
     * so the threshold varies rather than using a single global value.
     * @returns {number} Threshold ratio (0–1)
     */
    getRepairThreshold() {
        const type = this.#metadata.deviceType?.toLowerCase() || 'default';
        return REPAIR_THRESHOLDS[type] ?? REPAIR_THRESHOLDS.default;
    }

    /**
     * Returns the ratio of repair cost to new device price.
     * A ratio above the device-type threshold means recycling is recommended.
     * @returns {number} 0–1+ (can exceed 1 if repair costs more than new device)
     */
    getRepairRatio() {
        const { newPrice, repairCost } = this.#financials;
        if (!newPrice || Number(newPrice) === 0) return 1; // assume worst-case if unknown
        return Number(repairCost) / Number(newPrice);
    }

    /**
     * Determines whether repair is financially justified for this device.
     * Uses device-type-aware threshold via getRepairThreshold().
     * @returns {boolean}
     */
    isWorthRepairing() {
        return this.getRepairRatio() <= this.getRepairThreshold();
    }

    /**
     * Returns a human-readable recommendation based on financial data.
     * Used by the Decision Tree to determine the terminal recommendation.
     * @returns {'repair' | 'recycle' | 'assess'}
     */
    getRecommendation() {
        const { newPrice, repairCost } = this.#financials;
        if (!newPrice || !repairCost) return 'assess';  // insufficient data
        return this.isWorthRepairing() ? 'repair' : 'recycle';
    }

    /* --- Condition Access --- */

    /**
     * Returns a specific condition flag for the device.
     * @param {string} key - e.g. 'hasPower', 'screenIntact', 'batteryHealth'
     * @returns {*}
     */
    getCondition(key) {
        return this.#conditions[key];
    }

    /**
     * Returns all condition data as a shallow copy.
     * Read-only pattern prevents external mutation of private state.
     * @returns {Object}
     */
    getAllConditions() {
        return { ...this.#conditions };
    }

    /* --- Status Management --- */

    /** Returns the current lifecycle status of the device. */
    getStatus() { return this.#status; }

    /** Returns device metadata as a shallow copy. */
    getMetadata() { return { ...this.#metadata }; }

    /**
     * Updates the device's lifecycle status.
     * Only accepts valid DeviceStatus values — throws on invalid input.
     * @param {string} newStatus - Must be a valid DeviceStatus value
     */
    updateStatus(newStatus) {
        if (!Object.values(DeviceStatus).includes(newStatus)) {
            throw new AppError(
                `Invalid device status: "${newStatus}". ` +
                `Valid values are: ${Object.values(DeviceStatus).join(', ')}.`,
                400,
                'ERR_INVALID_STATUS'
            );
        }
        this.#status = newStatus;
    }

    /**
     * Serializes the device to a plain object for database insertion
     * or API response. Does not expose raw private field references.
     * @returns {Object}
     */
    toRecord() {
        return {
            ...this.#metadata,
            ...this.#financials,
            conditions     : JSON.stringify(this.#conditions),
            status         : this.#status,
            repairRatio    : this.getRepairRatio().toFixed(4),
            repairThreshold: this.getRepairThreshold(),
            recommendation : this.getRecommendation(),
        };
    }
}


/* AUTH SERVICE */

/**
 * AuthService contains all business logic for user registration,
 * login, and token verification. 
 * It is stateless and interacts with the database through the shared db pool.
 */
const AuthService = {
    /**
     * Registers a new user.
     * Automatically classifies institutional vs general based on email domain.
     * Institutional users must declare their role (student, staff, professor).
     *
     * @param {Object} params
     * @param {string} params.email
     * @param {string} params.password
     * @param {string} params.name
     * @param {string} [params.role] - Required for institutional users
     * @returns {Promise<{ userId: number, userType: string, message: string }>}
     */
    async register({ email, name, password, role }) {

        // Validate all inputs before any database interaction
        const emailCheck = Validator.email(email);
        if (!emailCheck.valid) throw new AppError(emailCheck.reason, 400, 'ERR_INVALID_EMAIL');

        const passCheck = Validator.password(password);
        if (!passCheck.valid) throw new AppError(passCheck.reason, 400, 'ERR_WEAK_PASSWORD');

        const nameCheck = Validator.name(name);
        if (!nameCheck.valid) throw new AppError(nameCheck.reason, 400, 'ERR_INVALID_NAME');

        const cleanEmail = emailCheck.value;
        const cleanName  = nameCheck.value;

        // Classify user type based on email domain
        const isInstitutional = Validator.isInstitutionalEmail(cleanEmail);
        const userType        = isInstitutional ? UserType.INSTITUTIONAL : UserType.GENERAL;

        // Institutional users must declare a valid role
        if (isInstitutional) {
            if (!role || !Object.values(InstitutionalRole).includes(role)) {
                throw new AppError(
                    `Institutional users must provide a valid role: ` +
                    `${Object.values(InstitutionalRole).join(', ')}.`,
                    400,
                    'ERR_MISSING_ROLE'
                );
            }
        }

        // Check for duplicate email before hashing password
        const [existing] = await db.execute(
            'SELECT id FROM users WHERE email = ? LIMIT 1',
            [cleanEmail]
        );
        if (existing.length > 0) {
            throw new AppError(
                'An account with this email already exists.',
                409,
                'ERR_DUPLICATE_EMAIL'
            );
        }

        // Hash password with bcrypt (12 rounds)
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Insert new user record
        const [result] = await db.execute(
            `INSERT INTO users (email, name, password_hash, user_type, role, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [cleanEmail, cleanName, passwordHash, userType, role ?? null]
        );

        return {
            userId   : result.insertId,
            userType,
            message  : `Account created successfully. Welcome to EcoCircuit, ${cleanName}!`,
        };
    },

    /**
     * Logs in an existing user and returns a signed JWT.
     * Uses a generic error message for both "user not found" and
     * "wrong password" cases to prevent email enumeration attacks.
     *
     * @param {Object} params
     * @param {string} params.email
     * @param {string} params.password
     * @returns {Promise<{ token: string, user: Object }>}
     */
    async login({ email, password }) {

        const emailCheck = Validator.email(email);
        if (!emailCheck.valid) throw new AppError(emailCheck.reason, 400, 'ERR_INVALID_EMAIL');

        if (!password) throw new AppError('Password is required.', 400, 'ERR_MISSING_PASSWORD');

        const cleanEmail = emailCheck.value;

        // Retrieve user record
        const [rows] = await db.execute(
            `SELECT id, name, email, password_hash, user_type, role
             FROM users WHERE email = ? LIMIT 1`,
            [cleanEmail]
        );

        // Generic message prevents attackers from confirming valid emails
        const GENERIC_AUTH_ERROR = 'Invalid email or password.';

        if (rows.length === 0) {
            throw new AppError(GENERIC_AUTH_ERROR, 401, 'ERR_INVALID_CREDENTIALS');
        }

        const user = rows[0];

        // Verify password against stored hash
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            throw new AppError(GENERIC_AUTH_ERROR, 401, 'ERR_INVALID_CREDENTIALS');
        }

        // Build JWT payload — never include sensitive data like password_hash
        const payload = {
            userId   : user.id,
            userType : user.user_type,
            role     : user.role,
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // Update last_login timestamp (fire-and-forget — does not block response)
        db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]).catch(() => {});

        return {
            token,
            user: {
                userId   : user.id,
                userName : user.name,
                email    : user.email,
                userType : user.user_type,
                role     : user.role,
            },
        };
    },

    /**
     * Verifies a JWT and returns its decoded payload.
     * Used in the requireAuth middleware to protect routes.
     *
     * @param {string} token
     * @returns {{ userId: number, userType: string, role: string|null }}
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch {
            throw new AppError(
                'Invalid or expired session. Please log in again.',
                401,
                'ERR_INVALID_TOKEN'
            );
        }
    },
};


/* ROUTE MIDDLEWARE (Express-compatible) */

/**
 * Rate limiter for the login endpoint.
 * Limits each IP to 10 login attempts per 15-minute window.
 * Prevents brute force attacks on user accounts.
 */
const loginLimiter = rateLimit({
    windowMs        : 15 * 60 * 1000,  // 15 minutes
    max             : 10,               // max 10 attempts per window per IP
    standardHeaders : true,
    legacyHeaders   : false,
    message         : {
        error   : 'TooManyRequests',
        message : 'Too many login attempts. Please try again after 15 minutes.',
        code    : 'ERR_RATE_LIMITED',
    },
});

/**
 * Rate limiter for the registration endpoint.
 * Limits each IP to 5 registration attempts per hour.
 * Prevents mass account creation abuse.
 */
const registerLimiter = rateLimit({
    windowMs        : 60 * 60 * 1000,  // 1 hour
    max             : 5,
    standardHeaders : true,
    legacyHeaders   : false,
    message         : {
        error   : 'TooManyRequests',
        message : 'Too many registration attempts. Please try again after an hour.',
        code    : 'ERR_RATE_LIMITED',
    },
});

/**
 * Middleware: extracts and verifies the Bearer JWT from the Authorization header.
 * Attaches the decoded payload to req.user for use in downstream handlers.
 * Apply to any route that requires a logged-in user.
 *
 * @example
 *   app.get('/api/devices', requireAuth, DeviceController.listAll);
 */
function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json(
            new AppError('No token provided. Please log in.', 401, 'ERR_NO_TOKEN').toResponse()
        );
    }

    try {
        req.user = AuthService.verifyToken(token);
        next();
    } catch (err) {
        return res.status(err.status || 401).json(
            err.toResponse?.() ?? { message: err.message }
        );
    }
}

/**
 * Middleware: restricts a route to institutional users only.
 * Must always be chained AFTER requireAuth.
 *
 * @example
 *   app.post('/api/reports', requireAuth, requireInstitutional, ReportController.create);
 */
function requireInstitutional(req, res, next) {
    if (req.user?.userType !== UserType.INSTITUTIONAL) {
        return res.status(403).json(
            new AppError(
                'This feature is available to institutional members only.',
                403,
                'ERR_FORBIDDEN'
            ).toResponse()
        );
    }
    next();
}

/**
 * Global error handler middleware.
 * Must be registered LAST in your Express app:
 *   app.use(globalErrorHandler);
 *
 * Handles both AppError instances and unexpected errors uniformly.
 * Never exposes stack traces to the client in any environment.
 */
function globalErrorHandler(err, req, res, _next) {
    const status = err.status || 500;
    const body   = err instanceof AppError
        ? err.toResponse()
        : {
            error     : 'InternalServerError',
            message   : 'An unexpected error occurred. Please try again later.',
            code      : 'ERR_500',
            timestamp : new Date().toISOString(),
        };

    // Log unexpected server errors for debugging (never log to client)
    if (status >= 500) {
        console.error('[EcoCircuit] ⚠️  Unhandled server error:', err);
    }

    res.status(status).json(body);
}


/* API ROUTE DEFINITIONS (Express)*/

/**
 * Registers all authentication API routes onto an Express router.
 *
 * Routes:
 *   POST   /api/auth/register  - Create a new account
 *   POST   /api/auth/login     - Log in and receive a JWT
 *   GET    /api/auth/me        - Get the current user's profile
 *   POST   /api/auth/logout    - Invalidate the current session (client-side)
 *
 * @param {import('express').Router} router - An Express Router instance
 */
function registerAuthRoutes(router) {

    /**
     * POST /api/auth/register
     * Creates a new user account.
     * Body: { email, name, password, role? }
     * Rate limited to 5 attempts per IP per hour.
     */
    router.post('/register', registerLimiter, async (req, res, next) => {
        try {
            const result = await AuthService.register(req.body);
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    });

    /**
     * POST /api/auth/login
     * Authenticates a user and returns a signed JWT.
     * Body: { email, password }
     * Returns: { token, user }
     * Rate limited to 10 attempts per IP per 15 minutes.
     */
    router.post('/login', loginLimiter, async (req, res, next) => {
        try {
            const result = await AuthService.login(req.body);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    });

    /**
     * GET /api/auth/me
     * Returns the currently authenticated user's profile.
     * Requires: Authorization: Bearer <token>
     */
    router.get('/me', requireAuth, async (req, res, next) => {
        try {
            const [rows] = await db.execute(
                `SELECT id, name, email, user_type, role, created_at, last_login
                 FROM users WHERE id = ? LIMIT 1`,
                [req.user.userId]
            );
            if (rows.length === 0) {
                throw new AppError('User not found.', 404, 'ERR_USER_NOT_FOUND');
            }
            res.status(200).json(rows[0]);
        } catch (err) {
            next(err);
        }
    });

    /**
     * POST /api/auth/logout
     * Logout is handled client-side by clearing the JWT from localStorage.
     * This endpoint exists as a clean REST hook for future server-side
     * token blacklisting if needed.
     * Requires: Authorization: Bearer <token>
     */
    router.post('/logout', requireAuth, (req, res) => {
        // Client must call activeSession.logout() to clear localStorage
        res.status(200).json({
            message : 'Logged out successfully. Please clear your session on the client.',
        });
    });
}