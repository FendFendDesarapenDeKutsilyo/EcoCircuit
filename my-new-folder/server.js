'use strict';

const express = require('express');
const path    = require('path');
require('dotenv').config();

const {
    // Database
    db,
    initDatabase,

    // Middleware
    requireAuth,
    requireInstitutional,
    globalErrorHandler,

    // Route Registration
    registerAuthRoutes,

    // Error Handling
    AppError,

    // Enums
    DeviceStatus,
    ModuleType,
    VALID_DEVICE_TYPES,

    // Core
    Validator,
    ElectronicDevice,
} = require('./EcoCircuit');



const app  = express();
const PORT = process.env.PORT || 3000;


/**
 * Parses incoming JSON request bodies.
 * Limits payload size to 10kb to prevent
 * large payload denial-of-service attacks.
 */
app.use(express.json({ limit: '10kb' }));

/**
 * Parses URL-encoded form data.
 * Used for standard HTML form submissions.
 */
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/**
 * Serves static files (HTML, CSS, JS, images)
 * from the /public directory.
 * This makes your frontend pages accessible
 * at their file paths directly.
 */
app.use(express.static(__dirname));

/**
 * Basic security headers applied to all responses.
 * Prevents common web vulnerabilities without
 * requiring the full helmet package.
 */
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com"
    );
    next();
});

/**
 * Simple request logger for development.
 * Logs the HTTP method, URL, and status code
 * of every request to the console.
 * Remove or replace with a proper logger
 * (e.g. morgan) in production.
 */
app.use((req, res, next) => {
    res.on('finish', () => {
        const status = res.statusCode;
        const color  = status >= 500 ? '❌' : status >= 400 ? '⚠️ ' : '✅';
        console.log(`[EcoCircuit] ${color} ${req.method} ${req.originalUrl} → ${status}`);
    });
    next();
});


/**
 * GET /
 * Serves the Home / Overview page (Page 1).
 * Contains the animated splash, overview,
 * module descriptions, and e-waste statistics.
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * GET /tipid
 * Serves the TIPID Module page (Page 2).
 * Responsible consumption educational content.
 */
app.get('/tipid', (req, res) => {
    res.sendFile(path.join(__dirname, 'tipid.html'));
});

/**
 * GET /techcare
 * Serves the TECH-CARE Module page (Page 3).
 * Device diagnostic chatbot and repair guidance.
 */
app.get('/techcare', (req, res) => {
    res.sendFile(path.join(__dirname, 'techcare.html'));
});

/**
 * GET /transfer
 * Serves the TRANSFER Module page (Page 4).
 * Recycling, donation, and disposal options.
 */
app.get('/transfer', (req, res) => {
    res.sendFile(path.join(__dirname, 'transfer.html'));
});

/**
 * GET /locations
 * Serves the CAMPUS ECO-DIRECTORY page.
 * Filterable list of repair hubs and e-waste bins.
 */
app.get('/locations', (req, res) => {
    res.sendFile(path.join(__dirname, 'locations.html'));
});

const authRouter = express.Router();
registerAuthRoutes(authRouter);
app.use('/api/auth', authRouter);


const deviceRouter = express.Router();

/**
 * POST /api/devices
 * Submits a new electronic device for assessment.
 * Validates input, creates an ElectronicDevice
 * instance, and saves it to the database.
 * Requires: Authorization Bearer token
 *
 * Body: {
 *   deviceType, brand, model,
 *   newPrice?, repairCost?,
 *   conditions?: { hasPower, screenIntact, ... }
 * }
 */
deviceRouter.post('/', requireAuth, async (req, res, next) => {
    try {
        const { deviceType, brand, model, newPrice, repairCost, conditions } = req.body;

        // Validate device submission fields
        const validation = Validator.deviceSubmission({ deviceType, brand, model, newPrice, repairCost });
        if (!validation.valid) {
            throw new AppError(validation.reason, 400, 'ERR_INVALID_DEVICE');
        }

        // Build the ElectronicDevice instance
        const device = new ElectronicDevice(
            { newPrice: Number(newPrice) || null, repairCost: Number(repairCost) || null },
            conditions || {},
            { deviceType: deviceType.toLowerCase(), brand, model, submittedBy: req.user.userId }
        );

        // Persist to database
        const record = device.toRecord();
        const [result] = await db.execute(
            `INSERT INTO devices
                (user_id, device_type, brand, model, new_price, repair_cost,
                 conditions, status, repair_ratio, repair_threshold, recommendation, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                req.user.userId,
                record.deviceType,
                record.brand,
                record.model,
                record.newPrice       || null,
                record.repairCost     || null,
                record.conditions,
                record.status,
                record.repairRatio    || null,
                record.repairThreshold|| null,
                record.recommendation || null,
            ]
        );

        res.status(201).json({
            deviceId       : result.insertId,
            recommendation : device.getRecommendation(),
            repairRatio    : device.getRepairRatio().toFixed(4),
            message        : 'Device submitted successfully.',
        });

    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/devices
 * Returns all active device records for
 * the currently authenticated user.
 * Requires: Authorization Bearer token
 */
deviceRouter.get('/', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, device_type, brand, model, status,
                    recommendation, repair_ratio, created_at
             FROM devices
             WHERE user_id = ? AND is_archived = 0
             ORDER BY created_at DESC`,
            [req.user.userId]
        );
        res.status(200).json({ devices: rows });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/devices/:id
 * Returns the full record of a single device
 * belonging to the authenticated user.
 * Requires: Authorization Bearer token
 */
deviceRouter.get('/:id', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT * FROM devices
             WHERE id = ? AND user_id = ? AND is_archived = 0
             LIMIT 1`,
            [req.params.id, req.user.userId]
        );
        if (rows.length === 0) {
            throw new AppError('Device not found.', 404, 'ERR_DEVICE_NOT_FOUND');
        }
        res.status(200).json(rows[0]);
    } catch (err) {
        next(err);
    }
});

/**
 * PATCH /api/devices/:id/status
 * Updates the lifecycle status of a device.
 * Used when a device is repaired, recycled,
 * or donated through the TRANSFER module.
 * Requires: Authorization Bearer token
 *
 * Body: { status }
 */
deviceRouter.patch('/:id/status', requireAuth, async (req, res, next) => {
    try {
        const { status } = req.body;
        const validStatuses = Object.values(DeviceStatus);

        if (!status || !validStatuses.includes(status)) {
            throw new AppError(
                `Invalid status. Valid values: ${validStatuses.join(', ')}.`,
                400,
                'ERR_INVALID_STATUS'
            );
        }

        // Archive device if it has been transferred or recycled
        const shouldArchive = ['recycled', 'donated'].includes(status) ? 1 : 0;

        const [result] = await db.execute(
            `UPDATE devices
             SET status = ?, is_archived = ?, updated_at = NOW()
             WHERE id = ? AND user_id = ?`,
            [status, shouldArchive, req.params.id, req.user.userId]
        );

        if (result.affectedRows === 0) {
            throw new AppError('Device not found or update not permitted.', 404, 'ERR_DEVICE_NOT_FOUND');
        }

        res.status(200).json({ message: `Device status updated to "${status}".` });
    } catch (err) {
        next(err);
    }
});

app.use('/api/devices', deviceRouter);


const logRouter = express.Router();

/**
 * POST /api/logs
 * Records a new module interaction for the
 * currently authenticated user.
 * Requires: Authorization Bearer token
 *
 * Body: { moduleAccessed, strategyUsed? }
 */
logRouter.post('/', requireAuth, async (req, res, next) => {
    try {
        const { moduleAccessed, strategyUsed } = req.body;
        const validModules = Object.values(ModuleType);

        if (!moduleAccessed || !validModules.includes(moduleAccessed)) {
            throw new AppError(
                `Invalid module. Valid values: ${validModules.join(', ')}.`,
                400,
                'ERR_INVALID_MODULE'
            );
        }

        await db.execute(
            `INSERT INTO activity_logs (user_id, module_accessed, strategy_used, created_at)
             VALUES (?, ?, ?, NOW())`,
            [req.user.userId, moduleAccessed, strategyUsed || null]
        );

        res.status(201).json({ message: 'Activity logged successfully.' });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/logs
 * Returns all activity logs for the
 * currently authenticated user.
 * Requires: Authorization Bearer token
 */
logRouter.get('/', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, module_accessed, strategy_used, created_at
             FROM activity_logs
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.user.userId]
        );
        res.status(200).json({ logs: rows });
    } catch (err) {
        next(err);
    }
});

app.use('/api/logs', logRouter);


const diagnosticRouter = express.Router();

/**
 * POST /api/diagnostics
 * Saves the result of a completed
 * Decision Tree session.
 * Requires: Authorization Bearer token
 *
 * Body: {
 *   deviceId,
 *   pathTaken: [ "Question → Answer", ... ],
 *   recommendation
 * }
 */
diagnosticRouter.post('/', requireAuth, async (req, res, next) => {
    try {
        const { deviceId, pathTaken, recommendation } = req.body;

        if (!deviceId || !pathTaken || !recommendation) {
            throw new AppError(
                'deviceId, pathTaken, and recommendation are required.',
                400,
                'ERR_MISSING_FIELDS'
            );
        }

        if (!Array.isArray(pathTaken) || pathTaken.length === 0) {
            throw new AppError(
                'pathTaken must be a non-empty array of decision steps.',
                400,
                'ERR_INVALID_PATH'
            );
        }

        // Verify the device belongs to this user
        const [deviceRows] = await db.execute(
            'SELECT id FROM devices WHERE id = ? AND user_id = ? LIMIT 1',
            [deviceId, req.user.userId]
        );
        if (deviceRows.length === 0) {
            throw new AppError('Device not found or does not belong to this user.', 404, 'ERR_DEVICE_NOT_FOUND');
        }

        const [result] = await db.execute(
            `INSERT INTO diagnostic_results
                (user_id, device_id, path_taken, recommendation, is_active, created_at)
             VALUES (?, ?, ?, ?, 1, NOW())`,
            [req.user.userId, deviceId, JSON.stringify(pathTaken), recommendation]
        );

        res.status(201).json({
            resultId       : result.insertId,
            recommendation,
            message        : 'Diagnostic result saved successfully.',
        });

    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/diagnostics
 * Returns all active diagnostic results
 * for the currently authenticated user.
 * Requires: Authorization Bearer token
 */
diagnosticRouter.get('/', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT dr.id, dr.device_id, dr.path_taken,
                    dr.recommendation, dr.created_at,
                    d.device_type, d.brand, d.model
             FROM diagnostic_results dr
             JOIN devices d ON dr.device_id = d.id
             WHERE dr.user_id = ? AND dr.is_active = 1
             ORDER BY dr.created_at DESC`,
            [req.user.userId]
        );
        res.status(200).json({ results: rows });
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /api/diagnostics/:id
 * Soft-deletes a diagnostic result by setting
 * is_active to 0. The record is retained in
 * the database for analytics purposes.
 * Requires: Authorization Bearer token
 */
diagnosticRouter.delete('/:id', requireAuth, async (req, res, next) => {
    try {
        const [result] = await db.execute(
            `UPDATE diagnostic_results
             SET is_active = 0, updated_at = NOW()
             WHERE id = ? AND user_id = ?`,
            [req.params.id, req.user.userId]
        );

        if (result.affectedRows === 0) {
            throw new AppError('Diagnostic result not found.', 404, 'ERR_RESULT_NOT_FOUND');
        }

        res.status(200).json({ message: 'Diagnostic result removed successfully.' });
    } catch (err) {
        next(err);
    }
});

app.use('/api/diagnostics', diagnosticRouter);


app.use((req, res, next) => {
    const isApiRequest = req.originalUrl.startsWith('/api/');

    if (isApiRequest) {
        return next(new AppError(
            `Route ${req.method} ${req.originalUrl} does not exist.`,
            404,
            'ERR_ROUTE_NOT_FOUND'
        ));
    }

    // Non-API requests redirect to home page
    res.redirect('/');
});


app.use(globalErrorHandler);


async function startServer() {
    try {
        // Step 1: Verify database connection
        await initDatabase();

        // Step 2: Start listening for requests
        app.listen(PORT, () => {
            console.log('');
            console.log('===========================================');
            console.log('  🌿 ECOCIRCUIT SERVER RUNNING');
            console.log('===========================================');
            console.log(`  URL      : http://localhost:${PORT}`);
            console.log(`  TIPID    : http://localhost:${PORT}/tipid`);
            console.log(`  TECHCARE : http://localhost:${PORT}/techcare`);
            console.log(`  TRANSFER : http://localhost:${PORT}/transfer`);
            console.log('-------------------------------------------');
            console.log(`  API AUTH     : http://localhost:${PORT}/api/auth`);
            console.log(`  API DEVICES  : http://localhost:${PORT}/api/devices`);
            console.log(`  API LOGS     : http://localhost:${PORT}/api/logs`);
            console.log(`  API DIAG     : http://localhost:${PORT}/api/diagnostics`);
            console.log('===========================================');
            console.log('');
        });

    } catch (err) {
        console.error('[EcoCircuit] ❌ Server failed to start:', err.message);
        process.exit(1);
    }
}

startServer();

module.exports = { app };