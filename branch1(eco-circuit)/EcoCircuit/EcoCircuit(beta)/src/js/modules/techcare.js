class AssessmentStage {
    constructor(title, prompt, yesResponse, noResponse, issueTag) {
        this.title = title; this.prompt = prompt; this.yesResponse = yesResponse; this.noResponse = noResponse; this.issueTag = issueTag;
    }
}

export class TechCareModule {
    #stages; #currentIndex; #deviceType;
    constructor(deviceType = 'cellphone') { this.#deviceType = deviceType; this.#currentIndex = 0; this.#initializeStages(); }

    #initializeStages() {
        const deviceQuestions = {
            cellphone: [
                new AssessmentStage('Stage 1: Battery Health', 'Does your phone die before reaching 1%?', 'Protocol: Recalibrate battery.', 'Great! Keep charging between 20%-80%.', 'battery'),
                new AssessmentStage('Stage 2: Storage Check', 'Is your storage over 90% full?', 'Protocol: Offload unused apps.', 'Good. Leave 10% free space.', 'storage'),
                new AssessmentStage('Stage 3: Thermal Dynamics', 'Does the phone get uncomfortably hot?', 'Protocol: Remove casing.', 'Thermals are stable.', 'overheating')
            ],
            laptop: [
                new AssessmentStage('Stage 1: Battery Health', 'Does your laptop battery drain quickly (under 2 hours)?', 'Protocol: Calibrate battery.', 'Excellent! Keep battery between 20%-80%.', 'battery'),
                new AssessmentStage('Stage 2: Cooling System', 'Do you hear loud fan noise or feel excessive heat?', 'Protocol: Clean vents.', 'Good. Keep vents clear.', 'overheating'),
                new AssessmentStage('Stage 3: Performance Check', 'Does your laptop freeze or slow down?', 'Protocol: Run disk cleanup.', 'Performance is good.', 'performance')
            ],
            tablet: [
                new AssessmentStage('Stage 1: Battery Health', 'Does your tablet battery last less than 4 hours?', 'Protocol: Reset calibration.', 'Great! Keep charging 20%-80%.', 'battery'),
                new AssessmentStage('Stage 2: Touch Response', 'Is the touchscreen slow to respond?', 'Protocol: Clean screen.', 'Touch response is good.', 'screen'),
                new AssessmentStage('Stage 3: Storage Management', 'Is your tablet storage nearly full?', 'Protocol: Move files to cloud.', 'Storage is well managed.', 'storage')
            ]
        };
        this.#stages = deviceQuestions[this.#deviceType] || deviceQuestions.cellphone;
    }

    updateDeviceType(deviceType) { this.#deviceType = deviceType; this.#currentIndex = 0; this.#initializeStages(); }
    getCurrentStage() { return this.#stages[this.#currentIndex]; }

    processAnswer(isYes) {
        const stage = this.getCurrentStage();
        const feedback = isYes ? stage.yesResponse : stage.noResponse;
        const issueDetected = isYes ? stage.issueTag : null;
        this.#currentIndex++;
        const isComplete = this.#currentIndex >= this.#stages.length;
        return { feedback, issueDetected, isComplete, nextStage: isComplete ? null : this.getCurrentStage() };
    }

    reset() { this.#currentIndex = 0; return this.getCurrentStage(); }
}
