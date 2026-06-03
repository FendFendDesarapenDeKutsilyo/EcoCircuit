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
} = require('../EcoCircuit');

const { TransferFactory } = require('../Modules/TransferModule');

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


/* ══════════════════════════════════════════════════════════════════════
   PART PRICE DATABASE (PHP — mid-2024 Carousell / Greenhills estimates)
   ══════════════════════════════════════════════════════════════════════ */
const PART_PRICES = Object.freeze({
    smartphone: {
        screen        : { min: 300,  max: 2500,  label: 'Display / Digitizer Assembly'   },
        battery       : { min: 150,  max: 800,   label: 'Battery Pack'                    },
        motherboard   : { min: 500,  max: 5000,  label: 'Motherboard / Logic Board'       },
        camera        : { min: 200,  max: 1800,  label: 'Camera Module (rear + front)'    },
        charging_port : { min: 80,   max: 350,   label: 'Charging Port / Flex Cable'      },
        housing       : { min: 100,  max: 600,   label: 'Back Cover / Frame'              },
    },
    laptop: {
        screen        : { min: 800,  max: 6000,  label: 'LCD / LED Panel Assembly'        },
        battery       : { min: 400,  max: 2500,  label: 'Laptop Battery Pack'             },
        motherboard   : { min: 1000, max: 12000, label: 'Motherboard / CPU Board'         },
        ram           : { min: 300,  max: 2000,  label: 'RAM Module(s)'                   },
        storage       : { min: 200,  max: 3000,  label: 'SSD / HDD'                       },
        keyboard      : { min: 150,  max: 1200,  label: 'Keyboard Assembly'               },
        gpu           : { min: 500,  max: 8000,  label: 'Discrete GPU (if present)'       },
        charger       : { min: 200,  max: 1500,  label: 'Power Adapter / Charger'         },
    },
    tablet: {
        screen        : { min: 500,  max: 4000,  label: 'LCD + Digitizer Assembly'        },
        battery       : { min: 250,  max: 1200,  label: 'Battery Pack'                    },
        motherboard   : { min: 600,  max: 6000,  label: 'Motherboard'                     },
        camera        : { min: 150,  max: 1000,  label: 'Camera Module'                   },
        charging_port : { min: 100,  max: 500,   label: 'Charging Port / USB Board'       },
        housing       : { min: 200,  max: 1200,  label: 'Back Panel / Frame'              },
    },
    desktop: {
        cpu           : { min: 500,  max: 10000, label: 'Processor (CPU)'                 },
        gpu           : { min: 500,  max: 20000, label: 'Graphics Card (GPU)'             },
        ram           : { min: 200,  max: 4000,  label: 'RAM Module(s)'                   },
        storage       : { min: 150,  max: 4000,  label: 'SSD / HDD'                       },
        motherboard   : { min: 500,  max: 8000,  label: 'Motherboard'                     },
        psu           : { min: 300,  max: 3000,  label: 'Power Supply Unit (PSU)'         },
        case          : { min: 200,  max: 2500,  label: 'PC Case / Chassis'               },
        cooler        : { min: 150,  max: 2000,  label: 'CPU Cooler / Heatsink'           },
    },
    peripheral: {
        pcb           : { min: 50,   max: 800,   label: 'Main PCB / Controller Board'     },
        cable         : { min: 30,   max: 300,   label: 'USB / Interface Cables'          },
        housing       : { min: 50,   max: 500,   label: 'Outer Housing / Shell'           },
        switches      : { min: 100,  max: 1500,  label: 'Mechanical Switches (if present)'},
    },
    other: {
        components    : { min: 50,   max: 2000,  label: 'Miscellaneous Components'        },
        housing       : { min: 50,   max: 500,   label: 'Outer Housing'                   },
    },
});

/* ══════════════════════════════════════════════════════════════════════
   WHOLE-DEVICE RESALE PRICE BANDS (PHP)
   ══════════════════════════════════════════════════════════════════════ */
const WHOLE_DEVICE_PRICES = Object.freeze({
    smartphone: {
        premium   : { min: 6000,  max: 25000 },
        good      : { min: 3000,  max: 18000 },
        fair      : { min: 1500,  max: 8000  },
        poor      : { min: 300,   max: 2500  },
    },
    laptop: {
        premium   : { min: 15000, max: 55000 },
        good      : { min: 8000,  max: 45000 },
        fair      : { min: 4000,  max: 20000 },
        poor      : { min: 1500,  max: 8000  },
    },
    tablet: {
        premium   : { min: 6000,  max: 28000 },
        good      : { min: 3000,  max: 20000 },
        fair      : { min: 1500,  max: 9000  },
        poor      : { min: 500,   max: 4000  },
    },
    desktop: {
        premium   : { min: 12000, max: 50000 },
        good      : { min: 6000,  max: 35000 },
        fair      : { min: 3000,  max: 15000 },
        poor      : { min: 1000,  max: 6000  },
    },
    peripheral: {
        premium   : { min: 600,   max: 8000  },
        good      : { min: 300,   max: 5000  },
        fair      : { min: 100,   max: 2500  },
        poor      : { min: 50,    max: 800   },
    },
    other: {
        premium   : { min: 300,   max: 6000  },
        good      : { min: 200,   max: 5000  },
        fair      : { min: 100,   max: 2000  },
        poor      : { min: 50,    max: 500   },
    },
});


/* ══════════════════════════════════════════════════════════════════════
   MASTER QUESTION BANK
   Hierarchical, general-to-specific question definitions.
   Each question carries:
     - id          : condition key used by the decision tree
     - stage       : 'general' | 'functional' | 'damage' | 'parts' | 'specific'
     - order       : sort order within stage
     - question    : user-facing question text
     - hint        : brief educational tooltip
     - type        : 'yesno' | 'select'
     - options     : (select only) array of { value, label }
     - showWhen    : object of { conditionKey: requiredValue } — all must match to show
     - treeKey     : the condition key this answer feeds into the decision tree
   ══════════════════════════════════════════════════════════════════════ */
const QUESTION_BANK = Object.freeze([

    /* ── STAGE 1: GENERAL — Power & Basic Status ─────────────────────
       These questions apply to every device and are always shown first.
       They quickly gate the two main paths: powered-on vs. off.
       ────────────────────────────────────────────────────────────────── */
    {
        id       : 'powersOn',
        stage    : 'general',
        order    : 1,
        question : 'Does the device still power on?',
        hint     : 'Press and hold the power button for 5–10 seconds. Any sign of life — screen flash, vibration, or sound — counts as powering on.',
        type     : 'yesno',
        treeKey  : 'powersOn',
        showWhen : {},
    },
    {
        id       : 'deviceAge',
        stage    : 'general',
        order    : 2,
        question : 'Approximately how old is the device?',
        hint     : 'Device age significantly affects whether repair is economically viable.',
        type     : 'select',
        treeKey  : 'deviceAgeLessThan3',  // API converts this to yes/no
        options  : [
            { value: '0', label: 'Less than 1 year old' },
            { value: '1', label: '1–2 years old'        },
            { value: '2', label: '2–3 years old'        },
            { value: '4', label: '4–5 years old'        },
            { value: '6', label: 'More than 5 years old'},
        ],
        showWhen : {},
    },


    /* ── STAGE 2: FUNCTIONAL — For devices that power on ────────────
       Entered only if powersOn === 'yes'.
       Checks safety, display, and operational status.
       ────────────────────────────────────────────────────────────────── */
    {
        id       : 'batterySwollen',
        stage    : 'functional',
        order    : 1,
        question : 'Is the battery visibly swollen or bulging?',
        hint     : 'A swollen battery causes the back cover to lift or the device body to warp. This is a critical safety hazard — handle immediately.',
        type     : 'yesno',
        treeKey  : 'batterySwollen',
        showWhen : { powersOn: 'yes' },
    },
    {
        id       : 'screenFunctional',
        stage    : 'functional',
        order    : 2,
        question : 'Is the display fully functional?',
        hint     : 'Check for a complete image, touch responsiveness, and absence of black bleed lines or dead zones.',
        type     : 'yesno',
        treeKey  : 'screenFunctional',
        showWhen : { powersOn: 'yes', batterySwollen: 'no' },
    },
    {
        id       : 'batteryHealthAbove80',
        stage    : 'functional',
        order    : 3,
        question : 'Is battery health above 80% (or does the battery last most of the day)?',
        hint     : 'On iOS: Settings → Battery → Battery Health. On Android: use AccuBattery or similar. Laptops: check manufacturer utility. If unsure, estimate based on daily usage.',
        type     : 'yesno',
        treeKey  : 'batteryHealthAbove80',
        showWhen : { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
    },
    {
        id       : 'touchWorking',
        stage    : 'functional',
        order    : 4,
        question : 'Is the touchscreen (or trackpad / input method) fully responsive?',
        hint     : 'Test multiple touch points. Dead zones, ghost touches, or unresponsive areas reduce the device\'s usability and resale value.',
        type     : 'yesno',
        treeKey  : 'touchWorking',
        showWhen : { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
    },
    {
        id       : 'speakerMicWorking',
        stage    : 'functional',
        order    : 5,
        question : 'Do the speaker and microphone work correctly?',
        hint     : 'Play audio and make a test call or voice recording. Distorted sound, silence, or muffled audio indicates failure.',
        type     : 'yesno',
        treeKey  : 'speakerMicWorking',
        showWhen : { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
    },
    {
        id       : 'cameraWorking',
        stage    : 'functional',
        order    : 6,
        question : 'Is the camera functional?',
        hint     : 'Open the camera app and test both front and rear cameras. Blurry, black, or crashing camera apps indicate a module fault.',
        type     : 'yesno',
        treeKey  : 'cameraWorking',
        showWhen : { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
    },
    {
        id       : 'chargingPortWorking',
        stage    : 'functional',
        order    : 7,
        question : 'Is the charging port working properly?',
        hint     : 'Check for loose connection, slow charging, or failure to charge. A faulty port is a common, usually inexpensive repair.',
        type     : 'yesno',
        treeKey  : 'chargingPortWorking',
        showWhen : { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
    },
    {
        id       : 'connectivityWorking',
        stage    : 'functional',
        order    : 8,
        question : 'Are wireless functions working? (Wi-Fi, Bluetooth, cellular signal)',
        hint     : 'Connectivity failures may indicate antenna damage — common in dropped devices. Each failed radio reduces resale value.',
        type     : 'yesno',
        treeKey  : 'connectivityWorking',
        showWhen : { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
    },


    /* ── STAGE 3: DAMAGE — Cosmetic and structural assessment ───────
       Entered for powered-on devices with functional screens.
       Assesses external condition to determine resale tier.
       ────────────────────────────────────────────────────────────────── */
    {
        id       : 'cosmeticDamage',
        stage    : 'damage',
        order    : 1,
        question : 'Is there any visible cosmetic damage?',
        hint     : 'Cosmetic damage does not affect functionality but lowers resale price. Honest disclosure builds buyer trust.',
        type     : 'select',
        treeKey  : 'cosmeticDamage',
        options  : [
            { value: 'none',     label: 'None — looks almost new'                },
            { value: 'minor',    label: 'Minor — light scratches or scuffs only' },
            { value: 'moderate', label: 'Moderate — visible dents or chips'      },
        ],
        showWhen : { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
    },
    {
        id       : 'structuralDamage',
        stage    : 'damage',
        order    : 2,
        question : 'Is there structural or frame damage? (bent chassis, cracked body, not just surface scratches)',
        hint     : 'Structural damage means the device frame or body is warped, cracked, or misaligned — not just surface scratches. This significantly reduces value.',
        type     : 'yesno',
        treeKey  : 'structuralDamage',
        showWhen : { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes', cosmeticDamage: 'minor' },
    },
    {
        id       : 'screenCracks',
        stage    : 'damage',
        order    : 3,
        question : 'Are there visible cracks on the screen glass? (even if the display still works)',
        hint     : 'A cracked glass without display failure is a cosmetic issue. It can be repaired relatively cheaply and improves resale value significantly.',
        type     : 'yesno',
        treeKey  : 'screenCracks',
        showWhen : { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
    },
    {
        id       : 'originalAccessories',
        stage    : 'damage',
        order    : 4,
        question : 'Do you still have the original accessories? (charger, cable, earphones, box)',
        hint     : 'Original accessories — especially the charger and original box — can add 10–15% to resale price and increase buyer confidence.',
        type     : 'yesno',
        treeKey  : 'hasOriginalAccessories',
        showWhen : { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
    },


    /* ── STAGE 4: PARTS — For devices with broken screens / non-functional displays ──
       Entered when screenFunctional === 'no'.
       Assesses which internal components remain viable for parts sale.
       ────────────────────────────────────────────────────────────────── */
    {
        id       : 'partsSalvageable',
        stage    : 'parts',
        order    : 1,
        question : 'Do you believe internal components are likely still functional?',
        hint     : 'A device with a broken screen but no other damage often has valuable internal components: camera, RAM, storage, charging IC, etc.',
        type     : 'yesno',
        treeKey  : 'partsSalvageable',
        showWhen : { powersOn: 'yes', screenFunctional: 'no' },
    },
    {
        id       : 'motherboardIntact',
        stage    : 'parts',
        order    : 2,
        question : 'Does the motherboard / logic board appear intact? (No visible burn marks, deep cracks, or severe impact damage to the board area)',
        hint     : 'The motherboard is the highest-value salvageable component. If it\'s dead, overall parts value drops significantly.',
        type     : 'yesno',
        treeKey  : 'motherboardIntact',
        showWhen : { powersOn: 'yes', screenFunctional: 'no', partsSalvageable: 'yes' },
    },
    {
        id       : 'storageIntact',
        stage    : 'parts',
        order    : 3,
        question : 'Is internal storage (SSD, eMMC, or HDD) likely intact and readable?',
        hint     : 'Working storage is valuable to data recovery shops and as a standalone part. If you don\'t know, answer No to be conservative.',
        type     : 'yesno',
        treeKey  : 'storageIntact',
        showWhen : { powersOn: 'yes', screenFunctional: 'no', partsSalvageable: 'yes', motherboardIntact: 'yes' },
    },
    {
        id       : 'cameraModuleIntact',
        stage    : 'parts',
        order    : 4,
        question : 'Is the camera module (rear and/or front) physically undamaged?',
        hint     : 'Camera modules are frequently purchased by repair shops for common repair jobs and have consistent secondhand demand.',
        type     : 'yesno',
        treeKey  : 'cameraModuleIntact',
        showWhen : { powersOn: 'yes', screenFunctional: 'no', partsSalvageable: 'yes' },
    },


    /* ── STAGE 5: OFF-PATH — Device will not power on ───────────────
       Entered when powersOn === 'no'.
       Determines the root cause of failure.
       ────────────────────────────────────────────────────────────────── */
    {
        id       : 'waterDamaged',
        stage    : 'off-path',
        order    : 1,
        question : 'Was the device exposed to water, liquid, or high humidity?',
        hint     : 'Even brief exposure to liquid can cause circuit failure hours or days later. Check if the liquid damage indicator (LDI sticker) inside the SIM tray is red or pink.',
        type     : 'yesno',
        treeKey  : 'waterDamaged',
        showWhen : { powersOn: 'no' },
    },
    {
        id       : 'corrosionVisible',
        stage    : 'off-path',
        order    : 2,
        question : 'Is there visible corrosion on the charging port, speaker grille, or headphone jack?',
        hint     : 'Corrosion appears as green, white, or dark residue around metal contacts. It indicates deep liquid damage that renders most components unsalvageable.',
        type     : 'yesno',
        treeKey  : 'corrosionVisible',
        showWhen : { powersOn: 'no', waterDamaged: 'yes' },
    },
    {
        id       : 'deviceCharges',
        stage    : 'off-path',
        order    : 3,
        question : 'Does the device show any sign of charging when plugged in? (charging LED, screen flash, vibration)',
        hint     : 'A device that charges but won\'t boot often has a minor software or firmware fault — usually cheaper to repair than a device that shows zero response to power.',
        type     : 'yesno',
        treeKey  : 'deviceCharges',
        showWhen : { powersOn: 'no', waterDamaged: 'no' },
    },
    {
        id       : 'physicallyDamaged',
        stage    : 'off-path',
        order    : 4,
        question : 'Does the device have obvious physical damage? (cracked screen, dented body, bent frame)',
        hint     : 'Physical damage on a non-functional older device usually indicates the repair cost will exceed the device\'s remaining value.',
        type     : 'yesno',
        treeKey  : 'physicallyDamaged',
        showWhen : { powersOn: 'no', waterDamaged: 'no' },
    },
    {
        id       : 'dropOrImpact',
        stage    : 'off-path',
        order    : 5,
        question : 'Was the device dropped or subjected to a strong physical impact before it stopped working?',
        hint     : 'Impact damage can cause internal connector displacement or board flex damage — which a technician can often fix without full component replacement.',
        type     : 'yesno',
        treeKey  : 'dropOrImpact',
        showWhen : { powersOn: 'no', waterDamaged: 'no' },
    },
    {
        id       : 'lastWorkedRecently',
        stage    : 'off-path',
        order    : 6,
        question : 'Was the device working normally within the last 7 days before it stopped?',
        hint     : 'A sudden failure in a recently working device often points to a fixable software or minor hardware fault rather than long-term wear.',
        type     : 'yesno',
        treeKey  : 'lastWorkedRecently',
        showWhen : { powersOn: 'no', waterDamaged: 'no' },
    },
]);


/* ══════════════════════════════════════════════════════════════════════
   DEVICE-SPECIFIC SUPPLEMENTARY QUESTIONS
   These appear after the general question flow.
   Keyed by deviceType.
   ══════════════════════════════════════════════════════════════════════ */
const DEVICE_SPECIFIC_QUESTIONS = Object.freeze({

    smartphone: [
        {
            id      : 'biometricWorking',
            stage   : 'specific',
            order   : 1,
            question: 'Is the biometric sensor functional? (Face ID / fingerprint unlock)',
            hint    : 'Biometric failure reduces usability but rarely affects core functions. It does lower resale value on premium models.',
            type    : 'yesno',
            treeKey : 'biometricWorking',
            showWhen: { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
        },
        {
            id      : 'simSlotWorking',
            stage   : 'specific',
            order   : 2,
            question: 'Is the SIM card slot working and readable?',
            hint    : 'A dead SIM slot may indicate a connector fault or corrosion — particularly important for buyers who need cellular capability.',
            type    : 'yesno',
            treeKey : 'simSlotWorking',
            showWhen: { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
        },
        {
            id      : 'networkUnlocked',
            stage   : 'specific',
            order   : 3,
            question: 'Is the device network-unlocked (works with any carrier)?',
            hint    : 'An unlocked device commands 10–20% higher resale value compared to a carrier-locked unit.',
            type    : 'yesno',
            treeKey : 'networkUnlocked',
            showWhen: { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
        },
        {
            id      : 'accountsSignedOut',
            stage   : 'specific',
            order   : 4,
            question: 'Is the device free of locked accounts? (iCloud Lock / Google Account lock removed)',
            hint    : 'Account locks (iCloud Activation Lock, Google FRP) make a device nearly worthless on the secondhand market. Confirm accounts are fully signed out before sale.',
            type    : 'yesno',
            treeKey : 'accountsSignedOut',
            showWhen: { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
        },
    ],

    laptop: [
        {
            id      : 'keyboardWorking',
            stage   : 'specific',
            order   : 1,
            question: 'Is the keyboard fully functional? (all keys respond, no sticky or dead keys)',
            hint    : 'Keyboard replacement is relatively inexpensive but affects usability. A working keyboard is a notable selling point for a secondhand laptop.',
            type    : 'yesno',
            treeKey : 'keyboardWorking',
            showWhen: { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
        },
        {
            id      : 'storageType',
            stage   : 'specific',
            order   : 2,
            question: 'What type of storage does the laptop have?',
            hint    : 'SSD laptops are significantly more desirable on the secondhand market than HDD models.',
            type    : 'select',
            treeKey : 'storageType',
            options : [
                { value: 'ssd',   label: 'SSD (fast, silent)' },
                { value: 'hdd',   label: 'HDD (spinning disk)'  },
                { value: 'both',  label: 'Both SSD and HDD'     },
                { value: 'unknown', label: 'Not sure'           },
            ],
            showWhen: { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
        },
        {
            id      : 'hasDiscreteGPU',
            stage   : 'specific',
            order   : 3,
            question: 'Does the laptop have a dedicated / discrete GPU? (e.g. NVIDIA GeForce, AMD Radeon)',
            hint    : 'A discrete GPU dramatically increases laptop resale value, particularly for gaming or creative work. Integrated-only graphics laptops are valued lower.',
            type    : 'yesno',
            treeKey : 'hasDiscreteGPU',
            showWhen: { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
        },
        {
            id      : 'hingeIntact',
            stage   : 'specific',
            order   : 4,
            question: 'Are the screen hinges intact and firm? (no wobble, cracking, or detachment)',
            hint    : 'Loose or cracked hinges are a common fault in older laptops. Hinge repair can be moderate in cost but failing hinges are a red flag for buyers.',
            type    : 'yesno',
            treeKey : 'hingeIntact',
            showWhen: { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
        },
    ],

    tablet: [
        {
            id      : 'stylusWorking',
            stage   : 'specific',
            order   : 1,
            question: 'If the tablet supports a stylus (Apple Pencil, S Pen, etc.), is it functional?',
            hint    : 'Stylus functionality significantly increases the resale value of premium tablets. If not applicable, answer No.',
            type    : 'yesno',
            treeKey : 'stylusWorking',
            showWhen: { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
        },
        {
            id      : 'hasCellular',
            stage   : 'specific',
            order   : 2,
            question: 'Does the tablet have cellular data capability (4G / 5G)?',
            hint    : 'Cellular-capable tablets are worth 15–30% more than Wi-Fi-only models on the secondhand market.',
            type    : 'yesno',
            treeKey : 'hasCellular',
            showWhen: { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
        },
    ],

    desktop: [
        {
            id      : 'gpuPresent',
            stage   : 'specific',
            order   : 1,
            question: 'Does the desktop have a dedicated graphics card? (NVIDIA / AMD)',
            hint    : 'A discrete GPU is often the single highest-value component in a desktop system. Knowing the model (RTX, RX series, etc.) helps estimate its resale price.',
            type    : 'yesno',
            treeKey : 'gpuPresent',
            showWhen: { powersOn: 'yes', batterySwollen: 'no', screenFunctional: 'yes' },
        },
        {
            id      : 'ramAmount',
            stage   : 'specific',
            order   : 2,
            question: 'How much RAM does the desktop have?',
            hint    : 'RAM amount affects resale value significantly. Systems with 16GB+ RAM are substantially more desirable.',
            type    : 'select',
            treeKey : 'ramAmount',
            options : [
                { value: '4',     label: '4 GB or less'  },
                { value: '8',     label: '8 GB'          },
                { value: '16',    label: '16 GB'         },
                { value: '32',    label: '32 GB or more' },
                { value: 'unknown', label: 'Not sure'    },
            ],
            showWhen: { powersOn: 'yes', batterySwollen: 'no' },
        },
        {
            id      : 'psuWorking',
            stage   : 'specific',
            order   : 3,
            question: 'Is the power supply unit (PSU) working? (no buzzing, burning smell, or failure to start)',
            hint    : 'A failed PSU is often the reason a desktop won\'t power on — and it\'s frequently the easiest/cheapest component to replace.',
            type    : 'yesno',
            treeKey : 'psuWorking',
            showWhen: { powersOn: 'yes' },
        },
    ],

    peripheral: [
        {
            id      : 'hasMechanicalSwitches',
            stage   : 'specific',
            order   : 1,
            question: 'If this is a keyboard, does it have mechanical switches?',
            hint    : 'Mechanical keyboards retain significant secondhand value. Even used or damaged mechanical keyboards often sell well for parts.',
            type    : 'yesno',
            treeKey : 'hasMechanicalSwitches',
            showWhen: { powersOn: 'yes' },
        },
        {
            id      : 'usbConnectionWorking',
            stage   : 'specific',
            order   : 2,
            question: 'Is the USB or wireless connection working correctly?',
            hint    : 'A peripheral with a dead connection is far less valuable — check that the device is recognized when plugged in.',
            type    : 'yesno',
            treeKey : 'usbConnectionWorking',
            showWhen: { powersOn: 'yes' },
        },
    ],
});


/* ══════════════════════════════════════════════════════════════════════
   RESALE ANALYSIS HELPER
   ══════════════════════════════════════════════════════════════════════ */

function buildResaleAnalysis(deviceType, conditions, outcome) {
    const type  = (deviceType || 'other').toLowerCase();
    const parts = PART_PRICES[type]         || PART_PRICES.other;
    const bands = WHOLE_DEVICE_PRICES[type] || WHOLE_DEVICE_PRICES.other;

    const salvageableKeys = _inferSalvageablePartKeys(type, conditions, outcome);
    const salvageableParts = salvageableKeys
        .map(key => parts[key] ? { key, label: parts[key].label, priceMin: parts[key].min, priceMax: parts[key].max, currency: 'PHP' } : null)
        .filter(Boolean);

    const totalMin = salvageableParts.reduce((s, p) => s + p.priceMin, 0);
    const totalMax = salvageableParts.reduce((s, p) => s + p.priceMax, 0);

    let wholeDevice = null;
    const wholeTier = _getWholeTier(outcome, conditions);
    if (wholeTier && bands[wholeTier]) {
        const band = bands[wholeTier];
        wholeDevice = {
            conditionTier: wholeTier,
            priceMin     : band.min,
            priceMax     : band.max,
            currency     : 'PHP',
            recommendation: _wholeTierAdvice(wholeTier, conditions),
        };
    }

    const saleMode = _recommendSaleMode(outcome, totalMax, wholeDevice);

    return {
        saleMode,
        wholeDevice,
        salvageableParts,
        estimatedPartsTotal: { min: totalMin, max: totalMax, currency: 'PHP' },
        marketplaces: [
            { name: 'Carousell Philippines', url: 'https://www.carousell.ph' },
            { name: 'Facebook Marketplace',  url: 'https://www.facebook.com/marketplace' },
            { name: 'OLX Philippines',        url: 'https://www.olx.com.ph' },
        ],
        recycleGuidance: _buildRecycleGuidance(outcome),
    };
}

function _getWholeTier(outcome, conditions) {
    const tierMap = {
        SELL_FUNCTIONAL_PREMIUM : 'premium',
        SELL_FUNCTIONAL_BATT_LOW: 'fair',
        SELL_MINOR_WEAR         : 'fair',
        SELL_HEAVY_COSMETIC     : 'poor',
    };
    return tierMap[outcome] || null;
}

function _wholeTierAdvice(tier, conditions) {
    const advice = {
        premium: 'Device is in excellent condition with strong battery — list at or near market rate.',
        good   : 'Solid condition — list slightly below market rate to move quickly.',
        fair   : 'Functional with noticeable wear — price 15–25% below market rate and disclose condition.',
        poor   : 'Significant cosmetic or battery issues — price 30–50% below market rate.',
    };
    return advice[tier] || '';
}

function _inferSalvageablePartKeys(type, conditions, outcome) {
    if (['SELL_FUNCTIONAL_PREMIUM','SELL_FUNCTIONAL_BATT_LOW','SELL_MINOR_WEAR','SELL_HEAVY_COSMETIC','REPAIR_LIKELY_MINOR','REPAIR_DEEP_FAULT'].includes(outcome)) return [];
    if (conditions.waterDamaged === 'yes') return [];
    const all     = Object.keys(PART_PRICES[type] || PART_PRICES.other);
    const excl    = new Set();
    if (conditions.batterySwollen === 'yes')   excl.add('battery');
    if (conditions.screenFunctional === 'no')  excl.add('screen');
    if (conditions.motherboardIntact === 'no') { excl.add('motherboard'); excl.add('cpu'); }
    if (conditions.storageIntact === 'no')     excl.add('storage');
    if (conditions.powersOn === 'no')          excl.add('motherboard');
    return all.filter(k => !excl.has(k));
}

function _recommendSaleMode(outcome, partsTotal, wholeDevice) {
    if (wholeDevice) return 'whole';
    if (['SELL_PARTS_PREMIUM','SELL_PARTS_NO_STORAGE'].includes(outcome)) return 'parts';
    if (['RECYCLE_NO_PARTS','RECYCLE_WATER_DAMAGE','RECYCLE_OLD_DEVICE','RECYCLE_OLD_DAMAGED',
         'RECYCLE_CORRODED','RECYCLE_BOARD_DEAD'].includes(outcome)) return 'recycle';
    if (outcome === 'DANGER_BATTERY') return 'hazardous';
    if (['REPAIR_LIKELY_MINOR','REPAIR_DEEP_FAULT'].includes(outcome)) return 'repair';
    return partsTotal > 500 ? 'parts' : 'recycle';
}

function _buildRecycleGuidance(outcome) {
    const guides = {
        DANGER_BATTERY                    : 'Swollen batteries are a fire hazard. Do NOT self-remove. Bring to a certified technician or e-waste facility immediately.',
        RECYCLE_WATER_POSSIBLE_RECOVERY   : 'No corrosion detected — data recovery may still be possible. Do NOT charge the device. Visit a data recovery specialist first.',
        RECYCLE_CORRODED                  : 'Corrosion from liquid damage has made components unrecoverable. Seal and bring to a certified e-waste facility.',
        RECYCLE_OLD_DEVICE                : 'Factory reset first. Remove SIM/SD. Drop off at an DENR-accredited e-waste recycler.',
        RECYCLE_OLD_DAMAGED               : 'Old and physically damaged — recycle responsibly at a certified facility.',
        RECYCLE_NO_PARTS                  : 'No salvageable parts. Deposit at SM Cyberzone E-waste Drive or NU Building A Drop-off Point.',
        RECYCLE_BOARD_DEAD                : 'Motherboard failure eliminates most parts value. Recycle at a certified e-waste facility.',
        SELL_PARTS_PREMIUM                : 'Motherboard and storage intact. List on Carousell PH or sell directly to local repair shops in Sampaloc.',
        SELL_PARTS_NO_STORAGE             : 'Sell working components (motherboard, camera, etc.). Safely destroy or recycle the damaged storage.',
        SELL_FUNCTIONAL_PREMIUM           : 'Excellent condition. Factory reset, remove SIM/SD, and list at full market rate on Carousell or FB Marketplace.',
        SELL_FUNCTIONAL_BATT_LOW          : 'Disclose battery health honestly. Consider a battery replacement first to maximize your return.',
        SELL_MINOR_WEAR                   : 'Minor wear — price 10–20% below market. Be transparent in your listing.',
        SELL_HEAVY_COSMETIC               : 'Significant cosmetic damage — price 30–50% below market. Full photo disclosure is essential.',
        REPAIR_LIKELY_MINOR               : 'Young device that still charges — likely a minor, fixable fault. Get a written estimate before committing.',
        REPAIR_DEEP_FAULT                 : 'Young device with deep fault — get a professional diagnosis first. Compare repair cost vs. refurbished replacement.',
    };
    return guides[outcome] || 'Follow proper e-waste disposal procedures for your locality.';
}


/* ══════════════════════════════════════════════════════════════════════
   ROUTES
   ══════════════════════════════════════════════════════════════════════ */

/* ── POST /api/transfer/evaluate (authenticated) ── */
router.post('/evaluate', requireAuth, async (req, res, next) => {
    try {
        const { deviceType, age, conditions, sellMode } = req.body;

        if (!deviceType) throw new AppError('deviceType is required.', 400, 'ERR_INVALID_DEVICE');
        if (!conditions || typeof conditions !== 'object') throw new AppError('conditions object is required.', 400, 'ERR_MISSING_CONDITIONS');

        const enrichedConditions = {
            ...conditions,
            deviceAgeLessThan3: (Number(age) || 0) < 3 ? 'yes' : 'no',
        };

        const device = new ElectronicDevice({}, enrichedConditions, { deviceType: deviceType.toLowerCase(), age: Number(age) || 0 });
        const module = transferFactory.createModule();
        const result = module.execute(device);

        result.resaleAnalysis    = buildResaleAnalysis(deviceType, enrichedConditions, result.outcome);
        result.requestedSellMode = sellMode || 'auto';

        await db.execute(
            `INSERT INTO activity_logs (user_id, module_accessed, strategy_used, created_at) VALUES (?, ?, ?, NOW())`,
            [req.user.userId, ModuleType.TRANSFER, result.outcome || null]
        );

        res.status(200).json(result);

    } catch (err) { next(err); }
});


/* ── POST /api/transfer/evaluate/anonymous ── */
router.post('/evaluate/anonymous', async (req, res, next) => {
    try {
        const { deviceType, age, conditions, sellMode } = req.body;

        if (!deviceType) throw new AppError('deviceType is required.', 400, 'ERR_INVALID_DEVICE');
        if (!conditions || typeof conditions !== 'object') throw new AppError('conditions object is required.', 400, 'ERR_MISSING_CONDITIONS');

        const enrichedConditions = {
            ...conditions,
            deviceAgeLessThan3: (Number(age) || 0) < 3 ? 'yes' : 'no',
        };

        const device = new ElectronicDevice({}, enrichedConditions, { deviceType: deviceType.toLowerCase(), age: Number(age) || 0 });
        const module = transferFactory.createModule();
        const result = module.execute(device);

        result.resaleAnalysis    = buildResaleAnalysis(deviceType, enrichedConditions, result.outcome);
        result.requestedSellMode = sellMode || 'auto';

        res.status(200).json(result);

    } catch (err) { next(err); }
});


/* ── GET /api/transfer/questions ── */
router.get('/questions', (req, res, next) => {
    try {
        const { deviceType } = req.query;
        const specific = deviceType
            ? (DEVICE_SPECIFIC_QUESTIONS[deviceType.toLowerCase()] || [])
            : [];

        res.status(200).json({
            general : QUESTION_BANK,
            specific,
            stageOrder: ['general', 'functional', 'damage', 'parts', 'off-path', 'specific'],
            totalQuestions: QUESTION_BANK.length + specific.length,
        });

    } catch (err) { next(err); }
});


/* ── GET /api/transfer/questions/:stage ── */
router.get('/questions/:stage', (req, res, next) => {
    try {
        const { stage }      = req.params;
        const { deviceType } = req.query;

        const generalForStage = QUESTION_BANK.filter(q => q.stage === stage);

        let specificForStage = [];
        if (deviceType) {
            const allSpecific = DEVICE_SPECIFIC_QUESTIONS[deviceType.toLowerCase()] || [];
            specificForStage  = allSpecific.filter(q => q.stage === stage);
        }

        if (generalForStage.length === 0 && specificForStage.length === 0) {
            throw new AppError(
                `No questions found for stage "${stage}". Valid stages: general, functional, damage, parts, off-path, specific.`,
                404, 'ERR_STAGE_NOT_FOUND'
            );
        }

        res.status(200).json({
            stage,
            questions: [...generalForStage, ...specificForStage].sort((a, b) => a.order - b.order),
        });

    } catch (err) { next(err); }
});


/* ── GET /api/transfer/options ── */
router.get('/options', (req, res, next) => {
    try {
        const module = transferFactory.createModule();
        res.status(200).json({ options: module.getAllDisposalOptions() });
    } catch (err) { next(err); }
});


/* ── GET /api/transfer/options/:type ── */
router.get('/options/:type', (req, res, next) => {
    try {
        const module = transferFactory.createModule();
        const option = module.getDisposalOption(req.params.type);
        res.status(200).json({ type: req.params.type, ...option });
    } catch (err) { next(err); }
});


/* ── GET /api/transfer/parts-prices ── */
router.get('/parts-prices', (req, res, next) => {
    try {
        const { deviceType } = req.query;
        if (deviceType) {
            const type  = deviceType.toLowerCase();
            const parts = PART_PRICES[type];
            if (!parts) throw new AppError(`Unknown deviceType "${deviceType}".`, 400, 'ERR_UNKNOWN_DEVICE_TYPE');
            return res.status(200).json({ deviceType: type, currency: 'PHP', parts: Object.entries(parts).map(([key, p]) => ({ key, ...p })) });
        }
        const all = Object.entries(PART_PRICES).reduce((acc, [dtype, parts]) => {
            acc[dtype] = Object.entries(parts).map(([key, p]) => ({ key, ...p }));
            return acc;
        }, {});
        res.status(200).json({ currency: 'PHP', deviceTypes: all });
    } catch (err) { next(err); }
});


/* ── GET /api/transfer/whole-prices ── */
router.get('/whole-prices', (req, res, next) => {
    try {
        const { deviceType } = req.query;
        if (deviceType) {
            const type  = deviceType.toLowerCase();
            const bands = WHOLE_DEVICE_PRICES[type];
            if (!bands) throw new AppError(`Unknown deviceType "${deviceType}".`, 400, 'ERR_UNKNOWN_DEVICE_TYPE');
            return res.status(200).json({ deviceType: type, currency: 'PHP', tiers: bands });
        }
        res.status(200).json({ currency: 'PHP', deviceTypes: WHOLE_DEVICE_PRICES });
    } catch (err) { next(err); }
});


/* ── POST /api/transfer/confirm (authenticated) ── */
router.post('/confirm', requireAuth, async (req, res, next) => {
    try {
        const { deviceId, transferType, outcome } = req.body;
        if (!deviceId || !transferType || !outcome) throw new AppError('deviceId, transferType, and outcome are required.', 400, 'ERR_MISSING_FIELDS');
        if (!VALID_TRANSFER_TYPES.includes(transferType)) throw new AppError(`Invalid transfer type. Valid: ${VALID_TRANSFER_TYPES.join(', ')}.`, 400, 'ERR_INVALID_TRANSFER');

        const newStatus  = TRANSFER_STATUS_MAP[transferType];
        const isArchived = ['recycle','donate','sell','sellForParts'].includes(transferType) ? 1 : 0;

        const [result] = await db.execute(
            `UPDATE devices SET status = ?, is_archived = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`,
            [newStatus, isArchived, deviceId, req.user.userId]
        );
        if (result.affectedRows === 0) throw new AppError('Device not found or update not permitted.', 404, 'ERR_DEVICE_NOT_FOUND');

        await db.execute(
            `INSERT INTO activity_logs (user_id, module_accessed, strategy_used, created_at) VALUES (?, ?, ?, NOW())`,
            [req.user.userId, ModuleType.TRANSFER, `${transferType}:${outcome}`]
        );

        res.status(200).json({ deviceId, transferType, newStatus, message: `Transfer confirmed. Device status updated to "${newStatus}".` });

    } catch (err) { next(err); }
});


/* ── GET /api/transfer/history (authenticated) ── */
router.get('/history', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, module_accessed, strategy_used, created_at FROM activity_logs WHERE user_id = ? AND module_accessed = ? ORDER BY created_at DESC`,
            [req.user.userId, ModuleType.TRANSFER]
        );
        res.status(200).json({ history: rows });
    } catch (err) { next(err); }
});


/* ── GET /api/transfer/summary ── */
router.get('/summary', (req, res) => {
    const summary = Object.entries(PART_PRICES).map(([dtype, parts]) => ({
        deviceType          : dtype,
        partCount           : Object.keys(parts).length,
        partKeys            : Object.keys(parts),
        wholeDevicePriceBands: WHOLE_DEVICE_PRICES[dtype] || null,
        specificQuestions   : (DEVICE_SPECIFIC_QUESTIONS[dtype] || []).length,
    }));
    res.status(200).json({ currency: 'PHP', deviceTypes: summary });
});


/* EXPORT */
module.exports = router;