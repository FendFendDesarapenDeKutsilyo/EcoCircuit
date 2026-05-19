/* ==========================================================================
   PROJECT ECOCIRCUIT
   ========================================================================== */

/* -----------------------------------------
   1. USER SESSION MANAGEMENT 
   ----------------------------------------- */
class UserSession {
    #studentId;
    #studentName;
    #selectedDevice;

    constructor() {
        this.#studentId = null;
        this.#studentName = null;
        this.#selectedDevice = null;
        this.#loadFromStorage();
    }

    // Getters for read-only access
    get studentName() { return this.#studentName; }
    get selectedDevice() { return this.#selectedDevice; }
    
    isLoggedIn() {
        return this.#studentId !== null && this.#studentName !== null;
    }

    // State Modifiers
    login(studentId, studentName) {
        this.#studentId = studentId;
        this.#studentName = studentName;
        this.#saveToStorage();
    }

    setDevice(deviceType) {
        this.#selectedDevice = deviceType;
        this.#saveToStorage();
    }

    logout() {
        this.#studentId = null;
        this.#studentName = null;
        this.#selectedDevice = null;
        sessionStorage.removeItem('ecocircuit_session');
    }

    // Private Storage Methods
    #saveToStorage() {
        sessionStorage.setItem('ecocircuit_session', JSON.stringify({
            studentId: this.#studentId,
            studentName: this.#studentName,
            selectedDevice: this.#selectedDevice
        }));
    }

    #loadFromStorage() {
        const stored = sessionStorage.getItem('ecocircuit_session');
        if (stored) {
            const data = JSON.parse(stored);
            this.#studentId = data.studentId;
            this.#studentName = data.studentName;
            this.#selectedDevice = data.selectedDevice;
        }
    }
}

// Initialize Global State
const activeSession = new UserSession();


/* -----------------------------------------
   2. CORE ENTITY
   ----------------------------------------- */
class ElectronicDevice {
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

    getCondition(key) {
        return this.#conditions[key];
    }
}


/* -----------------------------------------
   3. MODULE 1: TIPID (Strategy Pattern)
   ----------------------------------------- */
class RepairStrategy {
    isApplicable(device) { throw new Error("Must implement isApplicable"); }
    evaluate(device) { throw new Error("Must implement evaluate"); }
}

class ObsoletePartsStrategy extends RepairStrategy {
    isApplicable(device) { return device.getCondition('partsAvail') === 'obsolete'; }
    evaluate() { return { rec: "❌ Do Not Repair", reason: "Parts are obsolete. Repair is impossible or too risky.", color: "#e74c3c" }; }
}

class SevereDamageStrategy extends RepairStrategy {
    isApplicable(device) { return device.getCondition('physDamage') === 'severe'; }
    evaluate() { return { rec: "❌ Replace", reason: "Severe structural damage compromises internal circuitry. Not worth the risk.", color: "#e74c3c" }; }
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

        if (effectiveRatio < 0.35) return { rec: "✅ Strong Repair", reason: `Effective cost burden is ${percent}%. Good value.`, color: "#2ecc71" };
        if (effectiveRatio < 0.55) return { rec: "⚠️ Grey Area", reason: `Effective cost burden is ${percent}%. Consider age and data importance.`, color: "#f1c40f" };
        return { rec: "❌ Replace", reason: `Effective cost burden is ${percent}%. Surpasses logical repair threshold.`, color: "#e74c3c" };
    }
}

class TipidModule {
    #strategies;
    constructor() {
        this.#strategies = [new ObsoletePartsStrategy(), new SevereDamageStrategy(), new NuancedCostStrategy()];
    }
    execute(device) {
        for (let s of this.#strategies) {
            if (s.isApplicable(device)) return s.evaluate(device);
        }
    }
}


/* -----------------------------------------
   4. MODULE 2: TRANSFER (Composite Pattern)
   ----------------------------------------- */
class TreeNode {
    evaluate(device) { throw new Error("Must implement evaluate"); }
}

class ResultNode extends TreeNode {
    #result;
    constructor(message, color) { super(); this.#result = { message, color }; }
    evaluate(device) { return this.#result; }
}

class DecisionNode extends TreeNode {
    #conditionKey;
    #expectedValue;
    #trueBranch;
    #falseBranch;

    constructor(conditionKey, expectedValue, trueBranch, falseBranch) {
        super();
        this.#conditionKey = conditionKey;
        this.#expectedValue = expectedValue;
        this.#trueBranch = trueBranch;
        this.#falseBranch = falseBranch;
    }

    evaluate(device) {
        if (device.getCondition(this.#conditionKey) === this.#expectedValue) {
            return this.#trueBranch.evaluate(device);
        }
        return this.#falseBranch.evaluate(device);
    }
}

class TransferModule {
    #rootNode;
    constructor() {
        const recycleNode = new ResultNode("♻️ RECYCLE: Motherboard/water damage. Drop at E-Waste.", "#2ecc71");
        const partsNode = new ResultNode("🔧 SELL FOR PARTS: Broken screen but board works.", "#e67e22");
        const sellNode = new ResultNode("💰 SELL: Device is functional! Sell at marketplace.", "#f1c40f");
        const dangerNode = new ResultNode("🚨 DANGER: Swollen battery! Isolate and bring to technician.", "#e74c3c");

        const waterCheckTree = new DecisionNode('waterDamaged', 'yes', recycleNode, partsNode);
        const screenCheckTree = new DecisionNode('screenFunctional', 'yes', sellNode, partsNode);
        const batteryCheckTree = new DecisionNode('batterySwollen', 'yes', dangerNode, screenCheckTree);

        this.#rootNode = new DecisionNode('powersOn', 'yes', batteryCheckTree, waterCheckTree);
    }

    execute(device) {
        return this.#rootNode.evaluate(device);
    }
}


/* -----------------------------------------
   5. MODULE 3: TECH-CARE (State Machine)
   ----------------------------------------- */
class AssessmentStage {
    constructor(title, prompt, yesResponse, noResponse, issueTag) {
        this.title = title;
        this.prompt = prompt;
        this.yesResponse = yesResponse;
        this.noResponse = noResponse;
        this.issueTag = issueTag;
    }
}

class TechCareModule {
    #stages;
    #currentIndex;
    #deviceType;

    constructor(deviceType = 'cellphone') {
        this.#currentIndex = 0;
        this.#deviceType = deviceType;
        this.#initializeStages();
    }

    #initializeStages() {
        const deviceQuestions = {
            cellphone: [
                new AssessmentStage("Stage 1: Battery Health", "Does your phone die before reaching 1%?", "Protocol: Recalibrate battery.", "Great! Keep charging between 20%-80%.", "battery"),
                new AssessmentStage("Stage 2: Storage Check", "Is your storage over 90% full?", "Protocol: Offload unused apps.", "Good. Leave 10% free space.", "storage"),
                new AssessmentStage("Stage 3: Thermal Dynamics", "Does the phone get uncomfortably hot?", "Protocol: Remove casing.", "Thermals are stable.", "overheating")
            ],
            laptop: [
                new AssessmentStage("Stage 1: Battery Health", "Does your laptop battery drain quickly (under 2 hours)?", "Protocol: Calibrate battery.", "Excellent! Keep battery between 20%-80%.", "battery"),
                new AssessmentStage("Stage 2: Cooling System", "Do you hear loud fan noise or feel excessive heat?", "Protocol: Clean vents.", "Good. Keep vents clear.", "overheating"),
                new AssessmentStage("Stage 3: Performance Check", "Does your laptop freeze or slow down?", "Protocol: Run disk cleanup.", "Performance is good.", "performance")
            ],
            tablet: [
                new AssessmentStage("Stage 1: Battery Health", "Does your tablet battery last less than 4 hours?", "Protocol: Reset calibration.", "Great! Keep charging 20%-80%.", "battery"),
                new AssessmentStage("Stage 2: Touch Response", "Is the touchscreen slow to respond?", "Protocol: Clean screen.", "Touch response is good.", "screen"),
                new AssessmentStage("Stage 3: Storage Management", "Is your tablet storage nearly full?", "Protocol: Move files to cloud.", "Storage is well managed.", "storage")
            ]
        };
        this.#stages = deviceQuestions[this.#deviceType] || deviceQuestions.cellphone;
    }

    updateDeviceType(deviceType) {
        this.#deviceType = deviceType;
        this.#currentIndex = 0;
        this.#initializeStages();
    }

    getCurrentStage() { return this.#stages[this.#currentIndex]; }

    processAnswer(isYes) {
        const stage = this.getCurrentStage();
        const feedback = isYes ? stage.yesResponse : stage.noResponse;
        const issueDetected = isYes ? stage.issueTag : null;

        this.#currentIndex++;
        const isComplete = this.#currentIndex >= this.#stages.length;

        return { feedback, issueDetected, isComplete, nextStage: isComplete ? null : this.getCurrentStage() };
    }

    reset() {
        this.#currentIndex = 0;
        return this.getCurrentStage();
    }
}


/* -----------------------------------------
   6. FACTORY
   ----------------------------------------- */
class ModuleFactory {
    static createModule(type, deviceType = 'cellphone') {
        switch(type) {
            case 'tipid': return new TipidModule();
            case 'transfer': return new TransferModule();
            case 'techcare': return new TechCareModule(deviceType);
            default: throw new Error("Invalid Module");
        }
    }
}


/* ==========================================================================
   UI CONTROLLER LAYER (Handles ALL DOM manipulation cleanly)
   ========================================================================== */
const LOCATION_DATA = {
    'dan': { title: "Dan The Technician Repair", img: "images/Dan_The_Technician.jpg", address: "📍 803 Alex, Sampaloc, Manila (Near NU)", direction: "From NU, walk to Fajardo St. Walk straight..." },
    'tovy': { title: "Tovy's Cellphone Repair", img: "images/Tovy's_Cellphone_Repair.jpg", address: "📍 1953 Florentino St, Sampaloc, Manila", direction: "From NU, walk towards Earnshaw/Lacson..." },
    'orbanthic': { title: "Orbanthics Repair Shop", img: "images/Orbanthic.jpg", address: "📍 639 Delos Santos St, Sampaloc, Manila", direction: "From NU, walk towards San Anton St..." },
    'annex': { title: "NU Annex 2 E-Waste Bin", img: "images/Annex2_1st_Floor.jpg", address: "📍 National University Annex 2, 1st Floor", direction: "Go to the 1st floor lobby..." },
    'jmb': { title: "NU JMB E-Waste Bin", img: "images/JMB_1st_Floor.jpg", address: "📍 Jhocson Memorial Building, 1st Floor", direction: "Located near the entrance guard." },
    'mb': { title: "NU MB E-Waste Bin", img: "images/MB_5th_Floor.jpg", address: "📍 Main Building, 5th Floor", direction: "Take the elevator to the 5th floor..." }
};

class UIController {
    static initialize() {
        this.bindAuthEvents();
        this.bindModuleEvents();
        this.bindLocationModals();
        this.updateGlobalUI();
    }

    static bindAuthEvents() {
        const loginForm = document.getElementById('loginForm');
        const logoutBtn = document.getElementById('logoutBtn');
        const deviceOptions = document.querySelectorAll('.device-option');
        const changeDeviceBtn = document.getElementById('changeDeviceBtn');
        const skipDeviceBtn = document.getElementById('skipDeviceBtn');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('studentId').value.trim();
                const name = document.getElementById('studentName').value.trim();
                if (id && name) {
                    activeSession.login(id, name);
                    // Let updateGlobalUI cleanly handle which modal to display next
                    this.updateGlobalUI();
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    activeSession.logout();
                    location.reload();
                }
            });
        }

        deviceOptions.forEach(option => {
            option.addEventListener('click', () => {
                deviceOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                activeSession.setDevice(option.dataset.device);
                document.getElementById('deviceModal').style.display = 'none';
                this.updateGlobalUI();
            });
        });

        if (changeDeviceBtn) {
            changeDeviceBtn.addEventListener('click', () => {
                document.getElementById('deviceModal').style.display = 'flex';
            });
        }

        if (skipDeviceBtn) {
            skipDeviceBtn.addEventListener('click', () => {
                document.getElementById('deviceModal').style.display = 'none';
            });
        }
    }

    static updateGlobalUI() {
        // FIX: Handle Modals based on auth state safely
        if (!activeSession.isLoggedIn()) {
            const loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.style.display = 'flex';
            
            const deviceModal = document.getElementById('deviceModal');
            if (deviceModal) deviceModal.style.display = 'none';
            return;
        }

        // Hide login modal since user is logged in
        document.getElementById('loginModal').style.display = 'none';

        // Check if device needs to be selected
        const deviceModal = document.getElementById('deviceModal');
        if (!activeSession.selectedDevice) {
            if (deviceModal) deviceModal.style.display = 'flex';
        } else {
            if (deviceModal) deviceModal.style.display = 'none';
            this.updateDeviceSpecificUI(activeSession.selectedDevice);
        }

        // Update Greetings & Nav
        const userInfo = document.getElementById('userInfo');
        const heroGreeting = document.getElementById('heroGreeting');
        const deviceGreeting = document.getElementById('deviceGreeting');
        
        if (userInfo) {
            userInfo.innerHTML = `👤 ${activeSession.studentName}`;
            userInfo.style.display = 'block';
        }
        if (heroGreeting) {
            heroGreeting.innerHTML = `Hey, ${activeSession.studentName}! 👋 <br><span class="highlight-gold">Save Your Wallet.</span>`;
        }
        if (deviceGreeting) {
            deviceGreeting.textContent = `What device are we evaluating today, ${activeSession.studentName}?`;
        }
    }

    static updateDeviceSpecificUI(deviceType) {
        const deviceInfo = document.getElementById('deviceInfo');
        const deviceDisplay = document.getElementById('selectedDeviceDisplay');
        const emojis = { 'cellphone': '📱', 'laptop': '💻', 'tablet': '📲' };

        if (deviceInfo && deviceDisplay) {
            deviceDisplay.textContent = `${emojis[deviceType]} Evaluating: ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`;
            deviceInfo.classList.remove('hidden');
        }

        // Highlight selected option in modal
        document.querySelectorAll('.device-option').forEach(opt => opt.classList.remove('selected'));
        const selectedOpt = document.querySelector(`.device-option[data-device="${deviceType}"]`);
        if (selectedOpt) selectedOpt.classList.add('selected');

        // Sync TechCare Module Data safely
        if (window.tcModuleInstance) {
            window.tcModuleInstance.updateDeviceType(deviceType);
            const firstStage = window.tcModuleInstance.reset();
            document.getElementById('tc-stage-title').textContent = firstStage.title;
            document.getElementById('tc-prompt').textContent = firstStage.prompt;
        }
    }

    static bindModuleEvents() {
        // --- TIPID Adapter ---
        const btnTipid = document.getElementById('btn-calc-tipid');
        if(btnTipid) {
            btnTipid.addEventListener('click', () => {
                const financials = {
                    repairCost: parseFloat(document.getElementById('repairPrice').value),
                    newPrice: parseFloat(document.getElementById('newPhonePrice').value)
                };
                const conditions = {
                    partsAvail: document.getElementById('partsAvail').value,
                    physDamage: document.getElementById('physDamage').value
                };

                if (isNaN(financials.repairCost) || isNaN(financials.newPrice)) return alert("Enter valid amounts.");

                const device = new ElectronicDevice(financials, conditions);
                const result = ModuleFactory.createModule('tipid').execute(device);
                const resultBox = document.getElementById('tipid-result');
                
                let msg = activeSession.studentName ? `Hey ${activeSession.studentName}! ${result.rec}` : result.rec;
                
                resultBox.innerHTML = `<strong>${msg}</strong><br>${result.reason}`;
                resultBox.style.borderLeftColor = result.color;
                resultBox.classList.remove('hidden');
            });
        }

        // --- TRANSFER Adapter ---
        const btnTransfer = document.getElementById('btn-decide-transfer');
        if(btnTransfer) {
            btnTransfer.addEventListener('click', () => {
                const conditions = {
                    powersOn: document.getElementById('t-power').value,
                    batterySwollen: document.getElementById('t-battery').value,
                    screenFunctional: document.getElementById('t-screen').value,
                    waterDamaged: document.getElementById('t-water').value
                };

                const device = new ElectronicDevice({}, conditions);
                const result = ModuleFactory.createModule('transfer').execute(device);
                const resultBox = document.getElementById('transfer-result');
                
                resultBox.textContent = result.message;
                resultBox.style.borderLeftColor = result.color;
                resultBox.classList.remove('hidden');
            });
        }

        // --- TECHCARE Adapter ---
        window.tcModuleInstance = ModuleFactory.createModule('techcare', activeSession.selectedDevice || 'cellphone');
        
        const handleTcResponse = (isYes) => {
            const result = window.tcModuleInstance.processAnswer(isYes);
            const tcTitle = document.getElementById('tc-stage-title');
            const tcPrompt = document.getElementById('tc-prompt');
            const btnYes = document.getElementById('btn-tc-yes');
            const btnNo = document.getElementById('btn-tc-no');
            const btnReset = document.getElementById('btn-tc-reset');

            if (result.isComplete) {
                tcTitle.textContent = "Assessment Complete";
                const userName = activeSession.studentName || 'Bulldog';
                tcPrompt.innerHTML = `<em>Great work, ${userName}! Here's your final note:</em> ${result.feedback}`;
                btnYes.classList.add('hidden');
                btnNo.classList.add('hidden');
                btnReset.classList.remove('hidden');
            } else {
                tcTitle.textContent = result.nextStage.title;
                tcPrompt.innerHTML = `<span style="color:#2ecc71; font-size:0.85em;">✅ Prev: ${result.feedback}</span><br><br>${result.nextStage.prompt}`;
            }
        };

        const btnYes = document.getElementById('btn-tc-yes');
        const btnNo = document.getElementById('btn-tc-no');
        const btnReset = document.getElementById('btn-tc-reset');

        if(btnYes) btnYes.addEventListener('click', () => handleTcResponse(true));
        if(btnNo) btnNo.addEventListener('click', () => handleTcResponse(false));
        if(btnReset) {
            btnReset.addEventListener('click', () => {
                const firstStage = window.tcModuleInstance.reset();
                document.getElementById('tc-stage-title').textContent = firstStage.title;
                document.getElementById('tc-prompt').textContent = firstStage.prompt;
                document.getElementById('btn-tc-yes').classList.remove('hidden');
                document.getElementById('btn-tc-no').classList.remove('hidden');
                document.getElementById('btn-tc-reset').classList.add('hidden');
            });
        }
    }

    static bindLocationModals() {
        // --- LOCATION DIRECTORY MODALS ---
        const locationBoxes = document.querySelectorAll('.loc-box');
        const locModal = document.getElementById('locModal');
        const closeLocBtn = document.getElementById('closeLocModalBtn');

        locationBoxes.forEach(box => {
            box.addEventListener('click', () => {
                const key = box.dataset.location; // Reads the data-location attribute
                const data = LOCATION_DATA[key];
                
                if (data) {
                    document.getElementById('modalTitle').textContent = data.title;
                    document.getElementById('modalImg').src = data.img;
                    document.getElementById('modalAddress').textContent = data.address;
                    document.getElementById('modalDirection').textContent = data.direction;
                    locModal.style.display = "flex";
                }
            });
        });

        // Close on X button
        if (closeLocBtn) {
            closeLocBtn.addEventListener('click', () => locModal.style.display = "none");
        }

        // Close on clicking outside the modal
        window.addEventListener('click', (event) => {
            if (event.target === locModal) {
                locModal.style.display = "none";
            }
        });
    }
}

// Boot up the application architecture
document.addEventListener('DOMContentLoaded', () => UIController.initialize());