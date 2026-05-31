'use strict';

/** Dependencies:
     - EcoCircuit.js (Module, ModuleFactory, RepairStrategy, AppError, ModuleType)
*/

const {
    Module,
    ModuleFactory,
    RepairStrategy,
    AppError,
    ModuleType,
} = require('../EcoCircuit');


/* CHATBOT ENUM
      - Tracks which step of the chatbot flow the user is currently in.
*/

const ChatbotState = Object.freeze({
    INIT            : 'INIT',             
    DAMAGE_CATEGORY : 'DAMAGE_CATEGORY', 
    SEVERITY_CHECK  : 'SEVERITY_CHECK',
    SPECIFIC_ISSUE  : 'SPECIFIC_ISSUE',   
    ANALYSIS        : 'ANALYSIS',
    OUTCOME         : 'OUTCOME',
    COMPLETE        : 'COMPLETE',
});

/* DAMAGE CATEGORY & ISSUE ENUMS
      - Defines the two damage paths and the specific issues available under each.
*/

const DamageCategory = Object.freeze({
    EXTERNAL : 'external',
    SOFTWARE : 'software',
});

const SeverityLevel = Object.freeze({
    MINOR    : 'minor',
    MODERATE : 'moderate',
    SEVERE   : 'severe',
});

const ExternalIssue = Object.freeze({
    SCREEN          : 'screen',
    BATTERY_CHARGING: 'battery_charging',
    PORT_CONNECTOR  : 'port_connector',
    PHYSICAL_WEAR   : 'physical_wear',
    KEYBOARD_INPUT  : 'keyboard_input',
    WATER_LIQUID    : 'water_liquid',
});

const SoftwareIssue = Object.freeze({
    PERFORMANCE     : 'performance',
    STORAGE_MEMORY  : 'storage_memory',
    OS_BOOT         : 'os_boot',
    VIRUS_MALWARE   : 'virus_malware',
    APP_CRASHES     : 'app_crashes',
    CONNECTIVITY    : 'connectivity',
});


/* GUIDES TUTORIAL LIBRARY */

/**
 * Static library of guided tutorials and maintenance protocols for the Tech-Care
 * DIY outcomes
 * Includes Hardware handling and software optimization routines
 * Note: Might improve in the future or include in Limitations
 */
class TutorialLibrary {

    /** @type {Object.<string, Object>} */
    static #tutorials = Object.freeze({

        /* EXTERNAL / HARDWARE TUTORIALS */

        screen: {
            title      : 'Screen Damage DIY Assessment and Cleaning',
            category   : 'Hardware Protocol',
            difficulty : 'Easy to Moderate',
            tools      : ['Microfiber cloth', 'Screen protector', 'Isopropyl alcohol (70%)'],
            steps: [
                'Power off the device completely before inspecting the screen.',
                'Clean the screen gently with a dry microfiber cloth using circular motions.',
                'For smudges, lightly dampen the cloth with 70% isopropyl alcohol — never spray directly.',
                'Inspect for dead pixels by displaying a solid white, black, red, green, and blue screen.',
                'Apply a tempered glass screen protector to prevent further surface damage.',
                'If the screen flickers or has dead pixels, document the issue and proceed to Step 3.',
                'For cracked screens, avoid using the device and seek professional repair immediately.',
            ],
            preventionTips: [
                'Always use a quality tempered glass screen protector.',
                'Avoid placing the device face-down on rough surfaces.',
                'Use a protective case that covers the screen edges.',
                'Keep the device away from sharp objects in bags and pockets.',
            ],
        },

        battery_charging: {
            title      : 'Battery and Charging Issues — Diagnosis and Optimization',
            category   : 'Hardware Protocol',
            difficulty : 'Easy',
            tools      : ['Original charger or certified alternative', 'Compressed air (optional)'],
            steps: [
                'Check the charging cable and adapter for visible damage or fraying.',
                'Clean the charging port gently with compressed air to remove debris.',
                'Use a wooden or plastic toothpick to carefully remove lint — never use metal.',
                'Test charging with a different certified cable and adapter.',
                'Perform a battery calibration: drain to 0%, then charge to 100% uninterrupted.',
                'Check battery health in device settings (Settings > Battery > Battery Health on iOS; AccuBattery app on Android).',
                'If battery health is below 80%, schedule a professional battery replacement.',
                'Avoid charging in extreme heat or cold environments.',
            ],
            preventionTips: [
                'Charge between 20% and 80% to maximize battery cell longevity.',
                'Avoid overnight charging — unplug at full charge when possible.',
                'Use only certified chargers that match your device wattage.',
                'Enable battery saver mode when below 20%.',
            ],
        },

        port_connector: {
            title      : 'Port and Connector Issues — Cleaning and Inspection',
            category   : 'Hardware Protocol',
            difficulty : 'Easy',
            tools      : ['Compressed air', 'Wooden toothpick', 'Flashlight', 'Lint-free cloth'],
            steps: [
                'Power off the device before inspecting any ports.',
                'Use a flashlight to inspect the port for lint, debris, or bent pins.',
                'Use short bursts of compressed air to clear loose debris from the port.',
                'For stubborn debris, use a wooden toothpick — never metal — to gently dislodge it.',
                'Test the port with multiple compatible cables to confirm if the issue is the port or the cable.',
                'For USB ports: update USB drivers in Device Manager (Windows) or check System Information (Mac).',
                'For audio jacks: clean with a cotton swab lightly dampened with isopropyl alcohol.',
                'If bent pins are visible inside the port, seek professional repair immediately.',
            ],
            preventionTips: [
                'Never force a connector into a port — check orientation first.',
                'Remove cables by gripping the connector head, not the cable.',
                'Use port covers or cases that protect open ports from dust.',
                'Avoid charging while the device is in a pocket or bag.',
            ],
        },

        physical_wear: {
            title      : 'Physical Wear and Casing — Maintenance and Protection',
            category   : 'Hardware Protocol',
            difficulty : 'Easy',
            tools      : ['Microfiber cloth', 'Isopropyl alcohol (70%)', 'Protective case', 'Cable organizer'],
            steps: [
                'Wipe down the exterior with a microfiber cloth to remove oils, dust, and grime.',
                'For stubborn residue, use a cloth lightly dampened with 70% isopropyl alcohol.',
                'Inspect all corners and edges for stress cracks — pay attention to hinge areas on laptops.',
                'Check rubber feet on laptops — replace with adhesive rubber pads if worn flat.',
                'Tighten any loose screws on the casing using the correct screwdriver size.',
                'Apply a quality protective case or laptop sleeve to prevent further wear.',
                'Organize cables to prevent strain on ports and connectors.',
                'Store the device in a padded bag when transporting to avoid impact damage.',
            ],
            preventionTips: [
                'Always use a protective case tailored to your device model.',
                'Clean the device weekly to prevent oil and grime buildup.',
                'Store the device on a flat, stable surface when not in use.',
                'Avoid stacking heavy objects on top of closed laptops.',
            ],
        },

        keyboard_input: {
            title      : 'Keyboard and Input Issues — Cleaning and Troubleshooting',
            category   : 'Hardware Protocol',
            difficulty : 'Easy to Moderate',
            tools      : ['Compressed air', 'Keycap puller (optional)', 'Isopropyl alcohol', 'Cotton swabs'],
            steps: [
                'Power off the device and disconnect from power before cleaning the keyboard.',
                'Hold the keyboard at a 45-degree angle and use compressed air to blow out debris between keys.',
                'For sticky keys, use a cotton swab lightly dampened with isopropyl alcohol to clean around the key.',
                'To deep-clean, use a keycap puller to remove keycaps — photograph the layout first.',
                'Wipe each keycap individually with isopropyl alcohol and allow to dry completely.',
                'For unresponsive keys on laptops, check keyboard settings and update keyboard drivers.',
                'Test the keyboard using an online keyboard tester (e.g., keyboardtester.com).',
                'If multiple keys are unresponsive after cleaning, the keyboard ribbon cable may need reseating.',
            ],
            preventionTips: [
                'Avoid eating or drinking near the keyboard.',
                'Use a keyboard cover to protect against dust and spills.',
                'Clean the keyboard with compressed air monthly.',
                'Avoid pressing keys with excessive force.',
            ],
        },

        water_liquid: {
            title      : 'Liquid Exposure — Emergency Protocol',
            category   : 'Hardware Protocol — URGENT',
            difficulty : 'Moderate (time-sensitive)',
            tools      : ['Microfiber cloth', 'Compressed air', 'Silica gel packets or dry rice (last resort)'],
            steps: [
                'IMMEDIATELY power off the device — do not wait. Hold the power button until it shuts down.',
                'Remove the battery if it is removable on your device model.',
                'Remove SIM card, memory card, and any connected accessories.',
                'Gently shake the device to expel water from ports and openings.',
                'Dab — do not rub — all surfaces with a dry microfiber cloth.',
                'Use compressed air at low pressure to blow water out of ports.',
                'Place the device in a sealed container with silica gel packets for 24 to 48 hours.',
                'Do NOT use a hair dryer — heat damages internal components.',
                'Do NOT charge the device for at least 48 hours after liquid exposure.',
                'After 48 hours, attempt to power on. If it does not start or behaves erratically, seek repair immediately.',
            ],
            preventionTips: [
                'Use a waterproof or water-resistant case in humid or outdoor environments.',
                'Keep liquids at a safe distance from devices at all times.',
                'Consider device insurance that covers liquid damage.',
                'Back up data regularly so loss from liquid damage is minimized.',
            ],
        },

        /* SOFTWARE TUTORIALS */

        performance: {
            title      : 'Performance Optimization — Speed and Responsiveness Routine',
            category   : 'Software Optimization Routine',
            difficulty : 'Easy',
            tools      : ['Device settings', 'Task Manager / Activity Monitor', 'CCleaner (Windows, optional)'],
            steps: [
                'Restart the device — this clears RAM and closes background processes.',
                'Open Task Manager (Windows: Ctrl+Shift+Esc) or Activity Monitor (Mac) to identify high CPU/RAM processes.',
                'Disable unnecessary startup programs: Task Manager > Startup tab (Windows) or System Settings > General > Login Items (Mac).',
                'Uninstall unused applications to free up system resources.',
                'Clear browser cache and temporary files in browser settings.',
                'Run Disk Cleanup (Windows) or empty the Trash and clear system storage (Mac).',
                'Check for and install pending OS and driver updates.',
                'Reduce visual effects: Windows > Adjust appearance and performance settings. Mac > Reduce Motion in Accessibility.',
                'If the device has an HDD, consider upgrading to an SSD for a significant performance boost.',
            ],
            preventionTips: [
                'Restart your device at least once a week to clear accumulated processes.',
                'Keep at least 15% of storage free at all times for optimal performance.',
                'Limit browser extensions to only essential ones.',
                'Schedule monthly disk cleanup and defragmentation (HDD only).',
            ],
        },

        storage_memory: {
            title      : 'Storage and Memory Optimization — Space Recovery Routine',
            category   : 'Software Optimization Routine',
            difficulty : 'Easy',
            tools      : ['Device storage settings', 'Cloud storage account', 'External drive (optional)'],
            steps: [
                'Open storage settings to identify which categories are consuming the most space.',
                'Delete duplicate photos and videos — use Google Photos or iCloud to identify duplicates.',
                'Move large files (videos, project files) to an external drive or cloud storage.',
                'Uninstall applications you have not used in the past 30 days.',
                'Clear app caches: Settings > Apps > Select App > Clear Cache (Android). On iPhone, offload unused apps.',
                'Empty the Recycle Bin or Trash after deleting files.',
                'Enable cloud backup for photos and documents to keep local storage light.',
                'For laptops, compress large folders using built-in compression tools.',
                'If RAM is frequently maxed out, consider closing browser tabs and background apps.',
            ],
            preventionTips: [
                'Set a monthly reminder to clean up downloads and temporary files.',
                'Keep storage usage below 80% for consistent performance.',
                'Use streaming services instead of downloading media locally.',
                'Regularly back up and remove completed project files to external storage.',
            ],
        },

        os_boot: {
            title      : 'OS and Boot Issues — Diagnosis and Recovery',
            category   : 'Software Optimization Routine',
            difficulty : 'Moderate to Advanced',
            tools      : ['OS recovery drive or bootable USB', 'Device manufacturer website'],
            steps: [
                'Perform a hard reset: hold the power button for 10 seconds to force shutdown, then restart.',
                'If the device boots to a black screen, try connecting to an external monitor to isolate display issues.',
                'Boot into Safe Mode to determine if the issue is caused by a third-party application.',
                '  Windows: Restart > hold Shift while clicking Restart > Troubleshoot > Advanced > Startup Settings > Safe Mode.',
                '  Mac: Restart while holding Shift until the Apple logo appears.',
                'In Safe Mode, uninstall recently installed applications that may be causing boot failure.',
                'Run Windows Startup Repair: Settings > System > Recovery > Advanced Startup.',
                'Run macOS Disk Utility from Recovery Mode to repair disk errors.',
                'If the issue persists, back up all data and perform an OS reinstall from a recovery drive.',
                'If reinstalling fails, seek professional repair — the storage drive may be failing.',
            ],
            preventionTips: [
                'Never force shutdown during OS updates.',
                'Keep a bootable recovery USB prepared in advance.',
                'Install OS updates promptly to prevent known boot vulnerabilities.',
                'Back up data weekly to minimize loss in the event of OS failure.',
            ],
        },

        virus_malware: {
            title      : 'Virus and Malware Removal — Security Cleanup Routine',
            category   : 'Software Optimization Routine',
            difficulty : 'Moderate',
            tools      : ['Malwarebytes (free)', 'Windows Defender or built-in antivirus', 'Browser with safe mode'],
            steps: [
                'Disconnect from the internet immediately to prevent further data transmission.',
                'Boot into Safe Mode with Networking to run scans without the malware loading at startup.',
                'Download and run Malwarebytes (free version) from a trusted device and transfer via USB if needed.',
                'Run a full system scan with your built-in antivirus (Windows Defender or equivalent).',
                'Quarantine and delete all identified threats.',
                'Clear all browser data: history, cookies, cache, and saved passwords.',
                'Remove unknown browser extensions and reset browser settings to default.',
                'Change passwords for all accounts accessed on the affected device from a separate, clean device.',
                'Enable two-factor authentication on all critical accounts.',
                'After cleaning, reconnect to the internet and run a second scan to confirm removal.',
            ],
            preventionTips: [
                'Never open email attachments from unknown senders.',
                'Download software only from official sources and verified publishers.',
                'Keep antivirus software active and updated at all times.',
                'Avoid clicking pop-up ads or suspicious links.',
            ],
        },

        app_crashes: {
            title      : 'App Crashes and Freezes — Troubleshooting Routine',
            category   : 'Software Optimization Routine',
            difficulty : 'Easy',
            tools      : ['Device settings', 'App Store or Google Play', 'Event Viewer (Windows, advanced)'],
            steps: [
                'Force close the crashing application and relaunch it.',
                'Check if the app has a pending update in the App Store or Google Play — update it.',
                'Clear the app cache: Settings > Apps > Select App > Clear Cache (Android only).',
                'Uninstall and reinstall the application to restore it to a clean state.',
                'Check available storage — apps frequently crash when storage is below 5%.',
                'Restart the device and relaunch the application.',
                'Check if the app is compatible with your current OS version.',
                'Check the developer website or community forums for known crash reports.',
                'If crashes persist across multiple apps, run a full antivirus scan.',
                'As a last resort, back up data and perform an OS reset.',
            ],
            preventionTips: [
                'Keep all applications updated to the latest version.',
                'Avoid sideloading applications from unverified sources.',
                'Keep at least 15% of storage free to prevent crash-inducing memory pressure.',
                'Restart the device weekly to prevent memory leaks from accumulating.',
            ],
        },

        connectivity: {
            title      : 'Connectivity Issues — Wi-Fi, Bluetooth, and Network Routine',
            category   : 'Software Optimization Routine',
            difficulty : 'Easy to Moderate',
            tools      : ['Device network settings', 'Router access (optional)'],
            steps: [
                'Toggle airplane mode on for 10 seconds, then off again to reset radio modules.',
                'Forget the Wi-Fi network and reconnect: Settings > Wi-Fi > Select Network > Forget > Reconnect.',
                'Restart the router by unplugging it for 30 seconds and plugging it back in.',
                'Check if other devices can connect to the same network to isolate the issue.',
                'Update network adapter drivers: Device Manager > Network Adapters > Right-click > Update Driver.',
                'Reset network settings: Windows — run "netsh winsock reset" in Command Prompt as admin. Mac — delete network configuration files in Library/Preferences/SystemConfiguration.',
                'For Bluetooth issues: remove all paired devices and re-pair from scratch.',
                'Check if a firewall or VPN is blocking the connection.',
                'Run the built-in network troubleshooter: Settings > System > Troubleshoot > Network.',
                'If issues persist, update the OS and restart — many connectivity bugs are patched in updates.',
            ],
            preventionTips: [
                'Keep network adapter drivers updated regularly.',
                'Restart your router at least once a week.',
                'Avoid connecting to unsecured public Wi-Fi networks.',
                'Keep the device within reasonable range of the router for stable signal.',
            ],
        },
    });

    /**
     * Returns the tutorial for a given issue key
     * @param {string} issueKey
     * @returns {Object}
     */
    static getTutorial(issueKey) {
        const tutorial = TutorialLibrary.#tutorials[issueKey];
        if (!tutorial) {
            throw new AppError(
                `No tutorial found for issue: "${issueKey}".`,
                404,
                'ERR_TUTORIAL_NOT_FOUND'
            );
        }
        return { ...tutorial };
    }

    /**
     * Returns all available tutorial keys.
     * @returns {string[]}
     */
    static getAvailableKeys() {
        return Object.keys(TutorialLibrary.#tutorials);
    }

    /**
     * Returns all tutorials grouped by category.
     * @returns {Object}
     */
    static getAllGrouped() {
        const grouped = { hardware: {}, software: {} };
        const hardwareKeys = Object.values(ExternalIssue);
        for (const [key, val] of Object.entries(TutorialLibrary.#tutorials)) {
            if (hardwareKeys.includes(key)) grouped.hardware[key] = val;
            else grouped.software[key] = val;
        }
        return grouped;
    }
}


/* REPAIR SHOPS DIRECTORY*/

/**
 * Static directory of repair shop options
 */
class RepairShopDirectory {

    static #shops = Object.freeze([
        {
            name     : 'NU Accredited Repair Center',
            location : 'Building A Lobby, National University Manila',
            address  : 'M.F. Jhocson St., Sampaloc, Manila',
            services : ['Screen replacement', 'Battery replacement', 'Software troubleshooting', 'Data recovery'],
            hours    : 'Mon–Fri: 8AM–5PM',
            note     : 'Preferred for NU students. Present your NU ID for priority service.',
        },
        {
            name     : 'Samsung Service Center',
            location : 'SM City Manila, 3rd Floor',
            address  : 'Concepcion Aguila St., Ermita, Manila',
            services : ['Samsung device repairs', 'Screen and battery replacement', 'Software flashing', 'Warranty claims'],
            hours    : 'Mon–Sun: 10AM–8PM',
            note     : 'Bring original purchase receipt for warranty claims.',
        },
        {
            name     : 'Apple Authorized Service Provider',
            location : 'iCenter Philippines — SM Manila',
            address  : 'Concepcion Aguila St., Ermita, Manila',
            services : ['iPhone and iPad repairs', 'MacBook servicing', 'Apple Watch repairs', 'Battery replacement'],
            hours    : 'Mon–Sun: 10AM–8PM',
            note     : 'Book an appointment online at support.apple.com to minimize wait time.',
        },
        {
            name     : 'PC Options Service Center',
            location : 'Gilmore IT Center, Quezon City',
            address  : 'E. Rodriguez Sr. Ave., New Manila, Quezon City',
            services : ['Laptop and desktop repair', 'RAM and SSD upgrades', 'OS reinstallation', 'Virus removal'],
            hours    : 'Mon–Sat: 9AM–6PM',
            note     : 'Known for affordable rates and reliable laptop servicing.',
        },
        {
            name     : 'Villman Computers Service',
            location : 'Robinsons Galleria, Ortigas',
            address  : 'EDSA corner Ortigas Ave., Quezon City',
            services : ['Laptop servicing', 'Desktop builds and repairs', 'Component upgrades', 'Data recovery'],
            hours    : 'Mon–Sun: 10AM–8PM',
            note     : 'Best for desktop builds and component-level repairs.',
        },
    ]);

    //*Siraulo. Siraulo. SIraulo. Who said that you should code in you phon, you moron. Deputek talaga wala na ako maintindihan sa code ko putek oute. */

    /**
     * Returns all repair shops in the directory.
     * @returns {Object[]}
     */
    static getAllShops() {
        return [...RepairShopDirectory.#shops];
    }

    /**
     * Returns shops that offer a specific service.
     * @param {string} serviceKeyword
     * @returns {Object[]}
     */
    static getShopsByService(serviceKeyword) {
        return RepairShopDirectory.#shops.filter(shop =>
            shop.services.some(s => s.toLowerCase().includes(serviceKeyword.toLowerCase()))
        );
    }
}


/*
   5. OUTCOME STRATEGIES
        (1) FixYourselfStrategy  [DIY with tutorial]
        (2) FindRepairShopStrategy [professional help] 
*/

/* NOTE: Placeholder Graphic Interface, please polish the graphics in this*/

/**
 * Outcome Strategy 1: Fix It Yourself
 * Delivers a guided tutorial from TutorialLibrary
with step-by-step instructions the user can
 * follow to resolve the issue on their own.
 */
class FixYourselfStrategy extends RepairStrategy {
    #issueKey;
    #tutorialData;

    /**
     * @param {string} issueKey - Key from ExternalIssue or SoftwareIssue
     */
    constructor(issueKey) {
        super();
        this.#issueKey    = issueKey;
        this.#tutorialData = TutorialLibrary.getTutorial(issueKey);
    }

    getStrategyName() { return 'FixYourselfStrategy'; }

    /**
     * @param {Object} deviceMeta
     * @returns {Object}
     */
    execute(deviceMeta = {}) {
        console.log(`[TechCare] FixYourselfStrategy activated for issue: ${this.#issueKey}`);
        return this.deliver(deviceMeta);
    }

    /**
     * Delivers the DIY tutorial result.
     * @param {Object} deviceMeta
     * @returns {Object}
     */
    deliver(deviceMeta = {}) {
        return {
            outcome         : 'FIX_YOURSELF',
            outcomeLabel    : 'You Can Fix This Yourself',
            icon            : 'tool',
            color           : '#2ecc71',
            message         : (
                `Good news — this issue is something you can resolve on your own. ` +
                `Follow the step-by-step guide below carefully and your device ` +
                `should be back to normal without needing professional repair.`
            ),
            tutorial        : this.#tutorialData,
            deviceType      : deviceMeta.deviceType || 'your device',
            encouragement   : (
                `Remember: maintaining your own device saves money, extends its lifespan, ` +
                `and reduces e-waste. You are making a responsible choice.`
            ),
        };
    }

    getRecommendation() {
        return `This issue (${this.#issueKey}) can be resolved with a DIY fix. Follow the ${this.#tutorialData.title} guide.`;
    }
}

/* Deputek na Techcare pahamak ka, Lord have mercy nalang sa TRANSFER mamatay na ako */

/**
 * Outcome Strategy 2: Find a Repair Shop
 * Delivers professional repair guidance with
 * a list of nearby repair shops from
 * RepairShopDirectory, preparation steps,
 * and cost expectations.
 */
class FindRepairShopStrategy extends RepairStrategy {
    #issueKey;
    #severity;
    #reason;

    /**
     * @param {string} issueKey  - The specific issue that triggered this outcome
     * @param {string} severity  - SeverityLevel that led to this outcome
     * @param {string} reason    - Explanation of why professional repair is needed
     */
    constructor(issueKey, severity, reason = '') {
        super();
        this.#issueKey = issueKey;
        this.#severity = severity;
        this.#reason   = reason;
    }

    getStrategyName() { return 'FindRepairShopStrategy'; }

    /**
     * @param {Object} deviceMeta
     * @returns {Object}
     */
    execute(deviceMeta = {}) {
        console.log(`[TechCare] FindRepairShopStrategy activated. Issue: ${this.#issueKey}, Severity: ${this.#severity}`);
        return this.deliver(deviceMeta);
    }

    /**
     * Delivers the Find a Repair Shop result.
     * @param {Object} deviceMeta
     * @returns {Object}
     */
    deliver(deviceMeta = {}) {
        const shops = RepairShopDirectory.getShopsByService(
            this.#issueKey.replace(/_/g, ' ')
        );
        const allShops = shops.length > 0
            ? shops
            : RepairShopDirectory.getAllShops();

        return {
            outcome          : 'FIND_REPAIR_SHOP',
            outcomeLabel     : 'Find a Professional Repair Shop',
            icon             : 'shop',
            color            : '#e67e22',
            message          : (
                `Based on your assessment, this issue requires professional attention. ` +
                `${this.#reason} ` +
                `Please bring your device to one of the recommended repair centers below.`
            ),
            severity         : this.#severity,
            issueDetected    : this.#issueKey,
            repairShops      : allShops,
            preparationSteps : [
                'Back up all important data before bringing your device for repair.',
                'Take note of any symptoms, error messages, or behaviors to describe to the technician.',
                'Remove personal SIM card and memory card before handing over the device.',
                'Ask for a written repair estimate and warranty on parts and labor before approving work.',
                'Request a diagnosis report if the technician recommends major repairs.',
                'Compare estimates from at least two shops for expensive repairs.',
            ],
            costGuidance     : (
                `Repair costs vary by device type and issue severity. ` +
                `As a general rule, if the repair estimate exceeds 50% of your device's ` +
                `current market value, consider using the TIPID module for a repair-or-replace analysis.`
            ),
            deviceType       : deviceMeta.deviceType || 'your device',
        };
    }

    getRecommendation() {
        return `Issue "${this.#issueKey}" at severity "${this.#severity}" requires professional repair. Visit a certified repair center.`;
    }
}


/* CHATBOT ENGINE
* - Manages chatbot responses and underlying processes.
*/

/**
 * Manages the multi-step Tech-Care chatbo conversation. 
 */
class ChatbotEngine {
    #state;
    #deviceType;
    #damageCategory;
    #severityLevel;
    #specificIssue;
    #conversationHistory;
    #outcomeStrategy;

    /**
     * @param {string} [deviceType='laptop'] - Device type for context
     */
    constructor(deviceType = 'laptop') {
        this.#state               = ChatbotState.INIT;
        this.#deviceType          = deviceType;
        this.#damageCategory      = null;
        this.#severityLevel       = null;
        this.#specificIssue       = null;
        this.#conversationHistory = [];
        this.#outcomeStrategy     = null;
    }

    /* --- Public Getters --- */
    get state()               { return this.#state; }
    get deviceType()          { return this.#deviceType; }
    get conversationHistory() { return [...this.#conversationHistory]; }
    get isComplete()          { return this.#state === ChatbotState.COMPLETE; }

    /**
     * Returns the next chatbot prompt base on the current state. 
     * @returns {Object} Prompt structure
     */
    getNextPrompt() {
        switch (this.#state) {

            case ChatbotState.INIT:
            case ChatbotState.DAMAGE_CATEGORY:
                return {
                    state    : ChatbotState.DAMAGE_CATEGORY,
                    message  : `Hello! I am the EcoCircuit Tech-Care assistant. Let us assess your ${this.#deviceType} together.\n\nFirst — what type of issue are you experiencing?`,
                    inputType: 'choice',
                    choices  : [
                        { key: 'external', label: 'External / Physical Damage', description: 'Cracked screen, battery issues, damaged ports, water exposure, physical wear' },
                        { key: 'software', label: 'Software / Performance Issue', description: 'Slow performance, crashes, storage problems, viruses, boot failures, connectivity' },
                    ],
                };

            case ChatbotState.SEVERITY_CHECK:
                return {
                    state    : ChatbotState.SEVERITY_CHECK,
                    message  : this.#damageCategory === DamageCategory.EXTERNAL
                        ? `I see — your ${this.#deviceType} has a physical or external issue.\n\nHow would you describe the severity of the damage?`
                        : `I see — your ${this.#deviceType} has a software or performance issue.\n\nHow severe would you say the problem is?`,
                    inputType: 'choice',
                    choices  : this.#damageCategory === DamageCategory.EXTERNAL
                        ? [
                            { key: 'minor',    label: 'Minor',    description: 'Small scratches, stuck keys, loose connectors, minor charging issues — device still functions' },
                            { key: 'moderate', label: 'Moderate', description: 'Screen flickering, battery draining fast, some keys unresponsive — partially functional' },
                            { key: 'severe',   label: 'Severe',   description: 'Cracked screen, water damage, device will not charge, device will not turn on' },
                          ]
                        : [
                            { key: 'minor',    label: 'Minor',    description: 'Slow performance, minor app crashes, storage filling up — device still usable' },
                            { key: 'moderate', label: 'Moderate', description: 'Frequent crashes, significant slowdown, connectivity issues — noticeably impaired' },
                            { key: 'severe',   label: 'Severe',   description: 'Cannot boot, suspected virus, OS failure, complete data loss risk' },
                          ],
                };

            case ChatbotState.SPECIFIC_ISSUE:
                return {
                    state    : ChatbotState.SPECIFIC_ISSUE,
                    message  : `Got it. Now let me get more specific.\n\nWhat is the exact issue you are experiencing with your ${this.#deviceType}?`,
                    inputType: 'choice',
                    choices  : this.#damageCategory === DamageCategory.EXTERNAL
                        ? [
                            { key: ExternalIssue.SCREEN,           label: 'Screen Damage',                description: 'Cracks, dead pixels, flickering, touch unresponsive, discoloration' },
                            { key: ExternalIssue.BATTERY_CHARGING,  label: 'Battery or Charging Issue',   description: 'Battery drains fast, will not charge, swollen battery, charging port loose' },
                            { key: ExternalIssue.PORT_CONNECTOR,    label: 'Port or Connector Issue',      description: 'USB, audio jack, or HDMI port not working, bent pins, debris inside' },
                            { key: ExternalIssue.KEYBOARD_INPUT,    label: 'Keyboard or Input Issue',      description: 'Keys not working, stuck keys, trackpad erratic, input lag' },
                            { key: ExternalIssue.WATER_LIQUID,      label: 'Liquid or Water Exposure',     description: 'Device got wet, liquid spill, moisture inside screen or ports' },
                            { key: ExternalIssue.PHYSICAL_WEAR,     label: 'Physical Wear or Casing',      description: 'Scratches, dents, loose casing, rubber feet worn, hinge loose' },
                          ]
                        : [
                            { key: SoftwareIssue.PERFORMANCE,      label: 'Slow Performance or Freezing', description: 'Device is very slow, lags, freezes, or takes long to open apps' },
                            { key: SoftwareIssue.STORAGE_MEMORY,   label: 'Storage or Memory Full',       description: 'Low storage warnings, apps crashing due to memory, cannot save files' },
                            { key: SoftwareIssue.OS_BOOT,          label: 'OS or Boot Failure',           description: 'Device will not start, boot loop, black screen, OS corrupted' },
                            { key: SoftwareIssue.VIRUS_MALWARE,    label: 'Virus or Malware',             description: 'Suspicious pop-ups, unusual behavior, unauthorized access, ransomware' },
                            { key: SoftwareIssue.APP_CRASHES,      label: 'App Crashes or Freezes',       description: 'Specific apps crash repeatedly, force close errors, apps not opening' },
                            { key: SoftwareIssue.CONNECTIVITY,     label: 'Connectivity Issues',           description: 'Wi-Fi drops, Bluetooth not pairing, no internet, network errors' },
                          ],
                };

            case ChatbotState.OUTCOME:
                return {
                    state    : ChatbotState.OUTCOME,
                    message  : 'Analysis complete. Here is your Tech-Care recommendation:',
                    inputType: 'none',
                    result   : this.#outcomeStrategy?.execute({ deviceType: this.#deviceType }) || null,
                };

            case ChatbotState.COMPLETE:
                return {
                    state    : ChatbotState.COMPLETE,
                    message  : 'Your Tech-Care session is complete. You can restart the assessment or visit another module.',
                    inputType: 'none',
                };

            default:
                return {
                    state    : this.#state,
                    message  : 'Unexpected state. Please restart the session.',
                    inputType: 'none',
                };
        }
    }

    /**
     * Processes a user message and advances
     * the chatbot to the next state.
     * The only public method external code
     * needs to call.
     *
     * @param {string} userInput - The user's selected choice key
     * @returns {Object} Response including next prompt and conversation update
     */
    processMessage(userInput) {
        const input = userInput?.trim().toLowerCase();

        if (!input) {
            throw new AppError('User input cannot be empty.', 400, 'ERR_EMPTY_INPUT');
        }
        if (this.#state === ChatbotState.COMPLETE) {
            throw new AppError('Session is complete. Call reset() to start over.', 400, 'ERR_SESSION_COMPLETE');
        }

        // Record message in conversation history
        this.#conversationHistory.push({
            role     : 'user',
            content  : userInput,
            state    : this.#state,
            timestamp: new Date().toISOString(),
        });

        let botResponse;

        switch (this.#state) {

            /* ── Step 1: Damage Category ── */
            case ChatbotState.INIT:
            case ChatbotState.DAMAGE_CATEGORY:
                if (input === 'external') {
                    this.#damageCategory = DamageCategory.EXTERNAL;
                    this.#state          = ChatbotState.SEVERITY_CHECK;
                    botResponse = 'Understood — you have an external or physical issue. Let me check the severity.';
                } else if (input === 'software') {
                    this.#damageCategory = DamageCategory.SOFTWARE;
                    this.#state          = ChatbotState.SEVERITY_CHECK;
                    botResponse = 'Understood — you have a software or performance issue. Let me check the severity.';
                } else {
                    botResponse = 'Please select either "external" for physical damage or "software" for software issues.';
                }
                break;

            /* ── Step 2: Severity Check ── */
            case ChatbotState.SEVERITY_CHECK:
                if (['minor', 'moderate', 'severe'].includes(input)) {
                    this.#severityLevel = input;
                    this.#state         = ChatbotState.SPECIFIC_ISSUE;
                    botResponse = `Noted — ${input} severity. Let me narrow down the specific issue.`;
                } else {
                    botResponse = 'Please select a severity level: "minor", "moderate", or "severe".';
                }
                break;

            /* ── Step 3: Specific Issue ── */
            case ChatbotState.SPECIFIC_ISSUE: {
                const allIssues = [
                    ...Object.values(ExternalIssue),
                    ...Object.values(SoftwareIssue),
                ];
                if (allIssues.includes(input)) {
                    this.#specificIssue = input;
                    this.#state         = ChatbotState.ANALYSIS;
                    botResponse = `Got it — ${input.replace(/_/g, ' ')} issue detected. Running analysis...`;

                    // Run analysis and set outcome strategy immediately
                    this.#runAnalysis();
                    this.#state = ChatbotState.OUTCOME;
                } else {
                    botResponse = 'Please select a valid issue from the options provided.';
                }
                break;
            }

            /* ── Step 4: Outcome acknowledged ── */
            case ChatbotState.OUTCOME:
                this.#state = ChatbotState.COMPLETE;
                botResponse = 'Thank you for using Tech-Care. Remember to back up your data and reach out if you need further help.';
                break;

            default:
                botResponse = 'Unexpected state. Please restart the session.';
        }

        // Record bot response
        this.#conversationHistory.push({
            role     : 'assistant',
            content  : botResponse,
            state    : this.#state,
            timestamp: new Date().toISOString(),
        });

        return {
            botMessage  : botResponse,
            currentState: this.#state,
            isComplete  : this.isComplete,
            nextPrompt  : this.getNextPrompt(),
        };
    }

    /**
     * Runs the internal analysis logic to
     * determine and set the correct outcome
     * strategy based on category, severity,
     * and specific issue.
     */
    #runAnalysis() {
        const category = this.#damageCategory;
        const severity = this.#severityLevel;
        const issue    = this.#specificIssue;

        // Determine outcome based on combination of inputs
        const needsRepairShop = this.#requiresProfessional(category, severity, issue);

        if (needsRepairShop.needed) {
            this.#outcomeStrategy = new FindRepairShopStrategy(
                issue,
                severity,
                needsRepairShop.reason
            );
        } else {
            this.#outcomeStrategy = new FixYourselfStrategy(issue);
        }

        console.log(
            `[TechCare] Analysis complete. ` +
            `Category: ${category} | Severity: ${severity} | Issue: ${issue} | ` +
            `Outcome: ${this.#outcomeStrategy.getStrategyName()}`
        );
    }

    /**
     * Determines whether an issue requires
     * professional repair based on category,
     * severity, and specific issue type.
     * Private analysis logic — fully encapsulated.
     *
     * @param {string} category - DamageCategory value
     * @param {string} severity - SeverityLevel value
     * @param {string} issue    - Issue key
     * @returns {{ needed: boolean, reason: string }}
     */
    #requiresProfessional(category, severity, issue) {

        // Always requires professional repair
        const alwaysPro = [
            ExternalIssue.WATER_LIQUID,    // Water damage is always professional
        ];
        if (alwaysPro.includes(issue) && severity !== SeverityLevel.MINOR) {
            return {
                needed: true,
                reason: 'Liquid damage carries a high risk of internal component failure that requires professional diagnosis and cleaning equipment.',
            };
        }

        // Severe external damage always requires professional repair
        if (category === DamageCategory.EXTERNAL && severity === SeverityLevel.SEVERE) {
            return {
                needed: true,
                reason: 'The severity of the physical damage indicates internal components may be affected, which requires professional tools and expertise to safely repair.',
            };
        }

        // Severe software issues require professional repair
        if (category === DamageCategory.SOFTWARE && severity === SeverityLevel.SEVERE) {
            if (issue === SoftwareIssue.OS_BOOT) {
                return {
                    needed: true,
                    reason: 'A severe OS or boot failure may indicate hardware-level storage failure or corrupted system files that require professional recovery tools.',
                };
            }
            if (issue === SoftwareIssue.VIRUS_MALWARE && severity === SeverityLevel.SEVERE) {
                return {
                    needed: true,
                    reason: 'A severe malware infection may have compromised firmware or system-level files that require professional removal tools beyond standard antivirus software.',
                };
            }
        }

        // Moderate external damage on specific issues
        if (category === DamageCategory.EXTERNAL && severity === SeverityLevel.MODERATE) {
            if (issue === ExternalIssue.SCREEN) {
                return {
                    needed: true,
                    reason: 'A moderately damaged screen — flickering, dead pixels, or partial display failure — requires professional screen replacement tools and parts sourcing.',
                };
            }
            if (issue === ExternalIssue.BATTERY_CHARGING) {
                return {
                    needed: true,
                    reason: 'A swollen or severely degraded battery is a safety hazard. Professional battery replacement ensures the correct battery is installed and safely disposed of.',
                };
            }
        }

        // Everything else — DIY is viable
        return { needed: false, reason: '' };
    }

    /**
     * Returns the final outcome result if
     * the analysis is complete.
     * @returns {Object|null}
     */
    getOutcome() {
        if (!this.#outcomeStrategy) return null;
        return this.#outcomeStrategy.execute({ deviceType: this.#deviceType });
    }

    /**
     * Returns a full session summary for
     * saving to diagnostic_results.
     * @returns {Object}
     */
    getSessionSummary() {
        return {
            deviceType      : this.#deviceType,
            damageCategory  : this.#damageCategory,
            severityLevel   : this.#severityLevel,
            specificIssue   : this.#specificIssue,
            strategyUsed    : this.#outcomeStrategy?.getStrategyName() || null,
            recommendation  : this.#outcomeStrategy?.getRecommendation() || null,
            conversationSteps: this.#conversationHistory.length,
        };
    }

    /**
     * Resets the chatbot engine to its
     * initial state for a new session.
     * @returns {Object} First prompt
     */
    reset() {
        this.#state               = ChatbotState.INIT;
        this.#damageCategory      = null;
        this.#severityLevel       = null;
        this.#specificIssue       = null;
        this.#conversationHistory = [];
        this.#outcomeStrategy     = null;
        return this.getNextPrompt();
    }
}

/**
 * The TECH-CARE module wraps the ChatbotEngine
 * and provides the module-level interface for
 * the API and frontend to interact with.
 */
class TechCareModule extends Module {
    #chatbot;

    /**
     * @param {string} [deviceType='laptop']
     */
    constructor(deviceType = 'laptop') {
        super('TECHCARE-MODULE-001');
        this.#chatbot = new ChatbotEngine(deviceType);
    }

    /**
     * Returns the module description.
     * Overrides Module.getDescription() — Polymorphism.
     * @returns {string}
     */
    getDescription() {
        return (
            'Tech-Care provides the HOW — offering guided tutorials, software optimization ' +
            'routines, and hardware handling protocols. Answer a series of questions about ' +
            'your device issue and receive one of two clear outcomes: a step-by-step DIY ' +
            'tutorial you can follow yourself, or a list of professional repair shops near you.'
        );
    }

    /**
     * Starts the Tech-Care chatbot session
     * and returns the initial state.
     * Overrides Module.execute()
     * @returns {Object}
     */
    execute() {
        return {
            moduleId   : this.getModuleId(),
            moduleName : 'TECH-CARE',
            description: this.getDescription(),
            deviceType : this.#chatbot.deviceType,
            firstPrompt: this.#chatbot.getNextPrompt(),
            message    : 'Welcome to EcoCircuit Tech-Care. Let us assess your device together.',
        };
    }

    /**
     * Processes a user chatbot message.
     * Delegates to ChatbotEngine.processMessage().
     * @param {string} userInput
     * @returns {Object}
     */
    processMessage(userInput) {
        return this.#chatbot.processMessage(userInput);
    }

    /**
     * Returns the current chatbot prompt.
     * @returns {Object}
     */
    getNextPrompt() {
        return this.#chatbot.getNextPrompt();
    }

    /**
     * Returns the final outcome if complete.
     * @returns {Object|null}
     */
    getOutcome() {
        return this.#chatbot.getOutcome();
    }

    /**
     * Returns a summary of the session for
     * saving to diagnostic_results.
     * @returns {Object}
     */
    getSessionSummary() {
        return this.#chatbot.getSessionSummary();
    }

    /**
     * Returns whether the chatbot session
     * is complete.
     * @returns {boolean}
     */
    isComplete() {
        return this.#chatbot.isComplete;
    }

    /**
     * Resets the chatbot to start over.
     * @returns {Object} First prompt
     */
    reset() {
        return this.#chatbot.reset();
    }

    /**
     * Returns the tutorial library for
     * display on the Tech-Care frontend page.
     * @returns {Object}
     */
    getTutorialLibrary() {
        return TutorialLibrary.getAllGrouped();
    }

    /**
     * Returns a specific tutorial by issue key.
     * @param {string} issueKey
     * @returns {Object}
     */
    getTutorial(issueKey) {
        return TutorialLibrary.getTutorial(issueKey);
    }

    /**
     * Returns all repair shops in the directory.
     * @returns {Object[]}
     */
    getRepairShops() {
        return RepairShopDirectory.getAllShops();
    }
}
 
/* TECH-CARE FACTORY * /

/**
 * Factory for creating TechCareModule instances.
 */
class TechCareFactory extends ModuleFactory {
    #instanceCount;
    #defaultDeviceType;

    /**
     * @param {string} [defaultDeviceType='laptop']
     */
    constructor(defaultDeviceType = 'laptop') {
        super();
        this.#instanceCount    = 0;
        this.#defaultDeviceType = defaultDeviceType;
    }

    getModuleType() { return ModuleType.TECHCARE; }

    /**
     * Creates and returns a configured TechCareModule.
     * @param {string} [deviceType]
     * @returns {TechCareModule}
     */
    createModule(deviceType = null) {
        this.#instanceCount++;
        const type = deviceType || this.#defaultDeviceType;
        console.log(`[EcoCircuit] TechCareFactory: creating TechCareModule #${this.#instanceCount} for "${type}".`);
        return new TechCareModule(type);
    }

    getInstanceCount() { return this.#instanceCount; }
}


/* EXPORTS */
module.exports = {
    // Enums
    ChatbotState,
    DamageCategory,
    SeverityLevel,
    ExternalIssue,
    SoftwareIssue,

    // Libraries
    TutorialLibrary,
    RepairShopDirectory,

    // Outcome Strategies
    FixYourselfStrategy,
    FindRepairShopStrategy,

    // Chatbot Engine
    ChatbotEngine,

    // Module and Factory
    TechCareModule,
    TechCareFactory,
};