'use strict';

const express = require('express');
const path    = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const {
    db,
    initDatabase,
    requireAuth,
    requireInstitutional,
    globalErrorHandler,
    registerAuthRoutes,
    AppError,
    DeviceStatus,
    ModuleType,
    VALID_DEVICE_TYPES,
    Validator,
    ElectronicDevice,
} = require('../EcoCircuit');

// FIXED: correct paths — APIs are at ../APIs/ and Modules at correct case
const tipidRoutes    = require('../APIs/TipidAPI');
const techCareRoutes = require('../APIs/TechCareAPI');
const transferRoutes = require('../APIs/TransferAPI');


const app  = express();
const PORT = process.env.PORT || 3000;


/* ── GLOBAL MIDDLEWARE ── */

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// FIXED: public folder is at root level, not inside DataBases/
app.use(express.static(path.join(__dirname, '..', 'public')));

// Security headers
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

// Request logger
app.use((req, res, next) => {
    res.on('finish', () => {
        const status = res.statusCode;
        const icon   = status >= 500 ? '[ERR]' : status >= 400 ? '[WARN]' : '[OK]';
        console.log(`[EcoCircuit] ${icon} ${req.method} ${req.originalUrl} -> ${status}`);
    });
    next();
});


/* ── PAGE ROUTES ── */

// FIXED: HTML files are in root-level /public, not DataBases/public
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/tipid', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'tipid.html'));
});

app.get('/techcare', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'techcare.html'));
});

app.get('/transfer', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'transfer.html'));
});


/* ── AUTH API ── */
const authRouter = express.Router();
registerAuthRoutes(authRouter);
app.use('/api/auth', authRouter);


/* ── MODULE APIs (FIXED: now properly mounted) ── */
app.use('/api/tipid',    tipidRoutes);
app.use('/api/techcare', techCareRoutes);
app.use('/api/transfer', transferRoutes);


/* ── DEVICES API ── */
const deviceRouter = express.Router();

// POST /api/devices — submit a device for assessment
deviceRouter.post('/', requireAuth, async (req, res, next) => {
    try {
        const { deviceType, brand, model, newPrice, repairCost, conditions } = req.body;

        const validation = Validator.deviceSubmission({ deviceType, brand, model, newPrice, repairCost });
        if (!validation.valid) {
            throw new AppError(validation.reason, 400, 'ERR_INVALID_DEVICE');
        }

        const device = new ElectronicDevice(
            { newPrice: Number(newPrice) || null, repairCost: Number(repairCost) || null },
            conditions || {},
            { deviceType: deviceType.toLowerCase(), brand, model, submittedBy: req.user.userId }
        );

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
                record.newPrice        || null,
                record.repairCost      || null,
                record.conditions,
                record.status,
                record.repairRatio     || null,
                record.repairThreshold || null,
                record.recommendation  || null,
            ]
        );

        res.status(201).json({
            deviceId      : result.insertId,
            recommendation: device.getRecommendation(),
            repairRatio   : device.getRepairRatio().toFixed(4),
            message       : 'Device submitted successfully.',
        });

    } catch (err) { next(err); }
});

// GET /api/devices — get all active devices for this user
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
    } catch (err) { next(err); }
});

// GET /api/devices/:id — get one device
deviceRouter.get('/:id', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT * FROM devices
             WHERE id = ? AND user_id = ? AND is_archived = 0 LIMIT 1`,
            [req.params.id, req.user.userId]
        );
        if (rows.length === 0) {
            throw new AppError('Device not found.', 404, 'ERR_DEVICE_NOT_FOUND');
        }
        res.status(200).json(rows[0]);
    } catch (err) { next(err); }
});

// PATCH /api/devices/:id/status — update device lifecycle status
deviceRouter.patch('/:id/status', requireAuth, async (req, res, next) => {
    try {
        const { status } = req.body;
        const validStatuses = Object.values(DeviceStatus);

        if (!status || !validStatuses.includes(status)) {
            throw new AppError(
                `Invalid status. Valid values: ${validStatuses.join(', ')}.`,
                400, 'ERR_INVALID_STATUS'
            );
        }

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
    } catch (err) { next(err); }
});

app.use('/api/devices', deviceRouter);


/* ── ACTIVITY LOGS API ── */
const logRouter = express.Router();

// POST /api/logs — record a module interaction
logRouter.post('/', requireAuth, async (req, res, next) => {
    try {
        const { moduleAccessed, strategyUsed } = req.body;
        const validModules = Object.values(ModuleType);

        if (!moduleAccessed || !validModules.includes(moduleAccessed)) {
            throw new AppError(
                `Invalid module. Valid values: ${validModules.join(', ')}.`,
                400, 'ERR_INVALID_MODULE'
            );
        }

        await db.execute(
            `INSERT INTO activity_logs (user_id, module_accessed, strategy_used, created_at)
             VALUES (?, ?, ?, NOW())`,
            [req.user.userId, moduleAccessed, strategyUsed || null]
        );

        res.status(201).json({ message: 'Activity logged successfully.' });
    } catch (err) { next(err); }
});

// GET /api/logs — get all logs for this user
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
    } catch (err) { next(err); }
});

app.use('/api/logs', logRouter);


/* ── DIAGNOSTIC RESULTS API ── */
const diagnosticRouter = express.Router();

// POST /api/diagnostics — save a diagnostic result
diagnosticRouter.post('/', requireAuth, async (req, res, next) => {
    try {
        const { deviceId, pathTaken, recommendation } = req.body;

        if (!deviceId || !pathTaken || !recommendation) {
            throw new AppError(
                'deviceId, pathTaken, and recommendation are required.',
                400, 'ERR_MISSING_FIELDS'
            );
        }
        if (!Array.isArray(pathTaken) || pathTaken.length === 0) {
            throw new AppError(
                'pathTaken must be a non-empty array.',
                400, 'ERR_INVALID_PATH'
            );
        }

        const [deviceRows] = await db.execute(
            'SELECT id FROM devices WHERE id = ? AND user_id = ? LIMIT 1',
            [deviceId, req.user.userId]
        );
        if (deviceRows.length === 0) {
            throw new AppError(
                'Device not found or does not belong to this user.',
                404, 'ERR_DEVICE_NOT_FOUND'
            );
        }

        const [result] = await db.execute(
            `INSERT INTO diagnostic_results
                (user_id, device_id, path_taken, recommendation, is_active, created_at)
             VALUES (?, ?, ?, ?, 1, NOW())`,
            [req.user.userId, deviceId, JSON.stringify(pathTaken), recommendation]
        );

        res.status(201).json({
            resultId      : result.insertId,
            recommendation,
            message       : 'Diagnostic result saved successfully.',
        });

    } catch (err) { next(err); }
});

// GET /api/diagnostics — get all diagnostic results for this user
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
    } catch (err) { next(err); }
});

// DELETE /api/diagnostics/:id — soft delete a diagnostic result
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
    } catch (err) { next(err); }
});

app.use('/api/diagnostics', diagnosticRouter);


/* ── 404 CATCH-ALL ── */
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
        return next(new AppError(
            `Route ${req.method} ${req.originalUrl} does not exist.`,
            404, 'ERR_ROUTE_NOT_FOUND'
        ));
    }
    res.redirect('/');
});


/* ── GLOBAL ERROR HANDLER (must be last) ── */
app.use(globalErrorHandler);


/* ── SERVER STARTUP ── */
async function startServer() {
    try {
        await initDatabase();

        app.listen(PORT, () => {
            console.log('');
            console.log('===========================================');
            console.log('  ECOCIRCUIT SERVER RUNNING');
            console.log('===========================================');
            console.log(`  URL      : http://localhost:${PORT}`);
            console.log(`  TIPID    : http://localhost:${PORT}/tipid`);
            console.log(`  TECHCARE : http://localhost:${PORT}/techcare`);
            console.log(`  TRANSFER : http://localhost:${PORT}/transfer`);
            console.log('-------------------------------------------');
            console.log(`  AUTH     : http://localhost:${PORT}/api/auth`);
            console.log(`  DEVICES  : http://localhost:${PORT}/api/devices`);
            console.log(`  LOGS     : http://localhost:${PORT}/api/logs`);
            console.log(`  DIAG     : http://localhost:${PORT}/api/diagnostics`);
            console.log(`  TIPID    : http://localhost:${PORT}/api/tipid`);
            console.log(`  TECHCARE : http://localhost:${PORT}/api/techcare`);
            console.log(`  TRANSFER : http://localhost:${PORT}/api/transfer`);
            console.log('===========================================');
            console.log('');
        });

    } catch (err) {
        console.error('[EcoCircuit] Server failed to start:', err.message);
        process.exit(1);
    }
}

startServer();

module.exports = { app };