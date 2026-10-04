# SHODHINI Testing & Verification Checklist

This document outlines manual testing scenarios to verify decentralized, real-time waste management workflows between citizens and garbage collectors across different wards.

---

## Prerequisites
1. Supabase project created with [`supabase/migrations/001_init.sql`](./supabase/migrations/001_init.sql) executed.
2. `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` populated in `.env`.

---

## Test Scenarios

### Test 1: Cross-Device Live Complaint Dispatch
- **Objective**: Confirm that a complaint filed by a citizen in a specific ward is instantly visible to a collector in that same ward without page refresh.
- **Steps**:
  1. **Device A (Citizen)**:
     - Open app and Sign Up as **Citizen** with residential area **Ward 1**.
     - Navigate to **File a Complaint** (`📝`).
     - Choose category `Roadside waste`, select area `Ward 1`, type a description, and tap **Submit Complaint**.
  2. **Device B (Collector - Ward 1)**:
     - Open app on a second browser/phone and Log In as **Garbage Collector** assigned to **Ward 1**.
     - **Verification**: Confirm the newly filed complaint appears immediately in the live feed without manual reloading.

---

### Test 2: Ward Area Isolation
- **Objective**: Ensure collectors only receive complaints for their assigned zone and not other wards.
- **Steps**:
  1. **Device C (Collector - Ward 2)**:
     - Log in as a **Garbage Collector** assigned to **Ward 2**.
  2. **Verification**:
     - Confirm that the complaint filed in **Ward 1** does **NOT** appear in Device C's dashboard.
     - Row-Level Security (RLS) and Realtime filters restrict visibility strictly to the assigned `area_id`.

---

### Test 3: Real-Time Status Updates & Citizen Synchronization
- **Objective**: Verify that worker status transitions reflect live on citizen devices.
- **Steps**:
  1. On **Device B (Collector)**:
     - Tap **📌 Assigned** on the complaint card.
  2. On **Device A (Citizen)**:
     - Open **Complaints & Details** (`📋`).
     - **Verification**: The complaint pill status immediately reflects `Assigned` in real-time.
  3. On **Device B (Collector)**:
     - Tap **⏳ In Progress**.
  4. On **Device A (Citizen)**:
     - **Verification**: The status pill immediately updates to `In Progress`.

---

### Test 4: Completion & Eco Points Allocation
- **Objective**: Verify that marking a complaint as `Completed` credits exactly 15 Eco Points to the citizen, and guards against double-awarding.
- **Steps**:
  1. Note the citizen's initial points on **Device A** (e.g. `0 pts`).
  2. On **Device B (Collector)**:
     - Tap **✅ Mark Done** / `Completed`.
  3. On **Device A (Citizen)**:
     - **Verification**:
       - The status changes to `✓ Completed`.
       - Eco points increase from `0 pts` to `15 pts` automatically via the database trigger.
  4. On **Device B (Collector)**:
     - Attempt to toggle or update the completed complaint again.
  5. On **Device A (Citizen)**:
     - **Verification**: Eco points remain `15 pts` and are **not** re-awarded.

---

### Test 5: Optional GPS Capture
- **Steps**:
  1. In **File a Complaint**, tap **📍 Add GPS Location**.
  2. Grant location permissions when prompted.
  3. Confirm latitude/longitude coordinates are populated and attached to the complaint row.
  4. Deny permissions on a fresh session and confirm submission succeeds using only the selected Ward without crashing.
