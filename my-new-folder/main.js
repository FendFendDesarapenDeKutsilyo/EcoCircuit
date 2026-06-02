/**
 * ECOCIRCUIT COLLECTIVE — CORE SHARED SCRIPT
 * Handles shared sessions, login modal integration, nav injections,
 * multi-page routing values, and API communication.
 * NO local fallback logic — real backend data only.
 */

const API_BASE = window.location.origin;

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

// ==========================================
// API CALLER
// ==========================================

/**
 * Reads the auth token from the current session.
 */
function getAuthToken() {
    const session = getSession();
    return session && session.authToken ? session.authToken : null;
}

/**
 * Generic API caller. Throws on failure — no silent fallback.
 *
 * @param {string} method - HTTP method
 * @param {string} path   - API path (e.g. '/api/tipid/evaluate')
 * @param {Object} [body] - Request body
 * @returns {Promise<Object>} Parsed JSON response
 */
async function callApi(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    const opts = { method, headers };
    if (body && method !== 'GET') {
        opts.body = JSON.stringify(body);
    }
    const url = API_BASE + path;
    const res = await fetch(url, opts);
    if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errBody.message || `API returned ${res.status}: ${res.statusText}`);
    }
    return await res.json();
}

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
        callApi('POST', '/api/auth/logout').catch(() => {});
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

function handleAuthSubmit(event) {
    event.preventDefault();
    const idVal = document.getElementById('authInputId').value.trim();
    const nameVal = document.getElementById('authInputName').value.trim();

    if (!idVal || !nameVal) {
        document.getElementById('authErrorMsg').classList.remove('hidden');
        return;
    }

    tempAuthData = { studentId: idVal, studentName: nameVal };

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