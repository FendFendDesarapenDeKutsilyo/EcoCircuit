class TreeNode { evaluate(device) { throw new Error('Must implement'); } }

class ResultNode extends TreeNode {
    #result;
    constructor(result) { super(); this.#result = result; }
    evaluate() { return this.#result; }
}

class DecisionNode extends TreeNode {
    #conditionKey; #expectedValue; #trueBranch; #falseBranch;
    constructor(conditionKey, expectedValue, trueBranch, falseBranch) { super(); this.#conditionKey = conditionKey; this.#expectedValue = expectedValue; this.#trueBranch = trueBranch; this.#falseBranch = falseBranch; }
    evaluate(device) { return device.getCondition(this.#conditionKey) === this.#expectedValue ? this.#trueBranch.evaluate(device) : this.#falseBranch.evaluate(device); }
}

export class TransferModule {
    #rootNode;
    constructor() {
        const dangerNode = new ResultNode({
            title: '🚨 Dangerous Battery Condition',
            resale: {
                summary: 'Battery swelling makes this device unsafe to repair. Salvage only non-battery components like casing, buttons, and connector cables.',
                estimate: 'Estimated salvage value: ₱200 - ₱500'
            },
            recycle: {
                summary: 'Battery and internal electronics should be recycled through certified e-waste centers. Do not attempt to open or reuse the swollen battery.',
                guidance: 'Bring it to a responsible e-waste drop-off and inform staff about the swollen battery.'
            },
            color: '#e74c3c'
        });

        const functionalNode = new ResultNode({
            title: '💰 Resale Potential Detected',
            resale: {
                summary: 'The device powers on and the screen works. Core components like the motherboard, battery, display, and ports may be sold individually or as a bundle.',
                estimate: 'Estimated resale range: ₱2,500 - ₱5,000 depending on condition.'
            },
            recycle: {
                summary: 'If any cosmetic parts are damaged, separate them for recycling and retain working electronics for resale.',
                guidance: 'Recycle broken frame parts and any non-working plastic pieces at an authorized e-waste facility.'
            },
            color: '#f1c40f'
        });

        const screenDamageNode = new ResultNode({
            title: '🔧 Salvageable Components Available',
            resale: {
                summary: 'Power is present but the screen is not functional. Salvage the motherboard, battery, camera, and charging port.',
                estimate: 'Estimated salvage value: ₱700 - ₱1,800 depending on components.'
            },
            recycle: {
                summary: 'Recycle the damaged screen and any water-sensitive components responsibly.',
                guidance: 'Separate the broken display and electronics, then deliver them to an authorized e-waste recycler.'
            },
            color: '#e67e22'
        });

        const waterDamageNode = new ResultNode({
            title: '♻️ E-Waste Recycling Recommended',
            resale: {
                summary: 'Extensive water damage reduces resale potential. Only metal housing and unused connectors may have salvage value.',
                estimate: 'Estimated salvage value: ₱100 - ₱300 for metal/connector parts.'
            },
            recycle: {
                summary: 'Water-exposed electronics should be recycled to prevent environmental contamination.',
                guidance: 'Take the device to a certified e-waste center for proper disposal of the circuit board, battery, and plastics.'
            },
            color: '#2ecc71'
        });

        const noPowerNode = new ResultNode({
            title: '🔧 Diagnostics Needed — Power Failure',
            resale: {
                summary: 'The device does not power on but is not water damaged. There may still be value in the board, battery, and casing.',
                estimate: 'Estimated salvage value: ₱300 - ₱900 depending on recoverable parts.'
            },
            recycle: {
                summary: 'Recycle the battery and any damaged electronics using approved e-waste channels.',
                guidance: 'Bring the device to an e-waste recycling point and specify that it did not power on.'
            },
            color: '#3498db'
        });

        const waterCheckTree = new DecisionNode('waterDamaged', 'yes', waterDamageNode, noPowerNode);
        const screenCheckTree = new DecisionNode('screenFunctional', 'yes', functionalNode, screenDamageNode);
        const batteryCheckTree = new DecisionNode('batterySwollen', 'yes', dangerNode, screenCheckTree);
        this.#rootNode = new DecisionNode('powersOn', 'yes', batteryCheckTree, waterCheckTree);
    }
    execute(device) { return this.#rootNode.evaluate(device); }
}
