'use strict';

const express = require('express');
const router  = express.Router();

const {
    db,
    AppError,
    requireAuth,
    ModuleType,
} = require('../EcoCircuit');

const { TechCareFactory } = require('../Modules/TechCareModule');

/* Factory instance — created once and reused */
const techCareFactory = new TechCareFactory();

/* Valid device types accepted by Tech-Care */
const VALID_TECHCARE_TYPES = ['cellphone', 'laptop', 'tablet', 'desktop'];

/* Valid intent types for the chatbot entry point */
const VALID_INTENTS = ['fix_yourself', 'find_location'];


/* -------------------------------------------
   POST /api/techcare/start
   Initializes a new Tech-Care chatbot session.
   Now requires an intent to split the flow
   between DIY repair and directory lookup.

   AUTH: Required

   Body: {
     deviceType : "laptop",
     intent     : "fix_yourself" | "find_location"
   }
   ------------------------------------------- */
router.post('/start', requireAuth, async (req, res, next) => {
    try {
        const { deviceType, intent } = req.body;

        if (!deviceType || !VALID_TECHCARE_TYPES.includes(deviceType)) {
            throw new AppError(
                `Invalid device type. Valid values: ${VALID_TECHCARE_TYPES.join(', ')}.`,
                400,
                'ERR_INVALID_DEVICE_TYPE'
            );
        }

        if (!intent || !VALID_INTENTS.includes(intent)) {
            throw new AppError(
                `Invalid intent. Valid values: ${VALID_INTENTS.join(', ')}.`,
                400,
                'ERR_INVALID_INTENT'
            );
        }

        // Log session start
        await db.execute(
            `INSERT INTO activity_logs
               (user_id, module_accessed, strategy_used, created_at)
             VALUES (?, ?, ?, NOW())`,
            [req.user.userId, ModuleType.TECHCARE, intent]
        );

        // If intent is find_location, return location data immediately
        if (intent === 'find_location') {
            return res.status(200).json({
                moduleId   : 'TECHCARE-MODULE-001',
                moduleName : 'TECH-CARE',
                intent,
                deviceType,
                message    : 'Welcome to EcoCircuit Tech-Care Directory. Here are the available locations.',
                locations  : getLocationDirectory(),
            });
        }

        // If intent is fix_yourself, start the diagnostic chatbot
        const module = techCareFactory.createModule(deviceType);
        const result = module.execute();

        res.status(200).json({
            ...result,
            intent,
        });

    } catch (err) { next(err); }
});


/* -------------------------------------------
   POST /api/techcare/chatbot/message
   Processes a single user message in the
   Tech-Care DIY diagnostic chatbot flow.

   The new flow adds a DAMAGE_TYPE step before
   the existing flow: external | internal | both | unknown.

   AUTH: Required

   Body: {
     deviceType    : "laptop",
     userInput     : "external",
     messageHistory: [
       { role: "user", content: "external", state: "DAMAGE_TYPE" },
       ...
     ]
   }

   Response (in-progress):
   {
     botMessage   : "...",
     currentState : "SEVERITY_CHECK",
     isComplete   : false,
     nextPrompt   : { state, message, inputType, choices: [...] }
   }

   Response (complete):
   {
     botMessage   : "...",
     currentState : "OUTCOME",
     isComplete   : true,
     nextPrompt   : {
       state  : "OUTCOME",
       result : { outcome, message, tutorial | repairShops, ... }
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
        const module = techCareFactory.createModule(deviceType);

        if (Array.isArray(messageHistory) && messageHistory.length > 0) {
            const userMessages = messageHistory.filter(m => m.role === 'user');
            for (const msg of userMessages) {
                if (!module.isComplete()) {
                    module.processMessage(msg.content);
                }
            }
        }

        // Process the new user input
        const result = module.processMessage(String(userInput));

        // Update activity log when session completes
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
   POST /api/techcare/chatbot/prompt
   Returns the current chatbot prompt without
   advancing state (used for page reloads).
   AUTH: Required
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
   POST /api/techcare/tutorial-search
   Searches for YouTube tutorials and device
   manuals using the Anthropic Claude API.
   Used when the chatbot cannot find a local
   tutorial for the specific device/model.

   AUTH: Required

   Body: {
     brand    : "Samsung",
     model    : "Galaxy S22",
     issue    : "battery_charging",
     issueLabel: "Battery or Charging Issue"
   }

   Response: {
     brand, model, issue,
     tutorialLinks: [
       { title, url, type: "youtube" | "manual", platform }
     ],
     searchQuery: "Samsung Galaxy S22 battery replacement tutorial"
   }
   ------------------------------------------- */
router.post('/tutorial-search', requireAuth, async (req, res, next) => {
    try {
        const { brand, model, issue, issueLabel } = req.body;

        if (!brand || !model || !issue) {
            throw new AppError(
                'brand, model, and issue are required.',
                400,
                'ERR_MISSING_FIELDS'
            );
        }

        // Build the search query
        const searchQuery = `${brand} ${model} ${issueLabel || issue.replace(/_/g, ' ')} fix repair tutorial`;

        // Call the Anthropic Claude API with web search tool
        // to find relevant tutorials and manuals
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method : 'POST',
            headers: {
                'Content-Type'      : 'application/json',
                'anthropic-version' : '2023-06-01',
                'anthropic-beta'    : 'web-search-2025-03-05',
            },
            body: JSON.stringify({
                model      : 'claude-sonnet-4-20250514',
                max_tokens : 1024,
                tools: [
                    {
                        type: 'web_search_20250305',
                        name: 'web_search',
                    },
                ],
                system: `You are a device repair assistant. Given a device brand, model, and issue, 
                         search the web and return ONLY a JSON array (no markdown, no explanation) 
                         of the top 4 most relevant repair tutorials or manuals.
                         Each item must have: title (string), url (string), type ("youtube" or "manual"), platform (string).
                         Prefer official manufacturer manuals and iFixit guides for manuals; 
                         prefer well-known repair YouTube channels.
                         Return ONLY valid JSON array. No other text.`,
                messages: [
                    {
                        role   : 'user',
                        content: `Find repair tutorials for: ${brand} ${model} — issue: ${issueLabel || issue.replace(/_/g, ' ')}. Search query: "${searchQuery}"`,
                    },
                ],
            }),
        });

        if (!anthropicResponse.ok) {
            const errBody = await anthropicResponse.text();
            console.error('[TechCare] Anthropic API error:', errBody);
            throw new AppError(
                'Failed to fetch tutorials from AI search. Please try again.',
                502,
                'ERR_ANTHROPIC_API'
            );
        }

        const anthropicData = await anthropicResponse.json();

        // Extract the text response from content blocks
        const textContent = (anthropicData.content || [])
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('');

        // Parse the JSON array from the response
        let tutorialLinks = [];
        try {
            const cleaned = textContent.replace(/```json|```/g, '').trim();
            tutorialLinks = JSON.parse(cleaned);
            if (!Array.isArray(tutorialLinks)) tutorialLinks = [];
        } catch (parseErr) {
            console.warn('[TechCare] Failed to parse tutorial JSON:', parseErr.message);
            tutorialLinks = [];
        }

        // Log tutorial search in activity_logs
        await db.execute(
            `UPDATE activity_logs SET strategy_used = ?
             WHERE user_id = ? AND module_accessed = ?
             ORDER BY created_at DESC LIMIT 1`,
            [
                `tutorial_search:${brand}:${model}:${issue}`,
                req.user.userId,
                ModuleType.TECHCARE,
            ]
        );

        res.status(200).json({
            brand,
            model,
            issue,
            searchQuery,
            tutorialLinks,
        });

    } catch (err) { next(err); }
});


/* -------------------------------------------
   POST /api/techcare/diagnostic/save
   Saves a completed Tech-Care session to
   diagnostic_results in the database.
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
   GET /api/techcare/locations
   Returns the full directory of repair shops
   AND campus e-waste bin locations.
   AUTH: PUBLIC
   ------------------------------------------- */
router.get('/locations', (req, res) => {
    res.status(200).json({ locations: getLocationDirectory() });
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


/* -------------------------------------------
   HELPER: getLocationDirectory()
   Returns the combined list of repair shops
   and campus e-waste bin locations.
   ------------------------------------------- */
function getLocationDirectory() {
    return {
        repairShops: [
            {
                id       : 'dan',
                name     : 'Dan The Technician Repair',
                type     : 'repair',
                image    : 'Dan_The_Technician.jpg',
                address  : '803 Alex, Sampaloc, Manila (Near NU)',
                direction: 'From NU, walk straight down Fajardo St. Walk straight for 3 blocks.',
                services : ['Cellphone repair', 'Screen replacement', 'Battery replacement', 'Data recovery'],
                hours    : 'Mon–Sat: 9AM–7PM',
            },
            {
                id       : 'tovy',
                name     : "Tovy's Cellphone Repair",
                type     : 'repair',
                image    : "Tovy's_Cellphone_Repair.jpg",
                address  : '1953 Florentino St, Sampaloc, Manila',
                direction: 'From NU, walk towards Earnshaw/Lacson intersection. Located on the left side.',
                services : ['Cellphone repair', 'Screen replacement', 'Charging port repair'],
                hours    : 'Mon–Sat: 9AM–6PM',
            },
            {
                id       : 'orbanthic',
                name     : 'Orbanthics Repair Shop',
                type     : 'repair',
                image    : 'Orbanthic.jpg',
                address  : '639 Delos Santos St, Sampaloc, Manila',
                direction: 'From NU, walk towards San Anton St. Right next to the convenience store.',
                services : ['General device repair', 'Laptop repair', 'Software troubleshooting'],
                hours    : 'Mon–Fri: 9AM–6PM',
            },
        ],
        eWasteBins: [
            {
                id       : 'annex',
                name     : 'NU Annex 2 — 1st Floor Bin',
                type     : 'waste',
                image    : 'Annex2_1st_Floor.jpg',
                address  : 'National University Annex 2, 1st Floor Lobby',
                direction: 'Go to the 1st floor lobby, next to the main staircase.',
                accepts  : ['Old phones', 'Batteries', 'Cables', 'Small electronics'],
            },
            {
                id       : 'jmb',
                name     : 'NU JMB — 1st Floor Bin',
                type     : 'waste',
                image    : 'JMB_1st_Floor.jpg',
                address  : 'Jhocson Memorial Building, 1st Floor',
                direction: 'Located near the main entrance guard desk.',
                accepts  : ['Old phones', 'Tablets', 'Chargers', 'Accessories'],
            },
            {
                id       : 'mb',
                name     : 'NU Main Building — 5th Floor Bin',
                type     : 'waste',
                image    : 'MB_5th_Floor.jpg',
                address  : 'Main Building, 5th Floor IT Lobby',
                direction: 'Take the elevator to the 5th floor, near the server rooms.',
                accepts  : ['Laptops', 'Desktop components', 'Hard drives', 'Peripherals'],
            },
        ],
    };
}


module.exports = router;