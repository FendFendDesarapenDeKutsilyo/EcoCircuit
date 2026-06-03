'use strict';

const {
    Module,
    ModuleFactory,
    ElectronicDevice,
    AppError,
    DeviceStatus,
    ModuleType,
} = require('../EcoCircuit');

/**
 * Abstract base class for all nodes in the
 * Transfer module's decision tree.
 * Both DecisionNode (branch) and ResultNode (leaf)
 * extend this class and implement evaluate().
 *
 * @abstract
 */
class TreeNode {
    constructor() {
        if (new.target === TreeNode) {
            throw new AppError(
                'TreeNode is abstract and cannot be instantiated directly.',
                500,
                'ERR_ABSTRACT_CLASS'
            );
        }
    }

    /**
     * Evaluates this node against the given device.
     * Branch nodes (DecisionNode) delegate to a child.
     * Leaf nodes (ResultNode) return a final outcome.
     * Must be implemented by every subclass.
     *
     * @abstract
     * @param {ElectronicDevice} device
     * @returns {Object} Evaluation result
     */
    evaluate(device) {
        throw new AppError(
            'evaluate() must be implemented by the subclass.',
            500,
            'ERR_NOT_IMPLEMENTED'
        );
    }

    /**
     * Returns the node type label for logging
     * and API response purposes.
     * Must be implemented by every subclass.
     *
     * @abstract
     * @returns {string}
     */
    getNodeType() {
        throw new AppError(
            'getNodeType() must be implemented by the subclass.',
            500,
            'ERR_NOT_IMPLEMENTED'
        );
    }
}


/* RESULT NODE
 *  - Leaf Node (Composite Pattern) Represents a terminal leaf in the tree.
 *  - When reached, it returns a final transfer recommendation directly without further branching.
 *  - TreeNode and returns a result immediately
 *     instead of delegating to a child node.
*/

/**
 * Represents a terminal leaf node in the
 * Transfer decision tree. Holds the final
 * recommendation, transfer options, disposal
 * instructions, and nearby drop-off locations.
 */
class ResultNode extends TreeNode {
    #outcome;           // Transfer outcome identifier
    #message;           // User-facing recommendation message
    #color;             // UI color code for the result card
    #icon;              // Emoji icon for the result
    #transferOptions;   // Array of available transfer methods
    #preparationSteps;  // Steps the user must take before transfer
    #dropOffLocations;  // Nearby drop-off or transfer locations
    #nextStatus;        // DeviceStatus the device should be updated to
    #urgency;           // 'normal' | 'urgent' | 'critical'

    /**
     * @param {string}   outcome          - Machine-readable outcome key
     * @param {string}   message          - User-facing recommendation
     * @param {string}   color            - UI color hex code
     * @param {string}   icon             - Emoji icon
     * @param {string[]} transferOptions  - Available transfer methods
     * @param {string[]} preparationSteps - Steps before transfer
     * @param {string[]} dropOffLocations - Nearby locations
     * @param {string}   nextStatus       - DeviceStatus after transfer
     * @param {string}   urgency          - Urgency level
     */
    constructor(
        outcome,
        message,
        color,
        icon,
        transferOptions  = [],
        preparationSteps = [],
        dropOffLocations = [],
        nextStatus       = DeviceStatus.PENDING,
        urgency          = 'normal'
    ) {
        super();

        if (!outcome || !message || !color) {
            throw new AppError(
                'ResultNode requires outcome, message, and color.',
                400,
                'ERR_INVALID_NODE'
            );
        }

        this.#outcome          = outcome;
        this.#message          = message;
        this.#color            = color;
        this.#icon             = icon;
        this.#transferOptions  = transferOptions;
        this.#preparationSteps = preparationSteps;
        this.#dropOffLocations = dropOffLocations;
        this.#nextStatus       = nextStatus;
        this.#urgency          = urgency;
    }

    getNodeType() { return 'ResultNode'; }

    /* --- Getters --- */
    get outcome()          { return this.#outcome; }
    get message()          { return this.#message; }
    get color()            { return this.#color; }
    get icon()             { return this.#icon; }
    get urgency()          { return this.#urgency; }
    get nextStatus()       { return this.#nextStatus; }
    get transferOptions()  { return [...this.#transferOptions]; }
    get preparationSteps() { return [...this.#preparationSteps]; }
    get dropOffLocations() { return [...this.#dropOffLocations]; }

    /**
     * Evaluates this leaf node and returns the
     * complete transfer recommendation result.
     * Overrides TreeNode.evaluate() — Polymorphism.
     * Does not inspect the device further —
     * this node is a terminal outcome.
     *
     * @param {ElectronicDevice} device
     * @returns {Object}
     */
    evaluate(device) {
        return {
            nodeType        : this.getNodeType(),
            outcome         : this.#outcome,
            icon            : this.#icon,
            message         : this.#message,
            color           : this.#color,
            urgency         : this.#urgency,
            transferOptions : this.#transferOptions,
            preparationSteps: this.#preparationSteps,
            dropOffLocations: this.#dropOffLocations,
            nextStatus      : this.#nextStatus,
            deviceMeta      : device.getMetadata(),
            evaluatedAt     : new Date().toISOString(),
        };
    }

    /**
     * Serializes the node structure for
     * debugging or visualization purposes.
     * @returns {Object}
     */
    toRecord() {
        return {
            nodeType: this.getNodeType(),
            outcome : this.#outcome,
            message : this.#message,
            urgency : this.#urgency,
        };
    }
}


/* DECISION NODE — Branch Node (Composite Pattern)
      Represents an internal branch in the tree.
      Evaluates a condition on the device and
      delegates to either its trueBranch or
      falseBranch child node.

      NOTE: This DecisionNode is specific to the
      TRANSFER module's Composite Pattern tree.
      It is distinct from the DecisionNode in
      techcare.js which is used for the chatbot
      Decision Tree flow.
*/

/**
 * Represents an internal branch node in the
 * Transfer decision tree. Checks a specific
 * device condition and routes to either the
 * trueBranch or falseBranch child node.
 */
class TransferDecisionNode extends TreeNode {
    #conditionKey;      // The condition to check on the device
    #expectedValue;     // The value that triggers the trueBranch
    #trueBranch;        // Child node when condition matches
    #falseBranch;       // Child node when condition does not match
    #nodeLabel;         // Human-readable label for this decision point

    /**
     * @param {string}   conditionKey   - Key passed to device.getCondition()
     * @param {string}   expectedValue  - Value that routes to trueBranch
     * @param {TreeNode} trueBranch     - Child node for matching condition
     * @param {TreeNode} falseBranch    - Child node for non-matching condition
     * @param {string}   [nodeLabel]    - Human-readable label for this node
     */
    constructor(conditionKey, expectedValue, trueBranch, falseBranch, nodeLabel = '') {
        super();

        if (!conditionKey || !expectedValue) {
            throw new AppError(
                'TransferDecisionNode requires conditionKey and expectedValue.',
                400,
                'ERR_INVALID_NODE'
            );
        }
        if (!(trueBranch instanceof TreeNode) || !(falseBranch instanceof TreeNode)) {
            throw new AppError(
                'TransferDecisionNode branches must be valid TreeNode instances.',
                400,
                'ERR_INVALID_BRANCH'
            );
        }

        this.#conditionKey  = conditionKey;
        this.#expectedValue = expectedValue;
        this.#trueBranch    = trueBranch;
        this.#falseBranch   = falseBranch;
        this.#nodeLabel     = nodeLabel || `Check: ${conditionKey} === ${expectedValue}`;
    }

    getNodeType()  { return 'TransferDecisionNode'; }
    getNodeLabel() { return this.#nodeLabel; }

    /**
     * Evaluates this branch node against the device.
     * If the device's condition matches expectedValue,
     * delegates to trueBranch. Otherwise falseBranch.
     * Overrides TreeNode.evaluate() — Polymorphism.
     *
     * @param {ElectronicDevice} device
     * @returns {Object} Result from the matched child node
     */
    evaluate(device) {
        const conditionValue = device.getCondition(this.#conditionKey);
        const isMatch        = conditionValue === this.#expectedValue;

        console.log(
            `[TRANSFER] ${this.#nodeLabel} → ` +
            `"${this.#conditionKey}" is "${conditionValue}" ` +
            `(expected "${this.#expectedValue}") → ${isMatch ? 'TRUE branch' : 'FALSE branch'}`
        );

        return isMatch
            ? this.#trueBranch.evaluate(device)
            : this.#falseBranch.evaluate(device);
    }

    /**
     * Serializes the node structure for
     * debugging or tree visualization.
     * @returns {Object}
     */
    toRecord() {
        return {
            nodeType      : this.getNodeType(),
            nodeLabel     : this.#nodeLabel,
            conditionKey  : this.#conditionKey,
            expectedValue : this.#expectedValue,
            trueBranch    : this.#trueBranch.toRecord?.() || { nodeType: this.#trueBranch.getNodeType() },
            falseBranch   : this.#falseBranch.toRecord?.() || { nodeType: this.#falseBranch.getNodeType() },
        };
    }
}


/* TRANSFER TREE BUILDER
      Constructs the full Transfer decision
      tree by wiring ResultNodes (leaves)
      and TransferDecisionNodes (branches).
      Separated from TransferModule to follow
      the Single Responsibility Principle. 
*/

class TransferTreeBuilder {

    /**
     * Constructs and returns the root node of
     * the full Transfer decision tree.
     * @returns {TreeNode} Root of the tree
     */
    static build() {

        /* ── LEAF NODES (Terminal Results) ── */

        const resultDanger = new ResultNode(
            'DANGER_BATTERY',
            'Your device has a swollen battery which is a fire and safety hazard.',
            '#e74c3c',
            '🚨',
            ['Bring to a certified technician immediately', 'Do NOT attempt to charge or use the device'],
            [
                'Do NOT puncture, bend, or attempt to remove the battery yourself.',
                'Place the device in a cool, dry, and open area away from flammable materials.',
                'Place it in a fireproof bag or container if available.',
                'Bring it to a certified technician or e-waste facility as soon as possible.',
                'Do NOT throw in regular trash — swollen batteries are a fire hazard.',
            ],
            ['NU Accredited Repair Center — Building A Lobby', 'Certified E-waste Facility — Sampaloc, Manila'],
            DeviceStatus.PENDING,
            'critical'
        );

        const resultRecycleWater = new ResultNode(
            'RECYCLE_WATER_DAMAGE',
            'Your device has sustained water damage and is no longer functional.',
            '#2ecc71',
            '♻️',
            ['Drop off at E-waste collection point', 'Submit to certified recycling center'],
            [
                'Do NOT attempt to charge a water-damaged device — this causes short circuits.',
                'Remove the SIM card and memory card if still accessible.',
                'Back up data using a data recovery service if the data is important.',
                'Wipe all personal accounts and data if possible before disposal.',
                'Seal the device in a bag to prevent moisture from spreading.',
            ],
            [
                'NU E-waste Drop-off Point — Building A Lobby',
                'Certified Recycling Center — Sampaloc, Manila',
                'SM Cyberzone E-waste Drive — SM City Manila',
            ],
            DeviceStatus.FOR_RECYCLING,
            'normal'
        );

        const resultRecycleOld = new ResultNode(
            'RECYCLE_OLD_DEVICE',
            'Your device is non-functional and past its practical lifespan. Recycle or donate responsibly.',
            '#2ecc71',
            '♻️',
            ['Recycle at certified e-waste facility', 'Donate to an electronics refurbishment program'],
            [
                'Perform a factory reset to wipe all personal data before disposal.',
                'Remove SIM and memory cards.',
                'Remove any accessories or peripherals that are still functional.',
                'Check if the manufacturer has a take-back or trade-in program.',
                'Label the device clearly if donating to a refurbishment program.',
            ],
            [
                'NU E-waste Drop-off Point — Building A Lobby',
                'Certified Recycling Center — Sampaloc, Manila',
                'DENR Accredited E-waste Facility — Metro Manila',
            ],
            DeviceStatus.FOR_RECYCLING,
            'normal'
        );

        const resultRepairFirst = new ResultNode(
            'REPAIR_RECOMMENDED',
            'Your device is non-functional but relatively new. Professional repair is recommended before disposal.',
            '#f39c12',
            '🛠️',
            ['Visit a certified repair center', 'Request a repair estimate before committing'],
            [
                'Get a repair estimate first — compare it against a refurbished replacement.',
                'Ask the technician whether the repair includes a parts warranty.',
                'Back up any recoverable data before leaving the device for repair.',
                'If repair cost exceeds 50% of replacement value, consider disposal instead.',
                'Use the TIPID module to evaluate the repair cost ratio.',
            ],
            [
                'NU Accredited Repair Center — Building A Lobby',
                'Authorized Service Center — Sampaloc, Manila',
            ],
            DeviceStatus.FOR_REPAIR,
            'normal'
        );

        const resultSellForParts = new ResultNode(
            'SELL_FOR_PARTS',
            'Your device has a broken screen but the motherboard is functional. Sell for parts.',
            '#e67e22',
            '🔧',
            ['List components on second-hand marketplaces', 'Sell to a local repair shop for parts'],
            [
                'Identify which components are still functional (RAM, storage, camera, etc.).',
                'Wipe all personal data before handing over to a buyer or shop.',
                'List individual parts on Carousell, OLX, or Facebook Marketplace.',
                'Contact local repair shops — they often buy working components.',
                'Package components carefully to prevent damage during handover.',
            ],
            [
                'Carousell Philippines — online marketplace',
                'OLX Philippines — online marketplace',
                'Local repair shops near National University — Sampaloc, Manila',
            ],
            DeviceStatus.FOR_RECYCLING,
            'normal'
        );

        const resultRecycleParts = new ResultNode(
            'RECYCLE_NO_PARTS',
            'Your device has no salvageable parts. Recycle it at a certified e-waste facility.',
            '#2ecc71',
            '♻️',
            ['Drop off at e-waste collection point', 'Submit to certified recycling program'],
            [
                'Do NOT throw the device in regular trash — it contains hazardous materials.',
                'Remove any accessible batteries before disposal.',
                'Wipe all personal data with a factory reset if the device can still power on.',
                'Check for a manufacturer take-back program for your brand.',
                'Bring it to the nearest certified e-waste collection point.',
            ],
            [
                'NU E-waste Drop-off Point — Building A Lobby',
                'Certified Recycling Center — Sampaloc, Manila',
                'SM Cyberzone E-waste Drive — SM City Manila',
            ],
            DeviceStatus.RECYCLED,
            'normal'
        );

        const resultSellFunctional = new ResultNode(
            'SELL_FUNCTIONAL',
            'Your device is fully functional and in good condition. Sell or donate it.',
            '#f1c40f',
            '💰',
            ['Sell on second-hand marketplace', 'Donate to a school or community program'],
            [
                'Perform a full factory reset to wipe all personal accounts and data.',
                'Remove all SIM cards, memory cards, and personal accessories.',
                'Take clear, honest photos showing the actual condition of the device.',
                'Research the current market price for your model before listing.',
                'Consider donating to an NU student who needs it more than a marketplace buyer.',
            ],
            [
                'Carousell Philippines — online marketplace',
                'Facebook Marketplace — online',
                'NU Student Exchange Program — inquire at the Student Affairs Office',
            ],
            DeviceStatus.DONATED,
            'normal'
        );

        const resultSellMinorWear = new ResultNode(
            'SELL_MINOR_WEAR',
            'Your device is functional with minor cosmetic wear. Still very sellable.',
            '#f1c40f',
            '💰',
            ['Sell at a slight discount on second-hand marketplace', 'Donate to a community program'],
            [
                'Be honest about the cosmetic condition when listing — build buyer trust.',
                'A case and screen protector can improve the perceived condition.',
                'Perform a full factory reset before handing over.',
                'Price it 10% to 20% below market rate to reflect the wear.',
                'Include original accessories if available to increase perceived value.',
            ],
            [
                'Carousell Philippines — online marketplace',
                'Facebook Marketplace — online',
                'NU Student Exchange Program — inquire at the Student Affairs Office',
            ],
            DeviceStatus.DONATED,
            'normal'
        );

        /* ── BRANCH NODES (built bottom-up) ── */

        // "Can parts be salvaged from the device?"
        const nodePartsCheck = new TransferDecisionNode(
            'partsSalvageable',
            'yes',
            resultSellForParts,
            resultRecycleParts,
            'Can parts be salvaged from the device?'
        );

        // "Is the screen still functional?"
        const nodeScreenCheck = new TransferDecisionNode(
            'screenFunctional',
            'yes',
            // Screen works — check cosmetic condition
            new TransferDecisionNode(
                'cosmeticDamage',
                'none',
                resultSellFunctional,   // No cosmetic damage → sell at full price
                resultSellMinorWear,    // Minor cosmetic damage → sell at discount
                'Is there any cosmetic damage on the device?'
            ),
            // Screen broken — check if parts are salvageable
            nodePartsCheck,
            'Is the screen still functional?'
        );

        // "Is the battery swollen?"
        const nodeBatteryCheck = new TransferDecisionNode(
            'batterySwollen',
            'yes',
            resultDanger,       // Swollen battery → danger
            nodeScreenCheck,    // No swollen battery → check screen
            'Is the battery swollen or bulging?'
        );

        // "Is the device less than 3 years old?"
        const nodeAgeCheck = new TransferDecisionNode(
            'deviceAgeLessThan3',
            'yes',
            resultRepairFirst,  // Young device → try repair first
            resultRecycleOld,   // Old device → recycle
            'Is the device less than 3 years old?'
        );

        // "Was the device water damaged?"
        const nodeWaterCheck = new TransferDecisionNode(
            'waterDamaged',
            'yes',
            resultRecycleWater, // Water damaged → recycle
            nodeAgeCheck,       // Not water damaged → check age
            'Was the device exposed to water or liquid damage?'
        );

        /* ── ROOT NODE ── */

        // "Does the device power on?"
        const root = new TransferDecisionNode(
            'powersOn',
            'yes',
            nodeBatteryCheck,   // Powers on → check battery
            nodeWaterCheck,     // Does not power on → check water damage
            'Does the device still power on?'
        );

        return root;
    }
}


/* DISPOSAL OPTION LIBRARY
      A static library of disposal and
      transfer options organized by outcome
      type. Used by TransferModule to provide
      additional context and links for each
      recommendation.
*/

/**
 * Static library of disposal and transfer
 * options for the TRANSFER module's
 * informational content sections.
 */
class DisposalOptionLibrary {

    /** @type {Object.<string, Object>} */
    static #options = Object.freeze({
        recycle: {
            label      : 'Recycle',
            icon       : '♻️',
            description: 'Drop your device at a certified e-waste recycling facility.',
            locations  : [
                'NU E-waste Drop-off Point — Building A Lobby, National University Manila',
                'Certified Recycling Center — Sampaloc, Manila',
                'SM Cyberzone E-waste Drive — SM City Manila',
                'DENR Accredited E-waste Facility — Metro Manila',
            ],
            tips: [
                'Always factory reset before dropping off.',
                'Remove SIM and memory cards.',
                'Check if the manufacturer has a take-back program.',
            ],
        },
        donate: {
            label      : 'Donate',
            icon       : '🤝',
            description: 'Give your device to someone who needs it or a community program.',
            locations  : [
                'NU Student Exchange Program — Student Affairs Office',
                'Digital Equity Foundation Philippines',
                'Gawad Kalinga Tech Donation Drive',
                'Public school ICT programs in Metro Manila',
            ],
            tips: [
                'Wipe all personal data before donating.',
                'Include a charger and accessories if available.',
                'Donate only working or repairable devices.',
            ],
        },
        sell: {
            label      : 'Sell',
            icon       : '💰',
            description: 'List your device on a second-hand marketplace.',
            locations  : [
                'Carousell Philippines — carousell.ph',
                'Facebook Marketplace',
                'OLX Philippines — olx.com.ph',
                'Shopee Preloved',
            ],
            tips: [
                'Be honest about the device condition in your listing.',
                'Factory reset before handing over.',
                'Research the current market price for your model.',
            ],
        },
        sellForParts: {
            label      : 'Sell for Parts',
            icon       : '🔧',
            description: 'Sell functional components to repair shops or hobbyists.',
            locations  : [
                'Local repair shops near National University — Sampaloc, Manila',
                'Carousell Philippines — tech parts listings',
                'Facebook Marketplace — tech and parts category',
            ],
            tips: [
                'Identify which components are still functional.',
                'Wipe storage components before selling.',
                'Package parts carefully to prevent damage.',
            ],
        },
        repair: {
            label      : 'Professional Repair',
            icon       : '🛠️',
            description: 'Bring your device to a certified repair center.',
            locations  : [
                'NU Accredited Repair Center — Building A Lobby',
                'Authorized Service Center — Sampaloc, Manila',
            ],
            tips: [
                'Get a written estimate before leaving the device.',
                'Ask about parts warranty.',
                'Back up data before repair.',
            ],
        },
    });

    /**
     * Returns the full disposal option record
     * for a given outcome type.
     * @param {string} outcomeType
     * @returns {Object}
     */
    static getOption(outcomeType) {
        const type = outcomeType?.toLowerCase();
        if (!DisposalOptionLibrary.#options[type]) {
            throw new AppError(
                `Unknown disposal option: "${outcomeType}". ` +
                `Valid types: ${Object.keys(DisposalOptionLibrary.#options).join(', ')}.`,
                400,
                'ERR_UNKNOWN_OPTION'
            );
        }
        return { ...DisposalOptionLibrary.#options[type] };
    }

    /**
     * Returns all available disposal option types.
     * @returns {string[]}
     */
    static getOptionTypes() {
        return Object.keys(DisposalOptionLibrary.#options);
    }

    /**
     * Returns all disposal options as an array.
     * @returns {Object[]}
     */
    static getAllOptions() {
        return Object.entries(DisposalOptionLibrary.#options).map(([key, val]) => ({
            type: key,
            ...val,
        }));
    }
}


/* TRANSFER MODULE
      The main TRANSFER module class.
      Manages the Composite Pattern tree
      traversal to produce a disposal or
      transfer recommendation for the device.
      Extends the abstract Module base class.
*/

/**
 * The TRANSFER module evaluates a user's
 * electronic device through a Composite Pattern
 * decision tree and recommends the most
 * appropriate and responsible transfer action:
 * sell, donate, recycle, sell for parts, or
 * seek professional repair.
 */
class TransferModule extends Module {
    #rootNode;          // Root TreeNode of the decision tree
    #lastResult;        // Most recent evaluation result

    constructor() {
        super('TRANSFER-MODULE-001'); // passes moduleId to Module base class
        this.#rootNode   = TransferTreeBuilder.build();
        this.#lastResult = null;
    }

    /* --- Module Abstract Method Implementations --- */

    /**
     * Returns a description of the TRANSFER module.
     * Overrides Module.getDescription() — Polymorphism.
     * @returns {string}
     */
    getDescription() {
        return (
            'The TRANSFER module helps you determine the most responsible action ' +
            'for your electronic device when you no longer need it. ' +
            'Answer a series of condition questions to receive a guided recommendation: ' +
            'sell, donate, recycle, sell for parts, or seek professional repair. ' +
            'All recommendations align with responsible e-waste management practices.'
        );
    }

    /**
     * Executes the TRANSFER module against a device.
     * Traverses the Composite Pattern decision tree
     * and returns the matching terminal recommendation.
     *
     * The tree traversal is fully polymorphic:
     * each node's evaluate() is called without
     * knowing whether it is a branch or a leaf.
     * The tree routes itself to the correct result.
     *
     * @param {ElectronicDevice} device
     * @returns {Object} Transfer recommendation result
     */
    execute(device) {
        if (!(device instanceof ElectronicDevice)) {
            throw new AppError(
                'TransferModule.execute() requires a valid ElectronicDevice instance.',
                400,
                'ERR_INVALID_DEVICE'
            );
        }

        console.log(`[TRANSFER] Starting tree traversal for device: ${JSON.stringify(device.getMetadata())}`);

        // Polymorphic traversal — the root delegates through the tree automatically
        const result = this.#rootNode.evaluate(device);

        this.#lastResult = {
            ...result,
            moduleId  : this.getModuleId(),
            moduleName: 'TRANSFER',
        };

        console.log(`[TRANSFER] Tree traversal complete. Outcome: ${result.outcome}`);

        return this.#lastResult;
    }

    /* --- Disposal Option Methods --- */

    /**
     * Returns disposal option details for
     * a given outcome type.
     * @param {string} outcomeType
     * @returns {Object}
     */
    getDisposalOption(outcomeType) {
        return DisposalOptionLibrary.getOption(outcomeType);
    }

    /**
     * Returns all available disposal option types.
     * @returns {string[]}
     */
    getDisposalOptionTypes() {
        return DisposalOptionLibrary.getOptionTypes();
    }

    /**
     * Returns all disposal options as a list.
     * Used to populate the TRANSFER module's
     * reference directory on the frontend.
     * @returns {Object[]}
     */
    getAllDisposalOptions() {
        return DisposalOptionLibrary.getAllOptions();
    }

    /**
     * Returns the result of the most recent
     * device evaluation, or null if none has
     * been performed yet in this session.
     * @returns {Object|null}
     */
    getLastResult() {
        return this.#lastResult;
    }
}


/* TRANSFER FACTORY
      Creates and returns a configured
      TransferModule instance.
      Extends the abstract ModuleFactory
      base class from EcoCircuit.js.
*/

/**
 * Factory responsible for creating and
 * returning a configured TransferModule.
 */
class TransferFactory extends ModuleFactory {
    #instanceCount;

    constructor() {
        super(); // calls ModuleFactory constructor — enforces abstract guard
        this.#instanceCount = 0;
    }

    /**
     * Returns the module type this factory produces.
     * @returns {string}
     */
    getModuleType() {
        return ModuleType.TRANSFER;
    }

    /**
     * Creates and returns a fully configured TransferModule.
     * @returns {TransferModule}
     */
    createModule() {
        this.#instanceCount++;
        console.log(
            `[EcoCircuit] TransferFactory: creating TransferModule ` +
            `(instance #${this.#instanceCount}).`
        );
        return new TransferModule();
    }

    /**
     * Returns the total number of TransferModule
     * instances this factory has created.
     * @returns {number}
     */
    getInstanceCount() {
        return this.#instanceCount;
    }
}


/*EXPORTS*/
module.exports = {
    // Abstract base
    TreeNode,

    // Tree nodes
    ResultNode,
    TransferDecisionNode,

    // Tree builder
    TransferTreeBuilder,

    // Disposal library
    DisposalOptionLibrary,

    // Module and Factory
    TransferModule,
    TransferFactory,
};