'use strict';


const express = require('express');
const router  = express.Router();

const {
    db,
    AppError,
    ElectronicDevice,
    requireAuth,
    DeviceStatus,
    ModuleType,
} = require('../ecocircuit_main');

const { TransferFactory } = require('../modules/transfer');

/* ── Factory instance (created once, reused) ── */
const transferFactory = new TransferFactory();

/* ── Valid transfer types for confirmation ── */
const VALID_TRANSFER_TYPES = ['recycle', 'donate', 'sell', 'sellForParts', 'repair'];

/* ── Device status map for transfer confirmation ── */
const TRANSFER_STATUS_MAP = Object.freeze({
    recycle     : DeviceStatus.RECYCLED,
    donate      : DeviceStatus.DONATED,
    sell        : DeviceStatus.DONATED,
    sellForParts: DeviceStatus.RECYCLED,
    repair      : DeviceStatus.FOR_REPAIR,
});


router.post('/evaluate', requireAuth, async (req, res, next) => {
    try {
        const { deviceType, age, conditions } = req.body;

        if (!deviceType) {
            throw new AppError('deviceType is required.', 400, 'ERR_INVALID_DEVICE');
        }
        if (!conditions || typeof conditions !== 'object') {
            throw new AppError('conditions object is required.', 400, 'ERR_MISSING_CONDITIONS');
        }

        // Enrich conditions with computed age flag
        const enrichedConditions = {
            ...conditions,
            deviceAgeLessThan3: (Number(age) || 0) < 3 ? 'yes' : 'no',
        };

        // Build device instance
        const device = new ElectronicDevice(
            {},
            enrichedConditions,
            { deviceType: deviceType.toLowerCase(), age: Number(age) || 0 }
        );

        // Run TRANSFER evaluation through composite tree
        const module = transferFactory.createModule();
        const result = module.execute(device);

        // Log activity
        await db.execute(
            `INSERT INTO activity_logs
               (user_id, module_accessed, strategy_used, created_at)
             VALUES (?, ?, ?, NOW())`,
            [req.user.userId, ModuleType.TRANSFER, result.outcome || null]
        );

        res.status(200).json(result);

    } catch (err) { next(err); }
});


router.post('/evaluate/anonymous', async (req, res, next) => {
    try {
        const { deviceType, age, conditions } = req.body;

        if (!deviceType) {
            throw new AppError('deviceType is required.', 400, 'ERR_INVALID_DEVICE');
        }
        if (!conditions || typeof conditions !== 'object') {
            throw new AppError('conditions object is required.', 400, 'ERR_MISSING_CONDITIONS');
        }

        const enrichedConditions = {
            ...conditions,
            deviceAgeLessThan3: (Number(age) || 0) < 3 ? 'yes' : 'no',
        };

        const device = new ElectronicDevice(
            {},
            enrichedConditions,
            { deviceType: deviceType.toLowerCase(), age: Number(age) || 0 }
        );

        const module = transferFactory.createModule();
        const result = module.execute(device);

        res.status(200).json(result);

    } catch (err) { next(err); }
});


router.get('/options', (req, res, next) => {
    try {
        const module = transferFactory.createModule();
        res.status(200).json({ options: module.getAllDisposalOptions() });
    } catch (err) { next(err); }
});



router.get('/options/:type', (req, res, next) => {
    try {
        const module = transferFactory.createModule();
        const option = module.getDisposalOption(req.params.type);
        res.status(200).json({ type: req.params.type, ...option });
    } catch (err) { next(err); }
});



router.post('/confirm', requireAuth, async (req, res, next) => {
    try {
        const { deviceId, transferType, outcome } = req.body;

        if (!deviceId || !transferType || !outcome) {
            throw new AppError(
                'deviceId, transferType, and outcome are required.',
                400,
                'ERR_MISSING_FIELDS'
            );
        }
        if (!VALID_TRANSFER_TYPES.includes(transferType)) {
            throw new AppError(
                `Invalid transfer type. Valid values: ${VALID_TRANSFER_TYPES.join(', ')}.`,
                400,
                'ERR_INVALID_TRANSFER'
            );
        }

        const newStatus  = TRANSFER_STATUS_MAP[transferType];
        const isArchived = ['recycle', 'donate', 'sell', 'sellForParts'].includes(transferType) ? 1 : 0;

        // Update device status and archive if necessary
        const [result] = await db.execute(
            `UPDATE devices
             SET status = ?, is_archived = ?, updated_at = NOW()
             WHERE id = ? AND user_id = ?`,
            [newStatus, isArchived, deviceId, req.user.userId]
        );

        if (result.affectedRows === 0) {
            throw new AppError(
                'Device not found or update not permitted.',
                404,
                'ERR_DEVICE_NOT_FOUND'
            );
        }

        // Log transfer confirmation
        await db.execute(
            `INSERT INTO activity_logs
               (user_id, module_accessed, strategy_used, created_at)
             VALUES (?, ?, ?, NOW())`,
            [req.user.userId, ModuleType.TRANSFER, `${transferType}:${outcome}`]
        );

        res.status(200).json({
            deviceId,
            transferType,
            newStatus,
            message: `Transfer confirmed. Device status updated to "${newStatus}".`,
        });

    } catch (err) { next(err); }
});



router.get('/history', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, module_accessed, strategy_used, created_at
             FROM activity_logs
             WHERE user_id = ? AND module_accessed = ?
             ORDER BY created_at DESC`,
            [req.user.userId, ModuleType.TRANSFER]
        );
        res.status(200).json({ history: rows });
    } catch (err) { next(err); }
});


/*EXPORT*/
module.exports = router;