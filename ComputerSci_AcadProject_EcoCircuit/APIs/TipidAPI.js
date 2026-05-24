'use strict';

const express = require('express');
const router  = express.Router();

const {
    db,
    AppError,
    ElectronicDevice,
    requireAuth,
    ModuleType,
    Validator,
} = require('../ecocircuit_main');

const { TipidFactory } = require('../modules/tipid');

/* ── Factory instance (created once, reused) ── */
const tipidFactory = new TipidFactory();


router.post('/evaluate', requireAuth, async (req, res, next) => {
    try {
        const { deviceType, age, newPrice, repairCost, conditions } = req.body;

        // Validate required fields
        const validation = Validator.deviceSubmission({
            deviceType,
            brand     : 'N/A',
            model     : 'N/A',
            newPrice,
            repairCost,
        });
        if (!validation.valid) {
            throw new AppError(validation.reason, 400, 'ERR_INVALID_DEVICE');
        }
        if (age === undefined || isNaN(age)) {
            throw new AppError('Device age is required.', 400, 'ERR_MISSING_AGE');
        }

        // Build ElectronicDevice instance
        const device = new ElectronicDevice(
            { newPrice: Number(newPrice), repairCost: Number(repairCost) },
            conditions || {},
            { deviceType: deviceType.toLowerCase(), age: Number(age) }
        );

        // Run TIPID evaluation through strategy chain
        const module = tipidFactory.createModule();
        const result = module.execute(device);

        // Log activity to database
        await db.execute(
            `INSERT INTO activity_logs
               (user_id, module_accessed, strategy_used, created_at)
             VALUES (?, ?, ?, NOW())`,
            [req.user.userId, ModuleType.TIPID, result.strategy || null]
        );

        res.status(200).json(result);

    } catch (err) { next(err); }
});



router.get('/tips', requireAuth, (req, res, next) => {
    try {
        const module   = tipidFactory.createModule();
        const category = req.query.category || null;

        if (category) {
            const tipData = module.getTips(category);
            res.status(200).json({ category, tips: tipData });
        } else {
            const categories = module.getTipCategories();
            const all        = {};
            categories.forEach(cat => { all[cat] = module.getTips(cat); });
            res.status(200).json({ categories, tips: all });
        }

    } catch (err) { next(err); }
});



router.get('/tips/random', requireAuth, (req, res, next) => {
    try {
        const count    = parseInt(req.query.count) || 3;
        const category = req.query.category || null;
        const module   = tipidFactory.createModule();
        const tipData  = module.getRandomTips(count, category);
        res.status(200).json({ count: tipData.length, tips: tipData });
    } catch (err) { next(err); }
});



router.get('/categories', (req, res, next) => {
    try {
        const module = tipidFactory.createModule();
        res.status(200).json({ categories: module.getTipCategories() });
    } catch (err) { next(err); }
});


/* EXPORT */
module.exports = router;