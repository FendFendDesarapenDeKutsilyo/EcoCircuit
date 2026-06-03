/**
 * ECOCIRCUIT COLLECTIVE — CORE SHARED SCRIPT
 * Handles shared sessions, login modal integration, standard calculations, 
 * nav injections, and multi-page routing values.
 */

const API_BASE = '';

// ===== DEFAULT USERS =====
(function seedDefaultUsers() {

    const existing =
        localStorage.getItem('ecocircuit_users');

    if (existing) return;

    const users = [
        {
            userId: 1,
            userName: 'MockName',
            userType: 'institutional',
            email: 'mocklastnamexyz@national-u.edu.ph',
            password: 'ecocircuit404'
        },
        {
            userId: 2,
            userName: 'MediaHost',
            userType: 'institutional',
            email: 'radiosilencelu@national-u.edu.ph',
            password: 'greatestFather666'
        },
        {
            userId: 3,
            userName: 'MockData',
            userType: 'general',
            email: 'mockdataname@gmail.com',
            password: 'mockdatapasswordEcoCircuit'
        },
        {
            userId: 4,
            userName: 'TheKingInYellow',
            userType: 'general',
            email: 'wifies@sfawtde.com',
            password: 'dontturnleftatthecrossroads'
        }
    ];

    localStorage.setItem(
        'ecocircuit_users',
        JSON.stringify(users)
    );

})();

/* ── API Helper ── */
async function apiFetch(method, path, body = null, skipAuth = false) {
    const url = `${API_BASE}${path}`;
    const headers = { 'Content-Type': 'application/json' };

    if (!skipAuth) {
        const token = getAuthToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const opts = { method, headers };

    if (body !== null) {
        opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Request failed (${res.status})`
        );
    }

    return data;
}

function getAuthToken() {
    const session = getSession();
    return session?.authToken || null;
}

function getAuthToken() {
    return 'local-token';
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

function isLoggedIn() {

    const session = getSession();

    return (
        session &&
        session.authToken &&
        session.userId
    );

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

    const nameUpper =
    (
        session.studentName ||
        session.userName ||
        'USER'
    ).toUpperCase();
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

// Tracks which modal panel is active: 'login' | 'signup' | 'device'
let _activePanel = 'login';
let tempAuthData = null;

// ─────────────────────────────────────────
// INJECT LOGIN/SIGNUP MODAL
// ─────────────────────────────────────────
function injectLoginModal() {
    const body = document.body;
    if (document.getElementById('loginModalOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'loginModalOverlay';
    overlay.className = 'auth-modal-overlay';
    overlay.innerHTML = `
        <div class="auth-modal-content max-w-sm w-11/12 text-left" id="modalContainer">

            <!-- ══ STEP 1A: LOGIN ══ -->
            <div id="authStepCredentials" class="animate-fadeIn">
                <div class="auth-logo">
                    ⚡ ECO<span style="color:var(--nu-gold)">CIRCUIT</span>
                </div>
                <h2>Welcome, Bulldog! 🎓</h2>
                <p class="auth-subtitle text-xs mb-4">
                    Sign in to your EcoCircuit account.
                </p>

                <!-- Error banner -->
                <div id="authErrorMsg"
                    class="hidden mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                    <span id="authErrorText">Invalid email or password.</span>
                </div>

                <form id="authLoginForm" class="auth-form" onsubmit="handleAuthSubmit(event)">

                    <div class="form-group mb-4">
                        <label class="block text-xs font-bold mb-1">Email</label>
                        <input
                            type="email"
                            id="authInputEmail"
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div class="form-group mb-6">
                        <label class="block text-xs font-bold mb-1">Password</label>
                        <input
                            type="password"
                            id="authInputPassword"
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <!-- LOGIN BUTTON -->
                    <button type="submit" class="btn-primary auth-btn w-full justify-center">
                        Login
                    </button>
                </form>

                <!-- Divider -->
                <div class="flex items-center gap-3 my-4">
                    <div style="flex:1;height:1px;background:#e2e8f0;"></div>
                    <span class="text-xs text-gray-400">or</span>
                    <div style="flex:1;height:1px;background:#e2e8f0;"></div>
                </div>

                <!-- SIGN UP LINK -->
                <p class="text-center text-xs text-gray-500 mb-3">
                    Don't have an account?
                    <button
                        type="button"
                        onclick="showSignupPanel()"
                        class="font-bold ml-1"
                        style="color:var(--nu-blue);background:none;border:none;cursor:pointer;text-decoration:underline;"
                    >Sign Up</button>
                </p>

                <!-- Institutional hint -->
                <p class="text-center text-xs mt-1" style="color:var(--nu-gold);font-weight:700;">
                    Institutional User?
                    <span style="color:var(--text-muted);font-weight:400;">
                        Use your National University email.
                    </span>
                </p>
            </div>

            <!-- ══ STEP 1B: SIGNUP ══ -->
            <div id="authStepSignup" class="hidden animate-fadeIn">
                <div class="auth-logo">
                    ⚡ ECO<span style="color:var(--nu-gold)">CIRCUIT</span>
                </div>
                <h2>Create Account</h2>
                <p class="auth-subtitle text-xs mb-4">
                    Join EcoCircuit. Fill in your details below.
                </p>

                <!-- Signup error banner -->
                <div id="signupErrorMsg"
                    class="hidden mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                    <span id="signupErrorText">Please check your details.</span>
                </div>

                <!-- Signup success banner -->
                <div id="signupSuccessMsg"
                    class="hidden mb-4 p-3 text-xs rounded-xl border"
                    style="background:#f0fdf4;color:#166534;border-color:#bbf7d0;">
                    ✅ Account created! Logging you in…
                </div>

                <form id="authSignupForm" class="auth-form" onsubmit="handleSignupSubmit(event)">

                    <div class="form-group mb-4">
                        <label class="block text-xs font-bold mb-1">Full Name</label>
                        <input
                            type="text"
                            id="signupInputName"
                            placeholder="e.g. Juan dela Cruz"
                            required
                            minlength="2"
                            maxlength="100"
                        />
                    </div>

                    <div class="form-group mb-4">
                        <label class="block text-xs font-bold mb-1">Email</label>
                        <input
                            type="email"
                            id="signupInputEmail"
                            placeholder="your@email.com"
                            required
                        />
                        <!-- Role row — only shown for @national-u.edu.ph emails -->
                        <div id="signupRoleRow" class="hidden mt-3">
                            <label class="block text-xs font-bold mb-1">Role (Institutional)</label>
                            <select id="signupInputRole"
                                class="w-full"
                                style="padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:0.85rem;">
                                <option value="">Select your role…</option>
                                <option value="student">Student</option>
                                <option value="staff">Staff</option>
                                <option value="professor">Professor</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group mb-1">
                        <label class="block text-xs font-bold mb-1">Password</label>
                        <input
                            type="password"
                            id="signupInputPassword"
                            placeholder="Min. 8 chars, 1 uppercase, 1 number"
                            required
                            minlength="8"
                        />
                    </div>
                    <p class="text-xs mb-5" style="color:var(--text-muted);">
                        At least 8 characters, one uppercase letter, one number.
                    </p>

                    <button type="submit" id="signupSubmitBtn" class="btn-primary auth-btn w-full justify-center">
                        Create Account
                    </button>
                </form>

                <!-- Back to Login -->
                <p class="text-center text-xs mt-4 text-gray-500">
                    Already have an account?
                    <button
                        type="button"
                        onclick="showLoginPanel()"
                        class="font-bold ml-1"
                        style="color:var(--nu-blue);background:none;border:none;cursor:pointer;text-decoration:underline;"
                    >Log In</button>
                </p>
            </div>

            <!-- ══ STEP 2: DEVICE PICKER ══ -->
            <div id="authStepDevice" class="hidden animate-fadeIn text-center">
                <h2 class="text-center font-extrabold text-xl mb-1">
                    What device are you evaluating, <span id="authGreetingName"></span>?
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

    // Wire up email field to show/hide Role dropdown on signup panel
    const signupEmail = document.getElementById('signupInputEmail');
    if (signupEmail) {
        signupEmail.addEventListener('input', () => {
            const isNU = signupEmail.value.toLowerCase().endsWith('@national-u.edu.ph');
            const roleRow = document.getElementById('signupRoleRow');
            if (roleRow) {
                roleRow.classList.toggle('hidden', !isNU);
                document.getElementById('signupInputRole').required = isNU;
            }
        });
    }
}

// ─────────────────────────────────────────
// PANEL SWITCHERS
// ─────────────────────────────────────────
function showLoginPanel() {
    _activePanel = 'login';
    document.getElementById('authStepCredentials').classList.remove('hidden');
    document.getElementById('authStepSignup').classList.add('hidden');
    document.getElementById('authStepDevice').classList.add('hidden');
    // Clear errors
    document.getElementById('authErrorMsg').classList.add('hidden');
}

function showSignupPanel() {
    _activePanel = 'signup';
    document.getElementById('authStepCredentials').classList.add('hidden');
    document.getElementById('authStepSignup').classList.remove('hidden');
    document.getElementById('authStepDevice').classList.add('hidden');
    // Clear errors
    document.getElementById('signupErrorMsg').classList.add('hidden');
    document.getElementById('signupSuccessMsg').classList.add('hidden');
}

// ─────────────────────────────────────────
// LOGIN SUBMIT
// ─────────────────────────────────────────
async function handleAuthSubmit(event) {
    event.preventDefault();

    const email    = document.getElementById('authInputEmail').value.trim();
    const password = document.getElementById('authInputPassword').value;
    const errBanner = document.getElementById('authErrorMsg');
    const errText   = document.getElementById('authErrorText');

    errBanner.classList.add('hidden');

    if (!email || !password) {
        errText.innerText = 'Please enter your email and password.';
        errBanner.classList.remove('hidden');
        return;
    }

    try {
        const result = await apiFetch('POST', '/api/auth/login', { email, password }, true);

        tempAuthData = {
            backendUserId : result.user.userId,
            studentName   : result.user.userName,
            userType      : result.user.userType,
            authToken     : result.token,
        };

        // Advance to device picker
        document.getElementById('authStepCredentials').classList.add('hidden');
        document.getElementById('authStepDevice').classList.remove('hidden');
        document.getElementById('authGreetingName').innerText = result.user.userName;

    } catch (err) {
        errText.innerText = err.message || 'Invalid email or password.';
        errBanner.classList.remove('hidden');
    }
}

// ─────────────────────────────────────────
// SIGNUP SUBMIT
// ─────────────────────────────────────────
async function handleSignupSubmit(event) {
    event.preventDefault();

    const name     = document.getElementById('signupInputName').value.trim();
    const email    = document.getElementById('signupInputEmail').value.trim();
    const password = document.getElementById('signupInputPassword').value;
    const roleEl   = document.getElementById('signupInputRole');
    const role     = roleEl ? roleEl.value : null;

    const errBanner     = document.getElementById('signupErrorMsg');
    const errText       = document.getElementById('signupErrorText');
    const successBanner = document.getElementById('signupSuccessMsg');
    const submitBtn     = document.getElementById('signupSubmitBtn');

    errBanner.classList.add('hidden');
    successBanner.classList.add('hidden');

    // Client-side pre-checks matching backend Validator rules
    if (!name || name.length < 2) {
        errText.innerText = 'Full name must be at least 2 characters.';
        errBanner.classList.remove('hidden');
        return;
    }
    if (!email) {
        errText.innerText = 'Please enter a valid email address.';
        errBanner.classList.remove('hidden');
        return;
    }
    if (password.length < 8) {
        errText.innerText = 'Password must be at least 8 characters.';
        errBanner.classList.remove('hidden');
        return;
    }
    if (!/[A-Z]/.test(password)) {
        errText.innerText = 'Password must contain at least one uppercase letter.';
        errBanner.classList.remove('hidden');
        return;
    }
    if (!/[0-9]/.test(password)) {
        errText.innerText = 'Password must contain at least one number.';
        errBanner.classList.remove('hidden');
        return;
    }

    const isNU = email.toLowerCase().endsWith('@national-u.edu.ph');
    if (isNU && !role) {
        errText.innerText = 'Institutional users must select a role.';
        errBanner.classList.remove('hidden');
        return;
    }

    // Disable button during request
    submitBtn.disabled = true;
    submitBtn.innerText = 'Creating account…';

    try {
        // 1. Register
        await apiFetch('POST', '/api/auth/register', {
            name,
            email,
            password,
            role: isNU ? role : null,
        }, true);

        // 2. Auto-login right after
        const loginResult = await apiFetch('POST', '/api/auth/login', { email, password }, true);

        successBanner.classList.remove('hidden');

        tempAuthData = {
            backendUserId : loginResult.user.userId,
            studentName   : loginResult.user.userName,
            userType      : loginResult.user.userType,
            authToken     : loginResult.token,
        };

        // Short pause so user sees the success message, then move to device picker
        setTimeout(() => {
            document.getElementById('authStepSignup').classList.add('hidden');
            document.getElementById('authStepDevice').classList.remove('hidden');
            document.getElementById('authGreetingName').innerText = loginResult.user.userName;
        }, 1200);

    } catch (err) {
        errText.innerText = err.message || 'Registration failed. Please try again.';
        errBanner.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Create Account';
    }
}

// ─────────────────────────────────────────
// DEVICE PICKER
// ─────────────────────────────────────────
function handleSelectDevice(deviceType) {
    if (!tempAuthData) return;
    const finalUser = {
        ...tempAuthData,
        selectedDevice: deviceType,
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

window.addEventListener('load', () => {

    const session =
        getSession();

    if (!session) {

        return;

    }

    console.log(
        'Session Restored:',
        session.studentName
    );

});