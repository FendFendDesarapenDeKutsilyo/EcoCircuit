# EcoCircuit - Login & Device Selection Feature Documentation

## Overview
Your website now includes a complete authentication and personalization system that greets users by name and tailors the experience based on device type.

---

## Features Implemented

### 1. **Login System** 🎓
- **What it does**: On first visit, users see a login modal asking for:
  - **Student ID**: (e.g., NU-2024-001)
  - **Full Name**: (e.g., Juan Dela Cruz)

- **Where it appears**: Before accessing any modules
- **Data storage**: User info is stored in `sessionStorage` (cleared when browser session ends)
- **Flow**: Login → Device Selection → Main Modules

### 2. **Device Selection Screen** 📱💻📲
- **What it does**: After login, users select which device they want to evaluate:
  - **Cellphone** 📱
  - **Laptop** 💻
  - **Tablet** 📲
  
- **Skip option**: Users can skip this and select later or decide not to select
- **Purpose**: Allows the system to provide tailored recommendations for the specific device type

### 3. **Personalization** 👤
The system now uses the user's name throughout the website:

#### In Navbar:
- Shows: `👤 [Student Name]` on the right side
- Logout button to clear session and restart

#### In Hero Section:
- Changes greeting from generic to: `"Hey, [Name]! 👋 Save Your Wallet."`
- Shows device badge below heading: `📱 Evaluating: Cellphone`

#### In TIPID Module:
- Personalized recommendations like: `"Hey, Eric! We encourage you to upgrade your device"`
- `"Great news, Juan! Strong Repair"`

#### In TECH-CARE Module:
- Personalized completion message: `"Great work, Maria! Here's your final note..."`
- Device Greeting: `"What device are we evaluating today, Alex?"`

---

## Code Structure

### New Classes & Methods

#### **UserSession Class** (Main.js)
```javascript
class UserSession {
    setUser(studentId, studentName)        // Set user after login
    setDevice(deviceType)                  // Set device type
    saveToStorage()                        // Persist to sessionStorage
    loadFromStorage()                      // Restore session on reload
    isLoggedIn()                          // Check if user is authenticated
    logout()                              // Clear session and reload
    updateUIWithUserInfo()                // Update navbar with name
    updateUIWithDeviceInfo()              // Show selected device badge
    getPersonalizedGreeting()             // Generate custom hero greeting
}
```

### New HTML Elements
- `#loginModal` - Login form container
- `#deviceModal` - Device selection container
- `#userInfo` - User display in navbar
- `#logoutBtn` - Logout button
- `#deviceInfo` - Device type badge in hero
- `#heroGreeting` - Personalized hero greeting
- `#deviceGreeting` - Personalized device selection greeting

### New CSS Classes
- `.auth-modal-overlay` - Full-screen modal background
- `.auth-modal-content` - Modal content container
- `.device-selector` - Grid layout for device options
- `.device-option` - Individual device choice
- `.device-option.selected` - Highlighted when selected
- `.user-info` - User name display in navbar
- `.btn-logout` - Logout button styling
- `.device-info-badge` - Device type display in hero

---

## How to Test

### Test Case 1: First Visit
1. Open the website
2. See login modal with fields for Student ID and Full Name
3. Enter: ID = "NU-2024-001", Name = "Eric"
4. Click "Continue"

### Test Case 2: Device Selection
1. See device selection modal with 3 options
2. Click on "Cellphone" option
3. Screen highlights and data is saved
4. Click "Skip for Now" (or device option to proceed)
5. Modal closes

### Test Case 3: Personalization Check
1. Navbar shows: `👤 Eric`
2. Hero shows: `"Hey, Eric! 👋 Save Your Wallet."`
3. Hero shows: `📱 Evaluating: Cellphone`
4. TIPID results show: `"Hey, Eric! We encourage you to upgrade your device"`

### Test Case 4: Logout
1. Click "Logout" button in navbar
2. Confirm logout
3. Page reloads showing login modal again
4. Previous data is cleared

---

## Data Persistence

**Session Storage** (cleared when browser closes):
```json
{
  "ecocircuit_session": {
    "studentId": "NU-2024-001",
    "studentName": "Eric",
    "selectedDevice": "cellphone"
  }
}
```

---

## Future Enhancements

- Add device-specific module variations
- Save user history (previous evaluations)
- Add profile/settings page
- Email notification system with personalized device tips
- Leaderboard for sustainable habits
- Device-specific resource recommendations
- Export personalized reports

---

## File Changes Summary

### 1. **index.html**
- Added login modal (#loginModal)
- Added device selection modal (#deviceModal)
- Added user info display and logout button in navbar
- Added device info badge in hero section
- Updated hero greeting ID for personalization

### 2. **Main.js**
- New `UserSession` class (lines 1-85)
- New `initializeAuthFlow()` function
- New helper functions: `updateHeroGreeting()`, `updateModuleGreetings()`
- Enhanced TIPID module with personalized messages
- Enhanced TECH-CARE module with personalized completions

### 3. **style.css**
- Added authentication modal styles
- Added device selector styles
- Added user info navbar styles
- Added responsive animations
- Added button hover effects

---

## Questions?
All code follows your existing EcoCircuit architecture and design patterns. The new features integrate seamlessly with:
- TIPID repair analysis
- TECH-CARE maintenance protocol
- TRANSFER disposal logic
- Location directory modal system
