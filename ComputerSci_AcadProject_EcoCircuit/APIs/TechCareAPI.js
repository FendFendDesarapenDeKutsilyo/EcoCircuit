'use strict';

const express = require('express');
const router  = express.Router();

// FIXED: correct filename and path
const {
    db,
    AppError,
    requireAuth,
    ModuleType,
} = require('../EcoCircuit');

// FIXED: correct folder name (Modules) and file name (TechCareModule)
const { TechCareFactory } = require('../Modules/TechCareModule');

/* Factory instance — created once and reused */
const techCareFactory = new TechCareFactory();

/* Valid device types accepted by Tech-Care */
const VALID_TECHCARE_TYPES = ['cellphone', 'laptop', 'tablet', 'desktop'];


/* -------------------------------------------
   POST /api/techcare/start
   Initializes a new Tech-Care chatbot session.
   Returns the module description and first
   chatbot prompt question.
   AUTH: Required

   Body: { deviceType: "laptop" }
   ------------------------------------------- */
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


/* -------------------------------------------
   POST /api/techcare/chatbot/message
   Processes a single user message in the
   Tech-Care chatbot flow.

   The frontend sends the user's selected
   choice key and the full conversation history
   so the server can rebuild the chatbot state.

   AUTH: Required

   Body: {
     deviceType    : "laptop",
     userInput     : "external",    // the choice key selected
     messageHistory: [              // full history to rebuild state
       { role: "user", content: "external", state: "DAMAGE_CATEGORY" },
       { role: "assistant", content: "...", state: "SEVERITY_CHECK" }
     ]
   }

   Response when chatbot is still running:
   {
     botMessage   : "Got it — checking severity...",
     currentState : "SEVERITY_CHECK",
     isComplete   : false,
     nextPrompt   : { state, message, inputType, choices: [...] }
   }

   Response when chatbot is complete:
   {
     botMessage   : "Analysis complete.",
     currentState : "OUTCOME",
     isComplete   : true,
     nextPrompt   : {
       state  : "OUTCOME",
       result : { outcome, message, tutorial OR repairShops, ... }
     }
   }
   ------------------------------------------- */
router.post('/chatbot/message', requireAuth, async (req, res, next) => {
    try {
        const { deviceType, userInput, messageHistory } = req.body;

        if (!deviceType || userInput === undefined) {
            throw new AppError(
                'deviceType and userInput are required.',
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

        // Rebuild a fresh module instance and replay the message history
        // to restore the chatbot's internal state before processing new input
        const module = techCareFactory.createModule(deviceType);

        if (Array.isArray(messageHistory) && messageHistory.length > 0) {
            const userMessages = messageHistory.filter(m => m.role === 'user');
            for (const msg of userMessages) {
                // Replay each previous user choice to advance the state machine
                if (!module.isComplete()) {
                    module.processMessage(msg.content);
                }
            }
        }

        // Process the new user input
        const result = module.processMessage(String(userInput));

        // If the chatbot just completed, update the activity log with strategy used
        if (result.isComplete && result.nextPrompt?.result?.outcome) {
            await db.execute(
                `UPDATE activity_logs SET strategy_used = ?
                 WHERE user_id = ? AND module_accessed = ?
                 ORDER BY created_at DESC LIMIT 1`,
                [
                    result.nextPrompt.result.outcome || null,
                    req.user.userId,
                    ModuleType.TECHCARE,
                ]
            );
        }

        res.status(200).json(result);

    } catch (err) { next(err); }
});


/* -------------------------------------------
   GET /api/techcare/chatbot/prompt
   Returns the current chatbot prompt without
   advancing state. Used when the frontend needs
   to re-render the current question after a
   page reload or refresh.

   AUTH: Required

   Body: {
     deviceType    : "laptop",
     messageHistory: [ ... ]   // previous messages to rebuild state
   }
   ------------------------------------------- */
router.post('/chatbot/prompt', requireAuth, (req, res, next) => {
    try {
        const { deviceType, messageHistory } = req.body;

        if (!deviceType) {
            throw new AppError('deviceType is required.', 400, 'ERR_MISSING_FIELDS');
        }

        const module = techCareFactory.createModule(deviceType);

        if (Array.isArray(messageHistory) && messageHistory.length > 0) {
            const userMessages = messageHistory.filter(m => m.role === 'user');
            for (const msg of userMessages) {
                if (!module.isComplete()) {
                    module.processMessage(msg.content);
                }
            }
        }

        res.status(200).json(module.getNextPrompt());

    } catch (err) { next(err); }
});


/* -------------------------------------------
   POST /api/techcare/diagnostic/save
   Saves the completed Tech-Care session result
   to diagnostic_results in the database.
   AUTH: Required

   Body: {
     deviceId      : 45,
     sessionSummary: { damageCategory, severityLevel, specificIssue, ... },
     recommendation: "Fix yourself — follow Battery guide..."
   }
   ------------------------------------------- */
router.post('/diagnostic/save', requireAuth, async (req, res, next) => {
    try {
        const { deviceId, sessionSummary, recommendation } = req.body;

        if (!deviceId || !sessionSummary || !recommendation) {
            throw new AppError(
                'deviceId, sessionSummary, and recommendation are required.',
                400,
                'ERR_MISSING_FIELDS'
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
            [
                req.user.userId,
                deviceId,
                JSON.stringify(sessionSummary),
                recommendation,
            ]
        );

        res.status(201).json({
            resultId      : result.insertId,
            recommendation,
            message       : 'Diagnostic result saved successfully.',
        });

    } catch (err) { next(err); }
});


/* -------------------------------------------
   GET /api/techcare/diagnostic/history
   Returns all saved diagnostic results for
   the authenticated user.
   AUTH: Required
   ------------------------------------------- */
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


/* -------------------------------------------
   DELETE /api/techcare/diagnostic/:id
   Soft-deletes a diagnostic result.
   AUTH: Required
   ------------------------------------------- */
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


/* -------------------------------------------
   GET /api/techcare/tutorials
   Returns the full tutorial library grouped
   by hardware and software categories.
   AUTH: PUBLIC
   ------------------------------------------- */
router.get('/tutorials', (req, res, next) => {
    try {
        const module = techCareFactory.createModule('laptop');
        res.status(200).json({ tutorials: module.getTutorialLibrary() });
    } catch (err) { next(err); }
});


/* -------------------------------------------
   GET /api/techcare/tutorials/:issueKey
   Returns the tutorial for a specific issue.
   AUTH: PUBLIC
   ------------------------------------------- */
router.get('/tutorials/:issueKey', (req, res, next) => {
    try {
        const module   = techCareFactory.createModule('laptop');
        const tutorial = module.getTutorial(req.params.issueKey);
        res.status(200).json({ issueKey: req.params.issueKey, tutorial });
    } catch (err) { next(err); }
});


/* -------------------------------------------
   GET /api/techcare/repair-shops
   Returns all repair shops in the directory.
   AUTH: PUBLIC
   ------------------------------------------- */
router.get('/repair-shops', (req, res, next) => {
    try {
        const module = techCareFactory.createModule('laptop');
        res.status(200).json({ shops: module.getRepairShops() });
    } catch (err) { next(err); }
});


/* -------------------------------------------
   GET /api/techcare/strategies
   Returns metadata about outcome strategies.
   AUTH: PUBLIC
   ------------------------------------------- */
router.get('/strategies', (req, res) => {
    res.status(200).json({
        strategies: [
            {
                name       : 'FixYourselfStrategy',
                label      : 'Fix It Yourself',
                icon       : 'tool',
                description: 'Step-by-step DIY tutorial for issues safe to resolve independently.',
            },
            {
                name       : 'FindRepairShopStrategy',
                label      : 'Find a Repair Shop',
                icon       : 'shop',
                description: 'Professional repair shop guidance for severe or complex issues.',
            },
        ],
    });
});


module.exports = router;