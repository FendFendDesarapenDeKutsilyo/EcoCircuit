# EcoCircuit Login System - Quick Reference Guide

## 🎯 System Overview

Your website now has three main stages:

```
Stage 1: LOGIN
↓
Stage 2: DEVICE SELECTION
↓
Stage 3: PERSONALIZED MAIN MODULES
```

---

## 📋 Login Modal

**Appears**: On first visit or after logout

**User Input Required**:
- Student ID (required)
- Full Name (required)

**Example**:
- ID: `NU-2024-001`
- Name: `Eric Reyes`

**Storage**: `sessionStorage` - persists until browser closes

---

## 📱 Device Selection Modal

**Appears**: After successful login

**Device Options**:
1. **📱 Cellphone** - data-device: `cellphone`
2. **💻 Laptop** - data-device: `laptop`
3. **📲 Tablet** - data-device: `tablet`

**Can Skip**: Yes (users can proceed without selecting)

---

## 👤 Personalization Examples

### Navbar Display
```
Before: [Logout]
After: 👤 Eric Reyes  [Logout]
```

### Hero Section
```
Before: "Sustain Your Tech. Save Your Wallet."
After:  "Hey, Eric Reyes! 👋 Save Your Wallet.
         📱 Evaluating: Cellphone"
```

### TIPID Module Recommendation
```
Before: "❌ Replace - Effective cost burden is 75%..."
After:  "Hey, Eric! We encourage you to ❌ Replace...
         Effective cost burden is 75%..."
```

### TECH-CARE Module Completion
```
Before: "Final Note: [feedback]"
After:  "Great work, Eric! Here's your final note:
         [feedback]"
```

---

## 🔐 Session Management

### Where Data is Stored
- **Location**: Browser `sessionStorage`
- **Key**: `ecocircuit_session`
- **Duration**: Until browser is closed or user logs out
- **Access**: Via `userSession` global object

### Session Data Structure
```javascript
{
  "studentId": "NU-2024-001",
  "studentName": "Eric Reyes",
  "selectedDevice": "cellphone"
}
```

### Access Session Data in Code
```javascript
// Check if user is logged in
if (userSession.isLoggedIn()) {
    console.log(userSession.studentName);
    console.log(userSession.studentId);
    console.log(userSession.selectedDevice);
}

// Personalize content
const greeting = `Hey, ${userSession.studentName}!`;
```

---

## 🚪 Logout Feature

**Logout Button**: Appears in navbar (top right)

**On Logout**:
1. ✓ Clear all session data
2. ✓ Remove studentStorage entry
3. ✓ Reload page
4. ✓ Show login modal again

**Code**:
```javascript
userSession.logout(); // Clears all data and reloads
```

---

## 🔧 Key JavaScript Objects & Methods

### UserSession Class

| Method | Purpose |
|--------|---------|
| `setUser(id, name)` | Store user login data |
| `setDevice(device)` | Store device selection |
| `isLoggedIn()` | Check if user authenticated |
| `logout()` | Clear session & reload |
| `getPersonalizedGreeting()` | Get customized hero text |
| `updateUIWithUserInfo()` | Update navbar with name |
| `updateUIWithDeviceInfo()` | Show device badge |

### Global Functions

| Function | Purpose |
|----------|---------|
| `initializeAuthFlow()` | Setup login/device modals (runs on DOMContentLoaded) |
| `updateHeroGreeting()` | Update hero heading with name |
| `updateModuleGreetings()` | Personalize module sections |

---

## 🎨 CSS Classes Reference

| Class | Purpose |
|-------|---------|
| `.auth-modal-overlay` | Full-screen modal background |
| `.auth-modal-content` | Modal white box container |
| `.device-selector` | 3-column grid for device options |
| `.device-option` | Individual device choice box |
| `.device-option.selected` | Active device option styling |
| `.user-info` | Navbar user display |
| `.btn-logout` | Red logout button |
| `.device-info-badge` | Hero section device display |

---

## 🧪 Testing Checklist

- [ ] **Login Works**: Enter ID and name, click Continue
- [ ] **Data Persists**: Refresh page, data still there
- [ ] **Device Selection**: Can select and see icon change
- [ ] **Navbar Updates**: User name appears in navbar
- [ ] **Hero Personalized**: Greeting shows user's name
- [ ] **Skip Works**: Can skip device selection
- [ ] **Logout Works**: Click logout, data clears, login modal reappears
- [ ] **TIPID Personal**: Module shows name in recommendations
- [ ] **TECH-CARE Personal**: Completion message shows name
- [ ] **Mobile Responsive**: All modals work on phone/tablet

---

## 🚀 How to Extend This

### Add More Personalized Messages
```javascript
// In Main.js, find event listeners and add:
if (userSession.studentName) {
    message = `Hey, ${userSession.studentName}! ` + message;
}
```

### Device-Specific Content
```javascript
// Show different content based on device
if (userSession.selectedDevice === 'cellphone') {
    // Show cellphone-specific tips
} else if (userSession.selectedDevice === 'laptop') {
    // Show laptop-specific tips
}
```

### Save User History
```javascript
// Replace sessionStorage with localStorage for persistent data
localStorage.setItem('ecocircuit_user', JSON.stringify(userData));
```

### Add Database Backend
- Replace `sessionStorage` with API calls
- Store user sessions on server
- Track user progress over time

---

## 📝 File Locations

| File | Changes |
|------|---------|
| [index.html](index.html) | Login modal, Device modal, Navbar updates, Hero personalization |
| [Main.js](Main.js) | UserSession class, authentication flow, personalized recommendations |
| [style.css](style.css) | Modal styles, device selector, navbar styling |

---

## ⚡ Performance Notes

- Login data is lightweight (sessionStorage only)
- Modals use CSS animations (smooth, performant)
- No external API calls needed (works offline)
- Personalization uses simple string interpolation
- Session data loads instantly on page load

---

## 🐛 Troubleshooting

### Login modal not appearing?
- Check: `#loginModal` exists in HTML
- Check: `initializeAuthFlow()` is called after `DOMContentLoaded`
- Check: JavaScript console for errors

### User name not showing?
- Verify: `userSession.isLoggedIn()` returns `true`
- Check: `#userInfo` element exists in navbar
- Check: CSS `.user-info` is not hidden

### Device not persisting?
- Check: `sessionStorage` is enabled in browser
- Verify: Device was selected (should see `.selected` class)
- Look: In browser DevTools → Application → Session Storage

### Logout not working?
- Check: `#logoutBtn` button exists and has correct ID
- Verify: Browser allows `location.reload()`
- Check: Confirm dialog appears (may need to click OK)
