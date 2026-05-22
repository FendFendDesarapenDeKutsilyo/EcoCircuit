class RepairStrategy {
    isApplicable(device) { throw new Error('Must implement'); }
    evaluate(device) { throw new Error('Must implement'); }
}

class ObsoletePartsStrategy extends RepairStrategy {
    isApplicable(device) { return device.getCondition('partsAvail') === 'obsolete'; }
    evaluate() { return { rec: '❌ Do Not Repair', reason: 'Parts are obsolete.', color: '#e74c3c' }; }
}

class SevereDamageStrategy extends RepairStrategy {
    isApplicable(device) { return device.getCondition('physDamage') === 'severe'; }
    evaluate() { return { rec: '❌ Replace', reason: 'Severe structural damage.', color: '#e74c3c' }; }
}

class NuancedCostStrategy extends RepairStrategy {
    isApplicable(device) { return true; }
    evaluate(device) {
        let ratio = device.getRepairRatio();
        let penalty = 0;
        if (device.getCondition('partsAvail') === 'scarce') penalty += 0.15;
        if (device.getCondition('physDamage') === 'moderate') penalty += 0.10;
        const effectiveRatio = ratio + penalty;
        const percent = (effectiveRatio * 100).toFixed(1);
        if (effectiveRatio < 0.35) return { rec: '✅ Strong Repair', reason: `Effective cost burden is ${percent}%.`, color: '#2ecc71' };
        if (effectiveRatio < 0.55) return { rec: '⚠️ Grey Area', reason: `Effective cost burden is ${percent}%.`, color: '#f1c40f' };
        return { rec: '❌ Replace', reason: `Effective cost burden is ${percent}%.`, color: '#e74c3c' };
    }
}

export class TipidModule {
    #strategies;
    constructor() { this.#strategies = [new ObsoletePartsStrategy(), new SevereDamageStrategy(), new NuancedCostStrategy()]; }
    execute(device) { for (const s of this.#strategies) if (s.isApplicable(device)) return s.evaluate(device); }
}
