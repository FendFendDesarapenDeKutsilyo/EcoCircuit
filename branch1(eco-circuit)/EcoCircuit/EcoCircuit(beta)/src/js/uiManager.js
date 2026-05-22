import { activeSession } from './sessionManager.js';
import { ElectronicDevice } from './models.js';
import { createModule } from './moduleFactory.js';

const LOCATION_DATA = {
    'dan': { title: 'Dan The Technician Repair', img: 'images/Dan_The_Technician.jpg', address: '📍 803 Alex, Sampaloc, Manila (Near NU)', direction: 'From NU, walk to Fajardo St. Walk straight...' },
    'tovy': { title: "Tovy's Cellphone Repair", img: "images/Tovy's_Cellphone_Repair.jpg", address: '📍 1953 Florentino St, Sampaloc, Manila', direction: 'From NU, walk towards Earnshaw/Lacson...' },
    'orbanthic': { title: 'Orbanthics Repair Shop', img: 'images/Orbanthic.jpg', address: '📍 639 Delos Santos St, Sampaloc, Manila', direction: 'From NU, walk towards San Anton St...' },
    'annex': { title: 'NU Annex 2 E-Waste Bin', img: 'images/Annex2_1st_Floor.jpg', address: '📍 National University Annex 2, 1st Floor', direction: 'Go to the 1st floor lobby...' },
    'jmb': { title: 'NU JMB E-Waste Bin', img: 'images/JMB_1st_Floor.jpg', address: '📍 Jhocson Memorial Building, 1st Floor', direction: 'Located near the entrance guard.' },
    'mb': { title: 'NU MB E-Waste Bin', img: 'images/MB_5th_Floor.jpg', address: '📍 Main Building, 5th Floor', direction: 'Take the elevator to the 5th floor...' }
};

export class UIController {
    static async initialize() {
        await activeSession.init();
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
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('studentId').value.trim();
                const name = document.getElementById('studentName').value.trim();
                const validId = this.validateStudentId(id);
                const validName = this.validateStudentName(name);

                if (!validId) return alert('Student ID must contain only numbers.');
                if (!validName) return alert('Full Name may only contain letters, spaces, and periods.');

                if (id && name) {
                    await activeSession.login(id, name);
                    this.updateGlobalUI();
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to logout?')) {
                    await activeSession.logout();
                    location.reload();
                }
            });
        }

        deviceOptions.forEach(option => {
            option.addEventListener('click', async () => {
                deviceOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                await activeSession.setDevice(option.dataset.device);
                document.getElementById('deviceModal').style.display = 'none';
                this.updateGlobalUI();
            });
        });

        if (changeDeviceBtn) changeDeviceBtn.addEventListener('click', () => { document.getElementById('deviceModal').style.display = 'flex'; });
        if (skipDeviceBtn) skipDeviceBtn.addEventListener('click', () => { document.getElementById('deviceModal').style.display = 'none'; });
    }

    static updateGlobalUI() {
        const sessionMeta = document.getElementById('sessionMeta');
        const userInfo = document.getElementById('userInfo');
        const heroGreeting = document.getElementById('heroGreeting');
        const deviceGreeting = document.getElementById('deviceGreeting');

        if (!activeSession.isLoggedIn()) {
            const loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.style.display = 'flex';
            const deviceModal = document.getElementById('deviceModal');
            if (deviceModal) deviceModal.style.display = 'none';
            if (sessionMeta) sessionMeta.classList.add('hidden');
            return;
        }

        document.getElementById('loginModal').style.display = 'none';

        const deviceModal = document.getElementById('deviceModal');
        if (!activeSession.selectedDevice) { if (deviceModal) deviceModal.style.display = 'flex'; }
        else { if (deviceModal) deviceModal.style.display = 'none'; this.updateDeviceSpecificUI(activeSession.selectedDevice); }

        if (userInfo) { userInfo.innerHTML = `👤 ${activeSession.studentName}`; userInfo.style.display = 'block'; }
        if (heroGreeting) heroGreeting.innerHTML = `Hey, ${activeSession.studentName}! 👋 <br><span class="highlight-gold">Save Your Wallet.</span>`;
        if (deviceGreeting) deviceGreeting.textContent = `What device are we evaluating today, ${activeSession.studentName}?`;
        if (sessionMeta && activeSession.loginTimestamp) {
            sessionMeta.textContent = `Logged in since ${this.formatSessionTime(activeSession.loginTimestamp)}.`;
            sessionMeta.classList.remove('hidden');
        }

        this.restoreSavedResults();
    }

    static updateDeviceSpecificUI(deviceType) {
        const deviceInfo = document.getElementById('deviceInfo');
        const deviceDisplay = document.getElementById('selectedDeviceDisplay');
        const emojis = { 'cellphone':'📱','laptop':'💻','tablet':'📲' };
        if (deviceInfo && deviceDisplay) { deviceDisplay.textContent = `${emojis[deviceType]} Evaluating: ${deviceType.charAt(0).toUpperCase()+deviceType.slice(1)}`; deviceInfo.classList.remove('hidden'); }
        document.querySelectorAll('.device-option').forEach(opt => opt.classList.remove('selected'));
        const selectedOpt = document.querySelector(`.device-option[data-device="${deviceType}"]`);
        if (selectedOpt) selectedOpt.classList.add('selected');

        if (window.tcModuleInstance) {
            window.tcModuleInstance.updateDeviceType(deviceType);
            const firstStage = window.tcModuleInstance.reset();
            document.getElementById('tc-stage-title').textContent = firstStage.title;
            document.getElementById('tc-prompt').textContent = firstStage.prompt;
        }
    }

    static bindModuleEvents() {
        const btnTipid = document.getElementById('btn-calc-tipid');
        if (btnTipid) btnTipid.addEventListener('click', async () => {
            const financials = { repairCost: parseFloat(document.getElementById('repairPrice').value), newPrice: parseFloat(document.getElementById('newPhonePrice').value) };
            const conditions = { partsAvail: document.getElementById('partsAvail').value, physDamage: document.getElementById('physDamage').value };
            if (isNaN(financials.repairCost) || isNaN(financials.newPrice)) return alert('Enter valid amounts.');
            const device = new ElectronicDevice(financials, conditions);
            const result = createModule('tipid').execute(device);
            const resultBox = document.getElementById('tipid-result');
            let msg = activeSession.studentName ? `Hey ${activeSession.studentName}! ${result.rec}` : result.rec;
            resultBox.innerHTML = `<strong>${msg}</strong><br>${result.reason}`;
            resultBox.style.borderLeftColor = result.color; resultBox.classList.remove('hidden');
            await activeSession.recordActivity('tipid', { input: financials, conditions, result });
        });

        const btnTransfer = document.getElementById('btn-decide-transfer');
        if (btnTransfer) btnTransfer.addEventListener('click', async () => {
            const conditions = { powersOn: document.getElementById('t-power').value, batterySwollen: document.getElementById('t-battery').value, screenFunctional: document.getElementById('t-screen').value, waterDamaged: document.getElementById('t-water').value };
            const device = new ElectronicDevice({}, conditions);
            const result = createModule('transfer').execute(device);
            const resultBox = document.getElementById('transfer-result');
            resultBox.innerHTML = this.formatTransferResult(result);
            resultBox.style.borderLeftColor = result.color; resultBox.classList.remove('hidden');
            await activeSession.recordActivity('transfer', { conditions, result });
        });

        window.tcModuleInstance = createModule('techcare', activeSession.selectedDevice || 'cellphone');
        const handleTcResponse = (isYes) => {
            const result = window.tcModuleInstance.processAnswer(isYes);
            const tcTitle = document.getElementById('tc-stage-title');
            const tcPrompt = document.getElementById('tc-prompt');
            const btnYes = document.getElementById('btn-tc-yes');
            const btnNo = document.getElementById('btn-tc-no');
            const btnReset = document.getElementById('btn-tc-reset');

            if (result.isComplete) {
                tcTitle.textContent = 'Assessment Complete';
                const userName = activeSession.studentName || 'Bulldog';
                tcPrompt.innerHTML = `<em>Great work, ${userName}! Here's your final note:</em> ${result.feedback}`;
                btnYes.classList.add('hidden'); btnNo.classList.add('hidden'); btnReset.classList.remove('hidden');
                activeSession.recordActivity('techcare', {
                    deviceType: activeSession.selectedDevice || 'cellphone',
                    feedback: result.feedback,
                    issues: result.issueDetected,
                    completedAt: new Date().toISOString()
                });
            } else {
                tcTitle.textContent = result.nextStage.title;
                tcPrompt.innerHTML = `<span style="color:#2ecc71; font-size:0.85em;">✅ Prev: ${result.feedback}</span><br><br>${result.nextStage.prompt}`;
            }
        };

        const btnYes = document.getElementById('btn-tc-yes');
        const btnNo = document.getElementById('btn-tc-no');
        const btnReset = document.getElementById('btn-tc-reset');
        if (btnYes) btnYes.addEventListener('click', () => handleTcResponse(true));
        if (btnNo) btnNo.addEventListener('click', () => handleTcResponse(false));
        if (btnReset) btnReset.addEventListener('click', () => { const firstStage = window.tcModuleInstance.reset(); document.getElementById('tc-stage-title').textContent = firstStage.title; document.getElementById('tc-prompt').textContent = firstStage.prompt; document.getElementById('btn-tc-yes').classList.remove('hidden'); document.getElementById('btn-tc-no').classList.remove('hidden'); document.getElementById('btn-tc-reset').classList.add('hidden'); });
    }

    static validateStudentId(id) {
        return /^\d+$/.test(id);
    }

    static validateStudentName(name) {
        return /^[A-Za-z.\s]+$/.test(name);
    }

    static formatSessionTime(timestamp) {
        try { return new Date(timestamp).toLocaleString(); } catch (e) { return timestamp; }
    }

    static formatTransferResult(result) {
        return `<div class="transfer-summary"><strong>${result.title}</strong></div>
            <div class="transfer-section"><strong>Resale potential analysis</strong><p>${result.resale.summary}</p><p><strong>Estimate:</strong> ${result.resale.estimate}</p></div>
            <div class="transfer-section"><strong>E-waste recycling recommendation</strong><p>${result.recycle.summary}</p><p><strong>Guidance:</strong> ${result.recycle.guidance}</p></div>`;
    }

    static restoreSavedResults() {
        const saved = activeSession.savedResults;
        if (!saved) return;

        const tipidSaved = saved.tipid;
        const transferSaved = saved.transfer;
        const techcareSaved = saved.techcare;

        if (tipidSaved) {
            const tipidResult = document.getElementById('tipid-result');
            if (tipidResult) {
                tipidResult.innerHTML = `<strong>Recovered saved TIPID evaluation</strong><br>${tipidSaved.result.reason}`;
                tipidResult.style.borderLeftColor = tipidSaved.result.color;
                tipidResult.classList.remove('hidden');
            }
            if (document.getElementById('repairPrice')) document.getElementById('repairPrice').value = tipidSaved.input.repairCost || '';
            if (document.getElementById('newPhonePrice')) document.getElementById('newPhonePrice').value = tipidSaved.input.newPrice || '';
            if (document.getElementById('partsAvail')) document.getElementById('partsAvail').value = tipidSaved.input.partsAvail || 'readily_available';
            if (document.getElementById('physDamage')) document.getElementById('physDamage').value = tipidSaved.input.physDamage || 'minor';
        }

        if (transferSaved) {
            const transferResult = document.getElementById('transfer-result');
            if (transferResult) {
                transferResult.innerHTML = this.formatTransferResult(transferSaved.result);
                transferResult.style.borderLeftColor = transferSaved.result.color;
                transferResult.classList.remove('hidden');
            }
            if (document.getElementById('t-power')) document.getElementById('t-power').value = transferSaved.conditions.powersOn || 'yes';
            if (document.getElementById('t-battery')) document.getElementById('t-battery').value = transferSaved.conditions.batterySwollen || 'no';
            if (document.getElementById('t-screen')) document.getElementById('t-screen').value = transferSaved.conditions.screenFunctional || 'yes';
            if (document.getElementById('t-water')) document.getElementById('t-water').value = transferSaved.conditions.waterDamaged || 'no';
        }

        if (techcareSaved) {
            const tcTitle = document.getElementById('tc-stage-title');
            const tcPrompt = document.getElementById('tc-prompt');
            const btnYes = document.getElementById('btn-tc-yes');
            const btnNo = document.getElementById('btn-tc-no');
            const btnReset = document.getElementById('btn-tc-reset');
            if (tcTitle && tcPrompt && btnYes && btnNo && btnReset) {
                tcTitle.textContent = 'Assessment Complete';
                tcPrompt.innerHTML = `<em>Saved Tech-Care result:</em> ${techcareSaved.feedback}`;
                btnYes.classList.add('hidden');
                btnNo.classList.add('hidden');
                btnReset.classList.remove('hidden');
            }
        }
    }

    static bindLocationModals() {
        const locationBoxes = document.querySelectorAll('.loc-box');
        const locModal = document.getElementById('locModal');
        const closeLocBtn = document.getElementById('closeLocModalBtn');

        locationBoxes.forEach(box => {
            box.addEventListener('click', () => {
                const key = box.dataset.location; const data = LOCATION_DATA[key];
                if (data) {
                    document.getElementById('modalTitle').textContent = data.title;
                    document.getElementById('modalImg').src = data.img;
                    document.getElementById('modalAddress').textContent = data.address;
                    document.getElementById('modalDirection').textContent = data.direction;
                    locModal.style.display = 'flex';
                }
            });
        });

        if (closeLocBtn) closeLocBtn.addEventListener('click', () => locModal.style.display = 'none');
        window.addEventListener('click', (event) => { if (event.target === locModal) locModal.style.display = 'none'; });
    }
}
