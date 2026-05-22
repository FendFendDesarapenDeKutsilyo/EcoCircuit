# EcoCircuit Login System - Code Examples

## Basic Usage Examples

### Example 1: Check if User is Logged In

```javascript
// Check if user has authenticated
if (userSession.isLoggedIn()) {
    console.log('User is logged in');
    console.log('Name:', userSession.studentName);
    console.log('ID:', userSession.studentId);
} else {
    console.log('User not authenticated');
}
```

---

### Example 2: Get User's Full Information

```javascript
// Access user data anytime after login
const userName = userSession.studentName;      // "Eric Reyes"
const userId = userSession.studentId;          // "NU-2024-001"
const deviceType = userSession.selectedDevice; // "cellphone"

// Use in a message
const message = `Welcome, ${userName}! You're evaluating a ${deviceType}.`;
console.log(message);
// Output: "Welcome, Eric Reyes! You're evaluating a cellphone."
```

---

### Example 3: Create Personalized Recommendations

```javascript
// TIPID Module - Personalized Message
function createPersonalizedRecommendation(baseRecommendation) {
    if (userSession.isLoggedIn()) {
        return `Hey, ${userSession.studentName}! ${baseRecommendation}`;
    }
    return baseRecommendation;
}

// Usage
const tipidResult = "We recommend upgrading your device";
const personalized = createPersonalizedRecommendation(tipidResult);
// Output: "Hey, Eric Reyes! We recommend upgrading your device"
```

---

### Example 4: Device-Specific Logic

```javascript
// Show different content based on device
function getDeviceSpecificTip() {
    const device = userSession.selectedDevice;
    
    const tips = {
        cellphone: "💡 Cellphone Tip: Close unused background apps to improve battery life",
        laptop: "💡 Laptop Tip: Clean your fans quarterly to prevent overheating",
        tablet: "💡 Tablet Tip: Update your OS regularly for security patches"
    };
    
    return tips[device] || "Please select a device type";
}

// Usage
console.log(getDeviceSpecificTip());
// If device is "cellphone", outputs: "💡 Cellphone Tip: Close unused background apps..."
```

---

### Example 5: Build Dynamic Greeting

```javascript
// Create context-aware messages for hero section
function generateHeroMessage() {
    const greeting = userSession.getPersonalizedGreeting();
    const device = userSession.selectedDevice ? 
        `<br>📱 Evaluating: ${userSession.selectedDevice.charAt(0).toUpperCase() + userSession.selectedDevice.slice(1)}` 
        : '';
    
    return greeting + device;
}

// Usage
document.getElementById('heroGreeting').innerHTML = generateHeroMessage();
// Output: "Hey, Eric Reyes! 👋 <br><span>Save Your Wallet.</span><br>📱 Evaluating: Cellphone"
```

---

### Example 6: Logout Function

```javascript
// Manually trigger logout
function initiateLogout() {
    const confirmed = confirm('Are you sure you want to logout?');
    if (confirmed) {
        userSession.logout();
        // This clears all data and reloads the page
    }
}

// Or attach to button
document.getElementById('logoutBtn').addEventListener('click', initiateLogout);
```

---

### Example 7: Extend with Custom Data

```javascript
// Add custom properties to UserSession (if needed)
class ExtendedUserSession extends UserSession {
    constructor() {
        super();
        this.preferredLanguage = 'Filipino';
        this.deviceBrand = null;
        this.assessmentHistory = [];
    }
    
    recordAssessment(module, result) {
        this.assessmentHistory.push({
            timestamp: new Date(),
            module: module,
            result: result
        });
    }
}
```

---

### Example 8: Fetch User-Specific Resources

```javascript
// Get resources tailored to user's device
function getPersonalizedResources() {
    const device = userSession.selectedDevice;
    const resources = resourceEngine.getRecommendationPackage(
        device,
        'Generic',
        'Device',
        'battery'
    );
    return resources;
}

// Usage
const resources = getPersonalizedResources();
console.log('Curated Resources:', resources.curatedResources);
console.log('Sustainability Tip:', resources.sustainabilityMessage);
```

---

### Example 9: Create User Profile Card

```javascript
// Display user information in a card format
function createUserProfileCard() {
    if (!userSession.isLoggedIn()) return 'Not logged in';
    
    const html = `
        <div class="profile-card">
            <h3>👤 ${userSession.studentName}</h3>
            <p><strong>Student ID:</strong> ${userSession.studentId}</p>
            <p><strong>Device:</strong> ${userSession.selectedDevice || 'Not selected'}</p>
            <button onclick="userSession.logout()">Logout</button>
        </div>
    `;
    
    return html;
}

// Usage
document.getElementById('profileContainer').innerHTML = createUserProfileCard();
```

---

### Example 10: Track User Actions with Name

```javascript
// Log user actions with their name for analytics
function trackUserAction(action, details = {}) {
    const log = {
        timestamp: new Date().toISOString(),
        user: userSession.studentName,
        userId: userSession.studentId,
        action: action,
        device: userSession.selectedDevice,
        ...details
    };
    
    console.log('[Analytics]', log);
    // In production, send to server: fetch('/api/log', { body: JSON.stringify(log) })
}

// Usage
trackUserAction('module_started', { module: 'TIPID', cost: 2000 });
// Output: [Analytics] { timestamp: "...", user: "Eric Reyes", action: "module_started", ... }
```

---

## Integration with Existing Modules

### Modifying TIPID for Personalization

```javascript
// Enhanced TIPID with user name
document.getElementById('btn-calc-tipid').addEventListener('click', () => {
    // ... existing code ...
    
    const result = ModuleFactory.createModule('tipid').execute(device);
    
    // Personalize the recommendation
    let personalizedMessage = result.rec;
    if (userSession.studentName) {
        if (result.rec.includes('Replace')) {
            personalizedMessage = `Hey, ${userSession.studentName}! We encourage you to ${result.rec.toLowerCase()}`;
        } else if (result.rec.includes('Repair')) {
            personalizedMessage = `Great news, ${userSession.studentName}! ${result.rec}`;
        }
    }
    
    // Display result
    const resultBox = document.getElementById('tipid-result');
    resultBox.innerHTML = `<strong>${personalizedMessage}</strong><br>${result.reason}`;
});
```

### Modifying TECH-CARE for Personalization

```javascript
// Enhanced TECH-CARE with user name
function handleTcResponse(isYes) {
    const result = tcModule.processAnswer(isYes);
    
    if (result.isComplete) {
        const userName = userSession.studentName ? userSession.studentName : 'Bulldog';
        tcTitle.textContent = "Assessment Complete";
        tcPrompt.innerHTML = `<em>Great work, ${userName}! Here's your final note:</em> ${result.feedback}`;
    } else {
        tcTitle.textContent = result.nextStage.title;
        tcPrompt.innerHTML = `<span style="color:#2ecc71;">✅ Prev: ${result.feedback}</span><br><br>${result.nextStage.prompt}`;
    }
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Page Load (index.html)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │  DOMContentLoaded Event  │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │  initializeAuthFlow()         │
        │  - Load sessionStorage        │
        │  - Check userSession.isLoggedIn()
        └────┬───────────────┬──────────┘
             │               │
        Not Logged In    Logged In
             │               │
             ▼               ▼
    ┌──────────────────┐  ┌──────────────────┐
    │ Show LoginModal  │  │ updateUIWithUserInfo()
    │                  │  │ updateUIWithDeviceInfo()
    └────┬─────────────┘  │ updateHeroGreeting()
         │                │ updateModuleGreetings()
         ▼                │
    ┌──────────────────┐  │
    │ User Enters:     │  │
    │ - Student ID     │  │
    │ - Full Name      │  │
    └────┬─────────────┘  │
         │                │
         ▼                ▼
    ┌──────────────────┐  ┌──────────────────┐
    │ setUser()        │  │  Display Main    │
    │ saveToStorage()  │  │  Website         │
    │                  │  │  (personalized)  │
    └────┬─────────────┘  └──────────────────┘
         │
         ▼
    ┌──────────────────┐
    │ Show DeviceModal │
    └────┬─────────────┘
         │
         ▼
    ┌──────────────────┐
    │ User Selects:    │
    │ Cellphone/       │
    │ Laptop/Tablet    │
    │ or Skip          │
    └────┬─────────────┘
         │
         ▼
    ┌──────────────────┐
    │ setDevice()      │
    │ saveToStorage()  │
    └────┬─────────────┘
         │
         ▼
    ┌────────────────────────────┐
    │ Display Personalized       │
    │ Main Modules:              │
    │ - TIPID (with user name)   │
    │ - TECH-CARE (customized)   │
    │ - TRANSFER (device-aware)  │
    └────────────────────────────┘
```

---

## Storage & Session Examples

### SessionStorage Example

```javascript
// What's stored in browser
JSON.stringify({
  "ecocircuit_session": {
    "studentId": "NU-2024-001",
    "studentName": "Eric Reyes",
    "selectedDevice": "cellphone"
  }
})

// Browser location: DevTools → Application → Session Storage
```

### Advanced: Save to LocalStorage (Persistent)

```javascript
// Modify saveToStorage() for persistence
UserSession.prototype.saveToStorage = function() {
    localStorage.setItem('ecocircuit_session', JSON.stringify({
        studentId: this.studentId,
        studentName: this.studentName,
        selectedDevice: this.selectedDevice
    }));
}

UserSession.prototype.loadFromStorage = function() {
    const stored = localStorage.getItem('ecocircuit_session');
    if (stored) {
        const data = JSON.parse(stored);
        this.studentId = data.studentId;
        this.studentName = data.studentName;
        this.selectedDevice = data.selectedDevice;
    }
}
// Now data persists even after browser closes!
```

---

## Error Handling Examples

```javascript
// Safe data access
function safeGetUserName() {
    try {
        if (userSession && userSession.isLoggedIn()) {
            return userSession.studentName;
        }
    } catch (error) {
        console.error('Error retrieving user name:', error);
    }
    return 'Bulldog'; // Fallback
}

// Usage
const name = safeGetUserName();
console.log(`Welcome, ${name}!`);
```
