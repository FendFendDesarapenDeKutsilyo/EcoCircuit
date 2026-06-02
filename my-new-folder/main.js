/**
 * ECOCIRCUIT COLLECTIVE — CORE SHARED SCRIPT
 * Handles shared sessions, login modal integration, standard calculations, 
 * nav injections, and multi-page routing values.
 */

const API_BASE = window.location.origin;

/* ── API Helper ── */
async function apiFetch(method, path, body = null, skipAuth = false) {
    const url = `${API_BASE}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    
    if (!skipAuth) {
        const token = getAuthToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const opts = { method, headers };
    if (body !== null) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const data = await res.json();
    
    if (!res.ok) {
        throw new Error(data.message || data.error || `Request failed (${res.status})`);
    }
    
    return data;
}

function getAuthToken() {
    const session = getSession();
    return session?.authToken || null;
}

const LOCATION_DATA = {
    dan: {
        title: 'Dan The Technician Repair',
        img: 'Dan_The_Technician.jpg',
        address: '📍 803 Alex, Sampaloc, Manila (Near NU)',
        direction: 'From NU, walk straight down Fajardo St. Walk straight for 3 blocks.',
        type: 'repair',
    },
    tovy: {
        title: "Tovy's Cellphone Repair",
        img: "Tovy's_Cellphone_Repair.jpg",
        address: '📍 1953 Florentino St, Sampaloc, Manila',
        direction: 'From NU, walk towards Earnshaw/Lacson intersection. Located on the left side.',
        type: 'repair',
    },
    orbanthic: {
        title: 'Orbanthics Repair Shop',
        img: 'Orbanthic.jpg',
        address: '📍 639 Delos Santos St, Sampaloc, Manila',
        direction: 'From NU, walk towards San Anton St. Right next to the convenience store.',
        type: 'repair',
    },
    annex: {
        title: 'NU Annex 2 (1st Floor Bin)',
        img: 'Annex2_1st_Floor.jpg',
        address: '📍 National University Annex 2, 1st Floor Lobby',
        direction: 'Go to the 1st floor lobby, next to the main staircase.',
        type: 'waste',
    },
    jmb: {
        title: 'NU JMB (1st Floor Bin)',
        img: 'JMB_1st_Floor.jpg',
        address: '📍 Jhocson Memorial Building, 1st Floor',
        direction: 'Located near the main entrance guard desk.',
        type: 'waste',
    },
    mb: {
        title: 'NU MB (5th Floor Bin)',
        img: 'MB_5th_Floor.jpg',
        address: '📍 Main Building, 5th Floor IT Lobby',
        direction: 'Take the elevator to the 5th floor, near the server rooms.',
        type: 'waste',
    }
};

const TECHCARE_QUESTIONS = {
    cellphone: [
        {
            title: 'Stage 1: Battery Health Check',
            prompt: 'Does your phone randomly shut down or die before reaching 1%?',
            yesResponse: '🔋 Calibration Reset needed! Turn off, charge to 100% uninterrupted, run complete drain loop, once fully empty recharge to 100% fully undisturbed.',
            noResponse: '✅ Excellent! Your battery is operating efficiently. Avoid frequent discharges below 15% to maintain long longevity.',
            issueTag: 'battery'
        },
        {
            title: 'Stage 2: Device Overheating',
            prompt: 'Is your phone uncomfortably hot to touch during typical reading or classroom tasks?',
            yesResponse: '⚠️ Thermal Throttle! Remove immediate rubber casework. Liquid metal backplates retain heat. Cool in shade; never charge in a closed hot pocket.',
            noResponse: '✅ Cool thermals! Heat causes lithium degradation. Keeping charging temperatures room-ambient safeguards internal circuit life.',
            issueTag: 'thermal'
        },
        {
            title: 'Stage 3: CPU & Storage Fatigue',
            prompt: 'Do apps frequently lock up or does typing input lag behind your fingers?',
            yesResponse: '🧹 Clear Buffer cache. Move WhatsApp/Telegram/Messenger media archives off native partition. Leave at minimum 15% space free.',
            noResponse: '✅ Balanced system indexing! Sustaining dynamic block space storage ensures prompt cache write speeds.',
            issueTag: 'performance'
        }
    ],
    laptop: [
        {
            title: 'Stage 1: Battery Level Cycle',
            prompt: 'Does your laptop battery collapse in less than 90 minutes of standard note-taking?',
            yesResponse: '🔋 Run battery diagnostics report via Terminal `powercfg /batteryreport`. Check the design capacity ratio. Consider cell calibration reset.',
            noResponse: '✅ Good battery cell index. Continue restricting extreme charge values: run on cable only occasionally to trigger native discharge loops.',
            issueTag: 'battery'
        },
        {
            title: 'Stage 2: Airflow Throttling Check',
            prompt: 'Do cooling fans engage immediately at maximum volume, accompanied by chassis heat?',
            yesResponse: '💨 Blocked Vents! Carefully blow canned compressed air into the side exhaust fins. Lift the back angle using rubber wedges or table stands.',
            noResponse: '✅ Vents are clear. Safe heat dispensation extends motherboard components lifespan.',
            issueTag: 'thermal'
        },
        {
            title: 'Stage 3: Disk I/O Throttling check',
            prompt: 'Does the laptop take over 2 minutes to boot into desktop or launch simple browsers?',
            yesResponse: '🧹 Turn off autostart utilities using Task Manager dashboard. Clean cache temp logs. Consider swapping spinning HDD platter panels with Solid State SSD.',
            noResponse: '✅ Swift filesystem response index detects healthy file structures.',
            issueTag: 'performance'
        }
    ],
    tablet: [
        {
            title: 'Stage 1: Lithium Charging Stability',
            prompt: 'Does your tablet screen battery indicator flicker or jump multiple percents instantly?',
            yesResponse: '🔋 Defective controller sensor signals calibration error. Charge continuously inside recovery-loader state for 4 hours to align battery indicators.',
            noResponse: '✅ Power controller cell synchronization is consistent. Ensure clean socket connections.',
            issueTag: 'battery'
        },
        {
            title: 'Stage 2: Display responsiveness Check',
            prompt: 'Do touch commands fail to register or cause jittery phantom typing?',
            yesResponse: '📱 Clean screen with microfiber and anhydrous isopropyl alcohol. Touch responses lag if grease residues attract moisture.',
            noResponse: '✅ Capacitive panel registration is functional.',
            issueTag: 'touchscreen'
        },
        {
            title: 'Stage 3: Cloud & Network Optimization',
            prompt: 'Does your tablet experience slowdowns when multiple online tabs are opened?',
            yesResponse: '🧹 Reset network sockets settings list. Disable background app synchronizations. Back up media onto cloud directories to save SSD partitions.',
            noResponse: '✅ Maintained RAM headroom ensures pristine rendering performance.',
            issueTag: 'storage'
        }
    ]
};

// ==========================================
// SESSION CONTROLLER
// ==========================================
function getSession() {
    const raw = localStorage.getItem('ecocircuit_session');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch(e) {
        localStorage.removeItem('ecocircuit_session');
        return null;
    }
}

function setSession(userData) {
    localStorage.setItem('ecocircuit_session', JSON.stringify(userData));
}

function getSavedResults() {
    const raw = localStorage.getItem('ecocircuit_saved_results');
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch(e) {
        return {};
    }
}

function saveModuleResult(moduleKey, data) {
    const results = getSavedResults();
    results[moduleKey] = data;
    localStorage.setItem('ecocircuit_saved_results', JSON.stringify(results));
}

function logout() {
    if (confirm('Are you sure you want to log out of your EcoCircuit session?')) {
        // Try to call backend logout (best-effort)
        try { apiFetch('POST', '/api/auth/logout').catch(() => {}); } catch(e) {}
        localStorage.removeItem('ecocircuit_session');
        localStorage.removeItem('ecocircuit_saved_results');
        window.location.href = 'index.html';
    }
}

// ==========================================
// NAVBAR & LOGIN LAYOUT INJECTORS
// ==========================================
function injectNavbar(activePage) {
    const session = getSession();
    const navContainer = document.getElementById('navbar-container');
    if (!navContainer) return;

    if (!session) {
        // Redundant injection guard: navbar is empty if not authenticated
        navContainer.innerHTML = '';
        return;
    }

    const nameUpper = session.studentName.toUpperCase();
    const device = session.selectedDevice || 'none';
    let deviceEmoji = '❓';
    let deviceText = 'No Device Selected';
    if (device === 'cellphone') { deviceEmoji = '📱'; deviceText = 'Cellphone'; }
    if (device === 'laptop') { deviceEmoji = '💻'; deviceText = 'Laptop'; }
    if (device === 'tablet') { deviceEmoji = '📲'; deviceText = 'Tablet'; }

    navContainer.innerHTML = `
    <nav class="navbar shrink-0">
        <div class="navbar-brand">
            <a href="index.html" class="logo text-decoration-none select-none">
                <span class="logo-icon">⚡</span>
                ECOCIRCUIT <span class="logo-accent">COLLECTIVE</span>
            </a>
        </div>
        <div class="navbar-nav select-none">
            <ul class="nav-links">
                <li class="nav-home">
                    <a href="index.html" class="nav-pill transition-transform ${activePage === 'home' ? 'active' : ''}">Home</a>
                </li>
                <li class="nav-tipid">
                    <a href="tipid.html" class="nav-pill transition-transform ${activePage === 'tipid' ? 'active' : ''}">Tipid</a>
                </li>
                <li class="nav-techcare">
                    <a href="techcare.html" class="nav-pill transition-transform ${activePage === 'techcare' ? 'active' : ''}">Tech-Care</a>
                </li>
                <li class="nav-transfer">
                    <a href="transfer.html" class="nav-pill transition-transform ${activePage === 'transfer' ? 'active' : ''}">Transfer</a>
                </li>
                <li class="nav-locations">
                    <a href="locations.html" class="nav-pill transition-transform ${activePage === 'locations' ? 'active' : ''}">Locations</a>
                </li>
                <li class="nav-pill-user flex items-center gap-1.5 select-none my-1 sm:my-0">
                    <span class="text-xs text-yellow-400 font-bold">${deviceEmoji}</span>
                    <span class="text-xs text-gray-200 font-bold">${nameUpper}</span>
                </li>
                <li>
                    <button onclick="logout()" class="nav-pill-logout transition-transform my-1 sm:my-0">Logout</button>
                </li>
            </ul>
        </div>
    </nav>
    `;
}

function enforceAuthentication() {
    const session = getSession();
    const currentLoc = window.location.pathname.split('/').pop() || 'index.html';

    if (!session) {
        if (currentLoc !== 'index.html') {
            // Redirect standard unauthenticated traffic to main page to complete auth modal
            window.location.href = 'index.html';
        }
        return false;
    }
    return true;
}

// ==========================================
// MODAL ENGINE (SHARED)
// ==========================================
function injectLoginModal() {
    const body = document.body;
    if (document.getElementById('loginModalOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'loginModalOverlay';
    overlay.className = 'auth-modal-overlay';
    overlay.innerHTML = `
        <div class="auth-modal-content max-w-sm w-11/12 text-left" id="modalContainer">
            <!-- STEP 1: CREDENTIALS -->
            <div id="authStepCredentials" class="animate-fadeIn">
                <div class="auth-logo">
                    ⚡ ECO<span style="color:var(--nu-gold)">CIRCUIT</span>
                </div>
                <h2>Welcome, Bulldog! 🎓</h2>
                <p class="auth-subtitle text-xs mb-6">
                    Enter your National U student details to construct your evaluation engine.
                </p>

                <div id="authErrorMsg" class="hidden mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                    <span>💡 Please complete required details correctly.</span>
                </div>

                <form id="authLoginForm" class="auth-form" onsubmit="handleAuthSubmit(event)">
                    <div class="form-group mb-4">
                        <label class="block text-xs font-bold mb-1">
                            Student ID (Required)
                        </label>
                        <input type="text" id="authInputId" placeholder="e.g., 2025100123" required />
                    </div>

                    <div class="form-group mb-4">
                        <label class="block text-xs font-bold mb-1">
                            Full Name (Required)
                        </label>
                        <input type="text" id="authInputName" placeholder="e.g., Ash Ketchum" required />
                    </div>

                    <button type="submit" class="btn-primary auth-btn w-full mt-6 justify-center gap-2 select-none">
                        Continue &rarr;
                    </button>
                </form>
            </div>

            <!-- STEP 2: PROFILE DEVICE -->
            <div id="authStepDevice" class="hidden animate-fadeIn text-center">
                <h2 class="text-center font-extrabold text-xl mb-1">
                    What device is analyzed, <span id="authGreetingName"></span>?
                </h2>
                <p class="auth-subtitle text-center text-xs mb-6">
                    Choose your diagnostic target.
                </p>

                <div class="device-selector">
                    <button onclick="handleSelectDevice('cellphone')" class="device-option hover:border-[#ffd400] transition-all w-full select-none cursor-pointer">
                        <div class="device-icon text-3xl mb-1">📱</div>
                        <span class="font-bold text-xs">Cellphone</span>
                    </button>

                    <button onclick="handleSelectDevice('laptop')" class="device-option hover:border-[#ffd400] transition-all w-full select-none cursor-pointer">
                        <div class="device-icon text-3xl mb-1">💻</div>
                        <span class="font-bold text-xs">Laptop</span>
                    </button>

                    <button onclick="handleSelectDevice('tablet')" class="device-option hover:border-[#ffd400] transition-all w-full select-none cursor-pointer">
                        <div class="device-icon text-3xl mb-1">📲</div>
                        <span class="font-bold text-xs">Tablet</span>
                    </button>
                </div>

                <button onclick="handleSelectDevice(null)" class="btn-secondary auth-btn w-full mt-4 cursor-pointer">
                    Skip for Now
                </button>
            </div>
        </div>
    `;
    body.appendChild(overlay);
}

let tempAuthData = null;

async function handleAuthSubmit(event) {
    event.preventDefault();
    const idVal = document.getElementById('authInputId').value.trim();
    const nameVal = document.getElementById('authInputName').value.trim();

    if (!idVal || !nameVal) {
        document.getElementById('authErrorMsg').classList.remove('hidden');
        return;
    }

    tempAuthData = { studentId: idVal, studentName: nameVal };

    // Try backend authentication (auto-login via institutional email)
    try {
        const email = `${idVal}@national-u.edu.ph`;
        const password = `NU${idVal}2026`; // Standard institutional password derivation
        const result = await apiFetch('POST', '/api/auth/login', {
            email,
            password
        }, true);
        // Store the JWT token with session data
        tempAuthData.authToken = result.token;
        tempAuthData.backendUserId = result.user?.userId;
        console.log('[EcoCircuit] Backend auth successful, JWT stored.');
    } catch (err) {
        // Backend unavailable — continue with local-only auth (fallback)
        console.warn('[EcoCircuit] Backend auth unavailable, using local session:', err.message);
    }

    // Move to device step
    document.getElementById('authStepCredentials').classList.add('hidden');
    document.getElementById('authStepDevice').classList.remove('hidden');
    document.getElementById('authGreetingName').innerText = nameVal;
}

function handleSelectDevice(deviceType) {
    if (!tempAuthData) return;
    const finalUser = {
        ...tempAuthData,
        selectedDevice: deviceType
    };
    setSession(finalUser);
    
    // Close modal & reload page
    const overlay = document.getElementById('loginModalOverlay');
    if (overlay) overlay.remove();
    window.location.reload();
}

// DEVICE REGULAR CHANGE MODAL
function injectDeviceModal() {
    const body = document.body;
    if (document.getElementById('deviceChangeModalOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'deviceChangeModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-content select-none">
            <span class="close-modal" onclick="closeDeviceModal()">&times;</span>
            <h2 class="text-center font-extrabold text-2xl mb-2">Change Evaluation Target</h2>
            <p class="text-center text-xs mb-6">Select the new category profile for customized guides.</p>
            
            <div class="device-selector">
                <button onclick="changeDeviceProfile('cellphone')" class="device-option card-action hover:border-[#ffd400] scale-95 hover:scale-100 transition-all select-none cursor-pointer p-4">
                    <div class="device-icon text-3xl mb-1">📱</div>
                    <span class="font-bold text-sm">Cellphone</span>
                </button>

                <button onclick="changeDeviceProfile('laptop')" class="device-option card-action hover:border-[#ffd400] scale-95 hover:scale-100 transition-all select-none cursor-pointer p-4">
                    <div class="device-icon text-3xl mb-1">💻</div>
                    <span class="font-bold text-sm">Laptop</span>
                </button>

                <button onclick="changeDeviceProfile('tablet')" class="device-option card-action hover:border-[#ffd400] scale-95 hover:scale-100 transition-all select-none cursor-pointer p-4">
                    <div class="device-icon text-3xl mb-1">📲</div>
                    <span class="font-bold text-sm">Tablet</span>
                </button>
            </div>
        </div>
    `;
    body.appendChild(overlay);
}

function closeDeviceModal() {
    const overlay = document.getElementById('deviceChangeModalOverlay');
    if (overlay) overlay.remove();
}

function changeDeviceProfile(deviceType) {
    const session = getSession();
    if (session) {
        session.selectedDevice = deviceType;
        setSession(session);
    }
    closeDeviceModal();
    window.location.reload();
}

// LOCATION DETAIL OVERLAY MODAL
function showLocationModal(key) {
    const loc = LOCATION_DATA[key];
    if (!loc) return;

    const body = document.body;
    if (document.getElementById('locationModalOverlay')) return;

    const isRepair = loc.type === 'repair';
    const tagText = isRepair ? '🔧 Certified Repair Hub' : '♻️ Authorized E-Waste Bin';

    const overlay = document.createElement('div');
    overlay.id = 'locationModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-content text-left max-w-xl">
            <span class="close-modal" onclick="closeLocationModal()">&times;</span>
            <span class="inline-block text-xs font-black ${isRepair ? 'bg-amber-100 text-[#b8860b] border-amber-200' : 'bg-emerald-100 text-[#2e7d32] border-emerald-200'} px-3 py-1 rounded-full border mb-4 uppercase tracking-widest">${tagText}</span>
            <h2 class="font-extrabold text-2xl mb-2">${loc.title}</h2>
            <p class="modal-address text-sm font-semibold mb-3">${loc.address}</p>
            
            <img class="modal-img mb-4" src="${loc.img}" alt="${loc.title}">
            
            <div class="modal-directions">
                <span class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Campus Directions:</span>
                <p class="text-sm">${loc.direction}</p>
            </div>
            
            <button onclick="closeLocationModal()" class="btn-action w-full mt-6">
                Understand Directions
            </button>
        </div>
    `;
    body.appendChild(overlay);
}

function closeLocationModal() {
    const overlay = document.getElementById('locationModalOverlay');
    if (overlay) overlay.remove();
}


// ==========================================
// CORE COMPUTATION ENGINES (Fallback — used when backend is unavailable)
// ==========================================
function evaluateTipidFormula(repairCost, newPrice, partsAvail, physDamage, username) {
    if (partsAvail === 'obsolete') {
        return {
            rec: '❌ Do Not Repair (Obsolete)',
            reason: 'Parts for this circuit profile are officially obsolete. Sourcing replacement panels produces severe secondary e-waste overhead.',
            color: '#ef4444'
        };
    }
    if (physDamage === 'severe') {
        return {
            rec: '❌ Replace & Transfer Device',
            reason: 'Severe frame breakdown indicates micro-fractures in general circuitry panels. Economic repair is impossible.',
            color: '#ef4444'
        };
    }

    const ratio = repairCost / newPrice;
    let penalty = 0;
    if (partsAvail === 'scarce') penalty += 0.15;
    if (physDamage === 'moderate') penalty += 0.10;

    const effectiveRatio = ratio + penalty;
    const percent = Math.round(effectiveRatio * 100);

    const greeting = username ? `Hey, ${username}! ` : '';

    if (effectiveRatio < 0.35) {
        return {
            rec: `${greeting}✅ Recommend Strong Repair`,
            reason: `Your computed cost scale burden index is ${percent}%. Repairing this device is both economically optimal and highly sustainable.`,
            color: '#10b981'
        };
    } else if (effectiveRatio < 0.55) {
        return {
            rec: `${greeting}⚠️ Boundary Decision Zone`,
            reason: `Your computed cost scale burden index is ${percent}%. Consider secondary conditions like device age, battery performance decay index, and trade-in opportunities.`,
                    color: '#f59e0b'
        };
    } else {
        return {
            rec: `${greeting}❌ Recommend Replacement & Recycle`,
            reason: `Your computed cost scale burden index is ${percent}%. This heavily breaches resource thresholds. Recycle broken electronics responsibly.`,
            color: '#ef4444'
        };
    }
}

function evaluateTransferFormula(powersOn, batterySwollen, screenFunctional, waterDamaged) {
    if (powersOn === 'yes') {
        if (batterySwollen === 'yes') {
            return {
                title: '🚨 Lithium Battery Danger: Immediate Isolation Required',
                resale: {
                    summary: 'Battery swelling signals standard chemical outgassing inside cell pouches. Sourcing motherboard power is extremely hazardous.',
                    estimate: 'Motherboard value: ₱200 - ₱500'
                },
                recycle: {
                    summary: 'Battery and internal electronics should be recycled through certified e-waste centers. Do not attempt to open or reuse the swollen battery.',
                    guidance: 'Handle with extreme safety. Isolate screen container inside secure, dry sand buckets and discard only at dedicated campus collection boxes immediately.'
                },
                color: '#ef4444'
            };
        } else {
            if (screenFunctional === 'yes') {
                return {
                    title: '💰 Fully Operational — High Re-commerce Value',
                    resale: {
                        summary: 'Excellent! The screen works and power signals are healthy. Motherboard board and processor chips enjoy premium secondary market liquid salvage lines.',
                        estimate: 'Estimated resell value: ₱2,500 - ₱5,000 depending on condition.'
                    },
                    recycle: {
                        summary: 'If any cosmetic parts are damaged, separate them for recycling and retain working electronics for resale.',
                        guidance: 'Reset credentials and execute a secure user files scrub. Deliver to nearby repair hub or online marketplaces for second-life student distribution.'
                    },
                    color: '#10b981'
                };
            } else {
                return {
                    title: '🔨 Parts Salvageable / Core Processor Intact',
                    resale: {
                        summary: 'Power is present but the screen is not functional. Salvage the motherboard, battery, camera, and charging port.',
                        estimate: 'Estimated core components trade-in: ₱700 - ₱1,800'
                    },
                    recycle: {
                        summary: 'Recycle the damaged screen and any water-sensitive components responsibly.',
                        guidance: 'Avoid disposal! Take to certified Sampaloc technicians to harvest motherboards and connectors as modular repair parts replacement blocks.'
                    },
                    color: '#f59e0b'
                };
            }
        }
    } else {
        if (waterDamaged === 'yes') {
            return {
                title: '♻️ Zero Recovery Potential / Circular Recycle Needed',
                resale: {
                    summary: 'Extensive water damage reduces resale potential. Only metal housing and unused connectors may have salvage value.',
                    estimate: 'Estimated salvage value: ₱100 - ₱300 for metal/connector parts.'
                },
                recycle: {
                    summary: 'Water-exposed electronics should be recycled to prevent environmental contamination.',
                    guidance: 'Place directly in National U collection vaults. Certified refining services isolate palladium, nickel, and copper alloy traces to eliminate heavy toxic seepage.'
                },
                color: '#10b981'
            };
        } else {
            return {
                title: '🔌 Diagnostic Evaluation / No-Power Booting State',
                resale: {
                    summary: 'The device does not power on but is not water damaged. There may still be value in the board, battery, and casing.',
                    estimate: 'Estimated salvage value: ₱300 - ₱900 depending on recoverable parts.'
                },
                recycle: {
                    summary: 'Recycle the battery and any damaged electronics using approved e-waste channels.',
                    guidance: 'Request professional component assessments before declaring as total loss. If unfixable, strip chassis covers to separate cells from standard plastics recycling.'
                },
                color: '#3b82f6'
            };
        }
    }
}