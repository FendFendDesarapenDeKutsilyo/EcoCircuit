'use strict';


const express = require('express');
const router  = express.Router();

const {
    db,
    AppError,
    requireAuth,
    ModuleType,
} = require('../ecocircuit_main');

const { TechCareFactory } = require('../modules/techcare');

/* ── Factory instance (created once, reused) ── */
const techCareFactory = new TechCareFactory();

/* ── Valid device types for Tech-Care ── */
const VALID_TECHCARE_TYPES = ['cellphone', 'laptop', 'tablet', 'desktop'];


router.post('/start', requireAuth, async (req, res, next) => {
    try {
        const { deviceType } = req.body;

        if (!deviceType || !VALID_TECHCARE_TYPES.includes(deviceType)) {
            throw new AppError(
                `Invalid device type. Valid values: ${VALID_TECHCARE_TYPES.join(', ')}.`,
                400,
                'ERR_INVALID_DEVICE_TYPE'
            );
        }

        const module = techCareFactory.createModule(deviceType);
        const result = module.execute();

        // Log session start
        await db.execute(
            `INSERT INTO activity_logs
               (user_id, module_accessed, strategy_used, created_at)
             VALUES (?, ?, ?, NOW())`,
            [req.user.userId, ModuleType.TECHCARE, null]
        );

        res.status(200).json(result);

    } catch (err) { next(err); }
});


router.post('/stage/answer', requireAuth, async (req, res, next) => {
    try {
        const { deviceType, stageIndex, isYes, detectedIssues } = req.body;

        if (deviceType === undefined || stageIndex === undefined || isYes === undefined) {
            throw new AppError(
                'deviceType, stageIndex, and isYes are required.',
                400,
                'ERR_MISSING_FIELDS'
            );
        }
        if (!VALID_TECHCARE_TYPES.includes(deviceType)) {
            throw new AppError(
                `Invalid device type. Valid values: ${VALID_TECHCARE_TYPES.join(', ')}.`,
                400,
                'ERR_INVALID_DEVICE_TYPE'
            );
        }

        // Rebuild module and fast-forward to current stage index
        const module = techCareFactory.createModule(deviceType);
        if (Array.isArray(detectedIssues) && stageIndex > 0) {
            for (let i = 0; i < stageIndex; i++) {
                module.processStageAnswer(false);
            }
        }

        const result = module.processStageAnswer(Boolean(isYes));
        res.status(200).json(result);

    } catch (err) { next(err); }
});


router.post('/chatbot/answer', requireAuth, async (req, res, next) => {
    try {
        const { deviceType, isYes, pathTaken } = req.body;

        if (deviceType === undefined || isYes === undefined) {
            throw new AppError(
                'deviceType and isYes are required.',
                400,
                'ERR_MISSING_FIELDS'
            );
        }

        // Rebuild module and replay path to restore tree state
        const module = techCareFactory.createModule(deviceType);
        if (Array.isArray(pathTaken) && pathTaken.length > 0) {
            for (const step of pathTaken) {
                if (module.getChatbotQuestion() === null) break;
                module.processChatbotAnswer(step.answer === 'Yes');
            }
        }

        const result = module.processChatbotAnswer(Boolean(isYes));

        // Update log with strategy if tree is complete
        if (result.isComplete) {
            await db.execute(
                `UPDATE activity_logs SET strategy_used = ?
                 WHERE user_id = ? AND module_accessed = ?
                 ORDER BY created_at DESC LIMIT 1`,
                [result.strategyResult?.strategy || null, req.user.userId, ModuleType.TECHCARE]
            );
        }

        res.status(200).json(result);

    } catch (err) { next(err); }
});


router.post('/diagnostic/save', requireAuth, async (req, res, next) => {
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
                'pathTaken must be a non-empty array.',
                400,
                'ERR_INVALID_PATH'
            );
        }

        // Verify device belongs to this user
        const [deviceRows] = await db.execute(
            'SELECT id FROM devices WHERE id = ? AND user_id = ? LIMIT 1',
            [deviceId, req.user.userId]
        );
        if (deviceRows.length === 0) {
            throw new AppError(
                'Device not found or does not belong to this user.',
                404,
                'ERR_DEVICE_NOT_FOUND'
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


router.get('/diagnostic/history', requireAuth, async (req, res, next) => {
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


router.delete('/diagnostic/:id', requireAuth, async (req, res, next) => {
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


router.get('/strategies', (req, res) => {
    res.status(200).json({
        strategies: [
            {
                name       : 'DIYRepairStrategy',
                label      : 'DIY Repair',
                icon       : '🔧',
                description: 'Step-by-step self-repair guidance for minor and moderate issues.',
            },
            {
                name       : 'ProfessionalRepairStrategy',
                label      : 'Professional Repair',
                icon       : '🛠️',
                description: 'Referral to a certified repair center for complex hardware issues.',
            },
            {
                name       : 'RefurbishStrategy',
                label      : 'Refurbish or Resale',
                icon       : '♻️',
                description: 'Guidance on refurbishing or selling a device that still has residual value.',
            },
            {
                name       : 'DisposeStrategy',
                label      : 'Responsible Disposal',
                icon       : '🗑️',
                description: 'Directed disposal through certified e-waste recycling or donation channels.',
            },
        ],
    });
});


/* EXPORTS
    */
module.exports = router;