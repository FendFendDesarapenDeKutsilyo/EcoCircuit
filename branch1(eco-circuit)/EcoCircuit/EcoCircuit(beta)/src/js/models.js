export class ElectronicDevice {
    #financials;
    #conditions;

    constructor(financials = {}, conditions = {}) {
        this.#financials = financials;
        this.#conditions = conditions;
    }

    getRepairRatio() {
        if (!this.#financials.newPrice || this.#financials.newPrice === 0) return 1;
        return this.#financials.repairCost / this.#financials.newPrice;
    }

    getCondition(key) { return this.#conditions[key]; }
}
