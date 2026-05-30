'use strict';

/* Dependencies:
     - ecocircuit_main.js (Module, ModuleFactory, ElectronicDevice, AppError, ModuleType)
*/

const {
    Module,
    ModuleFactory,
    ElectronicDevice,
    AppError,
    ModuleType,
    REPAIR_THRESHOLDS,
} = require('./EcoCircuit');


/* TIPID STRATEGY */

/**
 * Abstract base class for all TIPID evaluation
 * strategies. Each concrete strategy encapsulates
 * a specific repair-or-replace decision rule.
 *
 * @abstract
 */
class TipidStrategy {
    constructor() {
        if (new.target === TipidStrategy) {
            throw new AppError(
                'TipidStrategy is abstract and cannot be instantiated directly.',
                500,
                'ERR_ABSTRACT_CLASS'
            );
        }
    }

    /**
     * Determines whether this strategy applies
     * to the given device based on its conditions.
     * Must be implemented by every subclass.
     *
     * @abstract
     * @param {ElectronicDevice} device
     * @returns {boolean}
     */
    isApplicable(device) {
        throw new AppError(
            'isApplicable() must be implemented by the subclass.',
            500,
            'ERR_NOT_IMPLEMENTED'
        );
    }

    /**
     * Evaluates the device and returns a
     * structured recommendation result.
     * Must be implemented by every subclass.
     *
     * @abstract
     * @param {ElectronicDevice} device
     * @returns {{
     *   recommendation : string,
     *   reason         : string,
     *   severity       : string,
     *   color          : string,
     *   tips           : string[]
     * }}
     */
    evaluate(device) {
        throw new AppError(
            'evaluate() must be implemented by the subclass.',
            500,
            'ERR_NOT_IMPLEMENTED'
        );
    }

    /**
     * Returns the strategy's name.
     * Used for logging and API responses.
     * Must be implemented by every subclass.
     *
     * @abstract
     * @returns {string}
     */
    getStrategyName() {
        throw new AppError(
            'getStrategyName() must be implemented by the subclass.',
            500,
            'ERR_NOT_IMPLEMENTED'
        );
    }
}


/* CONCRETE TIPID STRATEGIES */

/**
 * Strategy: Device parts are obsolete.
 * Triggered when partsAvail condition is 'obsolete'.
 * Recommendation: Do not repair — parts cannot
 * be sourced, making repair impossible or unsafe.
 */
class ObsoletePartsStrategy extends TipidStrategy {
    #tips;

    constructor() {
        super();
        this.#tips = [
            'Parts for this device are no longer manufactured or available.',
            'Attempting repair with incompatible parts can cause further damage.',
            'Consider donating or recycling through the TRANSFER module.',
            'Look into upgrading to a newer model that has available parts.',
            'Check the TRANSFER module for responsible disposal options near you.',
        ];
    }

    getStrategyName() { return 'ObsoletePartsStrategy'; }

    /**
     * Applies when the device's parts availability
     * condition is marked as 'obsolete'.
     * @param {ElectronicDevice} device
     * @returns {boolean}
     */
    isApplicable(device) {
        return device.getCondition('partsAvail') === 'obsolete';
    }

    /**
     * @param {ElectronicDevice} device
     * @returns {Object}
     */
    evaluate(device) {
        return {
            strategy      : this.getStrategyName(),
            recommendation: '❌ Do Not Repair',
            reason        : (
                'Parts for this device are obsolete and can no longer be sourced. ' +
                'Repair is either impossible or carries a high risk of further damage. ' +
                'Responsible disposal is the most sustainable choice at this point.'
            ),
            severity      : 'critical',
            color         : '#e74c3c',
            tips          : this.#tips,
            nextStep      : 'TRANSFER',
        };
    }
}

/* ooga booga_Please Revised TIPID Module */

/**
 * Strategy: Device has severe physical damage.
 * Triggered when physDamage condition is 'severe'.
 * Recommendation: Replace structural damage
 * compromises internal components beyond repair.
 */
class SevereDamageStrategy extends TipidStrategy {
    #tips;

    constructor() {
        super();
        this.#tips = [
            'Severe structural damage often causes hidden damage to the motherboard.',
            'Attempting repair may cost more than the device is worth.',
            'Salvage any usable data before disposing of the device.',
            'Visit the TRANSFER module to recycle responsibly.',
            'When replacing, consider refurbished devices as a sustainable alternative.',
        ];
    }

    getStrategyName() { return 'SevereDamageStrategy'; }

    /**
     * Applies when the device has severe physical damage.
     * @param {ElectronicDevice} device
     * @returns {boolean}
     */
    isApplicable(device) {
        return device.getCondition('physDamage') === 'severe';
    }

    /**
     * @param {ElectronicDevice} device
     * @returns {Object}
     */
    evaluate(device) {
        return {
            strategy      : this.getStrategyName(),
            recommendation: '❌ Replace Device',
            reason        : (
                'Severe structural damage compromises the internal circuitry of the device. ' +
                'The cost and risk of repair significantly outweigh the potential benefit. ' +
                'Replacing the device is the more practical and cost-effective decision.'
            ),
            severity      : 'critical',
            color         : '#e74c3c',
            tips          : this.#tips,
            nextStep      : 'TRANSFER',
        };
    }
}

/**
 * Strategy: Device age reduces repair viability.
 * Triggered when device age exceeds a threshold
 * relative to its expected lifespan per type.
 * Recommendation varies based on age ratio.
 */
class DeviceAgeStrategy extends TipidStrategy {
    #ageThresholds;
    #tips;

    constructor() {
        super();

        // Expected lifespan in years per device type
        this.#ageThresholds = Object.freeze({
            laptop     : 5,
            smartphone : 3,
            desktop    : 7,
            tablet     : 4,
            peripheral : 6,
            default    : 4,
        });

        this.#tips = [
            'Older devices often face compatibility issues with current software.',
            'Battery replacement alone can extend lifespan by 1 to 2 years.',
            'Consider upgrading RAM or storage before full replacement.',
            'Check if the manufacturer still provides software updates.',
            'If the device is near end-of-life, plan for responsible disposal.',
        ];
    }

    getStrategyName() { return 'DeviceAgeStrategy'; }

    /**
     * Returns the expected lifespan for the device type.
     * @param {string} deviceType
     * @returns {number}
     */
    #getExpectedLifespan(deviceType) {
        const type = deviceType?.toLowerCase() || 'default';
        return this.#ageThresholds[type] ?? this.#ageThresholds.default;
    }

    /**
     * Applies when device age data is available
     * and the device is at least 60% through
     * its expected lifespan.
     * @param {ElectronicDevice} device
     * @returns {boolean}
     */
    isApplicable(device) {
        const meta = device.getMetadata();
        if (!meta.age || !meta.deviceType) return false;
        const lifespan = this.#getExpectedLifespan(meta.deviceType);
        return (meta.age / lifespan) >= 0.60;
    }

    /**
     * @param {ElectronicDevice} device
     * @returns {Object}
     */
    evaluate(device) {
        const meta      = device.getMetadata();
        const lifespan  = this.#getExpectedLifespan(meta.deviceType);
        const ageRatio  = ((meta.age / lifespan) * 100).toFixed(1);
        const remaining = Math.max(0, lifespan - meta.age);

        let recommendation, reason, severity, color;

        if (ageRatio >= 100) {
            recommendation = '❌ End of Lifespan';
            reason         = (
                `This device has exceeded its expected lifespan of ${lifespan} years ` +
                `(currently ${meta.age} years old). Continued use may be unreliable. ` +
                `Responsible disposal or replacement is strongly recommended.`
            );
            severity = 'critical';
            color    = '#e74c3c';
        } else if (ageRatio >= 80) {
            recommendation = '⚠️ Approaching End of Life';
            reason         = (
                `This device is at ${ageRatio}% of its expected lifespan ` +
                `with approximately ${remaining} year(s) remaining. ` +
                `Minor repairs may be worthwhile but plan for replacement soon.`
            );
            severity = 'warning';
            color    = '#f39c12';
        } else {
            recommendation = '✅ Age is Acceptable';
            reason         = (
                `This device is at ${ageRatio}% of its expected lifespan ` +
                `with approximately ${remaining} year(s) of viable use remaining. ` +
                `Repair is still a reasonable option at this stage.`
            );
            severity = 'good';
            color    = '#2ecc71';
        }

        return {
            strategy      : this.getStrategyName(),
            recommendation,
            reason,
            severity,
            color,
            tips          : this.#tips,
            ageRatio      : `${ageRatio}%`,
            nextStep      : ageRatio >= 100 ? 'TRANSFER' : 'TECH-CARE',
        };
    }
}

/* ─────────────────────────────────────────── */

/**
 * Strategy: Repair cost vs device value analysis.
 * The fallback strategy applied when no other
 * strategy has matched. Evaluates the effective
 * repair cost ratio with condition-based penalties.
 */
class NuancedCostStrategy extends TipidStrategy {
    #penaltyRules;
    #tips;

    constructor() {
        super();

        // Condition-based penalty additions to repair ratio
        this.#penaltyRules = Object.freeze({
            partsAvail : { scarce: 0.15,  limited: 0.08 },
            physDamage : { moderate: 0.10, minor: 0.04  },
            repairCount: { high: 0.12,    medium: 0.06  },
        });

        this.#tips = {
            strongRepair: [
                'The repair cost is well within a reasonable range.',
                'Repairing extends the device lifespan and reduces e-waste.',
                'Visit TECH-CARE for repair guidance and next steps.',
                'Back up your data before sending for repair.',
                'Ask for a warranty on any replacement parts.',
            ],
            greyArea: [
                'Consider how important your data and current setup are.',
                'Factor in how much longer you realistically need this device.',
                'Compare repair cost against a refurbished alternative.',
                'Check TECH-CARE for DIY repair options that reduce cost.',
                'If repaired, consider a protective case to avoid future damage.',
            ],
            replace: [
                'The repair cost makes it economically unreasonable to fix.',
                'Consider purchasing a certified refurbished replacement.',
                'Dispose of the device responsibly through the TRANSFER module.',
                'Wipe all personal data before disposal or donation.',
                'Refurbished devices are a sustainable and cost-effective choice.',
            ],
        };
    }

    getStrategyName() { return 'NuancedCostStrategy'; }

    /**
     * Always applicable — serves as the
     * catch-all fallback strategy.
     * @returns {boolean}
     */
    isApplicable() { return true; }

    /**
     * Calculates condition-based penalty additions
     * to the raw repair ratio.
     * @param {ElectronicDevice} device
     * @returns {number} Total penalty value
     */
    #calculatePenalty(device) {
        let penalty = 0;

        const partsAvail  = device.getCondition('partsAvail');
        const physDamage  = device.getCondition('physDamage');
        const repairCount = device.getCondition('repairCount');

        if (partsAvail && this.#penaltyRules.partsAvail[partsAvail]) {
            penalty += this.#penaltyRules.partsAvail[partsAvail];
        }
        if (physDamage && this.#penaltyRules.physDamage[physDamage]) {
            penalty += this.#penaltyRules.physDamage[physDamage];
        }
        if (repairCount && this.#penaltyRules.repairCount[repairCount]) {
            penalty += this.#penaltyRules.repairCount[repairCount];
        }

        return penalty;
    }

    /**
     * Evaluates repair cost ratio with
     * condition-based penalties applied.
     * @param {ElectronicDevice} device
     * @returns {Object}
     */
    evaluate(device) {
        const rawRatio      = device.getRepairRatio();
        const penalty       = this.#calculatePenalty(device);
        const effectiveRatio = rawRatio + penalty;
        const percent        = (effectiveRatio * 100).toFixed(1);
        const penaltyPercent = (penalty * 100).toFixed(1);

        let recommendation, reason, severity, color, tips, nextStep;

        if (effectiveRatio < 0.35) {
            recommendation = '✅ Strong Repair Recommendation';
            reason         = (
                `The effective cost burden is ${percent}% ` +
                `(base ratio + ${penaltyPercent}% condition penalties). ` +
                `This is well within a financially sound repair threshold. ` +
                `Repairing this device is both economically and environmentally justified.`
            );
            severity = 'good';
            color    = '#2ecc71';
            tips     = this.#tips.strongRepair;
            nextStep = 'TECH-CARE';

        } else if (effectiveRatio < 0.55) {
            recommendation = '⚠️ Grey Area — Proceed with Caution';
            reason         = (
                `The effective cost burden is ${percent}% ` +
                `(base ratio + ${penaltyPercent}% condition penalties). ` +
                `Repair is possible but may not deliver strong value. ` +
                `Consider the device's age, data importance, and remaining lifespan before deciding.`
            );
            severity = 'warning';
            color    = '#f1c40f';
            tips     = this.#tips.greyArea;
            nextStep = 'TECH-CARE';

        } else {
            recommendation = '❌ Replace Device';
            reason         = (
                `The effective cost burden is ${percent}% ` +
                `(base ratio + ${penaltyPercent}% condition penalties). ` +
                `This surpasses the logical repair threshold. ` +
                `Replacing or responsibly disposing of the device is the more sustainable choice.`
            );
            severity = 'critical';
            color    = '#e74c3c';
            tips     = this.#tips.replace;
            nextStep = 'TRANSFER';
        }

        return {
            strategy        : this.getStrategyName(),
            recommendation,
            reason,
            severity,
            color,
            tips,
            nextStep,
            rawRatio        : `${(rawRatio * 100).toFixed(1)}%`,
            penaltyAdded    : `${penaltyPercent}%`,
            effectiveRatio  : `${percent}%`,
        };
    }
}

/**
 * Strategy (GoodCondition): Device is still in good condition.
 * Applied when no issues are detected
 * provides responsible consumption tips and preventive
 * maintenance guidance for the TIPID module.
 */
class GoodConditionStrategy extends TipidStrategy {
    #tips;

    constructor() {
        super();
        this.#tips = [
            'Keep your device clean and free of dust — especially vents and ports.',
            'Avoid charging overnight to preserve battery cell health.',
            'Install software updates regularly to maintain security and performance.',
            'Use a quality protective case and screen protector.',
            'Avoid exposing the device to extreme heat, cold, or moisture.',
            'Back up your data monthly to prevent loss from unexpected failure.',
            'Reduce screen brightness to save battery and reduce eye strain.',
        ];
    }

    getStrategyName() { return 'GoodConditionStrategy'; }

    /**
     * Applies when repair ratio is very low and
     * no significant conditions are flagged.
     * @param {ElectronicDevice} device
     * @returns {boolean}
     */
    isApplicable(device) {
        const ratio      = device.getRepairRatio();
        const physDamage = device.getCondition('physDamage');
        const partsAvail = device.getCondition('partsAvail');

        return (
            ratio < 0.10 &&
            (!physDamage || physDamage === 'none') &&
            (!partsAvail || partsAvail === 'available')
        );
    }

    /**
     * @param {ElectronicDevice} device
     * @returns {Object}
     */
    evaluate(device) {
        return {
            strategy      : this.getStrategyName(),
            recommendation: '✅ Device is in Good Condition',
            reason        : (
                'Your device shows no significant issues at this time. ' +
                'Follow the preventive maintenance tips below to extend its lifespan ' +
                'and delay the need for repair or replacement as long as possible.'
            ),
            severity      : 'good',
            color         : '#27ae60',
            tips          : this.#tips,
            nextStep      : null,
        };
    }
}


/* CONSUMPTION TIP LIBRARY */

/**
 * Static library of responsible consumption
 * tips for the TIPID module's educational
 * content sections.
 */
class ConsumptionTipLibrary {
    /** @type {Object.<string, string[]>} */
    static #tips = Object.freeze({
        battery: [
            'Charge between 20% and 80% to maximize battery lifespan.',
            'Avoid charging your device overnight — unplug at full charge.',
            'Use the original charger or a certified alternative.',
            'Avoid using the device while charging under heavy load.',
            'Cool environments extend battery health — avoid heat exposure.',
        ],
        storage: [
            'Regularly delete unused apps, files, and duplicate photos.',
            'Use cloud storage for backups instead of filling internal memory.',
            'Clear app caches monthly to free up storage space.',
            'Transfer old files to an external drive for long-term storage.',
            'Keep at least 15% storage free for optimal performance.',
        ],
        screen: [
            'Apply a quality screen protector immediately after purchase.',
            'Lower brightness to reduce eye strain and extend display life.',
            'Clean the screen with a microfiber cloth — never use harsh chemicals.',
            'Enable auto-brightness to reduce unnecessary display wear.',
            'Set a short screen timeout to save battery and reduce OLED burn-in.',
        ],
        general: [
            'Think twice before upgrading — does your current device still meet your needs?',
            'Repair before replacing — most issues are fixable at low cost.',
            'When buying, choose devices with longer manufacturer support windows.',
            'Donate or sell devices you no longer need instead of storing them.',
            'Avoid impulse purchases driven by marketing rather than genuine need.',
        ],
        environment: [
            'E-waste is one of the fastest-growing waste streams in the world.',
            'Only 17% of global e-waste is formally recycled each year.',
            'A single smartphone contains over 60 chemical elements.',
            'Extending a device lifespan by one year significantly reduces its carbon footprint.',
            'Responsible disposal through certified channels prevents toxic leaching into soil.',
        ],
        buying: [
            'Research repairability scores before purchasing a new device.',
            'Brands with long software support reduce the need for early replacement.',
            'Refurbished devices are a sustainable and cost-effective alternative.',
            'Avoid buying accessories you do not genuinely need.',
            'Check if the manufacturer offers a trade-in or recycling program.',
        ],
    });

    /**
     * Returns all tips for a given category.
     * @param {string} category
     * @returns {string[]}
     */
    static getTips(category) {
        const cat = category?.toLowerCase();
        if (!ConsumptionTipLibrary.#tips[cat]) {
            throw new AppError(
                `Unknown tip category: "${category}". ` +
                `Valid categories: ${Object.keys(ConsumptionTipLibrary.#tips).join(', ')}.`,
                400,
                'ERR_UNKNOWN_CATEGORY'
            );
        }
        return [...ConsumptionTipLibrary.#tips[cat]];
    }

    /**
     * Returns all available tip categories.
     * @returns {string[]}
     */
    static getCategories() {
        return Object.keys(ConsumptionTipLibrary.#tips);
    }

    /**
     * Returns all tips across all categories
     * as a flat array.
     * @returns {string[]}
     */
    static getAllTips() {
        return Object.values(ConsumptionTipLibrary.#tips).flat();
    }

    /**
     * Returns a random selection of tips
     * from a given category or all categories.
     * @param {number} count         - Number of tips to return
     * @param {string} [category]    - Optional category filter
     * @returns {string[]}
     */
    static getRandomTips(count = 3, category = null) {
        const pool = category
            ? ConsumptionTipLibrary.getTips(category)
            : ConsumptionTipLibrary.getAllTips();

        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }
}


/* TIPID MODULE */

/**
 * The TIPID module evaluates a user's electronic
 * device and provides a repair-or-replace
 * recommendation based on a chain of strategies.
 * Also serves as the educational hub for
 * responsible consumption content.
 */
class TipidModule extends Module {
    #strategies;        // Ordered chain of TipidStrategy instances
    #lastResult;        // Most recent evaluation result

    constructor() {
        super('TIPID-MODULE-001'); // passes moduleId to Module base class

        // Strategy chain — order matters.
        // Specific strategies are checked first.
        // NuancedCostStrategy is always last (catch-all).
        this.#strategies = [
            new GoodConditionStrategy(),    // check best case first
            new ObsoletePartsStrategy(),    // critical blocker
            new SevereDamageStrategy(),     // critical blocker
            new DeviceAgeStrategy(),        // age-based filter
            new NuancedCostStrategy(),      // catch-all fallback
        ];

        this.#lastResult = null;
    }

    /* Module Abstract Method Implementations */

    /**
     * Returns a description of the TIPID module.
     * Overrides Module.getDescription()
     * @returns {string}
     */
    getDescription() {
        return (
            'The TIPID module helps you make informed decisions about your electronic device. ' +
            'Submit your device details to receive a repair, replace, or dispose recommendation ' +
            'based on repair cost, physical condition, parts availability, and device age. ' +
            'TIPID also provides responsible consumption tips to help you extend your device lifespan.'
        );
    }

    /**
     * Executes the TIPID module against a device.
     * Iterates through the strategy chain and
     * returns the first applicable strategy result.
     * Overrides Module.execute()
     *
     * @param {ElectronicDevice} device
     * @returns {Object} Evaluation result from the matched strategy
     */
    execute(device) {
        if (!(device instanceof ElectronicDevice)) {
            throw new AppError(
                'TipidModule.execute() requires a valid ElectronicDevice instance.',
                400,
                'ERR_INVALID_DEVICE'
            );
        }

        // Walk the strategy chain — return on first match
        for (const strategy of this.#strategies) {
            if (strategy.isApplicable(device)) {
                console.log(`[TIPID] Strategy matched: ${strategy.getStrategyName()}`);

                this.#lastResult = {
                    ...strategy.evaluate(device),
                    moduleId    : this.getModuleId(),
                    moduleName  : 'TIPID',
                    deviceMeta  : device.getMetadata(),
                    evaluatedAt : new Date().toISOString(),
                };

                return this.#lastResult;
            }
        }

        // Unreachable in practice — NuancedCostStrategy always matches
        throw new AppError(
            'No applicable strategy found. This should not occur.',
            500,
            'ERR_NO_STRATEGY_MATCH'
        );
    }

    /* Tip Content Methods */

    /**
     * Returns tips for a specific category
     * from the ConsumptionTipLibrary.
     * @param {string} category
     * @returns {string[]}
     */
    getTips(category) {
        return ConsumptionTipLibrary.getTips(category);
    }

    /**
     * Returns all available tip categories.
     * @returns {string[]}
     */
    getTipCategories() {
        return ConsumptionTipLibrary.getCategories();
    }

    /**
     * Returns a random selection of tips.
     * @param {number} count
     * @param {string} [category]
     * @returns {string[]}
     */
    getRandomTips(count = 3, category = null) {
        return ConsumptionTipLibrary.getRandomTips(count, category);
    }

    /**
     * Returns the result of the most recent
     * device evaluation, or null if none has
     * been performed yet.
     * @returns {Object|null}
     */
    getLastResult() {
        return this.#lastResult;
    }

    /**
     * Returns the number of strategies in
     * the evaluation chain.
     * @returns {number}
     */
    getStrategyCount() {
        return this.#strategies.length;
    }
}


/* TIPID FACTORY */

/**
 * Factory responsible for creating and returning a configured TipidModule.
 */

class TipidFactory extends ModuleFactory {
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
        return ModuleType.TIPID;
    }

    /**
     * Creates and returns a fully configured TipidModule.
     * @returns {TipidModule}
     */
    createModule() {
        this.#instanceCount++;
        console.log(
            `[EcoCircuit] TipidFactory: creating TipidModule ` +
            `(instance #${this.#instanceCount}).`
        );
        return new TipidModule();
    }

    /**
     * Returns the total number of TipidModule
     * instances this factory has created.
     * @returns {number}
     */
    getInstanceCount() {
        return this.#instanceCount;
    }
}


/* EXPORTS */
module.exports = {
    // Abstract base
    TipidStrategy,

    // Concrete strategies
    GoodConditionStrategy,
    ObsoletePartsStrategy,
    SevereDamageStrategy,
    DeviceAgeStrategy,
    NuancedCostStrategy,

    // Tip library
    ConsumptionTipLibrary,

    // Module and Factory
    TipidModule,
    TipidFactory,
};