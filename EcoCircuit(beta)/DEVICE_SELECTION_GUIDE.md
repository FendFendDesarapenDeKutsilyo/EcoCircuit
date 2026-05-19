# Device Selection Feature - Complete Guide

## 🎯 Features Implemented

### 1. **Skip for Now Button** ✅
- Users can skip device selection without choosing a device
- The device info badge will NOT appear if no device is selected
- Users can later choose a device by clicking the "Start Modules" button or other triggers

### 2. **Change Device Button** ✅
- A "Change Device" button appears next to the selected device info
- Clicking it reopens the device selection modal
- The currently selected device is highlighted in the modal
- Users can freely change devices without logging out

### 3. **Device-Specific Content Updates** ✅
When a device is selected (or changed):
- TECH-CARE module questions update to device-specific questions
- TRANSFER module questions adapt to the device type
- TIPID module labels update (e.g., "New Laptop Cost" vs "New Phone Cost")

---

## 📋 How It Works - User Flow

### **Scenario 1: User Selects a Device**
```
1. User logs in (enters Student ID & Name)
   ↓
2. Device selection modal appears
   ↓
3. User clicks "Cellphone" option
   ↓
4. Modal closes
   ↓
5. Hero section shows:
   - Personalized greeting: "Hey, [Name]! 👋"
   - Device badge: "📱 Evaluating: Cellphone"
   - "Change Device" button visible
   ↓
6. All modules show cellphone-specific content
```

### **Scenario 2: User Skips Device Selection**
```
1. User logs in
   ↓
2. Device selection modal appears
   ↓
3. User clicks "Skip for Now"
   ↓
4. Modal closes
   ↓
5. Hero section shows:
   - Personalized greeting only
   - NO device badge
   - NO "Change Device" button
   ↓
6. Modules show default (cellphone) content
```

### **Scenario 3: User Changes Device**
```
1. User has selected "Cellphone"
   ↓
2. Device badge shows: "📱 Evaluating: Cellphone"
   ↓
3. User clicks "Change Device" button
   ↓
4. Device modal reopens with "Cellphone" highlighted
   ↓
5. User clicks "Laptop"
   ↓
6. Modal closes
   ↓
7. Device badge updates: "💻 Evaluating: Laptop"
   ↓
8. All module content updates to laptop-specific:
   - TECH-CARE: Battery drains quickly? → "under 2 hours?"
   - TRANSFER: Screen question becomes "screen and keyboard"?
   - TIPID: "New Laptop Cost" label
```

---

## 🧪 Testing Checklist

### Test 1: Login & Device Selection
- [ ] Open website
- [ ] See login modal
- [ ] Enter Student ID: `NU-2024-001`
- [ ] Enter Name: `Eric`
- [ ] Click "Continue"
- [ ] Device selection modal appears
- [ ] Device greeting shows: "What device are we evaluating today, Eric?"

### Test 2: Select Device
- [ ] Click "📱 Cellphone" option
- [ ] Option gets highlighted (blue border)
- [ ] Modal closes
- [ ] Device badge appears: "📱 Evaluating: Cellphone"
- [ ] "Change Device" button is visible next to badge

### Test 3: Skip Device
- [ ] Refresh page to test skip scenario
- [ ] Open website, login again
- [ ] In device modal, click "Skip for Now"
- [ ] Modal closes
- [ ] Device badge does NOT appear
- [ ] Only personalized greeting shows

### Test 4: Change Device
- [ ] From "Cellphone", click "Change Device" button
- [ ] Device modal reopens
- [ ] "Cellphone" option is highlighted
- [ ] Click "💻 Laptop"
- [ ] Modal closes
- [ ] Badge updates: "💻 Evaluating: Laptop"

### Test 5: Device-Specific Content
**For Cellphone:**
- [ ] TECH-CARE: "Does your phone die before reaching 1%?"
- [ ] TRANSFER: "Is the battery swelling?"
- [ ] TIPID: "New Device Cost" or "New Phone Cost"

**For Laptop:**
- [ ] TECH-CARE: "Does your laptop battery drain quickly (under 2 hours)?"
- [ ] TRANSFER: "Is the battery swelling or damaged?"
- [ ] TIPID: "New Laptop Cost"

**For Tablet:**
- [ ] TECH-CARE: "Does your tablet battery last less than 4 hours?"
- [ ] TRANSFER: "Is the touchscreen slow to respond?"
- [ ] TIPID: "New Tablet Cost"

### Test 6: Multiple Device Changes
- [ ] Start with Cellphone → Change to Laptop → Change to Tablet → Change to Cellphone
- [ ] Verify all changes work smoothly
- [ ] Verify content updates each time

### Test 7: Logout & Login Again
- [ ] Click Logout button
- [ ] Confirm logout
- [ ] See login modal again
- [ ] Previous device selection is cleared
- [ ] After login, device modal shows again

---

## 📱 Device-Specific Content Map

### **CELLPHONE Content**

**TECH-CARE Stages:**
1. Battery Health: "Does your phone die before reaching 1%?"
2. Storage Check: "Is your storage over 90% full?"
3. Thermal Dynamics: "Does the phone get uncomfortably hot?"

**TRANSFER Questions:**
1. "Does your phone turn on?"
2. "Is the battery swelling?"
3. "Is the screen/touch functional?"
4. "Is there water damage?"

### **LAPTOP Content**

**TECH-CARE Stages:**
1. Battery Health: "Does your laptop battery drain quickly (under 2 hours)?"
2. Cooling System: "Do you hear loud fan noise or feel excessive heat?"
3. Performance Check: "Does your laptop freeze or slow down?"

**TRANSFER Questions:**
1. "Does your laptop turn on?"
2. "Is the battery swelling or damaged?"
3. "Is the screen and keyboard functional?"
4. "Is there liquid damage?"

### **TABLET Content**

**TECH-CARE Stages:**
1. Battery Health: "Does your tablet battery last less than 4 hours?"
2. Touch Response: "Is the touchscreen slow to respond?"
3. Storage Management: "Is your tablet storage nearly full?"

**TRANSFER Questions:**
1. "Does your tablet turn on?"
2. "Is the battery swelling?"
3. "Is the touchscreen functional?"
4. "Is there water damage?"

---

## 🔧 Technical Details

### JavaScript Classes & Methods

**UserSession**
- `setDevice(deviceType)` - Store selected device
- `updateUIWithDeviceInfo()` - Show device badge, hide if no device
- `selectedDevice` - Current device type

**TechCareModule**
- `updateDeviceType(deviceType)` - Change device and reload questions
- `#initializeStages()` - Load device-specific questions
- `reset()` - Reset to first stage

**Helper Functions**
- `highlightSelectedDevice()` - Highlight current device in modal
- `updateDeviceSpecificContent(deviceType)` - Update TIPID/TRANSFER labels
- `updateModuleGreetings()` - Call updateDeviceSpecificContent

### CSS Classes

| Class | Purpose |
|-------|---------|
| `.device-info-badge` | Flex container for device display |
| `.device-info-badge.hidden` | Hide device badge |
| `.btn-change-device` | Change device button styling |

---

## 🐛 Troubleshooting

**Issue: Device badge not showing after selection**
- Check: Is `#deviceInfo` element in HTML?
- Check: Does JS call `updateUIWithDeviceInfo()`?
- Check: Is `hidden` class being removed?

**Issue: Change Device button not working**
- Check: Is `#changeDeviceBtn` button in HTML?
- Check: Are event listeners attached in `initializeAuthFlow()`?
- Check: Browser console for JavaScript errors

**Issue: Device content not updating**
- Check: Is `updateDeviceSpecificContent()` called?
- Check: Is `tcModule.updateDeviceType()` called?
- Check: Are element IDs correct? (repairCostLabel, transfer-q1, etc.)

**Issue: Currently selected device not highlighted when modal reopens**
- Check: Is `highlightSelectedDevice()` called when Change Device clicked?
- Check: Does device have `.selected` class?

---

## 🎨 User Interface Layout

```
┌─────────────────────────────────────────┐
│         Eco Circuit Navbar              │
│  Logo    Home  Modules  Locations       │
│                              👤 Eric  [Logout]
├─────────────────────────────────────────┤
│         Hero Section                    │
│                                         │
│  Hey, Eric! 👋 Save Your Wallet.       │
│                                         │
│  [Start Modules]                        │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ 📱 Evaluating: Cellphone        │  │
│  │            [Change Device]      │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 💾 Session Data

When device is selected:
```javascript
sessionStorage.ecocircuit_session = {
  "studentId": "NU-2024-001",
  "studentName": "Eric",
  "selectedDevice": "cellphone"
}
```

When skipped (or initial):
```javascript
sessionStorage.ecocircuit_session = {
  "studentId": "NU-2024-001",
  "studentName": "Eric",
  "selectedDevice": null
}
```

---

## ✨ Key Features Summary

✅ Skip device selection without penalty
✅ Choose device anytime from hero section
✅ Change device freely without logout
✅ Device-specific questions for TECH-CARE
✅ Device-specific questions for TRANSFER  
✅ Device-specific labels for TIPID
✅ Currently selected device highlighted when modal reopens
✅ Device badge with one-click access to change

---
